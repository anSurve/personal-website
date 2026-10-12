"""Build the circulation app's parts catalog from BodyParts3D index files.

usage: catalog.py <data-dir> <out catalog.json>

Each selectable part = one leaf FMA concept (e.g. "left renal vein") with its
element mesh files. Categories: artery, vein, heart, gland, organ.
Kinds drive colour: Artery (oxygenated), Pulmonary artery (deoxygenated),
Vein, Pulmonary vein, Portal vein, Heart, Gland, Organ.
"""
import sys, json, re, collections

D, OUT = sys.argv[1], sys.argv[2]

def rows(f):
    with open(f"{D}/{f}", encoding="utf-8") as fh:
        next(fh)
        return [l.rstrip("\n").split("\t") for l in fh if l.strip()]

names = {r[0]: r[2] for r in rows("isa_parts_list_e.txt")}
for r in rows("partof_parts_list_e.txt"):
    names.setdefault(r[0], r[2])

def tree(f):
    par = collections.defaultdict(set)
    for p, pn, c, cn in rows(f):
        par[c].add(p); names.setdefault(p, pn); names.setdefault(c, cn)
    return par

isa_par, pof_par = tree("isa_inclusion_relation_list.txt"), tree("partof_inclusion_relation_list.txt")

def ancestors(par, c):
    seen, stack = set(), [c]
    while stack:
        for p in par.get(stack.pop(), ()):
            if p not in seen:
                seen.add(p); stack.append(p)
    return seen

elems = collections.defaultdict(set)
for f in ("isa_element_parts.txt", "partof_element_parts.txt"):
    for cid, n, fj in rows(f):
        elems[cid].add(fj)

leaf_of = {}
for c, es in elems.items():
    for e in es:
        if e not in leaf_of or len(elems[c]) < len(elems[leaf_of[e]]):
            leaf_of[e] = c

SIDE_RX = re.compile(r"\b(right|left)\b\s*", re.I)
def base_name(n):
    return re.sub(r"\s+", " ", SIDE_RX.sub("", n)).strip()

GLANDS = r"^(pituitary gland|pineal body|hypothalamus|adrenal gland|pancreas|testis|lobe of thymus)$"
GUT = r"^(duodenum|.*part of jejunum|.*part of ileum|ascending colon|transverse colon|descending colon|sigmoid colon)$"
VESSELISH = r"\bartery\b|arterial|aorta|\bvein\b|\bvenous\b|sinus|vena cava|portal|branch of|tributary"

def classify(c):
    n = names[c]
    b = base_name(n)
    isa = {names[a] for a in ancestors(isa_par, c)} | {n}
    pof = {names[a] for a in ancestors(pof_par, c)}
    vesselish = re.search(VESSELISH, b)
    if re.search(GLANDS, b):
        return "gland", "Gland"
    if b == "kidney":
        return "organ", "Kidney"
    if re.search(GUT, b):
        return "organ", "Gut"
    if "liver" in pof and not vesselish and not re.search(r"biliary|duct", b):
        return "organ", "Liver"
    if "brain" in pof and not vesselish and not re.search(r"ventricle|aqueduct|choroid", b):
        return "organ", "Brain"
    # "right side of heart" isn't linked up to "heart" in the part-of tree, so match by name too
    if not vesselish and ({"heart", "right side of heart", "left side of heart"} & pof or re.search(r"valve|papillary muscle|atrium|ventricle of heart|cavity of (left|right) (atrium|ventricle)", n)):
        return "heart", "Heart"
    portal = re.search(r"portal vein|pre-hepatic portal", b) or (re.search(r"branch of .*portal", b) is not None)
    if portal or "hepatic portal vein" in isa or "portal vein" in pof:
        return "vein", "Portal vein"
    if {"pulmonary artery", "pulmonary arterial trunk"} & isa or "pulmonary arterial tree" in pof:
        return "artery", "Pulmonary artery"
    if "pulmonary vein" in isa or "pulmonary venous tree organ" in isa:
        return "vein", "Pulmonary vein"
    if {"artery", "arterial trunk", "systemic artery"} & isa or re.search(r"aorta|artery|arterial", b):
        return "artery", "Artery"
    if {"vein", "venous trunk", "systemic vein"} & isa or re.search(r"vena cava|\bvein\b|venous arch", b):
        return "vein", "Vein"
    return None, None

parts = {}
for e, c in leaf_of.items():
    cat, kind = classify(c)
    if not cat:
        continue
    p = parts.setdefault(c, {"id": c, "name": names[c], "cat": cat, "kind": kind, "elements": []})
    p["elements"].append(e)

for c, p in parts.items():
    m = SIDE_RX.search(p["name"])
    # in the heart, left/right name different chambers, not body sides
    keep = p["kind"] == "Heart"
    p["side"] = m.group(1).lower() if m and not keep else ""
    p["base"] = p["name"] if keep else base_name(p["name"])
    p["elements"].sort()

out = sorted(parts.values(), key=lambda p: (p["cat"], p["base"], p["side"]))
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(out, fh, indent=1, ensure_ascii=False)

print(collections.Counter((p["cat"], p["kind"]) for p in out))
print("parts", len(out), "elements", sum(len(p["elements"]) for p in out))
for cat in ("heart", "gland", "organ"):
    print(cat, sorted({p["base"] for p in out if p["cat"] == cat}))
