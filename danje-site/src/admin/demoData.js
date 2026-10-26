// Generated SAMPLE data for exploring the admin panel without the backend.
// Deterministic (seeded) so numbers don't jump on every reload. Never shown as real figures:
// the panel labels demo mode clearly.
import { products as catalog } from "../data/angels.js";

let cache = null;

function rng(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}

const FIRST = ["Tasha", "Monique", "Keisha", "Aaliyah", "Grace", "Ruth", "Naomi", "Esther", "Joy", "Faith", "Dana", "Imani", "Brianna", "Lydia", "Hannah", "Simone"];
const LAST = ["Johnson", "Williams", "Brown", "Davis", "Carter", "Moore", "Taylor", "Harris", "Lewis", "Walker", "King", "Scott"];
const PAGES = ["/", "/shop", "/about", "/faith", "/every-child", "/reviews", "/contact"];
const REFS = [["Direct", 0.42], ["instagram.com", 0.21], ["facebook.com", 0.15], ["google.com", 0.14], ["pinterest.com", 0.05], ["Other", 0.03]];

const dayKey = (d) => d.toISOString().slice(0, 10);

export function makeDemo() {
  if (cache) return cache;
  const r = rng(20261026);
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const N = 120;
  const days = [];
  for (let i = N - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const trend = 1 + (N - i) / N * 0.6;
    const weekend = [0, 6].includes(d.getDay()) ? 1.25 : 1;
    const visitors = Math.round((90 + r() * 70) * trend * weekend);
    days.push({ date: dayKey(d), visitors, pageviews: Math.round(visitors * (2.4 + r() * 1.2)) });
  }
  const weights = catalog.map((p) => (p.category === "angels" ? 5 : p.category === "vinyl-dolls" ? 2.4 : 1.6) * (0.6 + r()));
  const pickProduct = () => { let t = r() * weights.reduce((a, b) => a + b, 0); for (let i = 0; i < catalog.length; i++) { t -= weights[i]; if (t <= 0) return catalog[i]; } return catalog[0]; };

  const orders = [];
  days.forEach((d) => {
    const n = Math.round(d.visitors * (0.018 + r() * 0.014));
    for (let k = 0; k < n; k++) {
      const items = [];
      const lines = r() < 0.7 ? 1 : r() < 0.8 ? 2 : 3;
      for (let j = 0; j < lines; j++) {
        const p = pickProduct();
        const ex = items.find((i) => i.slug === p.slug);
        if (ex) ex.qty++; else items.push({ slug: p.slug, name: p.name, qty: r() < 0.85 ? 1 : 2, price: p.price, image: p.image });
      }
      const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
      const amount = +(sub + (sub >= 75 ? 0 : 7.99)).toFixed(2);
      const f = FIRST[(r() * FIRST.length) | 0], l = LAST[(r() * LAST.length) | 0];
      const roll = r();
      const t = new Date(d.date + "T00:00:00"); t.setHours(7 + ((r() * 15) | 0), (r() * 60) | 0);
      orders.push({
        id: `cs_demo_${d.date.replace(/-/g, "")}_${k}`, session: "", name: `${f} ${l}`,
        email: `${f.toLowerCase()}.${l.toLowerCase()}@example.com`, amount, currency: "USD",
        status: roll < 0.86 ? "paid" : roll < 0.95 ? "pending" : "expired", created: t.toISOString(), items,
      });
    }
  });
  orders.sort((a, b) => b.created.localeCompare(a.created));

  const wishBase = catalog.map((p, i) => ({ slug: p.slug, adds: Math.round(weights[i] * 40 + r() * 30) }));

  const analytics = (span) => {
    const sel = days.slice(-span);
    const prev = days.slice(-span * 2, -span);
    const sum = (a, k) => a.reduce((s, x) => s + x[k], 0);
    const visitors = sum(sel, "visitors");
    const frac = span / N;
    const wishlist = wishBase.map((w) => { const adds = Math.max(1, Math.round(w.adds * frac * 1.6)); const removes = Math.round(adds * 0.18); return { slug: w.slug, adds, removes, net: adds - removes }; }).sort((a, b) => b.net - a.net);
    const paid = orders.filter((o) => o.status === "paid" && o.created.slice(0, 10) >= sel[0].date);
    const productViews = Math.round(visitors * 0.58);
    const cartAdds = Math.round(visitors * 0.085);
    return {
      days: sel,
      totals: { visitors, pageviews: sum(sel, "pageviews"), sessions: Math.round(visitors * 1.22), avg_pages: +(sum(sel, "pageviews") / Math.max(1, visitors * 1.22)).toFixed(1) },
      previous: { visitors: sum(prev, "visitors"), wishlist_adds: Math.round(wishBase.reduce((s, w) => s + w.adds, 0) * frac * 1.45) },
      live_visitors: 3 + ((r() * 9) | 0),
      top_pages: PAGES.map((p, i) => ({ path: p, views: Math.round(sum(sel, "pageviews") * [0.34, 0.22, 0.07, 0.05, 0.04, 0.03, 0.02][i]) }))
        .concat(catalog.slice(0, 5).map((p, i) => ({ path: `/product/${p.slug}`, views: Math.round(sum(sel, "pageviews") * (0.05 - i * 0.006)) })))
        .sort((a, b) => b.views - a.views),
      devices: { mobile: Math.round(visitors * 0.63), desktop: Math.round(visitors * 0.29), tablet: Math.round(visitors * 0.08) },
      referrers: REFS.map(([source, share]) => ({ source, visitors: Math.round(visitors * share) })),
      wishlist,
      wishlist_total: { adds: wishlist.reduce((s, w) => s + w.adds, 0), removes: wishlist.reduce((s, w) => s + w.removes, 0) },
      cart_adds: catalog.map((p, i) => ({ slug: p.slug, count: Math.round(cartAdds * weights[i] / weights.reduce((a, b) => a + b, 0)) })).sort((a, b) => b.count - a.count),
      funnel: { visitors, product_views: productViews, cart_adds: cartAdds, checkout_starts: Math.round(paid.length * 1.45), paid: paid.length },
      searches: [["healing", 64], ["janai", 41], ["wall art", 33], ["vinyl", 29], ["gift", 22], ["linc-linc", 15]].map(([q, n]) => ({ query: q, count: Math.round(n * frac * 3) })),
    };
  };

  const products = catalog.map((p) => ({ ...p }));
  const reviews = catalog.slice(0, 9).flatMap((p, i) => [
    { id: `rv${i}a`, product_slug: p.slug, name: FIRST[i], email: `${FIRST[i].toLowerCase()}@example.com`, rating: 5, comment: `Our daughter loves ${p.title}. Beautiful quality and a sweet reminder of God's promises.`, approved: true, created_at: days[N - 3 - i].date + "T10:00:00Z" },
    ...(i % 3 === 0 ? [{ id: `rv${i}b`, product_slug: p.slug, name: FIRST[i + 4], email: `${FIRST[i + 4].toLowerCase()}@example.com`, rating: 4, comment: "Lovely gift, shipping took a few extra days.", approved: true, created_at: days[N - 9 - i].date + "T15:30:00Z" }] : []),
  ]);
  const subscribers = Array.from({ length: 46 }, (_, i) => {
    const f = FIRST[i % FIRST.length], l = LAST[(i * 5) % LAST.length];
    return { id: `s${i}`, name: r() < 0.7 ? `${f} ${l}` : "", email: `${f.toLowerCase()}${i}@example.com`, created_at: days[N - 1 - ((i * 2.4) | 0)].date + "T09:00:00Z" };
  });
  const messages = [
    ["Wholesale for our church bookstore", "Hello! Our church bookstore would love to carry DanJe' Angels. Do you offer wholesale pricing for orders of 20+?"],
    ["Where is my order?", "I ordered Janai last week for my niece's birthday and haven't received tracking yet. Could you check?"],
    ["Linc-Linc availability", "Will Linc-Linc be available as a vinyl doll? My son would love the cowboy angel."],
    ["Gift wrapping", "Do you offer gift wrapping and a note card? It's for a baptism."],
    ["Thank you!", "Just wanted to say my daughter sleeps with DanJe' every night. Thank you for making these."],
  ].map(([subject, message], i) => ({ id: `m${i}`, name: `${FIRST[i + 2]} ${LAST[i + 1]}`, email: `${FIRST[i + 2].toLowerCase()}@example.com`, subject, message, created_at: days[N - 1 - i * 3].date + "T1" + i + ":20:00Z" }));

  const users = [
    { id: "u1", email: "owner@danjeangels.com", name: "Aanje Wilkerson", role: "owner", permissions: ["dashboard", "orders", "analytics", "products", "reviews", "subscribers", "messages", "users"], active: true, created_at: days[0].date + "T09:00:00Z", last_login: new Date().toISOString() },
    { id: "u2", email: "orders@danjeangels.com", name: "Dominique", role: "orders", permissions: ["dashboard", "orders", "subscribers", "messages"], active: true, created_at: days[30].date + "T09:00:00Z", last_login: days[N - 2].date + "T14:10:00Z" },
    { id: "u3", email: "content@danjeangels.com", name: "Grace (photos)", role: "content", permissions: ["dashboard", "products", "reviews"], active: true, created_at: days[70].date + "T09:00:00Z", last_login: null },
  ];
  cache = { orders, analytics, products, reviews, subscribers, messages, users };
  return cache;
}
