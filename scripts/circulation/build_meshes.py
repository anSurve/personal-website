"""Turn the circulation catalog into web GLBs + parts.json.

usage: build_meshes.py <zip> <catalog.json> <outdir> <parts.json out>

Writes <outdir>/{arteries,veins,organs}.raw.glb (compress afterwards with
gltf-transform meshopt). Uses the same transform as scripts/anatomy so the
anatomy app's bones.glb lines up as context. Each part also gets a browsing
region, from its name first and its position second.
"""
import sys, json, zipfile, io, re
import numpy as np
import fast_simplification
import trimesh

ZIP, CATALOG, OUT, PARTS_OUT = sys.argv[1:5]

# Same origin as scripts/anatomy/build_meshes.py (bounds of bones + muscles, mm)
CENTRE_X, CENTRE_Y, FLOOR_Z = 0.0, -108.0, -72.8

RATIO = {"Artery": 0.35, "Pulmonary artery": 0.35, "Vein": 0.35, "Pulmonary vein": 0.35, "Portal vein": 0.35,
         "Heart": 0.3, "Gland": 0.4, "Kidney": 0.2, "Liver": 0.15, "Gut": 0.12, "Brain": 0.1}
MIN_FACES = 120
FILE_OF = {"artery": "arteries", "vein": "veins", "heart": "organs", "gland": "organs", "organ": "organs"}

NAME_REGIONS = [
    ("Great vessels", r"aorta|vena cava|brachiocephalic|pulmonary trunk|azygos"),
    ("Heart", r"vein of (left )?ventricle|marginal vein|coronary|cardiac|interventricular|conus|coronary sinus|marginal branch|ventricular branch|septal branch|diagonal branch"),
    ("Brain", r"cerebr|cerebell|basilar|choroid|pontine|callosomarginal|pericallosal|thalam|frontobasal|prefrontal|parietal artery|temporal artery|temporal branch|occipital artery|precuneal|splenial|sulcus|vermian|communicating artery|hypothalamic|angular gyrus|polar temporal|anterior spinal|paracentral|intermediomedial|posteromedial|ophthalmic"),
    ("Lungs", r"pulmonary|segmental (artery|vein)|lingular|lobar artery|bronchial|segmental vein|part of .*segmental|branch of .*segmental artery|basal branch"),
    ("Kidneys & adrenals", r"renal|suprarenal|adrenal|kidney|ureteric"),
    ("Liver & gut", r"hepat|portal|gastr|pancrea|splenic|mesenteric|colic|ileal|ileocolic|jejun|cecal|appendicular|sigmoid|rectal|celiac|esophag|oesophag|duoden|colon|ileum|caudate|hepatovenous|marginal artery of colon"),
    ("Upper limb", r"brachial|axillary|radial|ulnar|cephalic|basilic|cubital|antebrachial|palmar|digital artery of (?!foot)|interosseous|humeral|carpal|pollicis|radialis indicis|metacarpal|subscapular|circumflex scapular|thoracodorsal|suprascapular|thoraco-acromial|deltoid branch|acromial|pectoral branch"),
    ("Lower limb", r"femoral|genicular|popliteal|tibial|fibular|plantar|of foot|arcuate|tarsal|saphenous|metatarsal"),
    ("Abdomen", r"lumbar|phrenic|subcostal|epigastric"),
    ("Pelvis", r"iliac|gluteal|pudendal|sacral|obturator|penis|testi|epididym|iliolumbar|vesical|prostat"),
]

def region_of(p, centroid):
    n, k = p["name"], p["kind"]
    if k == "Heart": return "Heart"
    if k == "Brain" or n in ("pituitary gland", "pineal body", "hypothalamus"): return "Brain"
    if k in ("Pulmonary artery", "Pulmonary vein"): return "Lungs"
    if k in ("Portal vein", "Liver", "Gut") or "pancreas" in n: return "Liver & gut"
    if k == "Kidney": return "Kidneys & adrenals"
    for label, rx in NAME_REGIONS:
        if re.search(rx, n):
            return label
    x, y = abs(centroid[0]), centroid[1]
    if y > 1.42: return "Head & neck"
    if y < 0.78: return "Lower limb"
    if x > 0.19 and y < 1.42: return "Upper limb"
    if y > 1.08: return "Thorax"
    if y > 0.92: return "Abdomen"
    return "Pelvis"

parts = json.load(open(CATALOG, encoding="utf-8"))
zf = zipfile.ZipFile(ZIP)
by_name = {re.sub(r"^.*/", "", n).replace(".obj", ""): n for n in zf.namelist() if n.endswith(".obj")}

def read_obj(raw):
    v, f = [], []
    for line in io.TextIOWrapper(io.BytesIO(raw), encoding="utf-8", errors="ignore"):
        if line.startswith("v "):
            v.append(line.split()[1:4])
        elif line.startswith("f "):
            idx = [int(t.split("/")[0]) for t in line.split()[1:]]
            for k in range(1, len(idx) - 1):
                f.append((idx[0], idx[k], idx[k + 1]))
    return np.array(v, dtype=np.float64), np.array(f, dtype=np.int64) - 1

def simplify(v, f, ratio):
    target = max(MIN_FACES, int(len(f) * ratio))
    if target >= len(f):
        return v, f
    vo, fo = fast_simplification.simplify(v.astype(np.float32), f.astype(np.int32), target_reduction=1 - target / len(f))
    return vo.astype(np.float64), fo.astype(np.int64)

def to_gltf(V):
    x, y, z = (V - [CENTRE_X, CENTRE_Y, FLOOR_Z]).T / 1000.0
    return np.column_stack([x, z, -y])

scenes = {f: trimesh.Scene() for f in set(FILE_OF.values())}
faces = {f: [0, 0] for f in scenes}
out_parts = []
for p in parts:
    vs, fs, off = [], [], 0
    for e in p["elements"]:
        if e not in by_name:
            continue
        v, f = read_obj(zf.read(by_name[e]))
        if not len(f):
            continue
        fname = FILE_OF[p["cat"]]
        faces[fname][0] += len(f)
        v, f = simplify(v, f, RATIO[p["kind"]])
        vs.append(v); fs.append(f + off); off += len(v)
    if not vs:
        continue
    V, F = to_gltf(np.vstack(vs)), np.vstack(fs)
    fname = FILE_OF[p["cat"]]
    faces[fname][1] += len(F)
    scenes[fname].add_geometry(trimesh.Trimesh(vertices=V, faces=F, process=True), node_name=p["id"], geom_name=p["id"])
    centroid = V.mean(0)
    out_parts.append({"id": p["id"], "n": p["name"], "b": p["base"], "s": p["side"], "c": p["cat"], "k": p["kind"],
                      "r": region_of(p, centroid), "f": fname})

for fname, sc in scenes.items():
    sc.export(f"{OUT}/{fname}.raw.glb")
    print(f"{fname}: faces {faces[fname][0]} -> {faces[fname][1]}")
json.dump(out_parts, open(PARTS_OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
import collections
print(collections.Counter(p["r"] for p in out_parts))
print(len(out_parts), "parts")
