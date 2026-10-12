"use strict";
// ---------- Reference data ----------
const SIGNS = [
  { en: "Aries", sa: "Mesha", dv: "मेष", el: "Fire", q: "Movable", lord: "Ma" },
  { en: "Taurus", sa: "Vrishabha", dv: "वृषभ", el: "Earth", q: "Fixed", lord: "Ve" },
  { en: "Gemini", sa: "Mithuna", dv: "मिथुन", el: "Air", q: "Dual", lord: "Me" },
  { en: "Cancer", sa: "Karka", dv: "कर्क", el: "Water", q: "Movable", lord: "Mo" },
  { en: "Leo", sa: "Simha", dv: "सिंह", el: "Fire", q: "Fixed", lord: "Su" },
  { en: "Virgo", sa: "Kanya", dv: "कन्या", el: "Earth", q: "Dual", lord: "Me" },
  { en: "Libra", sa: "Tula", dv: "तुला", el: "Air", q: "Movable", lord: "Ve" },
  { en: "Scorpio", sa: "Vrishchika", dv: "वृश्चिक", el: "Water", q: "Fixed", lord: "Ma" },
  { en: "Sagittarius", sa: "Dhanu", dv: "धनु", el: "Fire", q: "Dual", lord: "Ju" },
  { en: "Capricorn", sa: "Makara", dv: "मकर", el: "Earth", q: "Movable", lord: "Sa" },
  { en: "Aquarius", sa: "Kumbha", dv: "कुम्भ", el: "Air", q: "Fixed", lord: "Sa" },
  { en: "Pisces", sa: "Meena", dv: "मीन", el: "Water", q: "Dual", lord: "Ju" },
];
const ORDER = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"];
const PL = {
  Su: { name: "Sun", sa: "Surya", kw: "self, vitality, father, authority and recognition" },
  Mo: { name: "Moon", sa: "Chandra", kw: "mind, emotions, mother, comfort and the public" },
  Ma: { name: "Mars", sa: "Mangala", kw: "energy, courage, property, siblings and conflict" },
  Me: { name: "Mercury", sa: "Budha", kw: "intellect, speech, trade, writing and learning" },
  Ju: { name: "Jupiter", sa: "Guru", kw: "wisdom, growth, teachers, children and fortune" },
  Ve: { name: "Venus", sa: "Shukra", kw: "love, beauty, comforts, art and partnership" },
  Sa: { name: "Saturn", sa: "Shani", kw: "discipline, delay, duty, endurance and service" },
  Ra: { name: "Rahu", sa: "Rahu", kw: "ambition, obsession, foreign links and the unconventional" },
  Ke: { name: "Ketu", sa: "Ketu", kw: "detachment, intuition, past-life skills and spiritual search" },
};
const HOUSES = [null,
  { sa: "Tanu", kw: "body, temperament, health and the overall direction of life" },
  { sa: "Dhana", kw: "family, savings, speech and food" },
  { sa: "Sahaja", kw: "courage, siblings, initiative, short journeys and communication" },
  { sa: "Sukha", kw: "home, mother, property, vehicles and inner peace" },
  { sa: "Putra", kw: "children, intelligence, creativity, romance and past merit" },
  { sa: "Ripu", kw: "illness, debts, competition, daily work and service" },
  { sa: "Kalatra", kw: "marriage, partnerships, contracts and dealings with the public" },
  { sa: "Ayu", kw: "longevity, sudden events, inheritance, research and transformation" },
  { sa: "Dharma", kw: "fortune, father, teachers, higher learning and faith" },
  { sa: "Karma", kw: "career, status, authority and public deeds" },
  { sa: "Labha", kw: "gains, income, networks, elder siblings and fulfilled wishes" },
  { sa: "Vyaya", kw: "expenses, losses, foreign lands, sleep and liberation" },
];
const NAKS = [
  ["Ashwini", "Ashvini Kumaras", "quick, healing and pioneering, with a love of fresh starts"],
  ["Bharani", "Yama", "intense and responsible, able to carry heavy loads, with a strong sense of justice"],
  ["Krittika", "Agni", "sharp, purifying and principled, direct in speech"],
  ["Rohini", "Brahma", "charming, creative and fond of beauty and comfort, with fertile ideas"],
  ["Mrigashira", "Soma", "curious, gentle and searching, with a restless, seeking mind"],
  ["Ardra", "Rudra", "a stormy, penetrating intellect that grows through upheaval"],
  ["Punarvasu", "Aditi", "optimistic and generous, always able to return to the good and begin again"],
  ["Pushya", "Brihaspati", "nourishing, dutiful and protective; traditionally the most auspicious nakshatra"],
  ["Ashlesha", "Nagas", "perceptive, strategic and magnetic, holding on tightly to what matters"],
  ["Magha", "Pitris", "regal and proud of lineage and tradition, with natural authority"],
  ["Purva Phalguni", "Bhaga", "warm, sociable, artistic and pleasure-loving"],
  ["Uttara Phalguni", "Aryaman", "reliable, generous and loyal to promises and patrons"],
  ["Hasta", "Savitar", "skilful with the hands, clever, practical and humorous"],
  ["Chitra", "Vishvakarma", "a designer and builder with an eye for form and brilliance"],
  ["Swati", "Vayu", "independent, flexible and business-minded; needs freedom to thrive"],
  ["Vishakha", "Indra-Agni", "goal-driven and determined, patient for the prize"],
  ["Anuradha", "Mitra", "a devoted friend and organiser who succeeds away from home"],
  ["Jyeshtha", "Indra", "senior, protective and capable, often carrying responsibility for others"],
  ["Mula", "Nirriti", "drawn to the root of things: research, philosophy and radical change"],
  ["Purva Ashadha", "Apas", "persuasive, refreshing and convinced of their own invincibility"],
  ["Uttara Ashadha", "Vishvadevas", "ethical and enduring, aiming for lasting victory and leadership"],
  ["Shravana", "Vishnu", "a good listener and learner who connects people and gains wisdom by hearing"],
  ["Dhanishta", "Vasus", "ambitious and rhythmic, linked to wealth and music"],
  ["Shatabhisha", "Varuna", "a private, scientific healer, the star of a hundred physicians"],
  ["Purva Bhadrapada", "Aja Ekapada", "intense and idealistic, transformed through fire"],
  ["Uttara Bhadrapada", "Ahir Budhnya", "deep, calm and self-controlled, with quiet wisdom"],
  ["Revati", "Pushan", "gentle, compassionate and protective, a guide for travellers"],
];
const LAGNA_TEXT = [
  "Aries rising gives a direct, energetic presence and the urge to act first and think later. You tend to lead, dislike waiting and recover quickly from setbacks. Impatience is the main thing to manage.",
  "Taurus rising gives a steady, grounded temperament and a strong sense of value. You build slowly and keep what you build, enjoy comfort, food and beauty, and are hard to move once decided.",
  "Gemini rising makes you quick, curious and talkative, with a youthful manner. You learn fast, juggle several interests and do well with communication, trade and writing. Restlessness needs managing.",
  "Cancer rising gives a sensitive, protective and intuitive nature. Home and family matter deeply and moods follow the Moon. Once you feel secure, you care for others very well.",
  "Leo rising gives dignity, warmth and a wish to lead or be seen. You are generous and loyal, keep strong self-respect and do best when your work earns recognition. Pride can be the blind spot.",
  "Virgo rising gives an analytical, careful and service-minded nature. You notice details others miss, value health and routine, and improve whatever you touch. Self-criticism and worry need watching.",
  "Libra rising gives charm, tact and a strong sense of fairness. You are drawn to partnership, design and diplomacy and weigh every side before deciding. Indecision is the usual cost of that balance.",
  "Scorpio rising gives intensity, privacy and great staying power. You read people well, go deep rather than wide and transform through crises. Trust is earned slowly and kept for life.",
  "Sagittarius rising gives optimism, frankness and a love of ideas, travel and learning. You look for meaning and principles, often teach or advise, and need room to explore.",
  "Capricorn rising gives a practical, ambitious and patient temperament. You take responsibility early and climb steadily, often seeming serious when young and lighter with age.",
  "Aquarius rising gives an independent, idealistic and unconventional outlook. You think in systems and communities, value friendship and principle, and care about the larger good.",
  "Pisces rising gives an imaginative, compassionate and adaptable nature. You absorb the moods around you, have strong intuition and artistic or spiritual leanings, and need clear boundaries.",
];
const MOON_TEXT = [
  "Emotions run hot and fast. You react quickly, need independence and get over upsets quickly too.",
  "The Moon is exalted here, giving a stable, contented mind that seeks security, comfort and loyalty.",
  "An active, inquisitive mind that needs conversation and variety. Feelings get processed by talking or writing.",
  "The Moon is in its own sign: deeply feeling and nurturing, closely bonded to mother and home, and highly intuitive.",
  "A proud, warm heart that needs appreciation. Generous, expressive and loyal.",
  "A discerning, practical mind that finds calm in order and usefulness, though it can overthink.",
  "Seeks harmony and companionship. Emotional balance comes through good relationships and beautiful surroundings.",
  "The Moon is debilitated here: emotions are intense and private, with deep loyalty and resilience. Strength comes from facing what is hidden rather than brooding on it.",
  "Optimistic and principled. The mind is soothed by faith, philosophy and travel.",
  "A controlled, responsible emotional nature. Feelings are shown through duty and practical care.",
  "A detached, humanitarian mind that needs freedom and friendships of the intellect.",
  "A gentle, sensitive and imaginative mind, compassionate and spiritually inclined.",
];
const DASHA_NATURE = {
  Su: "a period of self-assertion, authority and visibility, with dealings involving government, father or superiors",
  Mo: "an emotional, public and changeable period centred on home, mother, comfort and people",
  Ma: "an energetic, competitive period in which property, courage, technical work and conflicts come up",
  Me: "a busy period of learning, trade, communication and networking",
  Ju: "a period of growth, study, guidance and expansion of family",
  Ve: "a period of relationships, comforts, art, vehicles and pleasures",
  Sa: "a slow, demanding period that rewards discipline, hard work and patience",
  Ra: "an ambitious, unconventional period of sudden opportunities, foreign links and restlessness",
  Ke: "an inward, detaching period that favours spiritual interests, research and letting go",
};
const EXALT = { Su: 0, Mo: 1, Ma: 9, Me: 5, Ju: 3, Ve: 11, Sa: 6, Ra: 1, Ke: 7 };
const OWN = { Su: [4], Mo: [3], Ma: [0, 7], Me: [2, 5], Ju: [8, 11], Ve: [1, 6], Sa: [9, 10], Ra: [], Ke: [] };
const FRIENDS = { Su: ["Mo", "Ma", "Ju"], Mo: ["Su", "Me"], Ma: ["Su", "Mo", "Ju"], Me: ["Su", "Ve"], Ju: ["Su", "Mo", "Ma"], Ve: ["Me", "Sa"], Sa: ["Me", "Ve"] };
const ENEMIES = { Su: ["Ve", "Sa"], Mo: [], Ma: ["Me"], Me: ["Mo"], Ju: ["Me", "Ve"], Ve: ["Su", "Mo"], Sa: ["Su", "Mo", "Ma"] };
const DIG_SCORE = { exalted: 2, own: 1.5, friend: 0.5, neutral: 0, enemy: -0.5, debilitated: -1.5 };
const DIG_LABEL = { exalted: "Exalted", own: "Own sign", friend: "Friend's sign", neutral: "Neutral", enemy: "Enemy's sign", debilitated: "Debilitated" };
const DIG_CLASS = { exalted: "good", own: "good", friend: "", neutral: "", enemy: "warn", debilitated: "bad" };
const DASHA_ORDER = ["Ke", "Ve", "Su", "Mo", "Ma", "Ra", "Ju", "Sa", "Me"];
const DASHA_YRS = { Ke: 7, Ve: 20, Su: 6, Mo: 10, Ma: 7, Ra: 18, Ju: 16, Sa: 19, Me: 17 };
const YEAR_MS = 365.25 * 86400000;
const TITHIS = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"];
const YOGAS27 = ["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"];
const VARAS = ["Ravivara (Sunday)", "Somavara (Monday)", "Mangalavara (Tuesday)", "Budhavara (Wednesday)", "Guruvara (Thursday)", "Shukravara (Friday)", "Shanivara (Saturday)"];

