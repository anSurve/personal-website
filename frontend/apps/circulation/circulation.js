// Circulation viewer: BodyParts3D arteries, veins, heart, glands and organs in
// three.js, plus step-by-step hormone routes (routes.js). The skeleton outline
// reuses the anatomy app's bones.glb, built in the same coordinate frame.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const pretty = n => cap(n.replace(/^set of /, "").replace(/hepatovenous segment (\w+)$/, (_, s) => "Liver segment " + s.toUpperCase()));

const REGION_ORDER = ["Heart", "Great vessels", "Brain", "Head & neck", "Lungs", "Thorax", "Liver & gut", "Kidneys & adrenals", "Abdomen", "Pelvis", "Upper limb", "Lower limb"];
const OXY = 0xc62828, DEOXY = 0x3b5bdb;
const KIND = {
  "Artery": { color: OXY, rough: 0.45, label: "Artery" },
  "Pulmonary artery": { color: DEOXY, rough: 0.45, label: "Pulmonary artery" },
  "Vein": { color: DEOXY, rough: 0.5, label: "Vein" },
  "Pulmonary vein": { color: OXY, rough: 0.5, label: "Pulmonary vein" },
  "Portal vein": { color: 0x8e44ad, rough: 0.5, label: "Portal vein" },
  "Heart": { color: 0xc96f6f, rough: 0.55, label: "Heart" },
  "Gland": { color: 0x14b8a6, rough: 0.5, label: "Hormone gland" },
  "Liver": { color: 0x8d5a46, rough: 0.7, label: "Organ", opacity: 0.35 },
  "Kidney": { color: 0x9c4a3c, rough: 0.7, label: "Organ", opacity: 0.45 },
  "Gut": { color: 0xd9a49a, rough: 0.7, label: "Organ", opacity: 0.3 },
  "Brain": { color: 0xd6c4c0, rough: 0.8, label: "Organ", opacity: 0.16 },
};
const HL_COLOR = 0xffd60a;

// ---------- State ----------
let parts = [];
const byId = new Map();
const structures = new Map();       // side-less name -> { key, cat, kind, region, parts[] }
const state = { mode: "both", layers: { heart: true, gland: true, organ: true, skeleton: true }, sel: null, isolated: false, fade: false, route: null };
let selSet = new Set();             // highlighted solid (selection, or current route step)
let routeSet = new Set();           // every part on the active route
let orient = { left: 1, front: 1 };

// ---------- Materials ----------
const mats = {};
function makeMat(color, rough, opacity = 1) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
  m.userData.opacity = opacity;
  return m;
}
for (const [k, v] of Object.entries(KIND)) {
  const hl = makeMat(HL_COLOR, 0.5);
  hl.emissive.set(0x8a6d00); hl.emissiveIntensity = 0.4;
  mats[k] = { base: makeMat(v.color, v.rough, v.opacity || 1), hl };
}
// Heart chambers are coloured by the blood they hold
mats.ChamberRight = { base: makeMat(DEOXY, 0.5, 0.85), hl: mats.Heart.hl };
mats.ChamberLeft = { base: makeMat(OXY, 0.5, 0.85), hl: mats.Heart.hl };
const matKey = p => p.k === "Heart" && /^cavity of right/.test(p.n) ? "ChamberRight" : p.k === "Heart" && /^cavity of left/.test(p.n) ? "ChamberLeft" : p.k;
// Route structures keep their natural colour, drawn solid while everything else fades
for (const m of Object.values(mats)) m.route = new THREE.MeshStandardMaterial({ color: m.base.color, roughness: m.base.roughness, metalness: 0 });
const overlayMat = new THREE.MeshStandardMaterial({ color: HL_COLOR, emissive: 0xb08900, emissiveIntensity: 0.5, roughness: 0.6, transparent: true, opacity: 0.45, depthTest: false, depthWrite: false });
const skeletonMat = new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 0.9, transparent: true, opacity: 0.12, depthWrite: false });

