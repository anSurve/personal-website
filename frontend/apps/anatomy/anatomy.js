// Human Anatomy viewer: BodyParts3D bones + muscles in three.js.
// Data: parts.json (one entry per mesh/part, keyed by FMA id), models/*.glb
// (one mesh per part, named by FMA id), info.js (lookupInfo, reference text).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const pretty = n => cap(n.replace(/\bsecondary /, "").replace(/\bdisk\b/g, "disc"));

const REGION_ORDER = ["Head", "Neck", "Thorax", "Abdomen", "Back & spine", "Arm & shoulder", "Forearm", "Hand", "Pelvis", "Thigh & hip", "Leg", "Foot"];
const KIND = {
  Bone: { color: 0xe3d6ba, rough: 0.75, dot: "bone" },
  Cartilage: { color: 0xa7c6d0, rough: 0.6, dot: "cart" },
  Tooth: { color: 0xf4f0e6, rough: 0.35, dot: "bone" },
  Muscle: { color: 0xb4473e, rough: 0.55, dot: "muscle" },
  Tendon: { color: 0xd9d0c0, rough: 0.5, dot: "muscle" },
};
const HL_COLOR = 0xf59e0b;
const isMuscleKind = k => k === "Muscle" || k === "Tendon";

// ---------- State ----------
let parts = [];
const byId = new Map();          // FMA id -> part (+ .mesh once loaded)
const structures = new Map();    // structure key (side-less name) -> { key, cat, kind, region, parts[] }
const state = { mode: "both", xray: false, sel: null, isolated: false, fade: false };
let selSet = new Set();
let orient = { left: 1, front: 1 };

// ---------- Materials ----------
const mats = {};
for (const [k, v] of Object.entries(KIND)) {
  const base = new THREE.MeshStandardMaterial({ color: v.color, roughness: v.rough, metalness: 0 });
  const hl = base.clone();
  hl.color.set(HL_COLOR);
  hl.emissive.set(0x7c2d12);
  hl.emissiveIntensity = 0.35;
  mats[k] = { base, hl };
}
// Drawn on top of everything (no depth test) so a selection stays visible through whatever covers it
const overlayMat = new THREE.MeshStandardMaterial({
  color: HL_COLOR, emissive: 0xb45309, emissiveIntensity: 0.5, roughness: 0.6,
  transparent: true, opacity: 0.42, depthTest: false, depthWrite: false,
});

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
renderer.domElement.setAttribute("aria-label", "3D anatomy model");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
scene.add(camera);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8d8475, 1.4));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(1.2, 2.2, 3);
camera.add(keyLight);            // lights ride with the camera so the visible side is always lit
const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
fillLight.position.set(-2.5, -0.5, 1);
camera.add(fillLight);

const overlay = new THREE.Group();
overlay.renderOrder = 10;
scene.add(overlay);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.12;
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

// Smooth camera moves
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

