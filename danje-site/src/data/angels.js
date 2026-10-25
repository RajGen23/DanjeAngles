// Product data copied from the live store API
// (https://dananjels-dolls-api-production.up.railway.app/api/products, 13 products, 25 Oct 2026).
// Images were saved locally under /public/img/products. When merged into the live site,
// `products` can be swapped for the API response — the field names below are the API's own,
// plus a few display helpers (virtue, color, title, sub, image).

const P = (f) => `/img/products/${f}`;

const raw = [
  {
    id: "796a5886-8097-4ef9-b8c3-98bcba694c7b", slug: "danje-protector-pink", name: "DanJe' — Protector (Pink)",
    category: "angels", category_label: "Angel Dolls",
    short_description: "God's angel of protection, reminding every child they are never alone.",
    description: "Meet DanJe', God's angel of protection, with beautiful purple hair that reminds you that you are royalty. DanJe' watches over little hearts day and night — a soft, reassuring companion whispering: you are loved, safe, strong, and always guided by God.",
    scripture: "“He will command his angels concerning you to guard you in all your ways.” — Psalm 91:11",
    price: 45, materials: ["Soft plush", "Embroidered details", "Child-safe stitching"], age_recommendation: "Ages 3+",
    handcrafted: true, featured: true, in_stock: true,
    virtue: "Protection", color: "pink", angel: "danje", image: P("plush-danje-cut.webp"), photo: P("plush-danje.jpg"),
  },
  {
    id: "0c1de895-cca4-4a0e-a02a-b3fe9d99922d", slug: "linaii-faith-yellow", name: "Linaii — Faith (Yellow)",
    category: "angels", category_label: "Angel Dolls",
    short_description: "God's angel of faith — teaching little ones to trust and believe.",
    description: "I'm Linaii, God's angel of faith. With purple hair reminding you of your royalty, I help you trust God, believe in yourself, and grow strong in faith — knowing He has placed greatness inside you.",
    scripture: "“If you have faith as small as a mustard seed… nothing will be impossible for you.” — Matthew 17:20",
    price: 45, materials: ["Soft plush", "Embroidered details", "Child-safe stitching"], age_recommendation: "Ages 3+",
    handcrafted: true, featured: true, in_stock: true,
    virtue: "Faith", color: "yellow", angel: "linaii", image: P("plush-linaii-cut.webp"), photo: P("plush-linaii.jpg"),
  },
  {
    id: "746f6e92-61b4-4038-9a82-95e2ba1ddabf", slug: "janai-angel-healing-purple", name: "Janai — Healing (Purple)",
    category: "angels", category_label: "Angel Dolls",
    short_description: "God's angel of healing — comfort for every ouch and every ache.",
    description: "I'm Janai, God's angel of healing. With purple hair reminding you of your royalty, I bring comfort and strength — reminding you that in God, you are whole, healed, and loved. A gentle friend for sick days and tender hearts.",
    scripture: "“By His wounds we are healed.” — Isaiah 53:5",
    price: 45, materials: ["Soft plush", "Embroidered details", "Child-safe stitching"], age_recommendation: "Ages 3+",
    handcrafted: true, featured: true, in_stock: true,
    virtue: "Healing", color: "purple", angel: "janai", image: P("plush-janai-cut.webp"), photo: P("plush-janai.jpg"),
  },
  {
    id: "3ec9dd01-fb60-4269-be97-fc4e990d96a9", slug: "nique-nique-encourager-blue", name: "Nique-Nique — Encourager (Blue)",
    category: "angels", category_label: "Angel Dolls",
    short_description: "God's angel of encouragement — brave, confident, and full of light.",
    description: "I'm Nique-Nique, God's angel of encouragement. With purple hair reminding you of your royalty, I lift you up to be confident, courageous, and strong — because with God, nothing is too big.",
    scripture: "“I can do all things through Christ who strengthens me.” — Philippians 4:13",
    price: 45, materials: ["Soft plush", "Embroidered details", "Child-safe stitching"], age_recommendation: "Ages 3+",
    handcrafted: true, featured: true, in_stock: true,
    virtue: "Encouragement", color: "blue", angel: "nique-nique", image: P("plush-nique-nique-cut.webp"), photo: P("plush-nique-nique.jpg"),
  },
  {
    id: "ecc8cb96-0a6a-48fb-ad68-2a435cc9e84a", slug: "linc-linc-dominion-green", name: "Linc-Linc — Dominion (Green)",
    category: "angels", category_label: "Angel Dolls",
    short_description: "God's angel of dominion — created in His image, called to lead with love.",
    description: "I'm Linc-Linc, God's angel of dominion. I remind every child that they are made in God's image and called to lead with love, courage, and kindness — to take dominion over fear, doubt, and discouragement.",
    scripture: "“Let us make mankind in our image… and let them have dominion.” — Genesis 1:26",
    price: 45, materials: ["Soft plush", "Embroidered details", "Child-safe stitching"], age_recommendation: "Ages 3+",
    handcrafted: true, featured: true, in_stock: true,
    // Photo supplied by the client on 25 Oct 2026 (it matches the Janai photo).
    virtue: "Dominion", color: "green", angel: "linc-linc", image: P("plush-linc-linc-cut.webp"), photo: P("plush-linc-linc.jpg"),
  },
  {
    id: "9111a709-7927-4cc1-bcee-a5f832acef76", slug: "angel-wall-art-yellow", name: "Angel Wall Art — Yellow (Linaii)",
    category: "wall-art", category_label: "Angel Wall Art",
    short_description: "A sun-bright print for a room filled with faith.",
    description: "A cheerful wall print featuring Linaii, God's angel of faith. Perfect for nurseries, playrooms, and bedtime corners — a daily reminder that your little one is loved and full of promise.",
    scripture: "“If you have faith as small as a mustard seed…” — Matthew 17:20",
    price: 28, materials: [], age_recommendation: "Ages 3+", handcrafted: true, featured: false, in_stock: true,
    virtue: "Faith", color: "yellow", angel: "linaii", image: P("art-linaii.jpg"), photo: P("art-linaii.jpg"),
  },
  {
    id: "e2136b40-0307-4dc1-92a7-2a256e450c02", slug: "angel-wall-art-blue", name: "Angel Wall Art — Blue (Nique-Nique)",
    category: "wall-art", category_label: "Angel Wall Art",
    short_description: "Calm blue print — a daily reminder to be brave.",
    description: "A serene wall print of Nique-Nique, God's angel of encouragement. Hang it where little ones begin and end the day.",
    scripture: "“I can do all things through Christ who strengthens me.” — Philippians 4:13",
    price: 28, materials: [], age_recommendation: "Ages 3+", handcrafted: true, featured: false, in_stock: true,
    virtue: "Encouragement", color: "blue", angel: "nique-nique", image: P("art-nique-nique.jpg"), photo: P("art-nique-nique.jpg"),
  },
  {
    id: "f0925f2b-4503-4f9f-abf2-6712829806e8", slug: "angel-wall-art-pink", name: "Angel Wall Art — Pink (DanJe')",
    category: "wall-art", category_label: "Angel Wall Art",
    short_description: "Soft pink print — a gentle watch over every sleep.",
    description: "A warm pink wall print of DanJe', God's angel of protection. A sweet finishing touch for a little one's room.",
    scripture: "“He will command his angels concerning you.” — Psalm 91:11",
    price: 28, materials: [], age_recommendation: "Ages 3+", handcrafted: true, featured: false, in_stock: true,
    virtue: "Protection", color: "pink", angel: "danje", image: P("art-danje.jpg"), photo: P("art-danje.jpg"),
  },
  {
    id: "fe702b29-5a07-4343-8a87-e49277f73aff", slug: "angel-wall-art-purple", name: "Angel Wall Art — Purple (Janai)",
    category: "wall-art", category_label: "Angel Wall Art",
    short_description: "Royal purple print — whole, healed, and loved.",
    description: "A rich purple wall print of Janai, God's angel of healing. A beautiful keepsake gift for birthdays, christenings, or any new beginning.",
    scripture: "“By His wounds we are healed.” — Isaiah 53:5",
    price: 28, materials: [], age_recommendation: "Ages 3+", handcrafted: true, featured: false, in_stock: true,
    virtue: "Healing", color: "purple", angel: "janai", image: P("art-janai.jpg"), photo: P("art-janai.jpg"),
  },
  {
    id: "20878f18-cece-4478-9e50-512269bc4824", slug: "vinyl-danje", name: "DanJe' — Vinyl Doll",
    category: "vinyl-dolls", category_label: "Vinyl Dolls",
    short_description: "A poseable vinyl keepsake of DanJe', God's angel of protection.",
    description: "DanJe' in beautifully sculpted vinyl — a heirloom-quality keepsake for bigger imaginations. Poseable arms and legs, hand-painted features, and purple royalty hair. A treasured gift for baptisms, birthdays, and every child called to courage.",
    scripture: "“He will command his angels concerning you to guard you in all your ways.” — Psalm 91:11",
    price: 53, materials: ["Hand-painted vinyl", "Soft fabric wings", "Poseable limbs"], age_recommendation: "Ages 3+",
    handcrafted: true, featured: true, in_stock: true,
    virtue: "Protection", color: "pink", angel: "danje", image: P("vinyl-danje-cut.webp"), photo: P("vinyl-danje.jpg"),
  },
  {
    id: "7ea49842-fb92-4419-8be8-fb86116e40a1", slug: "vinyl-linaii", name: "Linaii — Vinyl Doll",
    category: "vinyl-dolls", category_label: "Vinyl Dolls",
    short_description: "A poseable vinyl keepsake of Linaii, God's angel of faith.",
    description: "Linaii in hand-painted vinyl, ready to be played with, displayed, and passed down. A tangible, beautiful reminder that faith — even as small as a mustard seed — moves mountains.",
    scripture: "“If you have faith as small as a mustard seed… nothing will be impossible for you.” — Matthew 17:20",
    price: 53, materials: ["Hand-painted vinyl", "Soft fabric wings", "Poseable limbs"], age_recommendation: "Ages 3+",
    handcrafted: true, featured: false, in_stock: true,
    virtue: "Faith", color: "yellow", angel: "linaii", image: P("vinyl-linaii-cut.webp"), photo: P("vinyl-linaii.jpg"),
  },
  {
    id: "18b7e810-9e87-43c0-bcdb-917d2982a9bb", slug: "vinyl-janai-angel", name: "Janai — Vinyl Doll",
    category: "vinyl-dolls", category_label: "Vinyl Dolls",
    short_description: "A poseable vinyl keepsake of Janai, God's angel of healing.",
    description: "Janai sculpted in tender detail — a vinyl angel keepsake for tender hearts. A comforting companion for hospital stays, quiet recoveries, and every little one who needs the reminder: you are already whole in Him.",
    scripture: "“By His wounds we are healed.” — Isaiah 53:5",
    price: 53, materials: ["Hand-painted vinyl", "Soft fabric wings", "Poseable limbs"], age_recommendation: "Ages 3+",
    handcrafted: true, featured: false, in_stock: true,
    virtue: "Healing", color: "purple", angel: "janai", image: P("vinyl-janai-cut.webp"), photo: P("vinyl-janai.jpg"),
  },
  {
    id: "a336c3fa-b48e-40ff-bc2d-5ab06b70d6a7", slug: "vinyl-nique-nique", name: "Nique-Nique — Vinyl Doll",
    category: "vinyl-dolls", category_label: "Vinyl Dolls",
    short_description: "A poseable vinyl keepsake of Nique-Nique, God's angel of encouragement.",
    description: "Nique-Nique in hand-painted vinyl — a bright, brave companion for shy hearts and big feelings. Keep her close when courage feels small.",
    scripture: "“I can do all things through Christ who strengthens me.” — Philippians 4:13",
    price: 53, materials: ["Hand-painted vinyl", "Soft fabric wings", "Poseable limbs"], age_recommendation: "Ages 3+",
    handcrafted: true, featured: false, in_stock: true,
    virtue: "Encouragement", color: "blue", angel: "nique-nique", image: P("vinyl-nique-nique-cut.webp"), photo: P("vinyl-nique-nique.jpg"),
  },
];

