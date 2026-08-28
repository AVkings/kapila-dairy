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

export type PaymentMethod = "online" | "counter";

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
}

export interface Customer {
  name: string;
  phone: string;
  points: number;
  joinedAt: string;
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
}

export const REWARD_TIERS: RewardTier[] = [
  { grains: 100, reward: "250ml Taaza Doodh", hindi: "फ्री दूध" },
  { grains: 250, reward: "2 Kesar Pede", hindi: "मुँह मीठा" },
  { grains: 500, reward: "250g Motichoor Laddoo", hindi: "लड्डू डिब्बा" },
  { grains: 1000, reward: "500g Kaju Katli", hindi: "राजवाड़ा इनाम" },
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
    pay: o.payment === "online" ? "ONLINE-PAID" : "PAY-AT-COUNTER",
    payId: o.paymentId ?? null,
    total: o.total,
    pickup: o.pickup,
    items: o.items.map((i) => ({
      item: i.name,
      qty: i.qty,
      pack: i.unit.label,
      amt: i.unit.price * i.qty,
    })),
  });
