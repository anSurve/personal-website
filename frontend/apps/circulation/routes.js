"use strict";
// Hormone journeys through the circulation. Each step highlights structures by
// side-less name, optionally "name~left" / "name~right" for one side.

const HEART_LUNGS = [
  { label: "Right side of the heart", text: "Venous blood enters the right atrium and is pumped by the right ventricle.", parts: ["cavity of right atrium", "cavity of right ventricle", "wall of right atrium"] },
  { label: "Through the lungs", text: "The pulmonary trunk and arteries take the blood to the lungs to pick up oxygen; the hormone simply rides along.", parts: ["pulmonary trunk", "pulmonary artery"] },
  { label: "Back to the left heart", text: "Pulmonary veins return oxygen-rich blood to the left atrium; the left ventricle pumps it into the aorta.", parts: ["superior pulmonary vein", "inferior pulmonary vein", "cavity of left atrium", "cavity of left ventricle"] },
  { label: "Out through the aorta", text: "From the aorta, the hormone reaches every organ within about a minute.", parts: ["ascending aorta", "arch of aorta", "descending thoracic aorta", "descending aorta", "abdominal aorta"] },
];
const SVC_RETURN = { label: "Down to the heart", text: "The internal jugular vein joins the subclavian to form the brachiocephalic vein, which empties into the superior vena cava.", parts: ["internal jugular vein", "brachiocephalic vein", "superior vena cava"] };