const CITIES = `Mumbai|India|19.0760|72.8777|Asia/Kolkata
Delhi|India|28.6139|77.2090|Asia/Kolkata
Bengaluru|India|12.9716|77.5946|Asia/Kolkata
Chennai|India|13.0827|80.2707|Asia/Kolkata
Kolkata|India|22.5726|88.3639|Asia/Kolkata
Hyderabad|India|17.3850|78.4867|Asia/Kolkata
Pune|India|18.5204|73.8567|Asia/Kolkata
Ahmedabad|India|23.0225|72.5714|Asia/Kolkata
Jaipur|India|26.9124|75.7873|Asia/Kolkata
Lucknow|India|26.8467|80.9462|Asia/Kolkata
Kanpur|India|26.4499|80.3319|Asia/Kolkata
Nagpur|India|21.1458|79.0882|Asia/Kolkata
Indore|India|22.7196|75.8577|Asia/Kolkata
Bhopal|India|23.2599|77.4126|Asia/Kolkata
Patna|India|25.5941|85.1376|Asia/Kolkata
Varanasi|India|25.3176|82.9739|Asia/Kolkata
Prayagraj|India|25.4358|81.8463|Asia/Kolkata
Agra|India|27.1767|78.0081|Asia/Kolkata
Surat|India|21.1702|72.8311|Asia/Kolkata
Vadodara|India|22.3072|73.1812|Asia/Kolkata
Rajkot|India|22.3039|70.8022|Asia/Kolkata
Nashik|India|19.9975|73.7898|Asia/Kolkata
Aurangabad (Chhatrapati Sambhajinagar)|India|19.8762|75.3433|Asia/Kolkata
Kolhapur|India|16.7050|74.2433|Asia/Kolkata
Solapur|India|17.6599|75.9064|Asia/Kolkata
Thane|India|19.2183|72.9781|Asia/Kolkata
Navi Mumbai|India|19.0330|73.0297|Asia/Kolkata
Ratnagiri|India|16.9902|73.3120|Asia/Kolkata
Panaji (Goa)|India|15.4909|73.8278|Asia/Kolkata
Mangaluru|India|12.9141|74.8560|Asia/Kolkata
Mysuru|India|12.2958|76.6394|Asia/Kolkata
Belagavi|India|15.8497|74.4977|Asia/Kolkata
Hubballi|India|15.3647|75.1240|Asia/Kolkata
Kochi|India|9.9312|76.2673|Asia/Kolkata
Thiruvananthapuram|India|8.5241|76.9366|Asia/Kolkata
Kozhikode|India|11.2588|75.7804|Asia/Kolkata
Thrissur|India|10.5276|76.2144|Asia/Kolkata
Coimbatore|India|11.0168|76.9558|Asia/Kolkata
Madurai|India|9.9252|78.1198|Asia/Kolkata
Tiruchirappalli|India|10.7905|78.7047|Asia/Kolkata
Salem|India|11.6643|78.1460|Asia/Kolkata
Vellore|India|12.9165|79.1325|Asia/Kolkata
Puducherry|India|11.9416|79.8083|Asia/Kolkata
Visakhapatnam|India|17.6868|83.2185|Asia/Kolkata
Vijayawada|India|16.5062|80.6480|Asia/Kolkata
Tirupati|India|13.6288|79.4192|Asia/Kolkata
Warangal|India|17.9689|79.5941|Asia/Kolkata
Bhubaneswar|India|20.2961|85.8245|Asia/Kolkata
Cuttack|India|20.4625|85.8830|Asia/Kolkata
Ranchi|India|23.3441|85.3096|Asia/Kolkata
Jamshedpur|India|22.8046|86.2029|Asia/Kolkata
Dhanbad|India|23.7957|86.4304|Asia/Kolkata
Guwahati|India|26.1445|91.7362|Asia/Kolkata
Shillong|India|25.5788|91.8933|Asia/Kolkata
Imphal|India|24.8170|93.9368|Asia/Kolkata
Siliguri|India|26.7271|88.3953|Asia/Kolkata
Raipur|India|21.2514|81.6296|Asia/Kolkata
Chandigarh|India|30.7333|76.7794|Asia/Kolkata
Amritsar|India|31.6340|74.8723|Asia/Kolkata
Ludhiana|India|30.9010|75.8573|Asia/Kolkata
Jalandhar|India|31.3260|75.5762|Asia/Kolkata
Dehradun|India|30.3165|78.0322|Asia/Kolkata
Haridwar|India|29.9457|78.1642|Asia/Kolkata
Shimla|India|31.1048|77.1734|Asia/Kolkata
Srinagar|India|34.0837|74.7973|Asia/Kolkata
Jammu|India|32.7266|74.8570|Asia/Kolkata
Jodhpur|India|26.2389|73.0243|Asia/Kolkata
Udaipur|India|24.5854|73.7125|Asia/Kolkata
Ajmer|India|26.4499|74.6399|Asia/Kolkata
Kota|India|25.2138|75.8648|Asia/Kolkata
Gwalior|India|26.2183|78.1828|Asia/Kolkata
Jabalpur|India|23.1815|79.9864|Asia/Kolkata
Ujjain|India|23.1765|75.7885|Asia/Kolkata
Meerut|India|28.9845|77.7064|Asia/Kolkata
Noida|India|28.5355|77.3910|Asia/Kolkata
Gurugram|India|28.4595|77.0266|Asia/Kolkata
Ghaziabad|India|28.6692|77.4538|Asia/Kolkata
Mathura|India|27.4924|77.6737|Asia/Kolkata
Aligarh|India|27.8974|78.0880|Asia/Kolkata
Bareilly|India|28.3670|79.4304|Asia/Kolkata
Moradabad|India|28.8386|78.7733|Asia/Kolkata
Gorakhpur|India|26.7606|83.3732|Asia/Kolkata
Kathmandu|Nepal|27.7172|85.3240|Asia/Kathmandu
Colombo|Sri Lanka|6.9271|79.8612|Asia/Colombo
Dhaka|Bangladesh|23.8103|90.4125|Asia/Dhaka
Karachi|Pakistan|24.8607|67.0011|Asia/Karachi
Lahore|Pakistan|31.5204|74.3587|Asia/Karachi
Dubai|UAE|25.2048|55.2708|Asia/Dubai
Abu Dhabi|UAE|24.4539|54.3773|Asia/Dubai
Doha|Qatar|25.2854|51.5310|Asia/Qatar
Riyadh|Saudi Arabia|24.7136|46.6753|Asia/Riyadh
Muscat|Oman|23.5880|58.3829|Asia/Muscat
Kuwait City|Kuwait|29.3759|47.9774|Asia/Kuwait
Singapore|Singapore|1.3521|103.8198|Asia/Singapore
Kuala Lumpur|Malaysia|3.1390|101.6869|Asia/Kuala_Lumpur
Bangkok|Thailand|13.7563|100.5018|Asia/Bangkok
Jakarta|Indonesia|-6.2088|106.8456|Asia/Jakarta
Hong Kong|China|22.3193|114.1694|Asia/Hong_Kong
Shanghai|China|31.2304|121.4737|Asia/Shanghai
Beijing|China|39.9042|116.4074|Asia/Shanghai
Tokyo|Japan|35.6762|139.6503|Asia/Tokyo
Seoul|South Korea|37.5665|126.9780|Asia/Seoul
Manila|Philippines|14.5995|120.9842|Asia/Manila
Sydney|Australia|-33.8688|151.2093|Australia/Sydney
Melbourne|Australia|-37.8136|144.9631|Australia/Melbourne
Brisbane|Australia|-27.4698|153.0251|Australia/Brisbane
Perth|Australia|-31.9505|115.8605|Australia/Perth
Auckland|New Zealand|-36.8485|174.7633|Pacific/Auckland
London|UK|51.5074|-0.1278|Europe/London
Birmingham|UK|52.4862|-1.8904|Europe/London
Manchester|UK|53.4808|-2.2426|Europe/London
Leicester|UK|52.6369|-1.1398|Europe/London
Dublin|Ireland|53.3498|-6.2603|Europe/Dublin
Paris|France|48.8566|2.3522|Europe/Paris
Berlin|Germany|52.5200|13.4050|Europe/Berlin
Frankfurt|Germany|50.1109|8.6821|Europe/Berlin
Munich|Germany|48.1351|11.5820|Europe/Berlin
Amsterdam|Netherlands|52.3676|4.9041|Europe/Amsterdam
Zurich|Switzerland|47.3769|8.5417|Europe/Zurich
Rome|Italy|41.9028|12.4964|Europe/Rome
Madrid|Spain|40.4168|-3.7038|Europe/Madrid
Stockholm|Sweden|59.3293|18.0686|Europe/Stockholm
Moscow|Russia|55.7558|37.6173|Europe/Moscow
Istanbul|Turkey|41.0082|28.9784|Europe/Istanbul
Cairo|Egypt|30.0444|31.2357|Africa/Cairo
Nairobi|Kenya|-1.2921|36.8219|Africa/Nairobi
Johannesburg|South Africa|-26.2041|28.0473|Africa/Johannesburg
Durban|South Africa|-29.8587|31.0218|Africa/Johannesburg
Lagos|Nigeria|6.5244|3.3792|Africa/Lagos
Port Louis|Mauritius|-20.1609|57.5012|Indian/Mauritius
New York|USA|40.7128|-74.0060|America/New_York
Edison, New Jersey|USA|40.5187|-74.4121|America/New_York
Boston|USA|42.3601|-71.0589|America/New_York
Washington DC|USA|38.9072|-77.0369|America/New_York
Atlanta|USA|33.7490|-84.3880|America/New_York
Miami|USA|25.7617|-80.1918|America/New_York
Chicago|USA|41.8781|-87.6298|America/Chicago
Houston|USA|29.7604|-95.3698|America/Chicago
Dallas|USA|32.7767|-96.7970|America/Chicago
Denver|USA|39.7392|-104.9903|America/Denver
Phoenix|USA|33.4484|-112.0740|America/Phoenix
Los Angeles|USA|34.0522|-118.2437|America/Los_Angeles
San Francisco|USA|37.7749|-122.4194|America/Los_Angeles
San Jose|USA|37.3382|-121.8863|America/Los_Angeles
Seattle|USA|47.6062|-122.3321|America/Los_Angeles
Toronto|Canada|43.6532|-79.3832|America/Toronto
Montreal|Canada|45.5017|-73.5673|America/Toronto
Vancouver|Canada|49.2827|-123.1207|America/Vancouver
Mexico City|Mexico|19.4326|-99.1332|America/Mexico_City
São Paulo|Brazil|-23.5505|-46.6333|America/Sao_Paulo
Buenos Aires|Argentina|-34.6037|-58.3816|America/Argentina/Buenos_Aires
Port of Spain|Trinidad and Tobago|10.6549|-61.5019|America/Port_of_Spain
Suva|Fiji|-18.1248|178.4501|Pacific/Fiji`.split("\n").map(l => { const [n, c, la, lo, tz] = l.split("|"); return { n, c, lat: +la, lon: +lo, tz, label: n + ", " + c }; });

