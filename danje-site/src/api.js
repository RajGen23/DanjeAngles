// Talks to the existing DanJe' Angels backend (FastAPI on Railway).
// Set VITE_API_URL (e.g. https://dananjels-dolls-api-production.up.railway.app) when building
// for the live site. Without it (the design preview) calls resolve with { preview: true }.
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const API_ENABLED = Boolean(BASE);

async function call(path, { method = "GET", body } = {}) {
  if (!BASE) return { preview: true };
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : "";
    throw new Error(detail || `The store returned an error (${res.status}). Please try again in a moment.`);
  }
  return data;
}

// Stripe checkout: backend expects { items: [{ slug, quantity }], origin_url, customer_email? }
export const startCheckout = (items, email) =>
  call("/checkout/session", { method: "POST", body: { items, origin_url: window.location.origin, customer_email: email || undefined } });
export const checkoutStatus = (sessionId) => call(`/checkout/status/${encodeURIComponent(sessionId)}`);
export const subscribe = (email, name) => call("/newsletter", { method: "POST", body: { email, name } });
export const sendContact = (msg) => call("/contact", { method: "POST", body: msg });
export const getReviews = (slug) => call(`/products/${encodeURIComponent(slug)}/reviews`);
export const postReview = (slug, review) => call(`/products/${encodeURIComponent(slug)}/reviews`, { method: "POST", body: review });
