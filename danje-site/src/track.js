// Anonymous visitor analytics for the admin dashboard.
// Sends small events to POST /api/track/event (see backend-addon/analytics.py).
// No personal data: a random visitor id (localStorage) and session id (30 min idle).
// Does nothing in the design preview (no VITE_API_URL) or for visitors with Do Not Track on.
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const SESSION_IDLE = 30 * 60 * 1000;

const rid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

function ids() {
  let visitor, session;
  try {
    visitor = localStorage.getItem("dj-vid") || rid();
    localStorage.setItem("dj-vid", visitor);
    const raw = JSON.parse(sessionStorage.getItem("dj-sid") || "null");
    session = raw && Date.now() - raw.t < SESSION_IDLE ? raw.id : rid();
    sessionStorage.setItem("dj-sid", JSON.stringify({ id: session, t: Date.now() }));
  } catch { visitor = visitor || "anon"; session = session || "anon"; }
  return { visitor, session };
}

const device = () => {
  const w = window.innerWidth;
  return w < 640 ? "mobile" : w < 1060 ? "tablet" : "desktop";
};

/**
 * @param {"pageview"|"product_view"|"cart_add"|"wishlist_add"|"wishlist_remove"|"checkout_start"|"search"} type
 * @param {{slug?: string, qty?: number, value?: number, query?: string}} [data]
 */
export function track(type, data = {}) {
  if (!BASE || navigator.doNotTrack === "1") return;
  if (window.location.pathname.startsWith("/admin")) return;
  const { visitor, session } = ids();
  const body = JSON.stringify({
    type, ...data,
    path: window.location.pathname,
    referrer: document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : "",
    visitor_id: visitor, session_id: session, device: device(),
  });
  try {
    const url = `${BASE}/api/track/event`;
    if (!(navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "application/json" })))) {
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* analytics must never break the shop */ }
}