const EXAMPLE = { name: "", date: "1990-08-15", time: "06:30", place: "Mumbai, India", lat: "19.0760", lon: "72.8777", tz: "Asia/Kolkata" };

// ---------- Math helpers ----------
const norm = a => ((a % 360) + 360) % 360;
const angDiff = (a, b) => ((a - b + 540) % 360) - 180;
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const signOf = lon => Math.floor(norm(lon) / 30);
const NAK_LEN = 360 / 27;
const julianDay = ms => ms / 86400000 + 2440587.5;
const centuries = ms => (julianDay(ms) - 2451545) / 36525;
const ord = n => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const list = arr => arr.length <= 1 ? arr.join("") : arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];

// Lahiri (Chitrapaksha) ayanamsa: 23°14'43.9" at 21 Mar 1956 plus general precession since.
function ayanamsa(ms) {
  const p = T => (5028.796195 * T + 1.1054348 * T * T) / 3600;
  const T0 = (2435553.5 - 2451545) / 36525;
  return 23.245524743 + p(centuries(ms)) - p(T0);
}
function meanNode(ms) {
  const T = centuries(ms);
  return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441);
}
const BODY = { Ma: "Mars", Me: "Mercury", Ju: "Jupiter", Ve: "Venus", Sa: "Saturn" };
function tropLon(k, date) {
  if (k === "Su") return Astronomy.SunPosition(date).elon;
  if (k === "Mo") return Astronomy.EclipticGeoMoon(date).lon;
  return Astronomy.Ecliptic(Astronomy.GeoVector(BODY[k], date, true)).elon;
}
function siderealLon(k, ms) {
  if (k === "Ra") return norm(meanNode(ms) - ayanamsa(ms));
  if (k === "Ke") return norm(meanNode(ms) + 180 - ayanamsa(ms));
  return norm(tropLon(k, new Date(ms)) - ayanamsa(ms));
}
function ascendant(ms, lat, lon) {
  const lst = rad(Astronomy.SiderealTime(new Date(ms)) * 15 + lon);
  const eps = rad(23.4392911 - 0.0130042 * centuries(ms));
  return norm(deg(Math.atan2(Math.cos(lst), -(Math.sin(lst) * Math.cos(eps) + Math.tan(rad(lat)) * Math.sin(eps)))));
}

// ---------- Time zones ----------
function parseTz(s) {
  s = (s || "").trim();
  const m = s.match(/^(?:UTC|GMT)?\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (m) {
    const mins = (+m[2]) * 60 + (+(m[3] || 0));
    if (mins > 14 * 60) return null;
    return { fixed: (m[1] === "-" ? -1 : 1) * mins };
  }
  if (!s) return null;
  try { new Intl.DateTimeFormat("en-US", { timeZone: s }); return { zone: s }; } catch (e) { return null; }
}
function zoneOffsetMin(zone, utcMs) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(utcMs));
  const v = {}; parts.forEach(p => v[p.type] = +p.value);
  const asUtc = Date.UTC(v.year, v.month - 1, v.day, v.hour % 24, v.minute, v.second);
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
}
function localToUtc(y, mo, d, h, mi, tz) {
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  if (tz.fixed !== undefined) return { utc: wall - tz.fixed * 60000, off: tz.fixed };
  let off = zoneOffsetMin(tz.zone, wall);
  let utc = wall - off * 60000;
  const off2 = zoneOffsetMin(tz.zone, utc);
  if (off2 !== off) { off = off2; utc = wall - off * 60000; }
  return { utc, off };
}
const fmtOff = m => (m < 0 ? "−" : "+") + String(Math.floor(Math.abs(m) / 60)).padStart(2, "0") + ":" + String(Math.abs(m) % 60).padStart(2, "0");

