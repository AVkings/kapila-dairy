/* ── Kapila Dairy · catalogue, types & helpers ─────────────────────── */

export type Category = "sweets" | "dairy" | "snacks" | "drinks";

export interface UnitOption {
  label: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  hindi: string;
  desc: string;
  story: string;
  /** virasat — the long heritage / prestige paragraph */
  heritage: string;
  /** kaise banti hai — ordered craft steps */
  craft: string[];
  /** shuddhta ka vaada — purity promises */
  purity: string[];
  /** year the recipe joined the dhaaba */
  since: number;
  category: Category;
  image: string;
  units: UnitOption[];
  tag?: string;
  rating: number;
  reviews: number;
}

export interface CartItem {
  key: string;
  productId: string;
  name: string;
  hindi: string;
  image: string;
  unit: UnitOption;
  qty: number;
}

export type PaymentMethod = "online" | "counter" | "redeem";

export interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  phone: string;
  note?: string;
  pickup: string;
  items: CartItem[];
  total: number;
  payment: PaymentMethod;
  paid: boolean;
  paymentId?: string;
  grainsEarned: number;
  /** set when the order is a FREE dane-reward redemption */
  redeem?: { reward: string; daneSpent: number };
}

/** Logged-in customer (Supabase Auth + profiles table). */
export interface Customer {
  id: string; // auth uid (or "local-..." when Supabase is offline)
  name: string;
  phone: string;
  dane: number;
  joinedAt: string;
  authed: boolean;
}

/* ── images ── */
const IMG = {
  platter: "https://image.qwenlm.ai/generated-images/a1f8eaf4-1a38-4350-9c40-e5a135b1dc1d/_result.png",
  kaju: "https://image.qwenlm.ai/generated-images/c6f005fb-bb33-4b43-ba70-95f2fc3ff2a3/_result.png",
  laddoo: "https://image.qwenlm.ai/generated-images/7db3dcd4-d40d-4951-a590-0879d4bbecd1/_result.png",
  jamun: "https://image.qwenlm.ai/generated-images/46130cd3-3395-4da6-8b8a-f70e89b3d780/_result.png",
  jalebi: "https://image.qwenlm.ai/generated-images/bdfb81d8-74c5-4dbd-870b-95b9710c3136/_result.png",
  milk: "https://image.qwenlm.ai/generated-images/bca00f28-4cee-427e-8f1e-31d75f9c2e3f/_result.png",
  paneer: "https://image.qwenlm.ai/generated-images/a0ef3ef2-4ab9-4a4e-8180-36c370d75836/_result.png",
  ghee: "https://image.qwenlm.ai/generated-images/491686db-12f4-4cef-91d4-6b8560031d00/_result.png",
  samosa: "https://image.qwenlm.ai/generated-images/5844f2fa-a2fe-4304-83fd-38c367ed1c96/_result.png",
  lassi: "https://image.qwenlm.ai/generated-images/a6f8b6ef-ca03-4f62-8d13-cc6829d92a21/_result.png",
};

export const FLOAT_SWEETS = {
  laddoo: IMG.laddoo,
  jamun: IMG.jamun,
  jalebi: IMG.jalebi,
  kaju: IMG.kaju,
};