// ---------- Scene ----------
const viewer = $("#viewer");
const loadingEl = $("#loading");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (e) {
  loadingEl.textContent = "Your browser could not start 3D graphics (WebGL), so the model cannot be shown.";
  loadingEl.classList.add("error");
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
viewer.prepend(renderer.domElement);
renderer.domElement.setAttribute("aria-label", "3D model of the circulation");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
scene.add(camera);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8d8475, 1.5));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(1.2, 2.2, 3);
camera.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
fillLight.position.set(-2.5, -0.5, 1);
camera.add(fillLight);
const overlay = new THREE.Group();
scene.add(overlay);
const skeleton = new THREE.Group();
scene.add(skeleton);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.08;
controls.maxDistance = 8;
controls.target.set(0, 0.86, 0);

function resize() {
  const w = viewer.clientWidth, h = viewer.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewer);
resize();

let fly = null;
function flyTo(target, position, ms = 650) {
  fly = { t0: performance.now(), ms, fromT: controls.target.clone(), toT: target.clone(), fromP: camera.position.clone(), toP: position.clone() };
}
renderer.setAnimationLoop(now => {
  if (fly) {
    const k = Math.min(1, (now - fly.t0) / fly.ms), e = 1 - Math.pow(1 - k, 3);
    controls.target.lerpVectors(fly.fromT, fly.toT, e);
    camera.position.lerpVectors(fly.fromP, fly.toP, e);
    if (k === 1) fly = null;
  }
  controls.update();
  renderer.render(scene, camera);
});

function bodyDistance() {
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const byHeight = 0.95 / Math.tan(vfov / 2);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  return Math.max(byHeight, 0.42 / Math.tan(hfov / 2));
}
function viewDir(view) {
  const { left, front } = orient;
  return { front: [0, 0, front], back: [0, 0, -front], left: [left, 0, 0], right: [-left, 0, 0] }[view];
}
function setView(view, whole = false) {
  const d = new THREE.Vector3(...viewDir(view));
  const target = whole ? new THREE.Vector3(0, 0.86, 0) : controls.target.clone();
  const dist = whole ? bodyDistance() : camera.position.distanceTo(controls.target);
  flyTo(target, target.clone().addScaledVector(d, dist));
}

// ---------- Visibility & materials ----------
function inMode(p) {
  if (p.c === "artery") return state.mode !== "veins";
  if (p.c === "vein") return state.mode !== "arteries";
  return state.layers[p.c];
}
function applyScene() {
  const routing = !!state.route;
  const fade = routing || (state.fade && selSet.size > 0 && !state.isolated);
  for (const { base } of Object.values(mats)) {
    const opacity = fade ? Math.min(0.08, base.userData.opacity) : base.userData.opacity;
    const t = opacity < 1;
    if (base.transparent !== t || base.opacity !== opacity) {
      base.transparent = t; base.opacity = opacity; base.depthWrite = !t; base.needsUpdate = true;
    }
  }
  overlay.clear();
  for (const p of parts) {
    if (!p.mesh) continue;
    const sel = selSet.has(p.id), onRoute = routeSet.has(p.id);
    p.mesh.visible = state.isolated ? sel : (sel || onRoute || inMode(p));
    p.mesh.material = sel ? mats[matKey(p)].hl : onRoute ? mats[matKey(p)].route : mats[matKey(p)].base;
    if (sel && p.mesh.visible && !state.isolated) {
      const ghost = new THREE.Mesh(p.mesh.geometry, overlayMat);
      ghost.matrixAutoUpdate = false;
      ghost.matrix.copy(p.mesh.matrixWorld);
      ghost.renderOrder = 10;
      ghost.raycast = () => {};
      overlay.add(ghost);
    }
  }
  skeleton.visible = state.layers.skeleton && !state.isolated;
  $("#showAll").hidden = !state.isolated;
}