// ---------- Chart construction ----------
function dignity(k, sign) {
  if (EXALT[k] === sign) return "exalted";
  if ((EXALT[k] + 6) % 12 === sign) return "debilitated";
  if (OWN[k].includes(sign)) return "own";
  if (k === "Ra" || k === "Ke") return "neutral";
  const l = SIGNS[sign].lord;
  if (FRIENDS[k].includes(l)) return "friend";
  if (ENEMIES[k].includes(l)) return "enemy";
  return "neutral";
}
function buildChart(utcMs, lat, lon) {
  const ay = ayanamsa(utcMs);
  const g = {};
  for (const k of ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa"]) {
    const speed = angDiff(tropLon(k, new Date(utcMs + 43200000)), tropLon(k, new Date(utcMs - 43200000)));
    g[k] = { lon: siderealLon(k, utcMs), retro: speed < 0, speed };
  }
  g.Ra = { lon: siderealLon("Ra", utcMs), retro: true };
  g.Ke = { lon: siderealLon("Ke", utcMs), retro: true };
  const asc = norm(ascendant(utcMs, lat, lon) - ay);
  const lagna = signOf(asc);
  for (const k of ORDER) {
    const p = g[k];
    p.sign = signOf(p.lon);
    p.deg = p.lon % 30;
    p.house = (p.sign - lagna + 12) % 12 + 1;
    p.nak = Math.floor(p.lon / NAK_LEN);
    p.pada = Math.floor((p.lon % NAK_LEN) / (NAK_LEN / 4)) + 1;
    p.dig = dignity(k, p.sign);
    p.d9 = Math.floor(p.lon / (10 / 3)) % 12;
  }
  const c = { utcMs, lat, lon, ay, asc, lagna, g, d9Lagna: Math.floor(asc / (10 / 3)) % 12 };
  c.ascNak = Math.floor(asc / NAK_LEN);
  c.ascPada = Math.floor((asc % NAK_LEN) / (NAK_LEN / 4)) + 1;
  c.waxing = norm(g.Mo.lon - g.Su.lon) < 180;
  c.dasha = vimshottari(g.Mo.lon, utcMs);
  return c;
}
function vimshottari(moonLon, birthMs) {
  const idx = Math.floor(moonLon / NAK_LEN);
  const frac = (moonLon - idx * NAK_LEN) / NAK_LEN;
  const li = idx % 9;
  let start = birthMs - frac * DASHA_YRS[DASHA_ORDER[li]] * YEAR_MS;
  const mds = [];
  for (let i = 0; i < 9; i++) {
    const L = DASHA_ORDER[(li + i) % 9], dur = DASHA_YRS[L] * YEAR_MS;
    const md = { lord: L, start, end: start + dur, ads: [] };
    let s = start;
    for (let j = 0; j < 9; j++) {
      const A = DASHA_ORDER[(li + i + j) % 9], d = dur * DASHA_YRS[A] / 120;
      md.ads.push({ lord: A, md: L, start: s, end: s + d });
      s += d;
    }
    mds.push(md);
    start += dur;
  }
  return mds;
}

// ---------- Interpretation helpers ----------
const lordOf = (c, h) => SIGNS[(c.lagna + h - 1) % 12].lord;
const ruledBy = (c, k) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(h => lordOf(c, h) === k);
const occupants = (c, h) => ORDER.filter(k => c.g[k].house === h);
const isBenefic = (c, k) => k === "Ju" || k === "Ve" || k === "Me" || (k === "Mo" && c.waxing);
const KENDRA = [1, 4, 7, 10], TRIKONA = [1, 5, 9], DUSTHANA = [6, 8, 12], UPACHAYA = [3, 6, 10, 11];
function aspects(c, k, h) {
  const d = (h - c.g[k].house + 12) % 12 + 1;
  return d === 7 || (k === "Ma" && (d === 4 || d === 8)) || (k === "Ju" && (d === 5 || d === 9)) || (k === "Sa" && (d === 3 || d === 10));
}
function strength(c, k) {
  const p = c.g[k];
  let s = DIG_SCORE[p.dig];
  if (KENDRA.includes(p.house) || TRIKONA.includes(p.house)) s += 0.75;
  else if (DUSTHANA.includes(p.house)) s -= 0.75;
  return s;
}
function houseScore(c, h) {
  let s = 0; const notes = [];
  const L = lordOf(c, h), lp = c.g[L];
  s += DIG_SCORE[lp.dig];
  if (KENDRA.includes(lp.house) || TRIKONA.includes(lp.house)) s += 1;
  else if (lp.house === 2 || lp.house === 11) s += 0.5;
  else if (DUSTHANA.includes(lp.house)) s += DUSTHANA.includes(h) ? 0.5 : -1;
  const digNote = lp.dig === "neutral" || lp.dig === "friend" ? "" : `, ${DIG_LABEL[lp.dig].toLowerCase()}`;
  notes.push(`${ord(h)} lord ${PL[L].name} sits in the ${ord(lp.house)} house${digNote}.`);
  const occ = occupants(c, h);
  for (const k of occ) {
    if (isBenefic(c, k)) s += 0.75;
    else if (UPACHAYA.includes(h)) s += 0.5;
    else s += (k === "Mo" ? -0.25 : -0.6);
  }
  if (occ.length) notes.push(`${list(occ.map(k => PL[k].name))} ${occ.length > 1 ? "occupy" : "occupies"} the ${ord(h)} house.`);
  if (aspects(c, "Ju", h) && c.g.Ju.house !== h) { s += 0.75; notes.push(`Jupiter's aspect protects the ${ord(h)} house.`); }
  if (aspects(c, "Sa", h) && c.g.Sa.house !== h) { s += UPACHAYA.includes(h) ? 0.2 : -0.4; notes.push(`Saturn aspects the ${ord(h)} house, adding delay and discipline.`); }
  if (aspects(c, "Ma", h) && c.g.Ma.house !== h) s += UPACHAYA.includes(h) ? 0.2 : -0.4;
  return { s, notes };
}
const AREAS = [
  { title: "Health & personality", houses: [1, 6], karakas: ["Su"], text: ["Constitution and self-confidence are well supported. You tend to recover well and carry yourself with purpose.", "Health and confidence are generally sound but depend on routine. Stress shows up in the body when life gets unbalanced.", "Vitality needs conscious care. Regular routines, rest and early attention to small symptoms pay off more than usual."] },
  { title: "Wealth & income", houses: [2, 11], karakas: ["Ju"], text: ["Income and savings are strongly indicated. Wealth tends to grow steadily, often from more than one source.", "Finances rise and fall with effort and timing. Saving during the good periods matters.", "Money comes through sustained effort and expenses can run ahead of income. Budgeting and avoiding speculation help."] },
  { title: "Career & status", houses: [10], karakas: ["Su", "Sa"], text: ["Career promise is strong. Responsibility, recognition and authority come with time.", "Career progress is real but uneven. The right field and good timing make a big difference.", "Career may involve changes, delays or a late start. Persistence and steadily building skills bring stability."] },
  { title: "Marriage & partnership", houses: [7], karakas: ["Ve"], text: ["Partnership is favoured. A supportive spouse and good collaborations are indicated.", "Relationships bring both growth and lessons. Communication and patience decide how they go.", "Marriage and partnerships can bring delay or friction. Choosing maturely and not rushing helps greatly."] },
  { title: "Education & children", houses: [4, 5], karakas: ["Me", "Ju"], text: ["Learning comes easily and the mind is creative. Children and students bring happiness.", "Education and creativity develop through effort. Results improve with focus and good mentors.", "Studies may be interrupted or take an unusual path, and matters of children may need patience. Persistence pays."] },
  { title: "Fortune & spiritual life", houses: [9, 12], karakas: ["Ju", "Ke"], text: ["Fortune favours you. Teachers, faith and higher learning open doors, and the inner life deepens with age.", "Luck comes in phases. Good mentors and a spiritual practice add stability.", "Luck often arrives later and through your own effort. Generosity, discipline and spiritual practice are said to strengthen it."] },
];
const RATING = [null, ["Challenging", "bad"], ["Needs effort", "warn"], ["Mixed", ""], ["Favourable", "good"], ["Strong", "good"]];
function areaReading(c, a, now) {
  const hs = a.houses.map(h => houseScore(c, h));
  const hAvg = hs.reduce((t, x) => t + x.s, 0) / hs.length;
  const kAvg = a.karakas.reduce((t, k) => t + strength(c, k), 0) / a.karakas.length;
  const total = hAvg + kAvg * 0.4;
  const r = total >= 2 ? 5 : total >= 1 ? 4 : total >= 0 ? 3 : total >= -1 ? 2 : 1;
  const notes = hs.flatMap(x => x.notes);
  const kNotes = a.karakas.map(k => { const p = c.g[k]; return `${PL[k].name} (significator) is in ${SIGNS[p.sign].en}, ${ord(p.house)} house${p.dig === "neutral" ? "" : ", " + DIG_LABEL[p.dig].toLowerCase()}.`; });
  const activators = new Set([...a.houses.map(h => lordOf(c, h)), ...a.houses.flatMap(h => occupants(c, h))]);
  const periods = c.dasha.flatMap(md => md.ads).filter(ad => ad.end > now && activators.has(ad.lord)).slice(0, 3);
  return { r, text: a.text[r >= 4 ? 0 : r === 3 ? 1 : 2], notes: [...notes, ...kNotes], periods };
}
function placementText(c, k) {
  const p = c.g[k], h = p.house;
  let t = `Brings ${PL[k].kw} into matters of ${HOUSES[h].kw}. `;
  if (k === "Ra" || k === "Ke") {
    t += UPACHAYA.includes(h) ? "The nodes do well in this house, giving drive and eventual success. " : "The node makes this area feel karmic: intense, unusual or hard to settle. ";
  } else if (isBenefic(c, k)) {
    t += DUSTHANA.includes(h) ? "A benefic in a difficult house protects these matters, though its gifts work quietly. " : "As a benefic here it supports and expands this part of life. ";
  } else {
    t += UPACHAYA.includes(h) ? "Malefics improve with time in this house: early struggle turns into real ability. " : "It can bring friction or delay here; patience and deliberate effort turn it to your advantage. ";
  }
  if (p.dig === "exalted") t += "Being exalted, it can give its best results.";
  else if (p.dig === "own") t += "In its own sign it is comfortable and dependable.";
  else if (p.dig === "debilitated") t += "Being debilitated, its results come after setbacks or need extra care.";
  else if (p.dig === "enemy") t += "It sits in an unfriendly sign, which adds some strain.";
  if (p.retro && k !== "Ra" && k !== "Ke") t += " Retrograde, so its results are more internal and often revisit old matters.";
  return t.trim();
}
function dashaText(c, k, kind) {
  const p = c.g[k], ruled = ruledBy(c, k);
  const st = strength(c, k);
  const rule = ruled.length ? `rules your ${list(ruled.map(ord))} house${ruled.length > 1 ? "s" : ""} and ` : "";
  const focus = [...new Set([...ruled, p.house])].map(h => HOUSES[h].kw.split(",")[0].replace(/^the /, "")).slice(0, 4);
  const strengthLine = st >= 1.5 ? `${PL[k].name} is strong in your chart, so this ${kind} tends to give good results.` : st >= 0 ? `${PL[k].name} is moderately placed, so results depend on effort and on the sub-periods within.` : `${PL[k].name} is under strain in your chart, so this ${kind} asks for patience and care.`;
  return `${PL[k].name} ${kind === "period" ? "Mahadasha" : "Antardasha"} is ${DASHA_NATURE[k]}. In your chart ${PL[k].name} ${rule}sits in the ${ord(p.house)} house, so ${list(focus)} come into focus. ${strengthLine}`;
}

