// Admin data layer. "live" mode calls the store backend with the admin's token;
// "demo" mode serves generated sample data so the panel can be explored without the backend.
import { products as catalog } from "../data/angels.js";
import { makeDemo } from "./demoData.js";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const LIVE_AVAILABLE = Boolean(BASE);
const KEY = "dj-admin-session";

export function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { return null; }
}
export function saveSession(s) {
  try { s ? sessionStorage.setItem(KEY, JSON.stringify(s)) : sessionStorage.removeItem(KEY); } catch { /* blocked */ }
}

async function req(session, path, { method = "GET", body, form } = {}) {
  const headers = { Authorization: `Bearer ${session.token}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}/api${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (res.status === 401) { const e = new Error("Your session has expired. Please sign in again."); e.auth = true; throw e; }
  if (res.status === 403) throw new Error("You don’t have access to this. Ask the store owner.");
  if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : `The server returned an error (${res.status}).`);
  return data;
}

export const PERMISSIONS = [
  ["dashboard", "Dashboard"], ["orders", "Orders"], ["analytics", "Visitors & wishlist"], ["products", "Products"],
  ["reviews", "Reviews"], ["subscribers", "Subscribers"], ["messages", "Messages"], ["users", "Team & access"],
];
export const ROLES = {
  owner: { label: "Owner", desc: "Everything, including team and access", perms: PERMISSIONS.map((p) => p[0]) },
  manager: { label: "Manager", desc: "Everything except team and access", perms: PERMISSIONS.map((p) => p[0]).filter((p) => p !== "users") },
  orders: { label: "Orders & customers", desc: "Orders, subscribers and messages", perms: ["dashboard", "orders", "subscribers", "messages"] },
  content: { label: "Products & content", desc: "Products and reviews", perms: ["dashboard", "products", "reviews"] },
  viewer: { label: "Viewer", desc: "Dashboard and visitor stats only", perms: ["dashboard", "analytics"] },
};

async function post(path, body) {
  const res = await fetch(`${BASE}/api${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { res, data: await res.json().catch(() => ({})) };
}

// Uses the staff add-on (roles) when installed, otherwise the store's original single admin login.
export async function login(email, password) {
  let { res, data } = await post("/staff/login", { email, password });
  if (res.status === 404) {
    ({ res, data } = await post("/auth/login", { email, password }));
    if (!res.ok) throw new Error(res.status === 401 ? "That email and password don’t match an admin account." : (data.detail || "Couldn’t sign in. Please try again."));
    return { mode: "live", staff: false, token: data.access_token, user: { email, name: data.user?.name || "", role: "owner", permissions: ROLES.owner.perms } };
  }
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Couldn’t sign in. Please try again.");
  return { mode: "live", staff: true, token: data.access_token, user: data.user };
}

// ---- Orders: the backend's order shape isn't documented, so normalise common field names.
const num = (v) => (typeof v === "number" ? v : parseFloat(v) || 0);
export function normalizeOrder(o) {
  const rawAmount = o.amount ?? o.total ?? o.amount_total ?? o.total_amount ?? 0;
  let amount = num(rawAmount);
  if (o.amount_total != null && Number.isInteger(o.amount_total) && amount > 1000) amount /= 100; // Stripe cents
  const status = String(o.payment_status || o.status || "pending").toLowerCase();
  const items = (o.items || o.metadata?.items || o.line_items || []).map((i) => {
    const slug = i.slug || i.product_slug;
    const p = catalog.find((x) => x.slug === slug);
    return { slug, name: i.name || p?.name || slug, qty: num(i.quantity ?? i.qty ?? 1), price: num(i.price ?? i.unit_price ?? p?.price ?? 0), image: p?.image };
  });
  return {
    id: o.id || o.session_id || o._id || Math.random().toString(36).slice(2),
    session: o.session_id || "",
    email: o.customer_email || o.email || o.metadata?.email || "",
    name: o.customer_name || o.name || "",
    amount, currency: (o.currency || "usd").toUpperCase(),
    status: status === "complete" || status === "succeeded" ? "paid" : status === "unpaid" || status === "open" || status === "initiated" ? "pending" : status,
    created: o.created_at || o.createdAt || o.timestamp || null,
    items,
  };
}

export function api(session) {
  if (session.mode === "demo") {
    const d = makeDemo();
    const wait = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 120));
    return {
      orders: () => wait(d.orders),
      analytics: (days) => wait(d.analytics(days)),
      products: () => wait(d.products),
      updateProduct: (slug, patch) => { const p = d.products.find((x) => x.slug === slug); Object.assign(p, patch); return wait(p); },
      createProduct: (p) => { d.products.unshift({ ...p, id: p.slug }); return wait(p); },
      uploadImage: async (file) => ({ url: URL.createObjectURL(file) }),
      reviews: () => wait(d.reviews),
      deleteReview: (id) => { d.reviews = d.reviews.filter((r) => r.id !== id); return wait({ ok: true }); },
      subscribers: () => wait(d.subscribers),
      messages: () => wait(d.messages),
      users: () => wait(d.users),
      addUser: (u) => {
        if (d.users.some((x) => x.email === u.email.toLowerCase())) return Promise.reject(new Error("Someone on the team already uses that email."));
        const nu = { id: `u${Date.now()}`, email: u.email.toLowerCase(), name: u.name, role: u.role, permissions: u.role === "owner" ? ROLES.owner.perms : u.permissions || ROLES[u.role].perms, active: true, created_at: new Date().toISOString(), last_login: null };
        d.users.push(nu); return wait(nu);
      },
      updateUser: (id, patch) => {
        const u = d.users.find((x) => x.id === id);
        if (u.role === "owner" && (patch.role && patch.role !== "owner" || patch.active === false) && d.users.filter((x) => x.role === "owner" && x.active).length <= 1) return Promise.reject(new Error("The store needs at least one active owner."));
        Object.assign(u, patch); if (patch.role && !patch.permissions) u.permissions = ROLES[patch.role].perms; if (u.role === "owner") u.permissions = ROLES.owner.perms;
        return wait(u);
      },
      resetPassword: () => wait({ ok: true }),
      deleteUser: (id) => { d.users = d.users.filter((x) => x.id !== id); return wait({ ok: true }); },
      changePassword: (cur) => (cur ? wait({ access_token: "demo", user: session.user }) : Promise.reject(new Error("Your current password isn’t right."))),
    };
  }
  return {
    orders: async () => {
      const r = await req(session, "/admin/orders");
      return (Array.isArray(r) ? r : r?.orders || r?.items || []).map(normalizeOrder);
    },
    analytics: async (days) => {
      try { return await req(session, `/admin/analytics?days=${days}`); }
      catch (e) { if (e.auth) throw e; return null; } // add-on not installed yet
    },
    products: () => fetch(`${BASE}/api/products`).then((r) => r.json()),
    updateProduct: (slug, patch) => req(session, `/admin/products/${encodeURIComponent(slug)}`, { method: "PATCH", body: patch }),
    createProduct: (p) => req(session, "/admin/products", { method: "POST", body: p }),
    uploadImage: (file) => { const f = new FormData(); f.append("file", file); return req(session, "/admin/uploads", { method: "POST", form: f }); },
    reviews: async () => {
      const all = await Promise.all(catalog.map((p) => fetch(`${BASE}/api/products/${p.slug}/reviews`).then((r) => r.json()).then((rs) => (Array.isArray(rs) ? rs : [])).catch(() => [])));
      return all.flat().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    },
    deleteReview: (id) => req(session, `/admin/reviews/${encodeURIComponent(id)}`, { method: "DELETE" }),
    subscribers: async () => { const r = await req(session, "/admin/subscribers"); return Array.isArray(r) ? r : r?.subscribers || []; },
    messages: async () => { const r = await req(session, "/admin/contact-messages"); return Array.isArray(r) ? r : r?.messages || []; },
    users: () => req(session, "/staff/users"),
    addUser: (u) => req(session, "/staff/users", { method: "POST", body: u }),
    updateUser: (id, patch) => req(session, `/staff/users/${id}`, { method: "PATCH", body: patch }),
    resetPassword: (id, pw) => req(session, `/staff/users/${id}/reset-password`, { method: "POST", body: { new_password: pw } }),
    deleteUser: (id) => req(session, `/staff/users/${id}`, { method: "DELETE" }),
    changePassword: (current, next) => req(session, "/staff/me/password", { method: "POST", body: { current_password: current, new_password: next } }),
  };
}

// CSV download helper
export function downloadCSV(name, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