// Whole-body framing distance for the current aspect ratio
function bodyDistance() {
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const byHeight = 0.95 / Math.tan(vfov / 2);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const byWidth = 0.42 / Math.tan(hfov / 2);
  return Math.max(byHeight, byWidth);
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
function inMode(p) { return p.c === "bone" ? state.mode !== "muscles" : state.mode !== "bones"; }
function applyScene() {
  const xray = state.xray && state.mode === "both" && !state.isolated;
  const fade = state.fade && selSet.size > 0 && !state.isolated;
  for (const [k, { base }] of Object.entries(mats)) {
    const opacity = fade ? 0.1 : xray && isMuscleKind(k) ? 0.16 : 1;
    const t = opacity < 1;
    if (base.transparent !== t || base.opacity !== opacity) {
      base.transparent = t; base.opacity = opacity; base.depthWrite = !t; base.needsUpdate = true;
    }
  }
  overlay.clear();
  for (const p of parts) {
    if (!p.mesh) continue;
    p.mesh.visible = state.isolated ? selSet.has(p.id) : inMode(p);
    const sel = selSet.has(p.id);
    p.mesh.material = sel ? mats[p.k].hl : mats[p.k].base;
    // Show-through copy of the selection; unnecessary when nothing else is drawn solid
    if (sel && p.mesh.visible && !state.isolated && !fade) {
      const ghost = new THREE.Mesh(p.mesh.geometry, overlayMat);
      ghost.matrixAutoUpdate = false;
      ghost.matrix.copy(p.mesh.matrixWorld);
      ghost.renderOrder = 10;
      ghost.raycast = () => {};
      overlay.add(ghost);
    }
  }
  $("#showAll").hidden = !state.isolated;
  const xr = $("#xray"), lab = xr.closest(".check");
  xr.disabled = state.mode !== "both";
  lab.classList.toggle("disabled", xr.disabled);
}

// ---------- Selection ----------
function partsFor(sel) {
  const st = structures.get(sel.key);
  if (!st) return [];
  if (sel.only) return st.parts.filter(p => p.id === sel.only);
  return st.parts.filter(p => !sel.side || p.s === sel.side || !p.s);
}
function select(key, side = "", { only = null, focus = true } = {}) {
  const st = structures.get(key);
  if (!st) return;
  state.sel = { key, side, only };
  selSet = new Set(partsFor(state.sel).map(p => p.id));
  // make sure what was picked can be seen
  if (!state.isolated && !partsFor(state.sel).some(inMode)) setMode("both", false);
  applyScene();
  renderDetail();
  markList();
  try { history.replaceState(null, "", "#" + encodeURIComponent(key) + (side ? "~" + side : "") + (only ? "~" + only : "")); } catch (e) {}
  if (focus) focusSelection();
}
function clearSelection() {
  state.sel = null; selSet = new Set();
  if (state.isolated) state.isolated = false;
  applyScene();
  renderDetail();
  markList();
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}
function focusSelection() {
  const box = new THREE.Box3();
  for (const id of selSet) { const m = byId.get(id).mesh; if (m) box.expandByObject(m); }
  if (box.isEmpty()) return;
  const centre = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()).length();
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const dist = Math.min(Math.max(size / Math.tan(vfov / 2) * 0.75, 0.22), bodyDistance());
  const dir = camera.position.clone().sub(controls.target).normalize();
  flyTo(centre, centre.clone().addScaledVector(dir, dist));
}