function findYogas(c) {
  const out = [];
  const g = c.g, moon = g.Mo.sign;
  const fromMoon = k => (g[k].sign - moon + 12) % 12 + 1;
  if (KENDRA.includes(fromMoon("Ju"))) out.push({ name: "Gajakesari Yoga", text: `Jupiter is in the ${ord(fromMoon("Ju"))} from the Moon. This classic yoga gives intelligence, good reputation and the ability to overcome adversaries.` });
  if (g.Su.sign === g.Me.sign) out.push({ name: "Budhaditya Yoga", text: `Sun and Mercury together in ${SIGNS[g.Su.sign].en} sharpen intellect, communication and administrative skill.` });
  if (g.Mo.sign === g.Ma.sign) out.push({ name: "Chandra-Mangala Yoga", text: "Moon with Mars gives enterprise and earning power, especially through trade, property or bold action." });
  const MPY = { Ma: "Ruchaka", Me: "Bhadra", Ju: "Hamsa", Ve: "Malavya", Sa: "Shasha" };
  const MPY_T = { Ma: "courage, physical strength and leadership", Me: "intelligence, eloquence and business ability", Ju: "wisdom, righteousness and respect", Ve: "beauty, comfort, art and refinement", Sa: "authority, organisation and command over people" };
  for (const k in MPY) if (KENDRA.includes(g[k].house) && (g[k].dig === "own" || g[k].dig === "exalted"))
    out.push({ name: `${MPY[k]} Yoga`, text: `One of the five Mahapurusha yogas: ${PL[k].name} is ${g[k].dig === "own" ? "in its own sign" : "exalted"} in a kendra (${ord(g[k].house)} house), giving ${MPY_T[k]}.` });
  const kL = [...new Set([4, 7, 10].map(h => lordOf(c, h)))], tL = [...new Set([5, 9].map(h => lordOf(c, h)))];
  for (const k of ORDER) if (kL.includes(k) && tL.includes(k) && k !== lordOf(c, 1))
    out.push({ name: `Yogakaraka ${PL[k].name}`, text: `${PL[k].name} rules both a kendra and a trikona for your ascendant, making it the most beneficial planet in the chart. It sits in the ${ord(g[k].house)} house, so its periods are important milestones.` });
  const pairs = (A, B) => {
    const seen = new Set(), res = [];
    for (const a of A) for (const b of B) {
      const key = [a, b].sort().join();
      if (a === b || seen.has(key) || g[a].sign !== g[b].sign) continue;
      seen.add(key); res.push(`${PL[a].name} with ${PL[b].name} (${ord(g[a].house)} house)`);
    }
    return res;
  };
  const raja = pairs([...new Set(KENDRA.map(h => lordOf(c, h)))], [...new Set(TRIKONA.map(h => lordOf(c, h)))]);
  if (raja.length) out.push({ name: "Raja Yoga", text: `Kendra and trikona lords join: ${list(raja)}. This is linked with a rise in status and authority, especially during the periods of these planets.` });
  const dhana = pairs([...new Set([2, 11].map(h => lordOf(c, h)))], [...new Set(TRIKONA.map(h => lordOf(c, h)))]);
  if (dhana.length) out.push({ name: "Dhana Yoga", text: `Lords of wealth houses join lords of fortune houses: ${list(dhana)}. This supports the accumulation of wealth.` });
  const VR = { 6: "Harsha", 8: "Sarala", 12: "Vimala" };
  for (const h of DUSTHANA) { const L = lordOf(c, h);
    if (DUSTHANA.includes(g[L].house)) out.push({ name: `${VR[h]} Yoga (Viparita Raja)`, text: `The ${ord(h)} lord ${PL[L].name} sits in the ${ord(g[L].house)} house. Difficulty cancels difficulty: success often comes from adversity or others' losses.` }); }
  for (const k of ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa"]) if (g[k].dig === "debilitated") {
    const disp = SIGNS[g[k].sign].lord;
    const dh = g[disp].house, dm = (g[disp].sign - moon + 12) % 12 + 1;
    if (KENDRA.includes(dh) || KENDRA.includes(dm)) out.push({ name: `Neecha Bhanga (${PL[k].name})`, text: `${PL[k].name} is debilitated, but its dispositor ${PL[disp].name} is in a kendra, cancelling the weakness. Early struggles with ${PL[k].name}'s themes can turn into notable strength.` });
  }
  return out;
}
function findDoshas(c, now) {
  const g = c.g, res = [];
  const fromMoon = (k) => (g[k].sign - g.Mo.sign + 12) % 12 + 1;
  const MH = [1, 2, 4, 7, 8, 12];
  const mL = MH.includes(g.Ma.house), mM = MH.includes(fromMoon("Ma"));
  const cancel = [];
  if (g.Ma.dig === "own" || g.Ma.dig === "exalted") cancel.push(`Mars is ${g.Ma.dig === "own" ? "in its own sign" : "exalted"}`);
  if (g.Ju.sign === g.Ma.sign || aspects(c, "Ju", g.Ma.house)) cancel.push("Jupiter conjoins or aspects Mars");
  let mText, mState;
  if (!mL && !mM) { mState = ["Not present", "good"]; mText = `Mars is in the ${ord(g.Ma.house)} house from the ascendant and the ${ord(fromMoon("Ma"))} from the Moon, outside the Manglik positions.`; }
  else {
    const where = [mL ? `the ${ord(g.Ma.house)} house from the ascendant` : null, mM ? `the ${ord(fromMoon("Ma"))} from the Moon` : null].filter(Boolean);
    mState = cancel.length ? ["Present, mitigated", "warn"] : ["Present", "bad"];
    mText = `Mars is in ${list(where)}. Traditionally this calls for matching with a partner who has a similar placement.` + (cancel.length ? ` It is softened because ${list(cancel)}.` : "");
  }
  res.push({ name: "Manglik (Kuja) Dosha", state: mState, text: mText });

  const R = g.Ra.lon;
  const side = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa"].map(k => norm(g[k].lon - R) < 180);
  const ks = side.every(x => x) || side.every(x => !x);
  res.push({ name: "Kaal Sarp Dosha", state: ks ? ["Present", "warn"] : ["Not present", "good"], text: ks ? "All seven planets fall on one side of the Rahu–Ketu axis. Tradition links this with intense, fated stretches of life that often end in a breakthrough." : "The planets are spread on both sides of the Rahu–Ketu axis." });

  const ms = g.Mo.sign;
  const near = ["Ma", "Me", "Ju", "Ve", "Sa"].filter(k => [(ms + 1) % 12, (ms + 11) % 12, ms].includes(g[k].sign));
  const kendraMoon = ["Ma", "Me", "Ju", "Ve", "Sa"].some(k => KENDRA.includes((g[k].sign - ms + 12) % 12 + 1));
  const kem = near.length === 0;
  res.push({ name: "Kemadruma Yoga", state: !kem ? ["Not present", "good"] : kendraMoon ? ["Cancelled", "warn"] : ["Present", "bad"], text: !kem ? "The Moon has planets beside it, which gives emotional support and resourcefulness." : "No planet sits next to the Moon, which can bring periods of loneliness or financial ups and downs." + (kendraMoon ? " It is cancelled because a planet occupies a kendra from the Moon." : "") });

  const sat = siderealLon("Sa", now), sd = (signOf(sat) - ms + 12) % 12;
  let ssText, ssState;
  if ([11, 0, 1].includes(sd)) {
    const phase = sd === 11 ? "rising (first) phase" : sd === 0 ? "peak (second) phase" : "setting (final) phase";
    let t = now; while (t < now + 9 * YEAR_MS && (signOf(siderealLon("Sa", t)) - ms + 12) % 12 !== 2) t += 5 * 86400000;
    ssState = ["Active now", "warn"];
    ssText = `Saturn is transiting the ${phase} over your Moon sign, ${SIGNS[ms].en}. This seven-and-a-half-year period asks for hard work and patience and tends to reshape responsibilities. It ends around ${fmtMonth(t)}.`;
  } else {
    let t = now; while (t < now + 32 * YEAR_MS && (signOf(siderealLon("Sa", t)) - ms + 12) % 12 !== 11) t += 5 * 86400000;
    ssState = ["Not active", "good"];
    ssText = `Saturn is in ${SIGNS[signOf(sat)].en}, the ${ord(sd + 1)} from your Moon.` + (sd === 3 ? " This is Kantaka Shani, a lighter testing period around home and peace of mind." : sd === 7 ? " This is Ashtama Shani, a testing transit that calls for caution with health and finances." : "") + ` Your next Sade Sati begins around ${fmtMonth(t)}.`;
  }
  res.push({ name: "Sade Sati", state: ssState, text: ssText });
  return res;
}

