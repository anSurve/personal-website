"""Build the anatomy parts catalog from BodyParts3D index files.

Each selectable part = one leaf FMA concept (e.g. "left humerus") whose meshes
are one or more FJ element files. Output: catalog.json with id, name, side,
base name, category, region, whole-muscle parent and element file ids.
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
for cid, n, fj in rows("isa_element_parts.txt"):
    elems[cid].add(fj)

# leaf concept for each element = the concept containing it with the fewest elements
leaf_of = {}
for c, es in elems.items():
    for e in es:
        if e not in leaf_of or len(elems[c]) < len(elems[leaf_of[e]]):
            leaf_of[e] = c

CAT_ROOTS = [  # order matters: first match wins
    ("FMA85453", "muscle"),   # head of muscle organ
    ("FMA10474", "muscle"),   # zone of muscle organ
    ("FMA5022", "muscle"),    # muscle organ
    ("FMA9721", "muscle"),    # tendon (shown with muscles)
    ("FMA5018", "bone"),      # bone organ
    ("FMA55107", "bone"),     # cartilage organ (costal cartilage, discs) shown with skeleton
    ("FMA7538", "bone"),      # cartilage organ component (costal cartilages)
]
# leaf concepts outside those roots that still belong in the viewer
EXTRA_RX = [
    (r"^(body of sternum|manubrium|xiphoid process)$", "bone"),
    (r"\btooth$", "bone"),
    (r"calcaneal tendon$", "muscle"),
]

def kind_of(cat, base):
    if re.search(r"tooth$", base): return "Tooth"
    if re.search(r"cartilage|disk|meniscus", base): return "Cartilage"
    if re.search(r"tendon|tendinous", base): return "Tendon"
    return "Bone" if cat == "bone" else "Muscle"

# Coarse regions, matched against names of part-of and is-a ancestors (most specific wins by order)
REGION_RULES = [
    # specific muscle names first, so generic words below (hallux, carp, head...) can't misfile them
    ("Leg", r"gastrocnemius|soleus|tibialis|peroneus|fibularis|popliteus|plantaris|calcaneal tendon|extensor digitorum longus|extensor hallucis longus|flexor digitorum longus|flexor hallucis longus"),
    ("Forearm", r"pronator|supinator|carpi\b|brachioradialis|anconeus|palmaris longus|flexor digitorum (superficialis|profundus)|extensor digitorum$|extensor digiti minimi$|extensor indicis|pollicis longus|extensor pollicis brevis|abductor pollicis longus"),
    ("Arm & shoulder", r"deltoid|biceps brachii|triceps|brachialis|coracobrachialis|supraspinatus|infraspinatus|subscapularis|teres"),
    ("Back & spine", r"trapezius|latissimus|rhomboid|levator scapulae|erector|iliocostalis|longissimus|spinalis|multifid|rotatores|splenius|suboccipital|obliquus capitis|rectus capitis posterior|interspinal|intertransvers|serratus posterior"),
    ("Thigh & hip", r"gluteus|vastus|rectus femoris|sartorius|gracilis|pectineus|adductor (longus|brevis|magnus|minimus)|biceps femoris|semitendinosus|semimembranosus|tensor fasciae|piriformis|gemellus|obturator|quadratus femoris|iliacus|psoas|iliopsoas|articularis genus"),
    ("Neck", r"intermediate tendon|digastric|stylohyoid|mylohyoid|geniohyoid|sternohyoid|sternothyroid|thyrohyoid|omohyoid|platysma|scalen|sternocleidomastoid|longus colli|longus capitis|rectus capitis (anterior|lateralis)"),
    ("Neck", r"cuneiform cartilage|corniculate cartilage|arytenoid|aryepiglott|cricothyroid|thyro-arytenoid|vocalis|crico-arytenoid|constrictor|stylopharyngeus|salpingopharyngeus|palatopharyngeus|epiglott"),
    ("Head", r"palpebr|ocul|^(superior|inferior|medial|lateral) rectus$|^(superior|inferior) oblique$|tooth$|masseter|temporalis|pterygoid|buccinator|orbicularis|zygomaticus|levator labii|depressor|mentalis|risorius|nasalis|procerus|frontalis|occipitofrontalis|auricular|corrugator|tensor tympani|stapedius|tensor veli|levator veli|palato|uvula|genioglossus|hyoglossus|styloglossus|glossus"),
    # then bones and generic regions
    ("Hand", r"\bhand\b|finger|thumb|carpal|metacarp|scaphoid|lunate|triquetr|pisiform|trapezium|trapezoid|capitate|hamate|pollicis|digiti minimi of hand|lumbrical of (right |left )?hand|interosse.* of (right |left )?hand|palmar interosse"),
    ("Forearm", r"forearm|radius|ulna"),
    ("Arm & shoulder", r"\barm\b|humerus|shoulder|pectoral girdle|scapula|clavicle|upper limb"),
    ("Foot", r"\bfoot\b|toe|tarsal|metatars|calcaneus|talus|navicular|cuboid|cuneiform|hallucis|plantar|digiti minimi of foot|dorsal interosse"),
    ("Leg", r"\bleg\b|tibia|fibula|crural"),
    ("Pelvis", r"hip bone|pelvi|perine|sacrum|coccyx|ilium|ischium|pubis|levator ani|coccygeus|iliococcygeus|pubococcygeus|puborectalis|anal|urogenital|bulbospongiosus|ischiocavernosus|sphincter"),
    ("Thigh & hip", r"thigh|femur|patella|\bhip\b|gluteal|lower limb"),
    ("Head", r"skull|cranium|face|facial|orbit|eye|mandible|maxilla|nasal|tongue|palat|mastica|\bear\b|auditory|tympan|frontal|parietal|occipital|temporal|sphenoid|ethmoid|zygomatic|lacrimal|vomer|incus|malleus|stapes|pharyn|laryn|epiglott|concha"),
    ("Neck", r"neck|cervical|hyoid|thyro|crico"),
    ("Back & spine", r"back\b|vertebra|spinal|spine|intervertebral|postvertebral|lumbar"),
    ("Thorax", r"thora|chest|\brib\b|ribs|costal|stern|intercostal|diaphragm|pectoral|serratus|subcostal|transversus thoracis|levatores costarum"),
    ("Abdomen", r"abdom|oblique|pyramidalis|quadratus lumborum|cremaster|inguinal"),
]
# is-a ancestors that only describe the kind of thing, not where it is
GENERIC_ANC = re.compile(r"head of muscle|zone of muscle|muscle organ|bone organ|cartilage organ|^organ|anatomical|material|physical|cavitated", re.I)

def region_of(c, own):
    pool = [names[a] for a in ancestors(pof_par, c)] + [names[a] for a in ancestors(isa_par, c) if not GENERIC_ANC.search(names[a])]
    for label, rx in REGION_RULES:
        if re.search(rx, own, re.I):
            return label
    for label, rx in REGION_RULES:
        if any(re.search(rx, n, re.I) for n in pool):
            return label
    return "Other"

SIDE_RX = re.compile(r"\b(right|left)\b\s*", re.I)
PART_RX = re.compile(r"^(.*?\b(?:head|part|portion|belly|fibers|lamina|slip|layer)\b(?: \w+)?) of (?:the )?(.+)$", re.I)

def base_name(n):
    return re.sub(r"\s+", " ", SIDE_RX.sub("", n)).strip()

parts = {}
for e, c in leaf_of.items():
    a = ancestors(isa_par, c) | {c}
    cat = next((label for root, label in CAT_ROOTS if root in a), None) or next((label for rx, label in EXTRA_RX if re.search(rx, base_name(names[c]))), None)
    if not cat:
        continue
    p = parts.setdefault(c, {"id": c, "name": names[c], "cat": cat, "elements": []})
    p["elements"].append(e)

for c, p in parts.items():
    n = p["name"]
    m = SIDE_RX.search(n)
    p["side"] = m.group(1).lower() if m else ""
    p["base"] = base_name(n)
    pm = PART_RX.match(p["base"])
    p["whole"] = pm.group(2).strip() if (p["cat"] == "muscle" and pm) else ""
    p["region"] = region_of(c, p["whole"] or p["base"])
    p["kind"] = kind_of(p["cat"], p["base"])
    p["elements"].sort()

out = sorted(parts.values(), key=lambda p: (p["cat"], p["region"], p["base"], p["side"]))
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(out, fh, indent=1, ensure_ascii=False)

cnt = collections.Counter((p["cat"], p["region"]) for p in out)
for k in sorted(cnt): print(k, cnt[k])
print("total parts", len(out), "elements", sum(len(p["elements"]) for p in out))
print("distinct bases:", collections.Counter(p["cat"] for p in {(q["cat"], q["base"]): q for q in out}.values()))
for p in out:
    if p["region"] == "Other": print("OTHER:", p["cat"], p["name"])