// ---------- Selection ----------
function partsFor(sel) {
  const st = structures.get(sel.key);
  if (!st) return [];
  return st.parts.filter(p => !sel.side || p.s === sel.side || !p.s);
}
function select(key, side = "", { focus = true } = {}) {
  if (!structures.has(key)) return;
  state.route = null; routeSet = new Set();
  state.sel = { key, side };
  selSet = new Set(partsFor(state.sel).map(p => p.id));
  if (!state.isolated && !partsFor(state.sel).some(inMode)) {
    const p0 = structures.get(key).parts[0];
    if (p0.c === "artery" || p0.c === "vein") setMode("both", false);
    else { state.layers[p0.c] = true; syncLayerInputs(); }
  }
  applyScene(); renderDetail(); markLists();
  setHash(encodeURIComponent(key) + (side ? "~" + side : ""));
  if (focus) focusOn(selSet);
}
function clearSelection() {
  state.sel = null; state.route = null; selSet = new Set(); routeSet = new Set(); state.isolated = false;
  applyScene(); renderDetail(); markLists();
  setHash("");
}
function setHash(h) {
  try { history.replaceState(null, "", h ? "#" + h : location.pathname + location.search); } catch (e) {}
}
function focusOn(ids, minDist = 0.18) {
  const box = new THREE.Box3();
  for (const id of ids) { const m = byId.get(id).mesh; if (m) box.expandByObject(m); }
  if (box.isEmpty()) return;
  const centre = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()).length();
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const dist = Math.min(Math.max(size / Math.tan(vfov / 2) * 0.75, minDist), bodyDistance());
  const dir = camera.position.clone().sub(controls.target).normalize();
  flyTo(centre, centre.clone().addScaledVector(dir, dist));
}

// ---------- Hormone routes ----------
function idsFor(ref) {
  const [b, side] = ref.split("~");
  const st = structures.get(b);
  return st ? st.parts.filter(p => !side || p.s === side).map(p => p.id) : [];
}
function startRoute(id, step = 0) {
  const r = ROUTES.find(x => x.id === id);
  if (!r) return;
  state.sel = null; state.isolated = false;
  state.route = { id, step: Math.max(0, Math.min(step, r.steps.length - 1)) };
  routeSet = new Set(r.steps.flatMap(s => s.parts.flatMap(idsFor)));
  showRouteStep();
  if (!$("#paneRoutes").hidden) markLists(); else switchTab("routes");
}
function showRouteStep() {
  const r = ROUTES.find(x => x.id === state.route.id), s = r.steps[state.route.step];
  selSet = new Set(s.parts.flatMap(idsFor));
  applyScene(); renderDetail(); markLists();
  setHash("route=" + r.id + "~" + (state.route.step + 1));
  focusOn(selSet, 0.3);
}