// ---------- Charts ----------
const ABBR = { Su: "Su", Mo: "Mo", Ma: "Ma", Me: "Me", Ju: "Ju", Ve: "Ve", Sa: "Sa", Ra: "Ra", Ke: "Ke" };
function stack(items, cx, cy, cols, lh = 17, cw = 30) {
  const rows = Math.ceil(items.length / cols); let out = "";
  items.forEach((it, i) => {
    const r = Math.floor(i / cols), inRow = Math.min(cols, items.length - r * cols), col = i % cols;
    const x = cx + (col - (inRow - 1) / 2) * cw, y = cy + (r - (rows - 1) / 2) * lh;
    out += `<text class="c-pl${it.asc ? " asc" : ""}" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"><title>${esc(it.title)}</title>${it.label}${it.retro ? '<tspan class="c-r" dy="-5">R</tspan>' : ""}</text>`;
  });
  return out;
}
function chartItems(c, key) {
  const items = [{ label: "As", asc: true, sign: key === "d9" ? c.d9Lagna : c.lagna, title: "Ascendant (Lagna)" }];
  for (const k of ORDER) {
    const p = c.g[k];
    items.push({ label: ABBR[k], retro: p.retro && k !== "Ra" && k !== "Ke", sign: key === "d9" ? p.d9 : p.sign, title: `${PL[k].name} ${fmtDeg(p.deg)} ${SIGNS[p.sign].en}` });
  }
  return items;
}
function northChart(c, key) {
  const lag = key === "d9" ? c.d9Lagna : c.lagna, items = chartItems(c, key);
  const POS = { 1: [200, 108, 3], 2: [100, 34, 3], 3: [34, 100, 1], 4: [100, 200, 3], 5: [34, 300, 1], 6: [100, 366, 3], 7: [200, 292, 3], 8: [300, 366, 3], 9: [366, 300, 1], 10: [300, 200, 3], 11: [366, 100, 1], 12: [300, 34, 3] };
  const NUM = { 1: [200, 180], 2: [100, 86], 3: [86, 100], 4: [180, 200], 5: [86, 300], 6: [100, 316], 7: [200, 222], 8: [300, 316], 9: [314, 300], 10: [220, 200], 11: [314, 100], 12: [300, 86] };
  let s = `<svg viewBox="-4 -4 408 408" role="img" aria-label="North Indian ${key === "d9" ? "navamsa" : "birth"} chart"><rect class="c-bg" x="0" y="0" width="400" height="400"/><path class="c-line" d="M0 0L400 400M400 0L0 400M200 0L400 200L200 400L0 200Z"/>`;
  for (let h = 1; h <= 12; h++) {
    const sign = (lag + h - 1) % 12;
    s += `<text class="c-num" x="${NUM[h][0]}" y="${NUM[h][1]}" text-anchor="middle" dominant-baseline="middle">${sign + 1}</text>`;
    s += stack(items.filter(i => i.sign === sign), POS[h][0], POS[h][1], POS[h][2]);
  }
  return s + "</svg>";
}
function southChart(c, key) {
  const lag = key === "d9" ? c.d9Lagna : c.lagna, items = chartItems(c, key);
  const CELL = { 11: [0, 0], 0: [1, 0], 1: [2, 0], 2: [3, 0], 3: [3, 1], 4: [3, 2], 5: [3, 3], 6: [2, 3], 7: [1, 3], 8: [0, 3], 9: [0, 2], 10: [0, 1] };
  let s = `<svg viewBox="-4 -4 408 408" role="img" aria-label="South Indian ${key === "d9" ? "navamsa" : "birth"} chart"><rect class="c-bg" x="0" y="0" width="400" height="400"/><path class="c-line" d="M100 0V400M300 0V400M0 100H400M0 300H400M200 0V100M200 300V400M0 200H100M300 200H400"/>`;
  for (let sign = 0; sign < 12; sign++) {
    const [cx, cy] = CELL[sign], x = cx * 100, y = cy * 100;
    s += `<text class="c-num" x="${x + 94}" y="${y + 14}" text-anchor="end">${SIGNS[sign].sa}</text>`;
    if (sign === lag) s += `<path class="c-lag" d="M${x} ${y + 26}L${x + 26} ${y}"/>`;
    const here = items.filter(i => i.sign === sign);
    s += stack(here, x + 50, y + 58, 3);
  }
  s += `<text class="c-mid" x="200" y="192" text-anchor="middle">${key === "d9" ? "Navamsa" : "Rasi"}</text><text class="c-mid2" x="200" y="218" text-anchor="middle">${key === "d9" ? "D9" : "D1"}</text>`;
  return s + "</svg>";
}

// ---------- Formatting ----------
const fmtDeg = d => { const t = Math.floor(d * 60 + 1e-9); return `${Math.floor(t / 60)}°${String(t % 60).padStart(2, "0")}′`; };
const fmtMonth = ms => new Date(ms).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const fmtDay = ms => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// ---------- Rendering ----------
let chartStyle = "north";
try { chartStyle = localStorage.getItem("jk-style") || "north"; } catch (e) {}
let current = null;

