// 16-week interview plan tracker. Signed-in users only: each person enrolls,
// lands on today's objectives, and ticks off objectives and days; progress
// lives in their account via GET/PUT /progress/fde-plan
// (backend/src/functions/progress.py), with a per-user copy cached on this
// device so the page opens instantly.
//
// Views (URL hash): #today (default) or #day=w1-mon, #plan, #reference,
// #jobs (the job-search tracker, drawn by jobs.js).
// Day guides (objectives, lessons, code…) come from content-week*.js files
// that fill window.FDE_CONTENT; days without a guide show the plan line.
(() => {
  const P = window.FDE_PLAN;
  const CONTENT = window.FDE_CONTENT || {};
  const auth = window.SiteAuth;
  const JOBS = window.FDEJobs;
  const APP = "fde-plan";
  const CACHE = "fde-plan:"; // + user id
  const PREF_HIDE = "fde-plan-hide-done";
  const DAY_IDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  const root = document.getElementById("app");
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Plan days ----------
  const start = new Date(P.start[0], P.start[1], P.start[2]);
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); // DST-safe
  const fmt = d => `${DOW[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()}`;
  const longDate = d => `${DOW_LONG[d.getDay()]}, ${MON_LONG[d.getMonth()]} ${d.getDate()}`;
  const short = d => `${MON[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
  const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const indexOf = d => Math.round((d - start) / 864e5);

  // Pull "LC ×2" and "(3h)" out of the text so they can show as tags
  function parse(raw) {
    let lc = null, optional = false, hours = null;
    let text = raw.replace(/\s*\((\d+)h\)\s*$/, (_, h) => { hours = +h; return ""; });
    text = text.replace(/(^|\s)(Optional )?LC ×(\d)(\s*\+\s*|\.\s*|$)/, (_, pre, opt, n) => { lc = +n; optional = !!opt; return pre; }).trim();
    if (text) text = text[0].toUpperCase() + text.slice(1);
    return { text, lc, optional, hours };
  }

  const DAYS = [];
  P.weeks.forEach((w, wi) => w.days.forEach((raw, di) => {
    DAYS.push({ id: `w${wi + 1}-${DAY_IDS[di]}`, week: wi + 1, index: wi * 7 + di, date: addDays(start, wi * 7 + di), ...parse(raw) });
  }));
  const H1B = P.h1b.map((text, i) => ({ id: `h1b-${i + 1}`, text }));
  const objId = (dayId, k) => `${dayId}-o${k + 1}`;

  // ---------- State ----------
  let state = null;   // { enrolledAt, done: { id: isoTime } } once loaded
  let pending = {};   // id -> true/false, not yet confirmed by the server
  let sync = "idle";  // idle | loading | saving | saved | error | loadError
  let busy = false;   // enroll / leave in flight
  let inflight = false, pushTimer = null, retryTimer = null;
  let hideDone = !!ls.get(PREF_HIDE);
  let openWeeks = null; // Set of week numbers expanded in the full plan
  let userSub = null;

  const user = () => (auth && auth.isSignedIn() && auth.user()) || null;
  const isDone = id => !!(state && state.done[id]);
  const enrolled = () => !!(state && state.enrolledAt);
  const normalize = d => ({ enrolledAt: d.enrolledAt || null, done: { ...(d.done || {}) } });
  function applyPending(s) {
    const now = new Date().toISOString();
    for (const [id, v] of Object.entries(pending)) { if (v) s.done[id] = s.done[id] || now; else delete s.done[id]; }
    return s;
  }
  const saveCache = () => { if (userSub) ls.set(CACHE + userSub, { state, pending }); };
  function dropOtherCaches(keepSub) {
    try { Object.keys(localStorage).filter(k => k.startsWith(CACHE) && k !== CACHE + keepSub).forEach(k => ls.del(k)); } catch (e) {}
  }

  // ---------- Server sync ----------
  async function pull() {
    sync = "loading"; render();
    try {
      const res = await auth.apiFetch(`/progress/${APP}`);
      if (!res.ok) throw new Error(String(res.status));
      state = applyPending(normalize(await res.json()));
      if (!state.enrolledAt) pending = {};
      saveCache();
      sync = Object.keys(pending).length ? "saving" : "saved";
      render();
      if (Object.keys(pending).length) schedulePush(0);
    } catch (e) {
      sync = state ? "error" : "loadError";
      render();
    }
  }

  function schedulePush(delay = 700) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, delay);
  }

  async function push() {
    if (inflight || !Object.keys(pending).length || !user()) return;
    inflight = true;
    clearTimeout(retryTimer);
    const sent = { ...pending };
    sync = "saving"; renderSync();
    try {
      const res = await auth.apiFetch(`/progress/${APP}`, { method: "PUT", body: JSON.stringify({ changes: sent }) });
      if (res.status === 409) { pending = {}; inflight = false; return pull(); } // left the plan on another device
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      for (const [k, v] of Object.entries(sent)) if (pending[k] === v) delete pending[k];
      state = applyPending(normalize(data));
      saveCache();
      sync = Object.keys(pending).length ? "saving" : "saved";
      render();
    } catch (e) {
      sync = "error"; renderSync();
      retryTimer = setTimeout(push, 15000);
    } finally {
      inflight = false;
      if (Object.keys(pending).length && sync !== "error") schedulePush();
    }
  }

  async function send(body) {
    busy = true; render();
    try {
      const res = await auth.apiFetch(`/progress/${APP}`, { method: "PUT", body: JSON.stringify(body) });
      if (!res.ok) throw new Error(String(res.status));
      pending = {};
      state = normalize(await res.json());
      saveCache();
      sync = "saved";
    } catch (e) {
      sync = "error";
      alert("Couldn't reach your account. Please check your connection and try again.");
    }
    busy = false; render();
  }

  function setDone(id, v) {
    pending[id] = v;
    if (v) state.done[id] = new Date().toISOString(); else delete state.done[id];
  }
  function toggle(id) {
    if (!enrolled()) return;
    setDone(id, !isDone(id));
    // Ticking a day's last objective completes the day
    const m = id.match(/^(w\d+-[a-z]{3})-o\d+$/);
    if (m && isDone(id) && !isDone(m[1])) {
      const g = CONTENT[m[1]];
      if (g && g.objectives.every((_, k) => isDone(objId(m[1], k)))) setDone(m[1], true);
    }
    saveCache();
    render();
    schedulePush();
  }

  // ---------- Derived numbers ----------
  function stats() {
    const t = indexOf(today());
    const doneDays = DAYS.filter(d => isDone(d.id)).length;
    const missedDays = DAYS.filter(d => d.index < t && !isDone(d.id));
    let streak = 0;
    let i = Math.min(t, DAYS.length - 1);
    if (i >= 0 && i === t && !isDone(DAYS[i].id)) i--; // today not done yet doesn't break the streak
    for (; i >= 0 && isDone(DAYS[i].id); i--) streak++;
    return { t, doneDays, missed: missedDays.length, firstMissed: missedDays[0], streak, pct: Math.round(doneDays / DAYS.length * 100) };
  }
  const currentWeek = () => Math.min(16, Math.max(1, Math.floor(indexOf(today()) / 7) + 1));
  const clampIndex = i => Math.min(DAYS.length - 1, Math.max(0, i));

  // ---------- Routing ----------
  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h === "plan") return { view: "plan" };
    if (h === "reference") return { view: "ref" };
    if (h === "jobs") return { view: "jobs" };
    const m = h.match(/^day=(w\d+-[a-z]{3})$/);
    const d = m && DAYS.find(x => x.id === m[1]);
    if (d) return { view: "day", index: d.index };
    return { view: "day", index: clampIndex(indexOf(today())), isToday: true };
  }

  // ---------- Rendering ----------
  const bar = (n, total, ok) => `<div class="bar${ok ? " ok" : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${n}"><i style="width:${total ? (n / total * 100).toFixed(1) : 0}%"></i></div>`;
  const checkBtn = (id, label, allow) => {
    const done = isDone(id), text = `${done ? "Mark not done" : "Mark done"}: ${label}`;
    return `<button type="button" class="check" data-toggle="${id}" aria-pressed="${done}" aria-label="${esc(text)}" title="${esc(text)}"${allow ? "" : " disabled"}>${CHECK}</button>`;
  };
  const link = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>`;

  function syncText() {
    const u = user() || {};
    return {
      loading: "Loading your progress…",
      saving: "Saving…",
      saved: `✓ Saved to your account${u.email ? ` (${esc(u.email)})` : ""}`,
      error: "Couldn't reach your account. Changes are kept on this device and will be retried.",
    }[sync] || "";
  }
  function renderSync() {
    const el = root.querySelector(".ip-sync");
    if (el) { el.innerHTML = enrolled() ? syncText() : ""; el.classList.toggle("err", sync === "error"); }
  }

  function tabsHtml(view) {
    const tab = (href, name, label) => `<a href="${href}" class="ip-tab"${view === name ? ' aria-current="page"' : ""}>${label}</a>`;
    return `<nav class="ip-tabs" aria-label="Plan views">${tab("#today", "day", "Today")}${tab("#plan", "plan", "Full plan")}${tab("#reference", "ref", "Reference")}${tab("#jobs", "jobs", "Job tracker")}</nav>`;
  }

  // ----- Day view (the default "Today" screen) -----
  function dayView(i, t, allow, isTodayRoute) {
    const d = DAYS[i], g = CONTENT[d.id], w = P.weeks[d.week - 1], done = isDone(d.id);
    const prev = DAYS[i - 1], next = DAYS[i + 1];
    const isToday = i === t;
    const rel = isToday ? "Today" : i === t + 1 ? "Tomorrow" : i === t - 1 ? "Yesterday" : i < t ? `${t - i} days ago` : `In ${i - t} days`;
    const s = stats();
    let html = "";

    if (isTodayRoute && t < 0) html += `<div class="ip-note">The plan starts on ${fmt(start)}. Here's day 1 so you can get ready.</div>`;
    if (isTodayRoute && t >= DAYS.length) html += `<div class="ip-card ip-today is-done"><p class="eyebrow">Plan finished</p><p class="task">You completed ${s.doneDays} of ${DAYS.length} days.${s.missed ? " Days you missed can still be marked in the full plan." : " Every single day. Celebrate! 🎉"}</p></div>`;

    html += `<div class="ip-dayhead">
      <div class="ip-daynav">
        ${prev ? `<a class="chip-btn" href="#day=${prev.id}" aria-label="Previous day, ${esc(fmt(prev.date))}">‹ Prev</a>` : `<span></span>`}
        ${!isToday && t >= 0 && t < DAYS.length ? `<a class="chip-btn" href="#today">Back to today</a>` : ""}
        ${next ? `<a class="chip-btn" href="#day=${next.id}" aria-label="Next day, ${esc(fmt(next.date))}">Next ›</a>` : `<span></span>`}
      </div>
      <p class="eyebrow">${rel} · Week ${d.week} · Day ${i + 1} of ${DAYS.length}</p>
      <h2>${longDate(d.date)}</h2>
      <p class="ip-muted">${esc(w.title)} · LeetCode: ${esc(w.lc)}</p>
    </div>`;

    if (enrolled()) {
      html += `<div class="ip-strip">
        <span><b>${s.streak}</b> day streak</span>
        <span><b>${s.pct}%</b> of the plan done</span>
        ${s.missed ? `<a href="#day=${s.firstMissed.id}"><b>${s.missed}</b> past day${s.missed === 1 ? "" : "s"} not done: catch up</a>` : `<span>On track ✓</span>`}
      </div>`;
    }

    const dayBtn = `<button type="button" class="btn ${done ? "btn-secondary" : "btn-ok"}" data-toggle="${d.id}" aria-pressed="${done}"${allow ? "" : " disabled"}>${done ? "✓ Day complete · undo" : `${CHECK} Mark day complete`}</button>`;
    const tags = [d.lc && `<span class="tag">LC ×${d.lc}${d.optional ? " · optional" : ""}</span>`, d.hours && `<span class="tag">${d.hours}h</span>`].filter(Boolean).join("");

    if (!g) {
      html += `<section class="ip-card ip-objectives${done ? " is-done" : ""}">
        <div class="ip-card-head"><h3>${isToday ? "Today's objective" : "Objective"}</h3></div>
        <p class="ip-goal">${esc(d.text)}</p>
        ${tags ? `<div class="tags">${tags}</div>` : ""}
        <div class="ip-daydone">${dayBtn}</div>
      </section>
      <p class="ip-note">A detailed guide for this day isn't written yet, so the plan line above is your objective. LeetCode problems for this week's pattern are on the ${link("https://neetcode.io/roadmap", "NeetCode roadmap")}.</p>`;
    } else {
      const objs = g.objectives, n = objs.filter((_, k) => isDone(objId(d.id, k))).length;
      html += `<section class="ip-card ip-objectives${done ? " is-done" : ""}">
        <div class="ip-card-head"><h3>${isToday ? "Today's objectives" : "Objectives"}</h3><span class="count">${n}/${objs.length}</span></div>
        ${bar(n, objs.length, n === objs.length)}
        <p class="ip-goal">${esc(g.goal)}</p>
        <ul class="ip-checklist ip-obj">${objs.map((o, k) => `<li class="${isDone(objId(d.id, k)) ? "done" : ""}">
          ${checkBtn(objId(d.id, k), `objective ${k + 1}`, allow)}
          <div><span>${esc(o.t)}</span>${o.tip ? `<small>${esc(o.tip)}</small>` : ""}</div>
        </li>`).join("")}</ul>
        <div class="ip-daydone">${dayBtn}<small>${tags ? `${tags} ` : ""}Ticking every objective completes the day.</small></div>
      </section>`;

      if (g.leetcode && g.leetcode.length) {
        html += `<section class="ip-card"><h3>LeetCode · ${esc(w.lc)}</h3><ul class="ip-lc">${g.leetcode.map(p => `<li>
          <div>${link(p.url, p.name)} <span class="tag">${esc(p.level)}</span></div>
          <details><summary>Hint</summary><p>${esc(p.hint)}</p></details>
        </li>`).join("")}</ul><p class="ip-muted ip-small">Stuck for more than 25 minutes? Watch the solution, then redo the problem in 3 days.</p></section>`;
      }
      if (g.learn && g.learn.length) {
        html += `<h3 class="ip-section">Learn</h3>${g.learn.map((l, k) => `<details class="ip-card ip-fold"${k === 0 ? " open" : ""}><summary>${esc(l.h)}</summary><div class="ip-prose">${l.html}</div></details>`).join("")}`;
      }
      if (g.code && g.code.length) {
        html += `<h3 class="ip-section">Code</h3>${g.code.map((c, k) => `<details class="ip-card ip-fold ip-code"><summary>${esc(c.title)} <span class="tag">${esc(c.lang)}</span></summary>
          <div class="ip-codewrap"><button type="button" class="chip-btn ip-copy" data-copy="${d.id}:${k}">Copy</button><pre><code>${esc(c.src)}</code></pre></div>
        </details>`).join("")}`;
      }
      if (g.resources && g.resources.length) {
        html += `<section class="ip-card"><h3>Resources</h3><ul class="ip-links">${g.resources.map(r => `<li>${link(r.url, r.t)}</li>`).join("")}</ul></section>`;
      }
      if (g.done) html += `<div class="ip-callout ok"><b>Done when</b><p>${esc(g.done)}</p></div>`;
      if (g.interview) html += `<div class="ip-callout"><b>Interview practice</b><p>${esc(g.interview)}</p></div>`;
    }

    if (next) {
      const ng = CONTENT[next.id];
      html += `<a class="ip-upnext" href="#day=${next.id}"><span class="eyebrow">Up next · ${fmt(next.date)}</span><span>${esc(ng ? ng.goal : next.text)}</span></a>`;
    }
    return html;
  }

  // ----- Full plan view -----
  function dayRow(d, t, allow) {
    const done = isDone(d.id), g = CONTENT[d.id];
    const cls = ["ip-day", done && "done", d.index === t && "today", d.index < t && !done && enrolled() && "missed"].filter(Boolean).join(" ");
    const tags = [];
    if (d.lc) tags.push(`<span class="tag">LC ×${d.lc}${d.optional ? " · optional" : ""}</span>`);
    if (d.hours) tags.push(`<span class="tag">${d.hours}h</span>`);
    if (g) tags.push(`<span class="tag">${g.objectives.filter((_, k) => isDone(objId(d.id, k))).length}/${g.objectives.length} objectives</span>`);
    if (done) { const at = new Date(state.done[d.id]); tags.push(`<span class="tag done">Done${isNaN(at) ? "" : ` ${fmt(at)}`}</span>`); }
    tags.push(`<a class="tag link" href="#day=${d.id}">${g ? "Open guide" : "Open day"} →</a>`);
    return `<li class="${cls}" id="day-${d.id}">
      ${checkBtn(d.id, fmt(d.date), allow)}
      <div>
        <div class="when">${fmt(d.date)}${d.index === t ? ' <span class="tag today">Today</span>' : ""}${d.index < t && !done && enrolled() ? ' <span class="tag missed">Missed</span>' : ""}</div>
        <p class="text">${esc(d.text)}</p>
        <div class="tags">${tags.join("")}</div>
      </div>
    </li>`;
  }

  function weeksHtml(t, allow) {
    const cur = currentWeek();
    if (!openWeeks) openWeeks = new Set([cur]);
    return P.weeks.map((w, wi) => {
      const n = wi + 1, days = DAYS.filter(d => d.week === n), done = days.filter(d => isDone(d.id)).length;
      const cls = ["ip-week", n === cur && t >= 0 && t < DAYS.length && "current", done === 7 && "complete"].filter(Boolean).join(" ");
      return `<details class="${cls}" data-week="${n}"${openWeeks.has(n) ? " open" : ""}>
        <summary>
          <span class="wk-title">Week ${n} · ${esc(w.title)}</span>
          <span class="wk-count">${done === 7 ? "✓ " : ""}${done}/7 ${bar(done, 7, done === 7)}</span>
          <span class="wk-meta">${short(days[0].date)} – ${short(days[6].date)} · ${esc(w.tag)} · LeetCode: ${esc(w.lc)}</span>
        </summary>
        <ul class="ip-days">${days.map(d => dayRow(d, t, allow)).join("")}</ul>
      </details>`;
    }).join("");
  }

  function phasesHtml() {
    return `<div class="ip-phases">${P.phases.map((p, i) => {
      const days = DAYS.filter(d => d.week >= p.from && d.week <= p.to), n = days.filter(d => isDone(d.id)).length;
      const weeks = p.from === p.to ? `Week ${p.from}` : `Weeks ${p.from}–${p.to}`;
      return `<div class="ip-phase">
        <span class="name">${i + 1}. ${esc(p.name)} <small>· ${weeks}</small></span>
        <span class="count">${n}/${days.length}</span>
        ${bar(n, days.length, n === days.length)}
        <span class="outcome">${esc(p.outcome)}</span>
      </div>`;
    }).join("")}</div>`;
  }

  function planView(t, allow) {
    const s = stats();
    return `
      <div class="ip-stats">
        <div class="ip-stat"><b>${s.pct}%</b><span>${s.doneDays} of ${DAYS.length} days done</span></div>
        <div class="ip-stat"><b>${t < 0 ? "–" : t >= DAYS.length ? "Done" : `${currentWeek()}/16`}</b><span>Current week</span></div>
        <div class="ip-stat"><b>${s.streak}</b><span>Day streak</span></div>
        <div class="ip-stat${s.missed ? " warn" : ""}"><b>${s.missed}</b><span>Past days not done</span></div>
      </div>
      ${bar(s.doneDays, DAYS.length, s.doneDays === DAYS.length)}
      <div class="ip-card"><h2>Phases</h2>${phasesHtml()}</div>
      <div class="ip-toolbar">
        <h2>Weekly plan</h2>
        ${t >= 0 && t < DAYS.length ? `<button type="button" class="chip-btn" data-act="jump">Jump to today</button>` : ""}
        <button type="button" class="chip-btn" data-act="expand">Expand all</button>
        <button type="button" class="chip-btn" data-act="hide" aria-pressed="${hideDone}">Hide completed</button>
      </div>
      <div class="${hideDone ? "ip-hidden-done" : ""}">${weeksHtml(t, allow)}</div>`;
  }

  // ----- Reference view -----
  function refView(allow) {
    return `
      <div class="ip-card"><h2>How to use this plan</h2><ul>${P.howTo.map(x => `<li>${x}</li>`).join("")}</ul></div>
      <div class="ip-card">
        <h2>H-1B checklist</h2>
        <ul class="ip-checklist">${H1B.map(h => `<li class="${isDone(h.id) ? "done" : ""}">${checkBtn(h.id, "H-1B item", allow)}<span>${esc(h.text)}</span></li>`).join("")}</ul>
      </div>
      <div class="ip-card"><h2>Target companies</h2><dl>${P.targets.map(x => `<dt>${esc(x.tier)}</dt><dd>${esc(x.list)}</dd>`).join("")}</dl></div>
      <div class="ip-card"><h2>Resources</h2><dl>${P.resources.map(x => `<dt>${esc(x.k)}</dt><dd>${esc(x.v)}</dd>`).join("")}</dl></div>
      <div class="ip-card"><h2>Weekly review (every Saturday, 10 min)</h2><ul>${P.review.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
      ${enrolled() ? `<p class="ip-leave">${isNaN(new Date(state.enrolledAt)) ? "" : `Enrolled ${fmt(new Date(state.enrolledAt))}. `}<button type="button" data-act="leave"${busy ? " disabled" : ""}>Leave the plan and delete my progress</button></p>` : ""}`;
  }

  function render() {
    if (!auth || !auth.enabled) {
      root.innerHTML = `<div class="ip-card ip-gate"><h2>Sign-in isn't available here</h2><p>This tracker needs an account, and sign-in isn't configured on this copy of the site.</p></div>`;
      return;
    }
    const u = user();
    if (!u) {
      root.innerHTML = `<div class="ip-card ip-gate">
        <h2>Sign in to open the plan</h2>
        <p>A 16-week plan for landing a Big Tech AI / Forward Deployed Engineer role: AI foundations and portfolio projects, positioning, interview prep, applications, interview loops and offers. Sign in to enroll, see each day's objectives and track your own progress.</p>
        <div class="ip-gate-actions">
          <button type="button" class="btn btn-google" data-act="google"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Continue with Google</button>
          <button type="button" class="btn btn-secondary" data-act="signin">Sign in with email</button>
        </div>
      </div>`;
      return;
    }
    if (!state) {
      root.innerHTML = sync === "loadError"
        ? `<div class="ip-card ip-gate"><h2>Couldn't load your plan</h2><p>Your account couldn't be reached. Check your connection and try again.</p><button type="button" class="btn btn-primary" data-act="retry">Try again</button></div>`
        : `<p class="ip-muted">Loading your plan…</p>`;
      return;
    }

    // Keep focus, the caret, and open code blocks across re-renders
    const ae = document.activeElement && root.contains(document.activeElement) ? document.activeElement : null;
    const focusKeys = ["data-fkey", "data-toggle", "data-act", "data-job-act", "data-job-filter", "data-job-edit", "data-job-status"];
    const focused = ae && focusKeys.map(a => ae.hasAttribute(a) && [a, ae.getAttribute(a)]).find(Boolean);
    const caret = ae && ae.tagName === "INPUT" ? ae.selectionStart : null;
    const openFolds = [...root.querySelectorAll("details.ip-fold")].map(el => el.open);
    const t = indexOf(today());
    const allow = enrolled() && !busy;
    const r = route();

    let html = r.view === "jobs" ? "" : `<p class="ip-sync"></p>`;
    if (!enrolled() && r.view !== "jobs") {
      html += `<div class="ip-card ip-today">
        <p class="eyebrow">Not enrolled yet</p>
        <p class="task">Enroll to start: you'll land on each day's objectives, tick them off as you go, and track your progress by week and phase. Progress is saved to your account (${esc(u.email || u.name)}) and only you can see it. Below is a preview.</p>
        <button type="button" class="btn btn-primary" data-act="enroll"${busy ? " disabled" : ""}>${busy ? "Enrolling…" : "Enroll in this plan"}</button>
      </div>`;
    }
    html += tabsHtml(r.view);
    html += r.view === "plan" ? planView(t, allow) : r.view === "ref" ? refView(allow) : r.view === "jobs" ? JOBS.html() : dayView(r.index, t, allow, r.isToday);

    root.innerHTML = html;
    renderSync();
    const folds = root.querySelectorAll("details.ip-fold");
    if (folds.length === openFolds.length) folds.forEach((el, k) => { el.open = openFolds[k]; });
    if (focused) {
      const el = root.querySelector(`[${focused[0]}="${CSS.escape(focused[1])}"]`);
      if (el) {
        el.focus({ preventScroll: true });
        if (caret != null) try { el.setSelectionRange(caret, caret); } catch (e) {}
      }
    }
  }

  // ---------- Events ----------
  root.addEventListener("click", e => {
    if (JOBS.onClick(e)) return;
    const tgl = e.target.closest("[data-toggle]");
    if (tgl && !tgl.disabled) { toggle(tgl.getAttribute("data-toggle")); return; }
    const copy = e.target.closest("[data-copy]");
    if (copy) {
      const [dayId, k] = copy.getAttribute("data-copy").split(":");
      const src = CONTENT[dayId].code[+k].src;
      const done = ok => { copy.textContent = ok ? "Copied ✓" : "Select and copy"; setTimeout(() => { copy.textContent = "Copy"; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(src).then(() => done(true), () => done(false)); else done(false);
      return;
    }
    const act = e.target.closest("[data-act]");
    if (!act || act.disabled) return;
    switch (act.getAttribute("data-act")) {
      case "signin": auth.signIn(); break;
      case "google": auth.signIn({ provider: "Google" }); break;
      case "retry": pull(); break;
      case "enroll": send({ enroll: true, changes: {} }); break;
      case "leave":
        if (confirm("Leave the plan? This permanently deletes your progress.")) { openWeeks = null; send({ leave: true }); }
        break;
      case "hide": hideDone = !hideDone; ls.set(PREF_HIDE, hideDone); render(); break;
      case "expand": {
        const all = openWeeks && openWeeks.size === P.weeks.length;
        openWeeks = all ? new Set([currentWeek()]) : new Set(P.weeks.map((_, i) => i + 1));
        render();
        act.blur();
        break;
      }
      case "jump": {
        const d = DAYS[indexOf(today())];
        openWeeks.add(d.week);
        if (hideDone && isDone(d.id)) { hideDone = false; ls.set(PREF_HIDE, false); }
        render();
        const row = document.getElementById(`day-${d.id}`);
        if (row) {
          row.scrollIntoView({ block: "center", behavior: reduceMotion() ? "auto" : "smooth" });
          const btn = row.querySelector(".check");
          if (btn) btn.focus({ preventScroll: true });
        }
        break;
      }
    }
  });
  root.addEventListener("change", e => JOBS.onChange(e));
  root.addEventListener("input", e => JOBS.onInput(e));
  // Remember which weeks are open
  root.addEventListener("toggle", e => {
    const w = e.target.closest && e.target.closest("details[data-week]");
    if (!w || !openWeeks) return;
    const n = +w.getAttribute("data-week");
    if (w.open) openWeeks.add(n); else openWeeks.delete(n);
  }, true);
  // Switching view or day: render it and bring its top into view
  window.addEventListener("hashchange", () => {
    render();
    const top = root.querySelector(".ip-tabs");
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: "start", behavior: reduceMotion() ? "auto" : "smooth" });
  });

  // ---------- Start / account switches ----------
  function start_() {
    clearTimeout(pushTimer); clearTimeout(retryTimer);
    const u = user();
    userSub = u ? u.sub : null;
    dropOtherCaches(userSub); // never leave someone else's plan on a shared device
    JOBS.reset(userSub);
    state = null; pending = {}; sync = "idle"; openWeeks = null;
    if (u) {
      const cached = ls.get(CACHE + userSub);
      if (cached && cached.state) { state = normalize(cached.state); pending = cached.pending || {}; }
      render();
      pull();
    } else {
      render();
    }
  }
  JOBS.init({ auth, esc, rerender: () => render(), targets: P.targets });
  window.addEventListener("siteauth:change", () => { if ((user() || {}).sub !== userSub) start_(); });
  // Retry unsaved changes when the connection comes back
  window.addEventListener("online", () => { if (Object.keys(pending).length) schedulePush(0); });
  start_();
})();