// ---------- Detail panel ----------
function renderDetail() {
  const box = $("#detail");
  if (state.route) return renderRoute(box);
  if (!state.sel) {
    box.innerHTML = `<div class="placeholder"><h2>Pick a vessel</h2><p>Click any artery, vein or organ on the model, or choose one of the ${structures.size} structures from the list. Or open <b>Hormone routes</b> to follow a hormone from its gland to its target.</p></div>`;
    return;
  }
  const { key, side } = state.sel, st = structures.get(key), p0 = st.parts[0];
  const info = lookupInfo(p0);
  const sides = [...new Set(st.parts.map(p => p.s).filter(Boolean))];
  const sideLabel = side ? cap(side) + " side" : sides.length === 2 ? "Left & right" : sides.length ? cap(sides[0]) : "Midline";
  const isArtery = p0.c === "artery", isVein = p0.c === "vein";
  const labels = p0.k === "Gland" ? ["Blood supply", "Drains into"]
    : p0.c === "heart" ? ["Receives", "Sends blood to"]
    : p0.c === "organ" ? ["Blood supply", "Drains into"]
    : isArtery ? ["Arises from", "Supplies"] : ["Drains", "Empties into"];
  const blood = p0.k === "Pulmonary artery" ? "Carries oxygen-poor blood, so it is shown blue even though it is an artery."
    : p0.k === "Pulmonary vein" ? "Carries oxygen-rich blood, so it is shown red even though it is a vein."
    : p0.k === "Portal vein" ? "Part of the hepatic portal system: carries nutrient- and hormone-rich blood from the gut and pancreas to the liver." : "";
  const routes = ROUTES.filter(r => r.steps.some(s => s.parts.some(ref => ref.split("~")[0] === key)));
  const sideBtns = sides.length === 2 ? (side
    ? `<button type="button" data-act="other">${cap(side === "left" ? "right" : "left")} side</button><button type="button" data-act="both">Both sides</button>`
    : `<button type="button" data-act="left">Left only</button><button type="button" data-act="right">Right only</button>`) : "";

  box.innerHTML = `
    <div><h2>${esc(pretty(key))}</h2></div>
    <div class="pills">
      <span class="pill"><i class="dot" style="background:#${mats[matKey(p0)].base.color.getHexString()}"></i>${esc(KIND[p0.k].label)}</span>
      <span class="pill">${esc(st.region)}</span>
      <span class="pill">${sideLabel}</span>
    </div>
    ${info ? `<p class="desc">${esc(info.desc)}</p>` : ""}
    ${info && info.hormones ? `<div class="hormones"><b>Hormones released</b>${esc(info.hormones)}</div>` : ""}
    ${blood ? `<p class="sub">${esc(blood)}</p>` : ""}
    ${info ? `<dl class="facts">
      <div><dt>${labels[0]}</dt><dd>${esc(info.inflow)}</dd></div>
      <div><dt>${labels[1]}</dt><dd>${esc(info.outflow)}</dd></div>
    </dl>` : ""}
    ${info && info.note ? `<div class="note"><b>Did you know</b>${esc(info.note)}</div>` : ""}
    ${routes.length ? `<div><span class="eyebrow">Hormone routes through here</span><div class="chips">${routes.map(r => `<button type="button" data-route="${r.id}">${esc(r.title)}</button>`).join("")}</div></div>` : ""}
    <div class="actions">
      <button type="button" data-act="focus">Zoom to it</button>
      <button type="button" data-act="fade" aria-pressed="${state.fade}"${state.isolated ? " disabled" : ""}>${state.fade ? "Unfade the rest" : "Fade the rest"}</button>
      <button type="button" data-act="isolate">${state.isolated ? "Show everything" : "Show only this"}</button>
      ${sideBtns}
      <button type="button" data-act="clear">Clear</button>
    </div>`;
  box.querySelectorAll("[data-route]").forEach(b => b.addEventListener("click", () => startRoute(b.dataset.route)));
  box.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
    const act = b.dataset.act;
    if (act === "focus") focusOn(selSet);
    else if (act === "fade") { state.fade = !state.fade; applyScene(); renderDetail(); }
    else if (act === "isolate") { state.isolated = !state.isolated; applyScene(); renderDetail(); if (state.isolated) focusOn(selSet); }
    else if (act === "clear") clearSelection();
    else if (act === "both") select(key, "", { focus: false });
    else if (act === "left" || act === "right") select(key, act);
    else if (act === "other") select(key, side === "left" ? "right" : "left");
  }));
}
function renderRoute(box) {
  const r = ROUTES.find(x => x.id === state.route.id), i = state.route.step, s = r.steps[i];
  box.innerHTML = `
    <div><h2>${esc(r.title)}</h2><p class="sub">From the ${esc(r.gland.toLowerCase())}</p></div>
    <p class="desc">${esc(r.summary)}</p>
    <div class="stepper">
      <span class="count">Step ${i + 1} of ${r.steps.length}</span>
      <button type="button" data-step="${i - 1}"${i === 0 ? " disabled" : ""}>&larr; Back</button>
      <button type="button" data-step="${i + 1}"${i === r.steps.length - 1 ? " disabled" : ""}>Next &rarr;</button>
    </div>
    <div class="note"><b>${esc(s.label)}</b>${esc(s.text)}</div>
    <ol class="steps">${r.steps.map((x, j) => `<li class="${j < i ? "done" : ""}"><button type="button" data-step="${j}"${j === i ? ' aria-current="step"' : ""}>${esc(x.label)}</button></li>`).join("")}</ol>
    <div class="actions"><button type="button" data-act="whole">See whole route</button><button type="button" data-act="exit">Exit route</button></div>`;
  box.querySelectorAll(".stepper button, .steps button").forEach(b => b.addEventListener("click", () => { state.route.step = +b.dataset.step; showRouteStep(); }));
  box.querySelector('[data-act="whole"]').addEventListener("click", () => focusOn(routeSet, 0.5));
  box.querySelector('[data-act="exit"]').addEventListener("click", clearSelection);
  // keep the stepper usable on keyboards with arrow keys
  box.querySelector(".stepper [data-step]:not([disabled])")?.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight");
}

