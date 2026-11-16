// Job-search tracker for the interview plan (the "Job tracker" tab).
// Each signed-in user keeps their own list of jobs, stored via
// GET/PUT /progress/fde-jobs (backend/src/functions/progress.py): PUT sends one
// change at a time ({upsert: job | [jobs]} or {delete: id}) and gets the full
// list back. A per-user copy is cached on this device.
//
// tracker.js owns the page: it calls FDEJobs.html() to draw the tab and
// forwards click / change / input events; FDEJobs calls ctx.rerender() when its
// data changes.
window.FDEJobs = (() => {
  const APP = "fde-jobs";
  const CACHE = "fde-jobs:"; // + user id
  const STATUSES = [
    { id: "planned", label: "Planned" },
    { id: "applied", label: "Applied" },
    { id: "interviewing", label: "Interviewing" },
    { id: "offer", label: "Offer" },
    { id: "rejected", label: "Rejected" },
    { id: "withdrawn", label: "Withdrawn" },
  ];
  const ACTIVE = new Set(["planned", "applied", "interviewing", "offer"]);
  const RANK = { offer: 0, interviewing: 1, applied: 2, planned: 3, rejected: 4, withdrawn: 5 };
  const FILTERS = [
    { id: "active", label: "Active", test: j => ACTIVE.has(j.status) },
    { id: "all", label: "All", test: () => true },
    ...STATUSES.slice(0, 4).map(s => ({ id: s.id, label: s.label, test: j => j.status === s.id })),
    { id: "closed", label: "Closed", test: j => !ACTIVE.has(j.status) },
  ];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let ctx = null;          // { auth, esc, rerender, targets }
  let userSub = null;
  let jobs = null;         // array once loaded
  let sync = "idle";       // idle | loading | saving | saved | error | loadError
  let filter = "active";
  let query = "";
  let dialog = null;
  let queue = Promise.resolve(); // saves run one after another

  const esc = s => ctx.esc(s == null ? "" : s);
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => (b % 36).toString(36)).join("");
  const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const fmtDate = iso => { if (!iso) return ""; const [y, m, d] = iso.split("-").map(Number); return `${MON[m - 1]} ${d}${y !== new Date().getFullYear() ? `, ${y}` : ""}`; };
  const blank = () => ({ id: newId(), company: "", role: "", tier: 2, link: "", nycOffice: "unknown", h1b: "unknown", referral: "", status: "planned", appliedOn: "", nextStep: "", nextDate: "", notes: "" });
  const saveCache = () => { if (userSub && jobs) ls.set(CACHE + userSub, jobs); };

  // ---------- Data ----------
  function init(c) { ctx = c; }

  function reset(sub) {
    userSub = sub;
    jobs = null; sync = "idle";
    // Never leave someone else's job list on a shared device
    try { Object.keys(localStorage).filter(k => k.startsWith(CACHE) && k !== CACHE + sub).forEach(k => ls.del(k)); } catch (e) {}
    if (sub) { const cached = ls.get(CACHE + sub); if (Array.isArray(cached)) jobs = cached; }
    if (dialog && dialog.open) dialog.close();
  }

  async function load() {
    if (!userSub || sync === "loading") return;
    sync = "loading"; ctx.rerender();
    try {
      const res = await ctx.auth.apiFetch(`/progress/${APP}`);
      if (!res.ok) throw new Error(String(res.status));
      jobs = (await res.json()).jobs || [];
      saveCache();
      sync = "saved";
    } catch (e) {
      sync = jobs ? "error" : "loadError";
    }
    ctx.rerender();
  }
  const loaded = () => jobs !== null && sync !== "idle";

  // Apply locally first, then save; on failure reload the server's copy
  function change(body, apply) {
    apply();
    saveCache();
    sync = "saving"; ctx.rerender();
    queue = queue.then(async () => {
      try {
        const res = await ctx.auth.apiFetch(`/progress/${APP}`, { method: "PUT", body: JSON.stringify(body) });
        if (!res.ok) {
          const msg = (await res.json().catch(() => ({}))).message;
          throw new Error(msg || String(res.status));
        }
        jobs = (await res.json()).jobs || [];
        saveCache();
        sync = "saved";
      } catch (e) {
        sync = "error";
        alert(`Couldn't save that change: ${e.message}. Reloading your list.`);
        sync = "idle";
        await load();
      }
      ctx.rerender();
    });
  }
  const upsert = list => change({ upsert: list }, () => {
    for (const job of list) {
      const i = jobs.findIndex(j => j.id === job.id);
      if (i >= 0) jobs[i] = job; else jobs.push(job);
    }
  });
  const remove = id => change({ delete: id }, () => { jobs = jobs.filter(j => j.id !== id); });

  // The plan's Tier 1 and Tier 2 companies, e.g. "Palantir (FDSE, NYC office)"
  function targetJobs() {
    const have = new Set(jobs.map(j => j.company.toLowerCase()));
    const out = [];
    ctx.targets.slice(0, 2).forEach((t, i) => {
      for (const part of t.list.match(/[^,(]+(?:\([^)]*\))?/g) || []) {
        const m = part.trim().match(/^([^(]+?)\s*(?:\(([^)]*)\))?$/);
        if (!m || have.has(m[1].toLowerCase())) continue;
        out.push({ ...blank(), company: m[1], role: m[2] || "", tier: i + 1, nycOffice: /NYC/.test(m[2] || "") ? "yes" : "unknown" });
      }
    });
    return out;
  }

  // ---------- Rendering ----------
  function syncLine() {
    return { loading: "Loading your job list…", saving: "Saving…", saved: "✓ Saved to your account", error: "Couldn't reach your account; showing the copy on this device." }[sync] || "";
  }

  function sorted(list) {
    return [...list].sort((a, b) => RANK[a.status] - RANK[b.status]
      || (a.nextDate || "9999").localeCompare(b.nextDate || "9999")
      || a.company.localeCompare(b.company));
  }
  const matches = j => !query || `${j.company} ${j.role} ${j.referral} ${j.notes} ${j.nextStep}`.toLowerCase().includes(query.toLowerCase());

  function row(j) {
    const today = isoToday();
    const overdue = j.nextDate && j.nextDate <= today && ACTIVE.has(j.status);
    const meta = [
      `Tier ${j.tier}`,
      j.appliedOn && `Applied ${fmtDate(j.appliedOn)}`,
      j.referral && `Referral: ${esc(j.referral)}`,
      j.nycOffice !== "unknown" && `NYC office: ${j.nycOffice}`,
      j.h1b !== "unknown" && `H-1B transfer: ${j.h1b}`,
    ].filter(Boolean).join(" · ");
    const next = j.nextStep || j.nextDate
      ? `<div class="jb-next${overdue ? " overdue" : ""}">${overdue ? "Due: " : "Next: "}${esc(j.nextStep || "Follow up")}${j.nextDate ? ` · ${j.nextDate < today && overdue ? "was due" : "by"} ${fmtDate(j.nextDate)}` : ""}</div>` : "";
    return `<li class="jb-row s-${j.status}" data-job-row="${j.id}">
      <div class="jb-main">
        <div class="jb-title"><b>${esc(j.company)}</b>${j.role ? ` <span>· ${esc(j.role)}</span>` : ""}${j.link ? ` <a href="${esc(j.link)}" target="_blank" rel="noopener" class="jb-link">Posting ↗</a>` : ""}</div>
        <div class="jb-meta">${meta}</div>
        ${next}
        ${j.notes ? `<div class="jb-notes">${esc(j.notes)}</div>` : ""}
      </div>
      <div class="jb-actions">
        <select data-job-status="${j.id}" aria-label="Status for ${esc(j.company)}">${STATUSES.map(s => `<option value="${s.id}"${s.id === j.status ? " selected" : ""}>${s.label}</option>`).join("")}</select>
        <button type="button" class="chip-btn" data-job-edit="${j.id}">Edit</button>
      </div>
    </li>`;
  }

  function html() {
    if (!loaded() && sync !== "loadError") {
      if (sync === "idle") setTimeout(load, 0);
      if (!jobs) return `<p class="ip-muted">Loading your job list…</p>`;
    }
    if (sync === "loadError") {
      return `<div class="ip-card ip-gate"><h2>Couldn't load your job list</h2><p>Your account couldn't be reached. Check your connection and try again.</p><button type="button" class="btn btn-primary" data-job-act="retry">Try again</button></div>`;
    }

    const today = isoToday();
    const now = new Date(), weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const weekIso = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
    const appliedThisWeek = jobs.filter(j => j.appliedOn && j.appliedOn >= weekIso && j.appliedOn <= today).length;
    const due = jobs.filter(j => j.nextDate && j.nextDate <= today && ACTIVE.has(j.status)).length;
    const referrals = jobs.filter(j => j.referral && ACTIVE.has(j.status)).length;
    const count = id => jobs.filter(j => j.status === id).length;
    const targets = targetJobs();

    let html = `<p class="ip-sync jb-sync${sync === "error" ? " err" : ""}">${syncLine()}</p>
      <div class="jb-pipeline">${STATUSES.slice(0, 5).map(s => `<div class="jb-stage s-${s.id}"><b>${count(s.id)}</b><span>${s.label}</span></div>`).join("")}</div>
      <div class="ip-strip">
        <span><b>${appliedThisWeek}</b> applied this week</span>
        ${due ? `<span class="jb-due"><b>${due}</b> follow-up${due === 1 ? "" : "s"} due</span>` : `<span>No follow-ups due</span>`}
        <span><b>${referrals}</b> active with a referral</span>
      </div>
      <div class="jb-toolbar">
        <button type="button" class="btn btn-primary" data-job-act="add">+ Add job</button>
        <input type="search" class="jb-search" placeholder="Search company, role, notes…" aria-label="Search jobs" value="${esc(query)}" data-job-search data-fkey="job-search">
        <button type="button" class="chip-btn" data-job-act="csv"${jobs.length ? "" : " disabled"}>Export CSV</button>
      </div>`;

    if (!jobs.length) {
      return html + `<div class="ip-card ip-gate">
        <h2>No jobs yet</h2>
        <p>Add the roles you're targeting and track each one from planned to offer. Week 8 of the plan builds this list properly; you can start with the companies from the plan.</p>
        <div class="ip-gate-actions">
          ${targets.length ? `<button type="button" class="btn btn-primary" data-job-act="targets">Add the plan's ${targets.length} Tier 1 &amp; 2 companies</button>` : ""}
          <button type="button" class="btn btn-secondary" data-job-act="add">Add a job</button>
        </div>
      </div>`;
    }

    const f = FILTERS.find(x => x.id === filter) || FILTERS[0];
    const shown = sorted(jobs.filter(j => f.test(j) && matches(j)));
    html += `<div class="jb-filters" role="group" aria-label="Filter jobs">${FILTERS.map(x => `<button type="button" class="chip-btn" data-job-filter="${x.id}" aria-pressed="${x.id === filter}">${x.label} <span>${jobs.filter(x.test).length}</span></button>`).join("")}</div>`;
    html += shown.length
      ? `<ul class="jb-list">${shown.map(row).join("")}</ul>`
      : `<p class="ip-note">No jobs match${query ? ` "${esc(query)}"` : ""} in ${esc(f.label.toLowerCase())}.</p>`;
    if (targets.length) html += `<p class="ip-small"><button type="button" class="link-btn" data-job-act="targets">Add the plan's remaining Tier 1 &amp; 2 companies (${targets.length})</button></p>`;
    return html;
  }

  // ---------- Add / edit dialog ----------
  const field = (label, input, wide) => `<label class="jb-field${wide ? " wide" : ""}"><span>${label}</span>${input}</label>`;
  const select = (name, options, value) => `<select name="${name}">${options.map(([v, t]) => `<option value="${v}"${v === value ? " selected" : ""}>${t}</option>`).join("")}</select>`;
  const tri = [["unknown", "Not sure"], ["yes", "Yes"], ["no", "No"]];

  function openDialog(job) {
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "jb-dialog";
      document.body.appendChild(dialog);
      dialog.addEventListener("submit", onSubmit);
      dialog.addEventListener("click", e => {
        if (e.target === dialog) dialog.close(); // click on the backdrop
        const act = e.target.closest("[data-dialog]");
        if (!act) return;
        if (act.dataset.dialog === "cancel") dialog.close();
        if (act.dataset.dialog === "delete") {
          const id = dialog.querySelector("[name=id]").value, name = dialog.querySelector("[name=company]").value;
          if (confirm(`Delete ${name || "this job"}?`)) { dialog.close(); remove(id); }
        }
      });
      // Typing clears a previous validation message
      dialog.addEventListener("input", () => { const el = dialog.querySelector(".jb-error"); if (el) el.hidden = true; });
      // Applying sets the date if it's empty
      dialog.addEventListener("change", e => {
        if (e.target.name === "status" && e.target.value === "applied") {
          const d = dialog.querySelector("[name=appliedOn]");
          if (!d.value) d.value = isoToday();
        }
      });
    }
    const isNew = !jobs.some(j => j.id === job.id);
    dialog.innerHTML = `<form method="dialog" class="jb-form" novalidate>
      <h2>${isNew ? "Add a job" : `Edit ${esc(job.company)}`}</h2>
      <input type="hidden" name="id" value="${esc(job.id)}">
      <div class="jb-grid">
        ${field("Company *", `<input name="company" required maxlength="80" value="${esc(job.company)}" autocomplete="off">`)}
        ${field("Role", `<input name="role" maxlength="120" value="${esc(job.role)}" autocomplete="off">`)}
        ${field("Tier", select("tier", [["1", "1 · Stretch"], ["2", "2 · Best fit"], ["3", "3 · Practice"]], String(job.tier)))}
        ${field("Status", select("status", STATUSES.map(s => [s.id, s.label]), job.status))}
        ${field("Posting link", `<input name="link" type="url" maxlength="500" placeholder="https://…" value="${esc(job.link)}">`, true)}
        ${field("NYC office?", select("nycOffice", tri, job.nycOffice))}
        ${field("H-1B transfer?", select("h1b", tri, job.h1b))}
        ${field("Referral contact", `<input name="referral" maxlength="120" value="${esc(job.referral)}" autocomplete="off">`)}
        ${field("Applied on", `<input name="appliedOn" type="date" value="${esc(job.appliedOn)}">`)}
        ${field("Next step", `<input name="nextStep" maxlength="200" placeholder="e.g. Follow up with recruiter" value="${esc(job.nextStep)}">`)}
        ${field("Next step by", `<input name="nextDate" type="date" value="${esc(job.nextDate)}">`)}
        ${field("Notes", `<textarea name="notes" rows="3" maxlength="2000">${esc(job.notes)}</textarea>`, true)}
      </div>
      <p class="jb-error" role="alert" hidden></p>
      <div class="jb-buttons">
        ${isNew ? "" : `<button type="button" class="jb-delete" data-dialog="delete">Delete</button>`}
        <span></span>
        <button type="button" class="btn btn-secondary" data-dialog="cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">${isNew ? "Add job" : "Save"}</button>
      </div>
    </form>`;
    dialog.showModal();
    dialog.querySelector("[name=company]").focus();
  }

  function onSubmit(e) {
    e.preventDefault();
    const form = e.target, data = Object.fromEntries(new FormData(form));
    const error = msg => { const el = form.querySelector(".jb-error"); el.textContent = msg; el.hidden = false; };
    const job = { ...data, tier: Number(data.tier) };
    for (const k of ["company", "role", "link", "referral", "nextStep", "notes"]) job[k] = (job[k] || "").trim();
    if (!job.company) return error("Add the company name.");
    if (job.link && !/^https?:\/\//.test(job.link)) return error("The posting link should start with https://");
    dialog.close();
    upsert([job]);
  }

  function downloadCsv() {
    const cols = [["company", "Company"], ["tier", "Tier"], ["role", "Role"], ["link", "Link"], ["nycOffice", "NYC office"], ["h1b", "H-1B transfer"], ["referral", "Referral contact"], ["status", "Status"], ["appliedOn", "Applied on"], ["nextStep", "Next step"], ["nextDate", "Next step by"], ["notes", "Notes"]];
    const cell = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const csv = [cols.map(c => cell(c[1])).join(","), ...sorted(jobs).map(j => cols.map(c => cell(j[c[0]])).join(","))].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `job-tracker-${isoToday()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- Events (forwarded by tracker.js) ----------
  function onClick(e) {
    const edit = e.target.closest("[data-job-edit]");
    if (edit) { const j = jobs.find(x => x.id === edit.dataset.jobEdit); if (j) openDialog({ ...j }); return true; }
    const f = e.target.closest("[data-job-filter]");
    if (f) { filter = f.dataset.jobFilter; ctx.rerender(); return true; }
    const act = e.target.closest("[data-job-act]");
    if (!act || act.disabled) return false;
    switch (act.dataset.jobAct) {
      case "add": openDialog(blank()); break;
      case "retry": sync = "idle"; load(); break;
      case "csv": downloadCsv(); break;
      case "targets": { const list = targetJobs(); if (list.length) upsert(list); break; }
    }
    return true;
  }
  function onChange(e) {
    const sel = e.target.closest("[data-job-status]");
    if (!sel) return false;
    const j = jobs.find(x => x.id === sel.dataset.jobStatus);
    if (j && j.status !== sel.value) upsert([{ ...j, status: sel.value, appliedOn: sel.value === "applied" && !j.appliedOn ? isoToday() : j.appliedOn }]);
    return true;
  }
  function onInput(e) {
    if (!e.target.matches("[data-job-search]")) return false;
    query = e.target.value;
    ctx.rerender();
    return true;
  }

  return { init, reset, html, onClick, onChange, onInput };
})();