function render(c, input, z, isExample) {
  const now = Date.now();
  const g = c.g;
  const md = c.dasha.find(d => d.start <= now && now < d.end);
  const ad = md && md.ads.find(d => d.start <= now && now < d.end);
  const elong = norm(g.Mo.lon - g.Su.lon), tIdx = Math.floor(elong / 12);
  const tithi = tIdx === 14 ? "Purnima" : tIdx === 29 ? "Amavasya" : TITHIS[tIdx % 15];
  const paksha = tIdx < 15 ? "Shukla" : "Krishna";
  const yoga = YOGAS27[Math.floor(norm(g.Su.lon + g.Mo.lon) / NAK_LEN)];
  const [yy, mm, dd] = input.date.split("-").map(Number);
  const vara = VARAS[new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay()];
  const localStr = new Date(Date.UTC(yy, mm - 1, dd)).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) + ", " + input.time;
  const placeStr = input.place || `${(+input.lat).toFixed(3)}, ${(+input.lon).toFixed(3)}`;
  const L = SIGNS[c.lagna], M = SIGNS[g.Mo.sign], N = NAKS[g.Mo.nak];

  const keys = [
    ["Ascendant · Lagna", `${L.en}<span class="dv">${L.dv}</span>`, `${fmtDeg(c.asc % 30)} · lord ${PL[L.lord].name}`],
    ["Moon sign · Rashi", `${M.en}<span class="dv">${M.dv}</span>`, `${fmtDeg(g.Mo.deg)} · lord ${PL[M.lord].name}`],
    ["Birth star · Nakshatra", N[0], `Pada ${g.Mo.pada} · lord ${PL[DASHA_ORDER[g.Mo.nak % 9]].name}`],
    ["Sun sign (sidereal)", `${SIGNS[g.Su.sign].en}<span class="dv">${SIGNS[g.Su.sign].dv}</span>`, fmtDeg(g.Su.deg)],
    ["Current dasha", md ? `${PL[md.lord].name} / ${PL[ad.lord].name}` : "Beyond 120 years", md ? `until ${fmtMonth(ad.end)}` : ""],
    ["Tithi at birth", `${paksha} ${tithi}`, `${yoga} yoga · ${vara.split(" ")[0]}`],
  ];

  const tableRows = [`<tr><td><b>Ascendant</b> <span class="sk">Lagna</span></td><td>${L.en} <span class="sk">${L.sa}</span></td><td class="num">${fmtDeg(c.asc % 30)}</td><td>${NAKS[c.ascNak][0]} <span class="sk">${c.ascPada}</span></td><td class="num">1</td><td>—</td><td>${SIGNS[c.d9Lagna].en}</td></tr>`];
  for (const k of ORDER) {
    const p = g[k];
    tableRows.push(`<tr><td><b>${PL[k].name}</b> <span class="sk">${PL[k].sa}</span>${p.retro && k !== "Ra" && k !== "Ke" ? ' <span class="pill bad" title="Retrograde">R</span>' : ""}</td><td>${SIGNS[p.sign].en} <span class="sk">${SIGNS[p.sign].sa}</span></td><td class="num">${fmtDeg(p.deg)}</td><td>${NAKS[p.nak][0]} <span class="sk">${p.pada}</span></td><td class="num">${p.house}</td><td>${p.dig === "neutral" ? '<span class="sk">Neutral</span>' : `<span class="pill ${DIG_CLASS[p.dig]}">${DIG_LABEL[p.dig]}</span>`}</td><td>${SIGNS[p.d9].en}</td></tr>`);
  }

  const readings = AREAS.map(a => {
    const r = areaReading(c, a, now);
    const pips = [1, 2, 3, 4, 5].map(i => `<i class="${i <= r.r ? "on" : ""}"></i>`).join("");
    const per = r.periods.length ? `<div class="periods"><b>Periods that activate this area</b>${r.periods.map(p => `<span>${PL[p.md].name}–${PL[p.lord].name} · ${fmtMonth(Math.max(p.start, now))} to ${fmtMonth(p.end)}</span>`).join("")}</div>` : "";
    return `<article class="reading"><div class="reading-top"><h3>${a.title}</h3><span class="pips" title="${r.r} of 5">${pips}</span></div><div><span class="pill ${RATING[r.r][1]}">${RATING[r.r][0]}</span></div><p class="lead">${r.text}</p><ul>${r.notes.map(n => `<li>${n}</li>`).join("")}</ul>${per}</article>`;
  }).join("");

  const yogas = findYogas(c), doshas = findDoshas(c, now);

  const tr = ["Ju", "Sa", "Ra"].map(k => {
    const lonNow = siderealLon(k, now), s = signOf(lonNow);
    const fm = (s - g.Mo.sign + 12) % 12 + 1, fl = (s - c.lagna + 12) % 12 + 1;
    const goodJ = [2, 5, 7, 9, 11], goodS = [3, 6, 11];
    const fav = k === "Ju" ? goodJ.includes(fm) : goodS.includes(fm);
    return `<div class="yoga"><h3>${PL[k].name} in ${SIGNS[s].en}</h3><span class="pill ${fav ? "good" : ""}">${fav ? "Supportive" : "Neutral to testing"}</span><p>Transiting your ${ord(fm)} house from the Moon and ${ord(fl)} house from the ascendant, touching ${HOUSES[fl].kw}.</p></div>`;
  }).join("");

  const mdHtml = c.dasha.map(d => {
    const cur = d === md, past = d.end < now;
    const age = a => { const y = (a - c.utcMs) / YEAR_MS; return y < 0 ? "before birth" : `age ${Math.floor(y)}`; };
    const rows = d.ads.map(a => `<tr class="${a === ad ? "current" : a.end < now ? "past" : ""}"><td>${PL[d.lord].name}–${PL[a.lord].name}</td><td class="num">${fmtDay(a.start)}</td><td class="num">${fmtDay(a.end)}</td><td>${a === ad ? '<span class="pill now">Now</span>' : ""}</td></tr>`).join("");
    return `<details class="${cur ? "current" : ""}"${cur ? " open" : ""}><summary><span class="l">${PL[d.lord].name} <span class="sk">${DASHA_YRS[d.lord]} yrs</span></span><span class="d">${fmtMonth(d.start)} – ${fmtMonth(d.end)}</span><span class="d">${age(d.start)}</span>${cur ? '<span class="pill now">Now</span>' : past ? '<span class="pill">Past</span>' : ""}</summary><div><div class="table-wrap"><table><thead><tr><th>Antardasha</th><th>From</th><th>To</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div></details>`;
  }).join("");

  const pct = md ? Math.round((now - md.start) / (md.end - md.start) * 100) : 0;
  const title = input.name ? `${esc(input.name)}'s chart` : "Your chart";
  const main = document.getElementById("results");
  main.classList.remove("fresh"); void main.offsetWidth; main.classList.add("fresh");
  main.innerHTML = `
    ${isExample ? `<p class="notice">This is an example chart for 15 August 1990, 06:30 in Mumbai. Enter your own birth details to cast yours.</p>` : ""}
    <section class="jk-section">
      <div class="who"><h2>${isExample ? "Example chart" : title}</h2><p class="jk-meta">${esc(localStr)} · ${esc(placeStr)} · UTC ${fmtOff(z.off)}</p></div>
      <div class="keys">${keys.map(k => `<div class="key"><span class="eyebrow">${k[0]}</span><span class="v">${k[1]}</span><span class="s">${k[2]}</span></div>`).join("")}</div>
      <nav class="jump" aria-label="Sections"><a href="#charts">Charts</a><a href="#planets">Planets</a><a href="#readings">Life readings</a><a href="#nature">Nature</a><a href="#yogas">Yogas & doshas</a><a href="#dasha">Dasha timeline</a><a href="#transits">Transits</a></nav>
    </section>

    <section class="jk-section" id="charts">
      <div class="section-head"><h2>Birth charts</h2><div class="seg" role="group" aria-label="Chart style"><button type="button" data-style="north" aria-pressed="${chartStyle === "north"}">North Indian</button><button type="button" data-style="south" aria-pressed="${chartStyle === "south"}">South Indian</button></div></div>
      <div class="charts">
        <figure class="chart-fig">${chartStyle === "north" ? northChart(c, "d1") : southChart(c, "d1")}<figcaption><b>Rasi (D1)</b>, the main birth chart. ${chartStyle === "north" ? "House 1 is the top diamond; numbers are signs (1 = Aries)." : "Signs are fixed; the stroke marks the ascendant."}</figcaption></figure>
        <figure class="chart-fig">${chartStyle === "north" ? northChart(c, "d9") : southChart(c, "d9")}<figcaption><b>Navamsa (D9)</b>, read for marriage and the inner strength of planets.</figcaption></figure>
      </div>
      <p class="hint">As = ascendant · Su Sun · Mo Moon · Ma Mars · Me Mercury · Ju Jupiter · Ve Venus · Sa Saturn · Ra Rahu · Ke Ketu · R = retrograde</p>
    </section>

    <section class="jk-section" id="planets">
      <div class="section-head"><h2>Planetary positions</h2><p>Ayanamsa ${fmtDeg(c.ay)} (Lahiri)</p></div>
      <div class="table-wrap"><table><thead><tr><th>Graha</th><th>Sign</th><th>Degree</th><th>Nakshatra · pada</th><th>House</th><th>Dignity</th><th>Navamsa</th></tr></thead><tbody>${tableRows.join("")}</tbody></table></div>
    </section>

    <section class="jk-section" id="readings">
      <div class="section-head"><h2>Life readings</h2><p>From house lords, occupants, aspects and significators</p></div>
      <div class="readings">${readings}</div>
    </section>

    <section class="jk-section" id="nature">
      <div class="section-head"><h2>Nature and temperament</h2></div>
      <div class="prose">
        <div class="block"><h3>${L.en} ascendant<span>${L.dv}</span></h3><p>${LAGNA_TEXT[c.lagna]}</p></div>
        <div class="block"><h3>Moon in ${M.en}<span>${M.dv}</span></h3><p>${MOON_TEXT[g.Mo.sign]} ${c.waxing ? "Born in the bright half of the lunar month, the Moon is waxing and supportive." : "Born in the dark half of the lunar month, the Moon is waning, which turns the mind more inward."}</p></div>
        <div class="block"><h3>${N[0]} nakshatra, pada ${g.Mo.pada}</h3><p>Ruled by ${PL[DASHA_ORDER[g.Mo.nak % 9]].name}, with ${N[1]} as its deity. People born under ${N[0]} are ${N[2]}.</p></div>
      </div>
      <h3 style="margin-top:8px">Planets in houses</h3>
      <div class="placements">${ORDER.map(k => `<div class="placement"><h3>${PL[k].name} in the ${ord(g[k].house)} house · ${SIGNS[g[k].sign].en}</h3><p>${placementText(c, k)}</p></div>`).join("")}</div>
    </section>

    <section class="jk-section" id="yogas">
      <div class="section-head"><h2>Yogas and doshas</h2><p>Classical combinations found in this chart</p></div>
      <div class="yogas">
        ${yogas.length ? yogas.map(y => `<div class="yoga"><h3>${y.name}</h3><span class="pill good">Present</span><p>${y.text}</p></div>`).join("") : `<p class="hint">None of the major yogas checked here (Gajakesari, Budhaditya, Mahapurusha, Raja, Dhana, Viparita) form in this chart.</p>`}
        ${doshas.map(d => `<div class="yoga"><h3>${d.name}</h3><span class="pill ${d.state[1]}">${d.state[0]}</span><p>${d.text}</p></div>`).join("")}
      </div>
    </section>

    <section class="jk-section" id="dasha">
      <div class="section-head"><h2>Vimshottari dasha</h2><p>Starts from the Moon's nakshatra, ${N[0]}</p></div>
      ${md ? `<div class="dasha-now"><span class="eyebrow">Running now</span><h3>${PL[md.lord].name} Mahadasha · ${PL[ad.lord].name} Antardasha</h3><div class="bar" title="${pct}% of the mahadasha elapsed"><b style="width:${pct}%"></b></div><p class="hint">${fmtMonth(md.start)} – ${fmtMonth(md.end)} · ${pct}% elapsed · sub-period until ${fmtDay(ad.end)}</p><p>${dashaText(c, md.lord, "period")}</p>${ad.lord !== md.lord ? `<p>${dashaText(c, ad.lord, "sub-period")}</p>` : ""}</div>` : ""}
      <div class="md-list">${mdHtml}</div>
    </section>

    <section class="jk-section" id="transits">
      <div class="section-head"><h2>Current transits</h2><p>Slow planets as of ${fmtDay(now)}</p></div>
      <div class="yogas">${tr}</div>
    </section>

    <section class="jk-section">
      <div class="tech"><span>Birth UTC: ${new Date(c.utcMs).toISOString().replace("T", " ").slice(0, 16)}</span><span>Latitude ${c.lat.toFixed(4)}, longitude ${c.lon.toFixed(4)}</span><span>Julian day ${julianDay(c.utcMs).toFixed(4)}</span><span>Ayanamsa ${c.ay.toFixed(4)}° · mean nodes</span></div>
      <p class="disclaimer">Positions are computed with the open-source Astronomy Engine and are accurate to well under an arcminute. Readings follow classical Parashari rules applied automatically; a practising astrologer weighs many more factors. Astrology is a traditional interpretive system, so use these readings for reflection rather than for medical, financial or legal decisions.</p>
    </section>`;
  main.querySelectorAll(".seg button").forEach(b => b.addEventListener("click", () => {
    chartStyle = b.dataset.style;
    try { localStorage.setItem("jk-style", chartStyle); } catch (e) {}
    if (current) render(...current);
    document.getElementById("charts").scrollIntoView({ block: "start" });
  }));
}