// ---------- Lists ----------
function visibleStructures() {
  return [...structures.values()].filter(st => st.parts.some(inMode));
}
function renderList() {
  const q = $("#search").value.trim().toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  const wasOpen = new Set([...document.querySelectorAll("#browse details[open]")].map(d => d.dataset.region));
  const byRegion = new Map(REGION_ORDER.map(r => [r, []]));
  for (const st of visibleStructures()) {
    const name = pretty(st.key).toLowerCase();
    if (terms.length && !terms.every(t => name.includes(t))) continue;
    (byRegion.get(st.region) || byRegion.set(st.region, []).get(st.region)).push(st);
  }
  let html = "";
  for (const [region, list] of byRegion) {
    if (!list.length) continue;
    list.sort((a, b) => a.key.localeCompare(b.key));
    const open = terms.length || wasOpen.has(region) || (state.sel && structures.get(state.sel.key).region === region);
    html += `<details data-region="${esc(region)}"${open ? " open" : ""}><summary>${esc(region)}<span class="ct">${list.length}</span></summary><ul>${
      list.map(st => `<li><button type="button" data-key="${esc(st.key)}"><i class="dot" style="background:#${mats[matKey(st.parts[0])].base.color.getHexString()}"></i>${esc(pretty(st.key))}</button></li>`).join("")
    }</ul></details>`;
  }
  $("#browse").innerHTML = html || `<p class="empty">Nothing matches “${esc(q)}”.</p>`;
  markLists();
}
function renderRoutes() {
  $("#routeList").innerHTML = ROUTES.map(r => `<button type="button" data-route="${r.id}"><b>${esc(r.title)}</b><span>${esc(r.gland)}</span></button>`).join("");
}
function markLists() {
  document.querySelectorAll("#browse [data-key]").forEach(b => b.setAttribute("aria-current", String(!!state.sel && b.dataset.key === state.sel.key)));
  document.querySelectorAll("#routeList [data-route]").forEach(b => b.setAttribute("aria-current", String(!!state.route && b.dataset.route === state.route.id)));
}
$("#browse").addEventListener("click", e => { const b = e.target.closest("[data-key]"); if (b) select(b.dataset.key, ""); });
$("#routeList").addEventListener("click", e => { const b = e.target.closest("[data-route]"); if (b) startRoute(b.dataset.route); });
$("#search").addEventListener("input", renderList);
$("#search").addEventListener("keydown", e => { if (e.key === "Enter") { const first = $("#browse [data-key]"); if (first) select(first.dataset.key, ""); } });

function switchTab(which) {
  const routes = which === "routes";
  $("#tabExplore").setAttribute("aria-selected", String(!routes));
  $("#tabRoutes").setAttribute("aria-selected", String(routes));
  $("#paneExplore").hidden = routes;
  $("#paneRoutes").hidden = !routes;
  markLists();
}
$("#tabExplore").addEventListener("click", () => switchTab("explore"));
$("#tabRoutes").addEventListener("click", () => switchTab("routes"));

// ---------- Mode, layers & controls ----------
function setMode(mode, rerender = true) {
  state.mode = mode;
  document.querySelectorAll(".seg [data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  if (rerender) { applyScene(); renderList(); }
}
function syncLayerInputs() {
  document.querySelectorAll("[data-layer]").forEach(i => { i.checked = state.layers[i.dataset.layer]; });
  renderList();
}
document.querySelectorAll(".seg [data-mode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
document.querySelectorAll("[data-layer]").forEach(i => i.addEventListener("change", () => { state.layers[i.dataset.layer] = i.checked; applyScene(); renderList(); }));
document.querySelectorAll(".views [data-view]").forEach(b => b.addEventListener("click", () => setView(b.dataset.view, !state.sel && !state.route)));
$("#showAll").addEventListener("click", () => { state.isolated = false; applyScene(); renderDetail(); setView("front", true); });
document.addEventListener("keydown", e => {
  if (document.activeElement.tagName === "INPUT") return;
  if (e.key === "Escape" && (state.sel || state.route)) clearSelection();
  if (state.route && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    const r = ROUTES.find(x => x.id === state.route.id), n = state.route.step + (e.key === "ArrowRight" ? 1 : -1);
    if (n >= 0 && n < r.steps.length) { state.route.step = n; showRouteStep(); }
  }
});

// ---------- Picking ----------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pickables = [];
function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(pickables.filter(m => m.visible), false);
  if (!hits.length) return null;
  const solid = hits.find(h => !h.object.material.transparent);
  return (solid || hits[0]).object.userData.part;
}
const hoverLabel = $("#hoverLabel");
let down = null, hoverQueued = null;
renderer.domElement.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; hoverLabel.hidden = true; });
renderer.domElement.addEventListener("pointerup", e => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), quick = performance.now() - down.t < 600;
  down = null;
  if (moved > 6 || !quick) return;
  const p = pick(e);
  if (p) select(p.b, p.s, { focus: false });
  else if (!state.isolated && !state.route) clearSelection();
});
renderer.domElement.addEventListener("pointermove", e => {
  if (down || e.pointerType === "touch") return;
  if (hoverQueued) { hoverQueued = e; return; }
  hoverQueued = e;
  requestAnimationFrame(() => {
    const ev = hoverQueued; hoverQueued = null;
    const p = pick(ev);
    viewer.classList.toggle("hovering", !!p);
    if (!p) { hoverLabel.hidden = true; return; }
    const r = viewer.getBoundingClientRect();
    hoverLabel.textContent = pretty(p.n);
    hoverLabel.style.left = (ev.clientX - r.left) + "px";
    hoverLabel.style.top = (ev.clientY - r.top) + "px";
    hoverLabel.hidden = false;
  });
});
renderer.domElement.addEventListener("pointerleave", () => { hoverLabel.hidden = true; viewer.classList.remove("hovering"); });