const TYPE_SUB = { angels: (v) => `${v} Angel`, "wall-art": () => "Angel Wall Art", "vinyl-dolls": () => "Vinyl Doll" };

export const products = raw.map((p) => ({
  ...p,
  title: p.category === "wall-art" ? p.name.match(/\(([^)]+)\)/)[1] : p.name.split(" — ")[0],
  sub: TYPE_SUB[p.category](p.virtue),
}));

export const productBySlug = (slug) => products.find((p) => p.slug === slug);

const plush = (angel) => products.find((p) => p.category === "angels" && p.angel === angel);

// Home hero 2x2 (mockup colours: pink, yellow, purple, blue)
export const heroAngels = ["danje", "linaii", "janai", "nique-nique"].map((a) => {
  const p = plush(a);
  return { name: p.title, role: `${p.virtue} Angel`, image: `/img/art/${a}.webp`, slug: p.slug };
});

// "Meet the Angels" — five angels, verses from the store
const TONES = { danje: "pink", "nique-nique": "blue", linaii: "yellow", janai: "purple", "linc-linc": "green" };
export const family = ["danje", "nique-nique", "linaii", "janai", "linc-linc"].map((a) => {
  const p = plush(a);
  return {
    name: p.title, virtue: p.virtue, verse: p.scripture.split("— ").pop(),
    tone: TONES[a], image: p.image, art: `/img/art/${a}.webp`, slug: p.slug, cutout: !p.placeholder,
  };
});

