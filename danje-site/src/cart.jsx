// Cart + wishlist. Saved in the browser so the basket survives a page reload.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { products } from "./data/angels.js";
import { track } from "./track.js";

const CartCtx = createContext(null);
const KEY = "dj-cart-v1";
export const SHIPPING = 7.99;
export const FREE_SHIPPING_FROM = 75;

const load = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { items: Array.isArray(raw.items) ? raw.items : [], liked: Array.isArray(raw.liked) ? raw.liked : [] };
  } catch { return { items: [], liked: [] }; }
};

export function CartProvider({ children }) {
  const [state] = useState(load);
  const [items, setItems] = useState(() => state.items.filter((i) => products.some((p) => p.id === i.id)));
  const [liked, setLiked] = useState(() => new Set(state.liked));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ items, liked: [...liked] })); } catch { /* storage blocked */ }
  }, [items, liked]);

  const setQty = useCallback((id, qty) => setItems((cur) =>
    qty <= 0 ? cur.filter((i) => i.id !== id) : cur.map((i) => (i.id === id ? { ...i, qty: Math.min(qty, 20) } : i))), []);

  const value = useMemo(() => {
    const lines = items.map((i) => ({ ...i, product: products.find((p) => p.id === i.id) })).filter((l) => l.product);
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING;
    return {
      items, lines, subtotal, shipping, total: subtotal + shipping,
      count: items.reduce((n, i) => n + i.qty, 0),
      add: (id, qty = 1) => {
        const pr = products.find((x) => x.id === id);
        track("cart_add", { slug: pr?.slug, qty, value: pr ? pr.price * qty : 0 });
        setItems((cur) => {
          const f = cur.find((i) => i.id === id);
          return f ? cur.map((i) => (i.id === id ? { ...i, qty: Math.min(i.qty + qty, 20) } : i)) : [...cur, { id, qty }];
        });
        setOpen(true);
      },
      setQty,
      remove: (id) => setQty(id, 0),
      clear: () => setItems([]),
      open, setOpen,
      liked,
      toggleLike: (id) => {
        track(liked.has(id) ? "wishlist_remove" : "wishlist_add", { slug: products.find((x) => x.id === id)?.slug });
        setLiked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
      },
    };
  }, [items, liked, open, setQty]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