const ROUTES = [
  {
    id: "insulin",
    title: "Insulin & glucagon",
    gland: "Pancreas",
    summary: "Made in the islets of the pancreas to control blood sugar. Their veins drain into the hepatic portal vein, so the liver gets the first and strongest dose.",
    steps: [
      { label: "Released in the pancreas", text: "Beta cells in the islets of Langerhans release insulin after a meal; alpha cells release glucagon when blood sugar falls. Both enter the capillaries around the islets.", parts: ["pancreas"] },
      { label: "Into the pancreatic veins", text: "Small pancreatic veins drain into the splenic vein and the pancreaticoduodenal veins.", parts: ["splenic vein", "pancreaticoduodenal vein"] },
      { label: "Into the hepatic portal vein", text: "The splenic and superior mesenteric veins join behind the pancreas to form the hepatic portal vein, which carries the hormones straight to the liver.", parts: ["superior mesenteric vein", "hepatic portal vein", "pre-hepatic portal vein", "portal vein", "trunk of portal vein"] },
      { label: "First stop: the liver", text: "Portal branches spread the hormones through every liver segment. The liver removes about half of the insulin on this first pass, and glucagon's main job is here: telling the liver to release glucose.", parts: ["hepatovenous segment ii", "hepatovenous segment iii", "hepatovenous segment iv", "hepatovenous segment v", "hepatovenous segment vi", "hepatovenous segment vii", "hepatovenous segment viii", "caudate lobe of liver"] },
      { label: "Out through the hepatic veins", text: "The remaining hormone leaves the liver through the hepatic veins into the inferior vena cava.", parts: ["hepatic vein", "middle hepatic vein", "inferior vena cava"] },
      ...HEART_LUNGS,
      { label: "To muscle and fat", text: "Insulin reaches muscles (here, the thigh via the femoral artery) and fat, letting them take up glucose from the blood.", parts: ["common iliac artery", "external iliac artery", "femoral artery"] },
    ],
  },
  {
    id: "adrenal",
    title: "Adrenaline, cortisol & aldosterone",
    gland: "Adrenal glands",
    summary: "The adrenal cortex makes cortisol and aldosterone; the medulla makes adrenaline. Each gland has three arteries but one vein, and the two sides drain differently.",
    steps: [
      { label: "Blood in: three arteries", text: "Each adrenal is fed by superior suprarenal arteries (from the inferior phrenic artery), a middle suprarenal artery straight from the aorta and an inferior suprarenal artery from the renal artery.", parts: ["inferior phrenic artery", "middle suprarenal artery", "inferior suprarenal artery", "abdominal aorta"] },
      { label: "Made in the adrenal gland", text: "Cortisol (stress, blood sugar) and aldosterone (salt and blood pressure) come from the cortex; adrenaline (fight or flight) from the medulla.", parts: ["adrenal gland"] },
      { label: "Right side: straight into the vena cava", text: "The short right suprarenal vein empties directly into the inferior vena cava.", parts: ["suprarenal vein~right", "inferior vena cava"] },
      { label: "Left side: via the renal vein", text: "The left suprarenal vein drains into the left renal vein, which then crosses in front of the aorta to the inferior vena cava.", parts: ["suprarenal vein~left", "renal vein~left", "inferior vena cava"] },
      ...HEART_LUNGS,
      { label: "Targets: heart and kidneys", text: "Adrenaline speeds and strengthens the heartbeat via the coronary circulation; aldosterone reaches the kidneys through the renal arteries and makes them keep salt and water.", parts: ["trunk of coronary artery", "renal artery", "trunk of renal artery", "kidney"] },
    ],
  },
  {
    id: "testosterone",
    title: "Testosterone",
    gland: "Testes",
    summary: "Made by Leydig cells in the testes. The testicular veins drain asymmetrically, just like the adrenal veins.",
    steps: [
      { label: "Blood in", text: "The long testicular arteries arise from the abdominal aorta just below the kidneys and descend to the scrotum.", parts: ["abdominal aorta", "testicular artery"] },
      { label: "Made in the testis", text: "Leydig cells release testosterone, prompted by LH from the pituitary.", parts: ["testis"] },
      { label: "Up the testicular veins", text: "The right testicular vein empties into the inferior vena cava; the left into the left renal vein.", parts: ["testicular vein", "renal vein~left", "inferior vena cava"] },
      ...HEART_LUNGS,
      { label: "Throughout the body", text: "Testosterone acts on muscle, bone, skin, hair follicles and the brain, delivered by arteries everywhere.", parts: ["common iliac artery", "femoral artery", "subclavian artery"] },
    ],
  },
  {
    id: "pituitary",
    title: "Pituitary hormones (ACTH, LH, ADH…)",
    gland: "Hypothalamus & pituitary",
    summary: "The brain's hormone control centre. A tiny private portal system links the hypothalamus to the pituitary, which then sends hormones to glands all over the body.",
    steps: [
      { label: "Signal from the hypothalamus", text: "The hypothalamus releases hormones such as CRH and GnRH into a tiny portal system (the hypophyseal portal vessels, too small to be in this model) that leads straight to the pituitary.", parts: ["hypothalamus", "posterior communicating artery", "internal carotid artery"] },
      { label: "Pituitary releases its hormones", text: "The front pituitary answers with ACTH, TSH, LH, FSH, growth hormone and prolactin; the back pituitary releases ADH and oxytocin made in the hypothalamus.", parts: ["pituitary gland"] },
      { label: "Out of the skull", text: "Pituitary blood drains into the cavernous sinuses and other dural sinuses (not modelled), which empty into the internal jugular veins.", parts: ["internal jugular vein"] },
      SVC_RETURN,
      ...HEART_LUNGS,
      { label: "To the target glands", text: "ACTH reaches the adrenal glands (middle suprarenal arteries), LH the testes (testicular arteries) and ADH the kidneys (renal arteries).", parts: ["middle suprarenal artery", "adrenal gland", "testicular artery", "testis", "renal artery", "kidney"] },
    ],
  },
  {
    id: "melatonin",
    title: "Melatonin",
    gland: "Pineal gland",
    summary: "The night-time hormone. The pineal gland releases it when darkness reaches the eyes, helping set the body clock.",
    steps: [
      { label: "Made in the pineal gland", text: "In darkness, the pineal gland releases melatonin. Light reaching the eyes switches it off through a nerve pathway via the hypothalamus.", parts: ["pineal body", "precommunicating part of posterior cerebral artery", "postcommunicating part of posterior cerebral artery"] },
      { label: "Into the brain's veins", text: "It drains through the internal cerebral veins and great cerebral vein into the dural sinuses (not modelled), then the internal jugular veins.", parts: ["internal jugular vein"] },
      SVC_RETURN,
      ...HEART_LUNGS,
      { label: "Back to the brain and body", text: "Melatonin acts on the brain's body clock (reached through the carotid and vertebral arteries) and on tissues throughout the body.", parts: ["common carotid artery", "internal carotid artery", "vertebral artery", "hypothalamus"] },
    ],
  },
  {
    id: "kidney",
    title: "EPO & renin",
    gland: "Kidneys",
    summary: "The kidneys sense oxygen and blood pressure in the blood flowing through them and answer with hormones.",
    steps: [
      { label: "Blood in through the renal arteries", text: "About a fifth of every heartbeat goes to the kidneys through the renal arteries.", parts: ["abdominal aorta", "renal artery", "trunk of renal artery"] },
      { label: "Made in the kidney", text: "When oxygen is low, kidney cells release erythropoietin (EPO). When blood pressure falls, cells near the glomeruli release renin.", parts: ["kidney"] },
      { label: "Out through the renal veins", text: "The renal veins carry the hormones to the inferior vena cava.", parts: ["renal vein", "inferior vena cava"] },
      ...HEART_LUNGS,
      { label: "EPO reaches the bone marrow", text: "EPO travels to the red bone marrow (for example in the hip bones and femurs via the iliac and femoral arteries) and boosts red blood cell production. Renin acts in the blood itself, starting the angiotensin cascade.", parts: ["common iliac artery", "internal iliac artery", "femoral artery"] },
    ],
  },
  {
    id: "anp",
    title: "ANP (heart hormone)",
    gland: "Heart",
    summary: "The heart is an endocrine organ too: when its atria are stretched by too much blood volume, they release atrial natriuretic peptide.",
    steps: [
      { label: "Released by the atria", text: "Stretched atrial muscle cells release ANP directly into the blood inside the heart.", parts: ["wall of right atrium", "wall of left atrium", "cavity of right atrium"] },
      ...HEART_LUNGS,
      { label: "Acts on the kidneys", text: "ANP reaches the kidneys via the renal arteries and makes them excrete more salt and water, lowering blood volume and pressure.", parts: ["renal artery", "trunk of renal artery", "kidney"] },
    ],
  },
  {
    id: "gut",
    title: "Gut hormones (GLP-1, secretin…)",
    gland: "Intestines",
    summary: "The gut lining releases hormones after a meal. They travel through the portal system and prime the pancreas to release insulin (the 'incretin effect').",
    steps: [
      { label: "Released by the gut lining", text: "The duodenum releases secretin and CCK; the lower small intestine releases GLP-1 and PYY when food arrives.", parts: ["duodenum", "proximal part of jejunum", "middle part of jejunum", "distal part of jejunum", "proximal part of ileum", "middle part of ileum", "distal part of ileum"] },
      { label: "Into the mesenteric veins", text: "Intestinal veins collect into the superior mesenteric vein.", parts: ["ileal vein", "ileocolic vein", "superior mesenteric vein"] },
      { label: "Through the portal vein and liver", text: "Like insulin, gut hormones pass through the liver first.", parts: ["hepatic portal vein", "pre-hepatic portal vein", "portal vein", "hepatic vein", "inferior vena cava"] },
      ...HEART_LUNGS,
      { label: "To the pancreas", text: "Arterial blood reaches the pancreas through the coeliac trunk and splenic artery, where GLP-1 boosts insulin release.", parts: ["celiac artery", "splenic artery", "pancreas"] },
    ],
  },
  {
    id: "thymus",
    title: "Thymosin",
    gland: "Thymus",
    summary: "The thymus helps immune T-cells mature, especially in childhood, partly through hormones such as thymosin.",
    steps: [
      { label: "Made in the thymus", text: "Thymic cells release thymosins that guide developing T-cells.", parts: ["lobe of thymus"] },
      { label: "Into the brachiocephalic vein", text: "Thymic veins (not modelled) drain into the left brachiocephalic vein, then the superior vena cava.", parts: ["brachiocephalic vein~left", "superior vena cava"] },
      ...HEART_LUNGS,
    ],
  },
];