// ---------- Form ----------
const $ = id => document.getElementById(id);
function fillForm(v) { $("fName").value = v.name || ""; $("fDate").value = v.date; $("fTime").value = v.time; $("fPlace").value = v.place || ""; $("fLat").value = v.lat; $("fLon").value = v.lon; $("fTz").value = v.tz; place.ok = true; }
function readForm() { return { name: $("fName").value.trim(), date: $("fDate").value, time: $("fTime").value, place: $("fPlace").value.trim(), lat: $("fLat").value.trim(), lon: $("fLon").value.trim(), tz: $("fTz").value.trim() }; }

// ---------- Place search ----------
// Suggestions come from Open-Meteo's free geocoding API (no key, CORS-enabled,
// and it returns each place's IANA time zone). The built-in CITIES list shows
// instantly while that loads and is the fallback when it's unreachable.
// place.ok is false while the typed place hasn't been resolved to coordinates.
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const PLACE_HINT = "Pick a place from the list to fill in its coordinates and time zone.";
const place = { items: [], active: -1, timer: 0, seq: 0, ok: true };
const fmtLatLon = (lat, lon) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
const placeLabel = p => p.region ? `${p.name}, ${p.region}` : p.name;
const cityToPlace = c => ({ name: c.n, region: c.c, lat: c.lat, lon: c.lon, tz: c.tz });
function findCity(q) {
  q = q.trim().toLowerCase(); if (!q) return null;
  return CITIES.find(c => c.label.toLowerCase() === q) || CITIES.find(c => c.n.toLowerCase() === q) || (CITIES.filter(c => c.label.toLowerCase().startsWith(q)).length === 1 ? CITIES.find(c => c.label.toLowerCase().startsWith(q)) : null);
}
function localPlaces(q) {
  q = q.toLowerCase();
  return CITIES.filter(c => c.label.toLowerCase().includes(q)).slice(0, 8).map(cityToPlace);
}
async function remotePlaces(q) {
  const r = await fetch(`${GEO_URL}?name=${encodeURIComponent(q)}&count=10&language=en&format=json`);
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j = await r.json();
  return (j.results || []).filter(p => p.timezone).map(p => ({
    name: p.name,
    // district (admin2) tells apart same-named villages in one state
    region: [...new Set([p.admin2, p.admin1].filter(a => a && a !== p.name)), p.country].filter(Boolean).join(", "),
    lat: p.latitude, lon: p.longitude, tz: p.timezone,
  }));
}
function showPlaces(items, status) {
  const ul = $("placeList"), input = $("fPlace");
  place.items = items; place.active = -1;
  input.removeAttribute("aria-activedescendant");
  if (!items.length && !status) return hidePlaces();
  ul.innerHTML = items.map((p, i) => `<li id="po${i}" role="option" aria-selected="false" data-i="${i}"><span class="pn">${esc(p.name)}</span>${p.region ? ` <span class="pr">${esc(p.region)}</span>` : ""}<span class="pc">${fmtLatLon(p.lat, p.lon)} · ${esc(p.tz)}</span></li>`).join("")
    + (status ? `<li class="pstatus" role="presentation">${esc(status)}</li>` : "");
  ul.hidden = false;
  input.setAttribute("aria-expanded", "true");
}
function hidePlaces() {
  $("placeList").hidden = true;
  $("fPlace").setAttribute("aria-expanded", "false");
  $("fPlace").removeAttribute("aria-activedescendant");
  place.active = -1;
}
function setActive(i) {
  const opts = $("placeList").querySelectorAll('[role="option"]');
  if (!opts.length) return;
  place.active = (i + opts.length) % opts.length;
  opts.forEach((o, j) => o.setAttribute("aria-selected", String(j === place.active)));
  opts[place.active].scrollIntoView({ block: "nearest" });
  $("fPlace").setAttribute("aria-activedescendant", opts[place.active].id);
}
function choosePlace(p) {
  $("fPlace").value = placeLabel(p);
  $("fLat").value = p.lat.toFixed(4); $("fLon").value = p.lon.toFixed(4); $("fTz").value = p.tz;
  const hint = $("placeHint");
  hint.textContent = `${fmtLatLon(p.lat, p.lon)} · ${p.tz}`; hint.classList.remove("bad");
  place.ok = true;
  hidePlaces();
}
function onPlaceInput() {
  const q = $("fPlace").value.trim(), hint = $("placeHint");
  clearTimeout(place.timer);
  const seq = ++place.seq;
  place.ok = !q;
  hint.textContent = PLACE_HINT; hint.classList.remove("bad");
  if (q.length < 2) return hidePlaces();
  const local = localPlaces(q);
  showPlaces(local, "Searching…");
  place.timer = setTimeout(async () => {
    try {
      const found = await remotePlaces(q);
      if (seq !== place.seq) return;
      showPlaces(found.length ? found : local, found.length || local.length ? "" : "No places found. Try a nearby larger town, or enter the coordinates below.");
    } catch (e) {
      if (seq !== place.seq) return;
      showPlaces(local, local.length ? "Online search is unavailable, so only built-in cities are shown." : "Online search is unavailable. Enter the coordinates and time zone below.");
    }
  }, 250);
}
function onPlaceKey(e) {
  const open = !$("placeList").hidden;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    if (!open) { onPlaceInput(); return; }
    e.preventDefault();
    const down = e.key === "ArrowDown";
    setActive(place.active < 0 ? (down ? 0 : -1) : place.active + (down ? 1 : -1));
  } else if (e.key === "Enter" && open && place.items.length) {
    e.preventDefault();
    choosePlace(place.items[Math.max(place.active, 0)]);
  } else if (e.key === "Escape" && open) {
    e.preventDefault();
    hidePlaces();
  }
}
// On submit: accept a resolved place, or an exact built-in city name typed without picking.
function checkPlace() {
  if (place.ok) return true;
  const c = findCity($("fPlace").value);
  if (c) { choosePlace(cityToPlace(c)); return true; }
  const err = $("formError");
  err.textContent = `Choose "${$("fPlace").value.trim()}" from the suggestions so its coordinates and time zone are filled in, or type them in below.`;
  err.hidden = false;
  $("fPlace").focus();
  onPlaceInput();
  return false;
}
function cast(v, isExample) {
  const err = $("formError"); err.hidden = true;
  const fail = m => { err.textContent = m; err.hidden = false; };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return fail("Enter the date of birth.");
  if (!/^\d{1,2}:\d{2}/.test(v.time)) return fail("Enter the time of birth. If unknown, 12:00 gives a rough chart, but the ascendant and houses will not be reliable.");
  const lat = parseFloat(v.lat), lon = parseFloat(v.lon);
  if (!isFinite(lat) || Math.abs(lat) > 66.5) return fail("Latitude must be a number between −66.5 and 66.5 (north positive).");
  if (!isFinite(lon) || Math.abs(lon) > 180) return fail("Longitude must be a number between −180 and 180 (east positive).");
  const tz = parseTz(v.tz);
  if (!tz) return fail("Time zone not recognised. Use a name like Asia/Kolkata or an offset like +05:30.");
  const [y, m, d] = v.date.split("-").map(Number), [hh, mi] = v.time.split(":").map(Number);
  if (y < 1800 || y > 2100) return fail("Dates between 1800 and 2100 are supported.");
  const z = localToUtc(y, m, d, hh, mi, tz);
  const c = buildChart(z.utc, lat, lon);
  current = [c, v, z, isExample];
  render(c, v, z, isExample);
  if (!isExample) try { localStorage.setItem("jk-last", JSON.stringify(v)); } catch (e) {}
}

function init() {
  let zones = [];
  try { zones = Intl.supportedValuesOf("timeZone"); } catch (e) { zones = [...new Set(CITIES.map(c => c.tz))]; }
  $("tzList").innerHTML = zones.map(z => `<option value="${esc(z)}"></option>`).join("");
  $("fPlace").addEventListener("input", onPlaceInput);
  $("fPlace").addEventListener("keydown", onPlaceKey);
  $("fPlace").addEventListener("blur", hidePlaces);
  // mousedown + preventDefault keeps focus in the input, so blur doesn't close the list before the pick lands
  $("placeList").addEventListener("mousedown", e => {
    e.preventDefault();
    const li = e.target.closest("[data-i]");
    if (li) choosePlace(place.items[+li.dataset.i]);
  });
  // Typing coordinates by hand means the user is supplying the location themselves.
  ["fLat", "fLon", "fTz"].forEach(id => $(id).addEventListener("input", () => { place.ok = true; }));
  $("birthForm").addEventListener("submit", e => { e.preventDefault(); hidePlaces(); if (!checkPlace()) return; cast(readForm(), false); if (window.innerWidth <= 900) $("results").scrollIntoView({ block: "start" }); });
  if (typeof Astronomy === "undefined") { $("results").innerHTML = '<p class="form-error">The ephemeris library did not load, so positions cannot be computed. Check your connection and reload the page.</p>'; return; }
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem("jk-last") || "null"); } catch (e) {}
  if (saved && saved.date) { fillForm(saved); cast(saved, false); }
  else { fillForm(EXAMPLE); cast(EXAMPLE, true); }
}
init();