// ---------- Detail panel ----------
function sidesOf(st) { return [...new Set(st.parts.map(p => p.s).filter(Boolean))]; }
function renderDetail() {
  const box = $("#detail");
  if (!state.sel) {
    const n = structures.size;
    box.innerHTML = `<div class="placeholder"><h2>Pick a structure</h2><p>Click any bone or muscle on the model, or choose one of the ${n} structures from the list, to see where it is, what it connects to and what it does.</p></div>`;
    return;
  }
  const { key, side, only } = state.sel, st = structures.get(key), p0 = st.parts[0];
  const info = lookupInfo({ base: p0.b, whole: p0.w, cat: p0.c, kind: p0.k });
  const sides = sidesOf(st);
  const sideLabel = side ? cap(side) + " side" : sides.length === 2 ? "Left & right" : sides.length ? cap(sides[0]) : "Midline";
  const onlyPart = only && byId.get(only);
  const subParts = [...new Map(st.parts.filter(p => p.w).map(p => [p.b, p])).values()];

  let body = "";
  if (info && p0.c === "muscle") {
    body = `<dl class="facts">
      <div><dt>Origin</dt><dd>${esc(info.origin)}</dd></div>
      <div><dt>Insertion</dt><dd>${esc(info.insertion)}</dd></div>
      <div><dt>Action</dt><dd>${esc(info.action)}</dd></div>
      ${info.nerve && info.nerve !== "—" ? `<div><dt>Nerve supply</dt><dd>${esc(info.nerve)}</dd></div>` : ""}
    </dl>`;
  } else if (info) {
    body = `<p class="desc">${esc(info.desc)}</p><dl class="facts"><div><dt>Connects with</dt><dd>${esc(info.joints)}</dd></div></dl>`;
  } else {
    body = `<p class="desc">A ${p0.k.toLowerCase()} of the ${p0.r.toLowerCase()} region.</p>`;
  }
  const note = info && info.note ? `<div class="note"><b>Did you know</b>${esc(info.note)}</div>` : "";
  const chips = subParts.length ? `<div><span class="eyebrow">Parts in this model</span><div class="chips">
      <button type="button" data-only="" aria-pressed="${!only}">Whole muscle</button>
      ${subParts.map(p => `<button type="button" data-only="${p.b}" aria-pressed="${!!(onlyPart && onlyPart.b === p.b)}">${esc(cap(p.b.replace(" of " + p.w, "")))}</button>`).join("")}
    </div></div>` : "";
  const sideBtns = sides.length === 2 ? (side
    ? `<button type="button" data-act="other">${cap(side === "left" ? "right" : "left")} side</button><button type="button" data-act="both">Both sides</button>`
    : `<button type="button" data-act="left">Left only</button><button type="button" data-act="right">Right only</button>`) : "";

  box.innerHTML = `
    <div>
      <h2>${esc(pretty(key))}</h2>
      ${onlyPart ? `<p class="sub">${esc(pretty(onlyPart.b))}</p>` : ""}
    </div>
    <div class="pills">
      <span class="pill"><i class="dot ${KIND[p0.k].dot}"></i>${p0.k}</span>
      <span class="pill">${esc(st.region)}</span>
      <span class="pill">${sideLabel}</span>
    </div>
    ${body}
    ${note}
    ${chips}
    <div class="actions">
      <button type="button" data-act="focus">Zoom to it</button>
      <button type="button" data-act="fade" aria-pressed="${state.fade}"${state.isolated ? " disabled" : ""}>${state.fade ? "Unfade the rest" : "Fade the rest"}</button>
      <button type="button" data-act="isolate">${state.isolated ? "Show everything" : "Show only this"}</button>
      ${sideBtns}
      <button type="button" data-act="clear">Clear</button>
    </div>`;

  box.querySelectorAll("[data-only]").forEach(b => b.addEventListener("click", () => {
    const want = b.dataset.only;
    const match = want && st.parts.find(p => p.b === want && (!side || p.s === side));
    select(key, match ? match.s : side, { only: match ? match.id : null });
  }));
  box.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
    const act = b.dataset.act;
    if (act === "focus") focusSelection();
    else if (act === "fade") { state.fade = !state.fade; applyScene(); renderDetail(); }
    else if (act === "isolate") { state.isolated = !state.isolated; applyScene(); renderDetail(); if (state.isolated) focusSelection(); }
    else if (act === "clear") clearSelection();
    else if (act === "both") select(key, "", { focus: false });
    else if (act === "left" || act === "right") select(key, act);
    else if (act === "other") {
      const other = side === "left" ? "right" : "left";
      const twin = onlyPart && st.parts.find(p => p.b === onlyPart.b && p.s === other);
      select(key, other, { only: twin ? twin.id : null });
    }
  }));
}