/* ── catalogue ── */
export const CATALOG: Product[] = [
  {
    id: "kaju-katli",
    name: "Kaju Katli",
    hindi: "काजू कतली",
    desc: "Slow-cooked cashew fudge, finished with pure silver varq.",
    story: "Sirf Goan kaju, thoda sa cheeni, aur Dadi ji ki 50 saal purani technique. Har katli haath se belii jaati hai — machine ka koi kaam nahi.",
    heritage:
      "1982 mein Dadi Sushila ne pehli baar kaanch ke patthar pe katli beli thi. Unka kehna tha — kaju bolta hai, bas dheemi aanch chahiye. Aaj bhi har katli usi sang-e-marmar pe haath se kat-ti hai, aur shaadi ke dabbe mein pehli rakhi jaati hai.",
    craft: [
      "Konkan ke W-320 grade kaju raat bhar bhigote hain",
      "Patli ek-taar chashni mein 40 minute dheema pakna",
      "Sangmarmar ke patthar pe haath se belna aur kaatna",
      "Upar chandi ka asli khaane layak varq",
    ],
    purity: ["100% kaju — maida zero", "Asli chandi ka varq", "Cheeni kam, kaju zyada", "Bina essence, bina rang"],
    since: 1982,
    category: "sweets",
    image: IMG.kaju,
    units: [
      { label: "250g", price: 230 },
      { label: "500g", price: 440 },
      { label: "1 kg", price: 860 },
    ],
    tag: "Sabse Bikau",
    rating: 4.9,
    reviews: 812,
  },
  {
    id: "motichoor-laddoo",
    name: "Motichoor Laddoo",
    hindi: "मोतीचूर लड्डू",
    desc: "Tiny boondi pearls bound in warm ghee — melts before you blink.",
    story: "Boondi ek-ek moti jaisi, desi ghee mein tala hua, aur pistachiyon ki chaadar. Shaadi ho ya tyohaar — Kapila ke laddoo pehle khatam hote hain.",
    heritage:
      "Yehi woh laddoo hai jisse dhaaba shuru hua — 1974 ki Diwali pe Dadaji ne poore mohalle ko khilaya tha. Boondi ka jhaara wahi purana peetal ka hai, teen peedhi se kaam kar raha hai aur aaj bhi roz subah garam-garam baandha jaata hai.",
    craft: [
      "Besan ko peetal ke jhaare se moti-moti boondi mein utaarte hain",
      "Apne bilona ghee mein halki aanch pe sone jaisa talna",
      "Ek-taar chashni mein boondi ko bhigona",
      "Haath ki hatheli pe garam-garam laddoo baandhna",
    ],
    purity: ["Apna bilona desi ghee", "Kesar ka rang — food colour nahi", "Boondi moti, daant nahi lagti", "Roz subah taaza"],
    since: 1974,
    category: "sweets",
    image: IMG.laddoo,
    units: [
      { label: "250g", price: 110 },
      { label: "500g", price: 200 },
      { label: "1 kg", price: 380 },
    ],
    tag: "Shaadi Season",
    rating: 4.8,
    reviews: 640,
  },
  {
    id: "gulab-jamun",
    name: "Gulab Jamun",
    hindi: "गुलाब जामुन",
    desc: "Khoya dumplings soaked overnight in rose-cardamom syrup.",
    story: "Khoya subah ka, syrup raat bhar ka. Jamun itna naram ki chammach ki zaroorat nahi — bas ek saans mein.",
    heritage:
      "Bade Papa 1980 mein Lucknow se khoya banane ki taleem le kar aaye the. Unhone kaha tha — jamun ka raaz syrup nahi, khoya hai. Isliye hamara khoya roz subah 40 litre doodh se taaza ghot-ta hai, raat bhar chashni mein sota hai.",
    craft: [
      "Subah ke doodh ka khoya haath se ghotna",
      "Halki aanch pe sona-sa bhunna — jalna mana hai",
      "Ungliyon se bina darar ke gol baandhna",
      "Gulaab-e-sadab aur elaichi wali chashni mein raat bhar bhigona",
    ],
    purity: ["Asli khoya — powder nahi", "Gulaab ke phool ka arq", "Bina essence", "Raat bhar bhigona zaroori"],
    since: 1980,
    category: "sweets",
    image: IMG.jamun,
    units: [
      { label: "250g (≈4 pc)", price: 95 },
      { label: "500g (≈8 pc)", price: 180 },
      { label: "1 kg (≈16 pc)", price: 340 },
    ],
    rating: 4.9,
    reviews: 731,
  },
  {
    id: "jalebi-rabri",
    name: "Jalebi with Rabri",
    hindi: "जलेबी रबड़ी",
    desc: "Crackling saffron coils over chilled, thick-set rabri.",
    story: "Tave se seedha aapke dabbe tak — garam jalebi, thandi rabri. Yeh jodi 1974 se tooti nahi hai.",
    heritage:
      "Jalebi ki kadhai 1985 se usi angeethi pe hai — peetal ki, 20 kilo ki, aur ghee usi mein badla jaata hai jab khud Dadi kha kar dekhti hain. Rabri raat bhar angaare ki dheemi aanch pe jamti hai, isliye uski tahon mein subah ki taazgi hoti hai.",
    craft: [
      "Maida-kesar ka batter 8 ghante khatta hone dena",
      "Peetal ki kadhai mein desi ghee pe gol-chakkar",
      "Chashni mein 2 minute — zyada nahi, kam nahi",
      "Rabri ki moti tah ke saath garama-garam parosna",
    ],
    purity: ["Desi ghee mein tali", "Asli kesar — peela rang usi ka", "Rabri angaare ki aanch ki", "Order pe tali jaati hai"],
    since: 1985,
    category: "sweets",
    image: IMG.jalebi,
    units: [
      { label: "250g", price: 120 },
      { label: "500g", price: 220 },
      { label: "1 kg", price: 420 },
    ],
    tag: "Garam Garam",
    rating: 4.7,
    reviews: 498,
  },
  {
    id: "kesar-peda",
    name: "Kesar Peda",
    hindi: "केसर पेड़ा",
    desc: "Mathura-style pedas perfumed with real Kashmiri kesar.",
    story: "Doodh subah 6 baje ka, kesar asli Kashmiri. Peda wahi hai jo prasad mein chadhe toh dil khush ho jaye.",
    heritage:
      "Mathura ke ek halwai gharane se 1978 mein yeh recipe hamare paas aayi — badle mein Dadaji ne unhein 12 kilo bilona ghee bheja tha, bas. Tab se har Shivratri pe yeh peda Mandir ke prasad mein jaata hai. Kesar wahi — Pampore, Kashmir ka, har saal same kisaan se.",
    craft: [
      "Khoya ko lohe ki kadhai mein 3 ghante dheema bhunna",
      "Kesar ko garm doodh mein kholna, rang bhi wahi, khushboo bhi",
      "Haath se gol peda baandhna, beech mein ungli ka nishaan",
      "Raat bhar thanda karke agle din bechna — aaj ka peda aaj nahi",
    ],
    purity: ["Pampore ka asli kesar", "Lohe ki kadhai ka khoya", "Bina essence, bina rang", "Prasad wali shuddhta"],
    since: 1978,
    category: "sweets",
    image: IMG.platter,
    units: [
      { label: "250g", price: 115 },
      { label: "500g", price: 215 },
      { label: "1 kg", price: 410 },
    ],
    rating: 4.8,
    reviews: 356,
  },
  {
    id: "taaza-doodh",
    name: "Taaza A2 Doodh",
    hindi: "ताज़ा दूध",
    desc: "Farm-to-door A2 cow milk — bottled within 2 hours of milking.",
    story: "Hamari gaayein sirf A2. Doodh subah 4 baje nikalta hai, 6 baje bottle mein, 7 baje aapke dhaabe tak. Upar ki malai dekh kar hi dil khush.",
    heritage:
      "Dadaji Ramkishan ne 1974 mein yehi dhaaba 2 gaayon aur 1 cycle se shuru kiya tha. Aaj 40+ desi gaayein hain — Gir, Sahiwal aur Tharparkar — par subah 4 baje ki doh aaj bhi haath se hoti hai. Pehli doh ka pehla gilass aaj bhi Mandir chadhta hai.",
    craft: [
      "Subah 4 baje — har gaay ke naam se, haath se doh",
      "Turant thanda karke 63°C pe dheema pasteurise",
      "Bina homogenise kiye — malai upar khud jamti hai",
      "Kaanch ki bottle mein, subah 7 baje se pehle aap tak",
    ],
    purity: ["100% A2 desi gaay", "No preservatives", "Paani nahi, powder nahi", "Sirf kaanch ki bottle"],
    since: 1974,
    category: "dairy",
    image: IMG.milk,
    units: [
      { label: "500 ml", price: 33 },
      { label: "1 litre", price: 66 },
      { label: "2 litre", price: 130 },
    ],
    tag: "A2 Gaay",
    rating: 5.0,
    reviews: 1024,
  },
  {
    id: "malai-paneer",
    name: "Malai Paneer",
    hindi: "मलाई पनीर",
    desc: "Same-day paneer, soft enough to crumble with a whisper.",
    story: "Sirf aaj ka doodh, sirf nimbu se phada hua. Kal ka paneer? Woh hamare yahan bikta hi nahi.",
    heritage:
      "1990 mein Chacha ji ne shaadi mein ek halwai se seekha tha ki paneer nimbu se phadho, sirke se nahi — aur dabaw sirf itna ki malai andar reh jaye. Aaj hamara paneer shehar ke 30 shaadi caterer maangte hain, par pehla hissa hamesha dhaabe ka hota hai.",
    craft: [
      "Subah ka taaza poore doodh ka doodh ubaalna",
      "Sirf nimbu ke ras se phadna — sirka ghar mein mana hai",
      "Musalmi kapde mein baandh kar sirf 20 minute dabana",
      "Bina fridge ke, usi din bechna — kal ka kabhi nahi",
    ],
    purity: ["Aaj ke doodh ka, aaj ka", "Sirf nimbu se phada", "Malai andar, daant nahi lagta", "Kal ka paneer bikta nahi"],
    since: 1990,
    category: "dairy",
    image: IMG.paneer,
    units: [
      { label: "250g", price: 115 },
      { label: "500g", price: 220 },
      { label: "1 kg", price: 420 },
    ],
    rating: 4.8,
    reviews: 412,
  },
  {
    id: "desi-ghee",
    name: "Bilona Desi Ghee",
    hindi: "देसी घी",
    desc: "28 litres of milk, hand-churned both ways — one litre of gold.",
    story: "Bilona method: malai jamao, mathna ghumao, dheemi aanch pe pakao. 28 litre doodh se 1 litre ghee. Daana-daana bolta hai.",
    heritage:
      "Dadi kehti thi — ghee mein jaldbaazi, ghar mein kangaali. Isliye hamara ghee aaj bhi bilona method se banta hai: dahi ka mathna dono taraf ghumao, makkhan nikalo, aur lakdi ki dheemi aanch pe pakao. 28 litre A2 doodh se sirf 1 litre. Daanedar, sone jaisa, teen peedhi ki mehnat.",
    craft: [
      "Poore doodh ka dahi mitti ki matki mein jamana",
      "Lakdi ka mathna dono taraf se 40 minute ghumana",
      "Makkhan ko lakdi ki aanch pe dheema-dheema pakana",
      "Chhalni se chhaan kar mitti ke matke mein bharna",
    ],
    purity: ["28L doodh = 1L ghee", "A2 desi gaay ka", "Lakdi ki aanch, danedar", "Lab-tested, milawat zero"],
    since: 1974,
    category: "dairy",
    image: IMG.ghee,
    units: [
      { label: "500 ml", price: 750 },
      { label: "1 litre", price: 1450 },
    ],
    tag: "Bilona",
    rating: 4.9,
    reviews: 289,
  },
  {
    id: "aloo-samosa",
    name: "Aloo Samosa",
    hindi: "आलू समोसा",
    desc: "Coal-fire crispy shells, masaledar aloo, do chutney saath.",
    story: "Aata subah goonda, aloo bhaap ka, tel garam — aur samosa seedha tave se aapke haath tak. Hari aur imli chutney ghar ki bani.",
    heritage:
      "1988 mein railway station ke paas wale thele se Chacha ji ne samosa karna seekha — badle mein unhone 2 mahine free chai pilayi thi. Ajwain wala khamiri cover aur bhaap wale aloo ka raaz tab se hamare paas hai. Chai ke bina samosa, aur samose ke bina chai — dono mana hai.",
    craft: [
      "Subah ajwain ke saath atta goondna, 4 ghante rest",
      "Aloo bhaap ke, haath se masalna — mixer mana hai",
      "Kam aanch pe dheema talna — 2 baar, taki andar pakke",
      "Ghar ki hari chutney aur imli chutney ke saath",
    ],
    purity: ["Channa nahi, vanaspati nahi", "Ajwain wala desi cover", "Aloo bhaap ka, masala ghar ka", "2 baar tali kurr-kurr"],
    since: 1988,
    category: "snacks",
    image: IMG.samosa,
    units: [
      { label: "2 pc + chutney", price: 30 },
      { label: "4 pc + chutney", price: 60 },
      { label: "12 pc party box", price: 170 },
    ],
    tag: "Chai Partner",
    rating: 4.6,
    reviews: 903,
  },
  {
    id: "aam-lassi",
    name: "Aam Lassi",
    hindi: "आम लस्सी",
    desc: "Hand-churned curd, Alphonso pulp, malai ka taaj.",
    story: "Dahi apni mathne ka, aam Ratnagiri ka Alphonso. Matki mein thandi ki hui — pehla ghoont aur din ban gaya.",
    heritage:
      "1992 ki garmi mein Dadi ne pehli matki lassi banayi thi — us saal aam itna achha tha ki cheeni ki zaroorat hi nahi padi. Tab se har garmi Ratnagiri se seedha Alphonso aata hai, aur lassi lakdi ke rai se mathi jaati hai. Mixer wali jhaag? Woh lassi nahi, natak hai.",
    craft: [
      "Poore doodh ki dahi mitti ki matki mein jamana",
      "Lakdi ke rai se haath se mathna — 15 minute",
      "Ratnagiri ka Alphonso guda, cheeni sirf zaroorat pe",
      "Upar malai ka taaj aur pista ki chaadar",
    ],
    purity: ["Asli Alphonso — essence nahi", "Dahi poore doodh ki", "Barf nahi, matki ki thandak", "Malai upar se nahi, andar se"],
    since: 1992,
    category: "drinks",
    image: IMG.lassi,
    units: [
      { label: "1 glass (300ml)", price: 60 },
      { label: "1 litre", price: 220 },
    ],
    tag: "Thanda Thanda",
    rating: 4.7,
    reviews: 567,
  },
];

