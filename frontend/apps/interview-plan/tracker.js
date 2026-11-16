// 16-week interview plan tracker. Signed-in users only: each person enrolls
// and marks days complete; progress lives in their account via
// GET/PUT /progress/fde-plan (backend/src/functions/progress.py), with a
// per-user copy cached on this device so the page opens instantly.
(() => {
  const P = window.FDE_PLAN;
  const auth = window.SiteAuth;
  const APP = "fde-plan";
  const CACHE = "fde-plan:"; // + user id
  const PREF_HIDE = "fde-plan-hide-done";
  const DAY_IDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  const root = document.getElementById("app");
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  // ---------- Plan days ----------
  const start = new Date(P.start[0], P.start[1], P.start[2]);
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); // DST-safe
  const fmt = d => `${DOW[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()}`;
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

  // ---------- State ----------
  let state = null;   // { enrolledAt, done: { id: isoTime } } once loaded
  let pending = {};   // id -> true/false, not yet confirmed by the server
  let sync = "idle";  // idle | loading | saving | saved | error | loadError
  let busy = false;   // enroll / leave in flight
  let inflight = false, pushTimer = null, retryTimer = null;
  let hideDone = !!ls.get(PREF_HIDE);
  let openWeeks = null; // Set of week numbers expanded
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

  function toggle(id) {
    if (!enrolled()) return;
    const v = !isDone(id);
    pending[id] = v;
    if (v) state.done[id] = new Date().toISOString(); else delete state.done[id];
    saveCache();
    render();
    schedulePush();
  }

  // ---------- Derived numbers ----------
  function stats() {
    const t = indexOf(today());
    const doneDays = DAYS.filter(d => isDone(d.id)).length;
    const missed = DAYS.filter(d => d.index < t && !isDone(d.id)).length;
    let streak = 0;
    let i = Math.min(t, DAYS.length - 1);
    if (i >= 0 && i === t && !isDone(DAYS[i].id)) i--; // today not done yet doesn't break the streak
    for (; i >= 0 && isDone(DAYS[i].id); i--) streak++;
    return { t, doneDays, missed, streak, pct: Math.round(doneDays / DAYS.length * 100) };
  }
  const currentWeek = () => Math.min(16, Math.max(1, Math.floor(indexOf(today()) / 7) + 1));

  // ---------- Rendering ----------
  const bar = (n, total, ok) => `<div class="bar${ok ? " ok" : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${n}"><i style="width:${total ? (n / total * 100).toFixed(1) : 0}%"></i></div>`;

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
    if (el) { el.innerHTML = syncText(); el.classList.toggle("err", sync === "error"); }
  }

  function dayRow(d, t, allow) {
    const done = isDone(d.id);
    const cls = ["ip-day", done && "done", d.index === t && "today", d.index < t && !done && enrolled() && "missed"].filter(Boolean).join(" ");
    const tags = [];
    if (d.lc) tags.push(`<span class="tag">LC ×${d.lc}${d.optional ? " · optional" : ""}</span>`);
    if (d.hours) tags.push(`<span class="tag">${d.hours}h</span>`);
    if (done) { const at = new Date(state.done[d.id]); tags.push(`<span class="tag done">Done${isNaN(at) ? "" : ` ${fmt(at)}`}</span>`); }
    const label = `${done ? "Mark not done" : "Mark complete"}: ${fmt(d.date)}`;
    return `<li class="${cls}" id="day-${d.id}">
      <button type="button" class="check" data-toggle="${d.id}" aria-pressed="${done}" aria-label="${esc(label)}" title="${esc(label)}"${allow ? "" : " disabled"}>${CHECK}</button>
      <div>
        <div class="when">${fmt(d.date)}${d.index === t ? ' <span class="tag today">Today</span>' : ""}${d.index < t && !done && enrolled() ? ' <span class="tag missed">Missed</span>' : ""}</div>
        <p class="text">${esc(d.text)}</p>
        ${tags.length ? `<div class="tags">${tags.join("")}</div>` : ""}
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

  function todayHtml(t) {
    if (t < 0) return `<div class="ip-card ip-today"><p class="eyebrow">Coming up</p><p class="task">The plan starts on ${fmt(start)}.</p></div>`;
    if (t >= DAYS.length) {
      const s = stats();
      return `<div class="ip-card ip-today is-done"><p class="eyebrow">Plan finished</p><p class="task">You completed ${s.doneDays} of ${DAYS.length} days.${s.missed ? " Days you missed can still be marked below." : " Every single day. Celebrate! 🎉"}</p></div>`;
    }
    const d = DAYS[t], done = isDone(d.id), w = P.weeks[d.week - 1];
    const extra = [d.lc && `LC ×${d.lc}${d.optional ? " (optional)" : ""}`, d.hours && `${d.hours}h`].filter(Boolean).join(" · ");
    return `<div class="ip-card ip-today${done ? " is-done" : ""}">
      <p class="eyebrow">${done ? "✓ Done today" : "Today"} · ${fmt(d.date)} · Week ${d.week}: ${esc(w.title)}</p>
      <p class="task">${esc(d.text)}${extra ? ` <span class="ip-muted">(${extra})</span>` : ""}</p>
      <button type="button" class="btn ${done ? "btn-secondary" : "btn-ok"}" data-toggle="${d.id}" aria-pressed="${done}">${done ? "Undo: mark not done" : `${CHECK} Mark today complete`}</button>
    </div>`;
  }

  function appendixHtml(allow) {
    return `
      <div class="ip-card">
        <h2>H-1B checklist</h2>
        <ul class="ip-checklist">${H1B.map(h => {
          const done = isDone(h.id), label = done ? "Mark not done" : "Mark done";
          return `<li class="${done ? "done" : ""}"><button type="button" class="check" data-toggle="${h.id}" aria-pressed="${done}" aria-label="${label}" title="${label}"${allow ? "" : " disabled"}>${CHECK}</button><span>${esc(h.text)}</span></li>`;
        }).join("")}</ul>
      </div>
      <div class="ip-card">
        <h2>Target companies</h2>
        <dl>${P.targets.map(x => `<dt>${esc(x.tier)}</dt><dd>${esc(x.list)}</dd>`).join("")}</dl>
      </div>
      <div class="ip-card">
        <h2>Resources</h2>
        <dl>${P.resources.map(x => `<dt>${esc(x.k)}</dt><dd>${esc(x.v)}</dd>`).join("")}</dl>
      </div>
      <div class="ip-card">
        <h2>Weekly review (every Saturday, 10 min)</h2>
        <ul>${P.review.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      </div>`;
  }

  const howToHtml = open => `<details class="ip-card"${open ? " open" : ""}><summary><b>How to use this plan</b></summary><ul>${P.howTo.map(x => `<li>${x}</li>`).join("")}</ul></details>`;

  function render() {
    if (!auth || !auth.enabled) {
      root.innerHTML = `<div class="ip-card ip-gate"><h2>Sign-in isn't available here</h2><p>This tracker needs an account, and sign-in isn't configured on this copy of the site.</p></div>`;
      return;
    }
    const u = user();
    if (!u) {
      root.innerHTML = `<div class="ip-card ip-gate">
        <h2>Sign in to open the plan</h2>
        <p>A 16-week plan for landing a Big Tech AI / Forward Deployed Engineer role: AI foundations and portfolio projects, positioning, interview prep, applications, interview loops and offers. Sign in to enroll and track your own progress day by day.</p>
        <button type="button" class="btn btn-primary" data-act="signin">Sign in</button>
      </div>`;
      return;
    }
    if (!state) {
      root.innerHTML = sync === "loadError"
        ? `<div class="ip-card ip-gate"><h2>Couldn't load your plan</h2><p>Your account couldn't be reached. Check your connection and try again.</p><button type="button" class="btn btn-primary" data-act="retry">Try again</button></div>`
        : `<p class="ip-muted">Loading your plan…</p>`;
      return;
    }

    // Keep focus on the same control across re-renders
    const focused = document.activeElement && root.contains(document.activeElement) ? document.activeElement.getAttribute("data-toggle") || document.activeElement.getAttribute("data-act") : null;
    const t = indexOf(today());
    const allow = enrolled() && !busy;

    let html;
    if (!enrolled()) {
      html = `
        <div class="ip-card ip-today">
          <p class="eyebrow">Not enrolled yet</p>
          <p class="task">Enroll to start tracking: mark each day complete as you finish it, and see your progress by week and phase. Your progress is saved to your account (${esc(u.email || u.name)}) and only you can see it.</p>
          <button type="button" class="btn btn-primary" data-act="enroll"${busy ? " disabled" : ""}>${busy ? "Enrolling…" : "Enroll in this plan"}</button>
        </div>
        ${howToHtml(true)}
        <div class="ip-card"><h2>Phases at a glance</h2>${phasesHtml()}</div>
        <div class="ip-toolbar"><h2>Preview the 16 weeks</h2></div>
        ${weeksHtml(t, false)}
        ${appendixHtml(false)}`;
    } else {
      const s = stats();
      html = `
        <p class="ip-sync"></p>
        ${todayHtml(t)}
        <div class="ip-stats">
          <div class="ip-stat"><b>${s.pct}%</b><span>${s.doneDays} of ${DAYS.length} days done</span></div>
          <div class="ip-stat"><b>${t < 0 ? "–" : t >= DAYS.length ? "Done" : `${currentWeek()}/16`}</b><span>Current week</span></div>
          <div class="ip-stat"><b>${s.streak}</b><span>Day streak</span></div>
          <div class="ip-stat${s.missed ? " warn" : ""}"><b>${s.missed}</b><span>Past days not done</span></div>
        </div>
        ${bar(s.doneDays, DAYS.length, s.doneDays === DAYS.length)}
        <div class="ip-card"><h2>Phases</h2>${phasesHtml()}</div>
        ${howToHtml(false)}
        <div class="ip-toolbar">
          <h2>Weekly plan</h2>
          ${t >= 0 && t < DAYS.length ? `<button type="button" class="chip-btn" data-act="jump">Jump to today</button>` : ""}
          <button type="button" class="chip-btn" data-act="expand">Expand all</button>
          <button type="button" class="chip-btn" data-act="hide" aria-pressed="${hideDone}">Hide completed</button>
        </div>
        <div class="${hideDone ? "ip-hidden-done" : ""}">${weeksHtml(t, allow)}</div>
        ${appendixHtml(allow)}
        <p class="ip-leave">${isNaN(new Date(state.enrolledAt)) ? "" : `Enrolled ${fmt(new Date(state.enrolledAt))}. `}<button type="button" data-act="leave"${busy ? " disabled" : ""}>Leave the plan and delete my progress</button></p>`;
    }
    root.innerHTML = html;
    renderSync();
    if (focused) {
      const el = root.querySelector(`[data-toggle="${focused}"]`) || root.querySelector(`[data-act="${focused}"]`);
      if (el) el.focus({ preventScroll: true });
    }
  }

  // ---------- Events ----------
  root.addEventListener("click", e => {
    const tgl = e.target.closest("[data-toggle]");
    if (tgl && !tgl.disabled) { toggle(tgl.getAttribute("data-toggle")); return; }
    const act = e.target.closest("[data-act]");
    if (!act || act.disabled) return;
    switch (act.getAttribute("data-act")) {
      case "signin": auth.signIn(); break;
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
        const t = indexOf(today()), d = DAYS[t];
        openWeeks.add(d.week);
        if (hideDone && isDone(d.id)) { hideDone = false; ls.set(PREF_HIDE, false); }
        render();
        const row = document.getElementById(`day-${d.id}`);
        if (row) {
          row.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          const btn = row.querySelector(".check");
          if (btn) btn.focus({ preventScroll: true });
        }
        break;
      }
    }
  });
  // Remember which weeks are open
  root.addEventListener("toggle", e => {
    const w = e.target.closest && e.target.closest("details[data-week]");
    if (!w || !openWeeks) return;
    const n = +w.getAttribute("data-week");
    if (w.open) openWeeks.add(n); else openWeeks.delete(n);
  }, true);

  // ---------- Start / account switches ----------
  function start_() {
    clearTimeout(pushTimer); clearTimeout(retryTimer);
    const u = user();
    userSub = u ? u.sub : null;
    dropOtherCaches(userSub); // never leave someone else's plan on a shared device
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
  window.addEventListener("siteauth:change", () => { if ((user() || {}).sub !== userSub) start_(); });
  // Retry unsaved changes when the connection comes back
  window.addEventListener("online", () => { if (Object.keys(pending).length) schedulePush(0); });
  start_();
})();