// ---------- Browse list & search ----------
function visibleStructures() {
  return [...structures.values()].filter(st => state.mode === "both" || (state.mode === "bones" ? st.cat === "bone" : st.cat === "muscle"));
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
      list.map(st => `<li><button type="button" data-key="${esc(st.key)}"><i class="dot ${KIND[st.kind].dot}"></i>${esc(pretty(st.key))}</button></li>`).join("")
    }</ul></details>`;
  }
  $("#browse").innerHTML = html || `<p class="empty">No structures match “${esc(q)}”.</p>`;
  markList();
}
function markList() {
  document.querySelectorAll("#browse [data-key]").forEach(b => b.setAttribute("aria-current", String(!!state.sel && b.dataset.key === state.sel.key)));
}
$("#browse").addEventListener("click", e => {
  const b = e.target.closest("[data-key]");
  if (b) select(b.dataset.key, "");
});
$("#search").addEventListener("input", renderList);
$("#search").addEventListener("keydown", e => {
  if (e.key === "Enter") { const first = $("#browse [data-key]"); if (first) select(first.dataset.key, ""); }
});

// ---------- Mode & controls ----------
function setMode(mode, rerender = true) {
  state.mode = mode;
  document.querySelectorAll(".seg [data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  if (state.sel && !partsFor(state.sel).some(inMode) && !state.isolated) { state.sel = null; selSet = new Set(); renderDetail(); }
  try { localStorage.setItem("an-mode", mode); } catch (e) {}
  if (rerender) { applyScene(); renderList(); }
}
document.querySelectorAll(".seg [data-mode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
$("#xray").addEventListener("change", e => { state.xray = e.target.checked; applyScene(); });
document.querySelectorAll(".views [data-view]").forEach(b => b.addEventListener("click", () => setView(b.dataset.view, !state.sel)));
$("#showAll").addEventListener("click", () => { state.isolated = false; applyScene(); renderDetail(); setView("front", true); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && state.sel && document.activeElement.tagName !== "INPUT") clearSelection(); });

// ---------- Picking ----------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let pickables = [];
function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(pickables.filter(m => m.visible), false);
  if (!hits.length) return null;
  // Faded or see-through structures let clicks pass to the solid ones behind them
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
  if (p) {
    const st = structures.get(p.w || p.b);
    // clicking a muscle part selects the whole muscle on that side
    select(st.key, p.s, { focus: false });
  } else if (!state.isolated) clearSelection();
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
    const key = p.w || p.b;
    if (!structures.has(key)) structures.set(key, { key, cat: p.c, kind: p.k, region: p.r, parts: [] });
    structures.get(key).parts.push(p);
  }
  let saved = null;
  try { saved = localStorage.getItem("an-mode"); } catch (e) {}
  if (saved === "bones" || saved === "muscles" || saved === "both") setMode(saved, false);
  renderList();
  renderDetail();

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const files = [["models/bones.glb", "bones"], ["models/muscles.glb", "muscles"]];
  const progress = files.map(() => 0);
  const show = () => { loadingEl.textContent = `Loading 3D model… ${Math.round(progress.reduce((a, b) => a + b, 0) / files.length * 100)}%`; };
  const gltfs = await Promise.all(files.map(([url], i) => loader.loadAsync(url, ev => { if (ev.total) { progress[i] = ev.loaded / ev.total; show(); } })));
  for (const gltf of gltfs) {
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      const p = byId.get(o.name) || byId.get(o.parent && o.parent.name);
      if (!p) return;
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      o.userData.part = p;
      p.mesh = o;
      pickables.push(o);
    });
    scene.add(gltf.scene);
  }
  scene.updateMatrixWorld(true);

  // Work out which way the model faces from its own anatomy, rather than assuming axes
  const lh = centreOf("left humerus"), rh = centreOf("right humerus"), st = centreOf("body of sternum"), tv = centreOf("sixth thoracic vertebra");
  if (lh && rh) orient.left = Math.sign(lh.x - rh.x) || 1;
  if (st && tv) orient.front = Math.sign(st.z - tv.z) || 1;

  loadingEl.hidden = true;
  applyScene();
  const d = bodyDistance();
  camera.position.set(0, 0.86, 0).addScaledVector(new THREE.Vector3(...viewDir("front")), d);
  controls.update();

  applyHash();
  window.addEventListener("hashchange", applyHash);
}
// Deep link: #<structure>~<side>~<part id>
function applyHash() {
  if (location.hash.length <= 1) return;
  const [key, side = "", only = ""] = decodeURIComponent(location.hash.slice(1)).split("~");
  if (structures.has(key)) select(key, side, { only: only || null });
}
load().catch(err => {
  console.error(err);
  loadingEl.hidden = false;
  loadingEl.textContent = "The 3D model could not be loaded. Check your connection and reload the page.";
  loadingEl.classList.add("error");
});