export interface CategoryInfo {
  id: Category;
  name: string;
  hindi: string;
  desc: string;
  image: string;
  accent: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: "sweets", name: "Mithai", hindi: "मिठाई", desc: "Halwai haath ki banawat — katli, laddoo, peda, jalebi.", image: IMG.platter, accent: "#E2670A" },
  { id: "dairy", name: "Doodh & Dairy", hindi: "दूध", desc: "A2 doodh, malai paneer, bilona ghee — subah 6 baje taaza.", image: IMG.milk, accent: "#2F7D3B" },
  { id: "snacks", name: "Chaat & Snacks", hindi: "नाश्ता", desc: "Garam samosa, tave wali chaat — chai ke pakke saathi.", image: IMG.samosa, accent: "#C9971C" },
  { id: "drinks", name: "Thanda", hindi: "ठंडा", desc: "Matki wali lassi aur chaas — garmi ka desi ilaaj.", image: IMG.lassi, accent: "#B3541E" },
];

/* ── loyalty: sakhar ke dane ── */
export interface RewardTier {
  grains: number;
  reward: string;
  hindi: string;
  img: string;
}

export const REWARD_TIERS: RewardTier[] = [
  { grains: 100, reward: "250ml Taaza Doodh", hindi: "फ्री दूध", img: IMG.milk },
  { grains: 250, reward: "2 Kesar Pede", hindi: "मुँह मीठा", img: IMG.platter },
  { grains: 500, reward: "250g Motichoor Laddoo", hindi: "लड्डू डिब्बा", img: IMG.laddoo },
  { grains: 1000, reward: "500g Kaju Katli", hindi: "राजवाड़ा इनाम", img: IMG.kaju },
];

export const grainsFrom = (total: number) => Math.floor(total / 10);

/* ── helpers ── */
export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export const makeOrderId = () =>
  "KD-" +
  Date.now().toString(36).toUpperCase().slice(-4) +
  Math.random().toString(36).toUpperCase().slice(2, 5);

export const cartTotal = (items: CartItem[]) =>
  items.reduce((s, i) => s + i.unit.price * i.qty, 0);

export const QR_EXPIRY_MS = 15 * 60 * 1000;

export const orderQRPayload = (o: Order) =>
  JSON.stringify({
    shop: "KAPILA DAIRY",
    order: o.id,
    at: o.createdAt,
    name: o.customerName,
    phone: o.phone,
    pay: o.redeem
      ? "DANE-REDEEM-FREE"
      : o.payment === "online"
        ? "ONLINE-PAID"
        : "PAY-AT-COUNTER",
    payId: o.paymentId ?? null,
    total: o.total,
    pickup: o.pickup,
    redeem: o.redeem ?? null,
    items: o.items.map((i) => ({
      item: i.name,
      qty: i.qty,
      pack: i.unit.label,
      amt: i.unit.price * i.qty,
    })),
  });