export const categories = [
  { id: "all", label: "All Angels", icon: "star" },
  { id: "Protection", label: "Protection Angels", icon: "shield" },
  { id: "Healing", label: "Healing Angels", icon: "heart" },
  { id: "Encouragement", label: "Encouragement Angels", icon: "butterfly" },
  { id: "Faith", label: "Faith Angels", icon: "cross" },
  { id: "Dominion", label: "Dominion Angels", icon: "crown" },
];

export const productTypes = [
  { id: "angels", label: "Angel Dolls" },
  { id: "vinyl-dolls", label: "Vinyl Dolls" },
  { id: "wall-art", label: "Angel Wall Art" },
];

export const colors = [
  { id: "pink", hex: "#ee6aa7" },
  { id: "purple", hex: "#8b3fc0" },
  { id: "blue", hex: "#2f8de4" },
  { id: "yellow", hex: "#f5c518" },
  { id: "green", hex: "#25b47e" },
];

export const priceRanges = [
  { id: "u30", label: "Under $30", min: 0, max: 29.99 },
  { id: "30-50", label: "$30 – $50", min: 30, max: 50 },
  { id: "50+", label: "$50 & up", min: 50.01, max: 9999 },
];

export const featured = [
  { label: "Angel Dolls", image: P("plush-danje-cut.webp"), to: "/shop?type=angels" },
  { label: "Vinyl Dolls", image: P("vinyl-linaii-cut.webp"), to: "/shop?type=vinyl-dolls" },
  { label: "Angel Wall Art", image: P("art-janai.jpg"), to: "/shop?type=wall-art" },
  { label: "And More to Come!", image: "/img/prod-gift.jpg", to: "/shop" },
];