// ---------- Load ----------
function centreOf(name) {
  const p = parts.find(q => q.n === name);
  return p && p.mesh ? new THREE.Box3().setFromObject(p.mesh).getCenter(new THREE.Vector3()) : null;
}
async function load() {
  parts = await (await fetch("parts.json")).json();
  for (const p of parts) {
    byId.set(p.id, p);
    if (!structures.has(p.b)) structures.set(p.b, { key: p.b, cat: p.c, kind: p.k, region: p.r, parts: [] });
    structures.get(p.b).parts.push(p);
  }
  renderList(); renderRoutes(); renderDetail();

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const files = ["models/arteries.glb", "models/veins.glb", "models/organs.glb", "../anatomy/models/bones.glb"];
  const progress = files.map(() => 0);
  const show = () => { loadingEl.textContent = `Loading 3D model… ${Math.round(progress.reduce((a, b) => a + b, 0) / files.length * 100)}%`; };
  const gltfs = await Promise.all(files.map((url, i) => loader.loadAsync(url, ev => { if (ev.total) { progress[i] = ev.loaded / ev.total; show(); } })));
  gltfs.forEach((gltf, i) => {
    const isSkeleton = i === files.length - 1;
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      if (isSkeleton) { o.material = skeletonMat; o.raycast = () => {}; return; }
      const p = byId.get(o.name) || byId.get(o.parent && o.parent.name);
      if (!p) return;
      o.userData.part = p;
      p.mesh = o;
      pickables.push(o);
    });
    (isSkeleton ? skeleton : scene).add(gltf.scene);
  });
  scene.updateMatrixWorld(true);

  const lk = centreOf("left kidney"), rk = centreOf("right kidney"), heart = centreOf("cavity of left ventricle"), aorta = centreOf("descending thoracic aorta");
  if (lk && rk) orient.left = Math.sign(lk.x - rk.x) || 1;
  if (heart && aorta) orient.front = Math.sign(heart.z - aorta.z) || 1;

  loadingEl.hidden = true;
  applyScene();
  camera.position.set(0, 0.86, 0).addScaledVector(new THREE.Vector3(...viewDir("front")), bodyDistance());
  controls.update();
  applyHash();
  window.addEventListener("hashchange", applyHash);
}
// #<structure>~<side>  or  #route=<id>~<step>
function applyHash() {
  if (location.hash.length <= 1) return;
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith("route=")) {
    const [id, step = "1"] = h.slice(6).split("~");
    startRoute(id, (+step || 1) - 1);
    return;
  }
  const [key, side = ""] = h.split("~");
  if (structures.has(key)) select(key, side);
}
load().catch(err => {
  console.error(err);
  loadingEl.hidden = false;
  loadingEl.textContent = "The 3D model could not be loaded. Check your connection and reload the page.";
  loadingEl.classList.add("error");
});
