"""Turn BodyParts3D OBJ files into two web-ready GLBs (bones, muscles).

usage: build_meshes.py <zip> <catalog.json> <outdir> [ratio_bone] [ratio_muscle]

One glTF node per catalog part, named by its FMA id, holding all of that part's
element meshes merged. Meshes are simplified (quadric decimation) and moved to
Y-up metres, centred on the feet. Compression happens afterwards with
gltf-transform (meshopt).
"""
import sys, json, zipfile, io, re
import numpy as np
import fast_simplification
import trimesh

ZIP, CATALOG, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
RATIO = {"bone": float(sys.argv[4]) if len(sys.argv) > 4 else 0.25,
         "muscle": float(sys.argv[5]) if len(sys.argv) > 5 else 0.25}
MIN_FACES = 150  # tiny parts (ossicles, phalanges) keep enough shape

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
    reduction = 1 - target / len(f)
    vo, fo = fast_simplification.simplify(v.astype(np.float32), f.astype(np.int32), target_reduction=reduction)
    return vo.astype(np.float64), fo.astype(np.int64)

meshes = {"bone": [], "muscle": []}
stats = {"bone": [0, 0], "muscle": [0, 0]}
missing = []
for p in parts:
    vs, fs, off = [], [], 0
    for e in p["elements"]:
        if e not in by_name:
            missing.append(e); continue
        v, f = read_obj(zf.read(by_name[e]))
        if not len(f):
            continue
        stats[p["cat"]][0] += len(f)
        v, f = simplify(v, f, RATIO[p["cat"]])
        vs.append(v); fs.append(f + off); off += len(v)
    if not vs:
        continue
    V, F = np.vstack(vs), np.vstack(fs)
    stats[p["cat"]][1] += len(F)
    meshes[p["cat"]].append((p["id"], V, F))

# Shared transform for both files: BodyParts3D is Z-up in mm -> glTF Y-up metres, feet at y=0, centred in x/z.
allv = np.vstack([V for cat in meshes.values() for _, V, _ in cat])
lo, hi = allv.min(0), allv.max(0)
print("raw bounds (mm):", lo.round(1), hi.round(1))
centre = (lo + hi) / 2

def to_gltf(V):
    x, y, z = (V - [centre[0], centre[1], lo[2]]).T / 1000.0
    return np.column_stack([x, z, -y])  # Z-up -> Y-up; BP3D's -Y is anterior, which becomes +Z (facing the camera)

for cat, items in meshes.items():
    scene = trimesh.Scene()
    for pid, V, F in items:
        m = trimesh.Trimesh(vertices=to_gltf(V), faces=F, process=True)
        scene.add_geometry(m, node_name=pid, geom_name=pid)
    scene.export(f"{OUT}/{cat}s.raw.glb")
    print(f"{cat}: {len(items)} parts, faces {stats[cat][0]} -> {stats[cat][1]}")
if missing:
    print("missing element files:", len(missing), missing[:10])
