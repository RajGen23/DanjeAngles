import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Minus, Plus, Trash2, ShoppingBag, Lock, ArrowRight } from "lucide-react";
import { useCart, FREE_SHIPPING_FROM } from "../cart.jsx";
import { startCheckout, API_ENABLED } from "../api.js";
import { Crown } from "./Decor.jsx";

const money = (n) => `$${n.toFixed(2)}`;

export default function CartDrawer() {
  const { lines, subtotal, shipping, total, count, setQty, remove, open, setOpen } = useCart();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) { setError(""); setNote(""); return; }
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, setOpen]);

  const checkout = async () => {
    setError(""); setNote("");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) { setError("Please enter a valid email address, or leave it empty."); return; }
    setBusy(true);
    try {
      const res = await startCheckout(lines.map((l) => ({ slug: l.product.slug, quantity: l.qty })), email);
      if (res?.preview) {
        setNote("This is the design preview, so payment isn't connected here. On the live site this button opens secure Stripe checkout with these items.");
      } else if (res?.url) {
        window.location.assign(res.url);
        return;
      } else {
        setError("Checkout didn't return a payment page. Please try again.");
      }
    } catch (e) {
      setError(e.message || "Checkout failed. Please try again.");
    }
    setBusy(false);
  };

  const toFree = Math.max(0, FREE_SHIPPING_FROM - subtotal);

  return (
    <div className={`dj-cartdrawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="dj-cartdrawer__scrim" onClick={() => setOpen(false)} />
      <aside className="dj-cartdrawer__panel" role="dialog" aria-modal="true" aria-label="Your basket">
        <header className="dj-cartdrawer__head">
          <div>
            <span className="dj-cartdrawer__eyebrow"><Crown size={14} /> Your basket</span>
            <h2 className="dj-h3">{count ? `${count} heavenly ${count === 1 ? "pick" : "picks"}` : "Your basket is empty"}</h2>
          </div>
          <button className="dj-cartdrawer__close" onClick={() => setOpen(false)} aria-label="Close basket"><X size={20} /></button>
        </header>

        {lines.length === 0 ? (
          <div className="dj-cartdrawer__empty">
            <ShoppingBag size={42} strokeWidth={1.3} />
            <p>No angels in your basket yet.</p>
            <Link to="/shop" className="dj-btn dj-btn--purple" onClick={() => setOpen(false)}>Shop the Angels <ArrowRight size={16} /></Link>
          </div>
        ) : (
          <>
            <ul className="dj-cartdrawer__lines">
              {lines.map(({ id, qty, product: p }) => (
                <li key={id} className="dj-cartline">
                  <Link to={`/product/${p.slug}`} onClick={() => setOpen(false)} className={`dj-cartline__img dj-tone--${p.color === "green" ? "green" : p.color}`}>
                    <img src={p.image} alt={p.name} />
                  </Link>
                  <div className="dj-cartline__info">
                    <Link to={`/product/${p.slug}`} onClick={() => setOpen(false)} className="dj-cartline__name">{p.name}</Link>
                    <span className="dj-cartline__price">{money(p.price)}</span>
                    <div className="dj-cartline__row">
                      <div className="dj-qty dj-qty--sm">
                        <button onClick={() => setQty(id, qty - 1)} aria-label={`Decrease ${p.title}`}><Minus size={13} /></button>
                        <span>{qty}</span>
                        <button onClick={() => setQty(id, qty + 1)} aria-label={`Increase ${p.title}`}><Plus size={13} /></button>
                      </div>
                      <button className="dj-cartline__remove" onClick={() => remove(id)}><Trash2 size={14} /> Remove</button>
                    </div>
                  </div>
                  <strong className="dj-cartline__total">{money(p.price * qty)}</strong>
                </li>
              ))}
            </ul>
            <footer className="dj-cartdrawer__foot">
              <div className="dj-ship-meter">
                <span>{toFree > 0 ? <>Add <strong>{money(toFree)}</strong> more for free shipping.</> : <>You’ve unlocked <strong>free shipping</strong>!</>}</span>
                <b className="dj-ship-meter__track"><i style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_FROM) * 100)}%` }} /></b>
              </div>
              <dl className="dj-totals">
                <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
                <div><dt>Shipping</dt><dd>{shipping ? money(shipping) : "Free"}</dd></div>
                <div className="is-total"><dt>Total</dt><dd>{money(total)}</dd></div>
              </dl>
              <label className="dj-field dj-field--sm">
                <input id="checkout-email" type="email" placeholder="Email for your receipt (optional)" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </label>
              {error && <p className="dj-form-error" role="alert">{error}</p>}
              {note && <p className="dj-form-note" role="status">{note}</p>}
              <button className="dj-btn dj-btn--magenta dj-cartdrawer__checkout" onClick={checkout} disabled={busy}>
                <Lock size={15} /> {busy ? "Opening secure checkout…" : "Continue to checkout"}
              </button>
              <p className="dj-cartdrawer__secure">{API_ENABLED ? "Secure payment by Stripe." : "Secure payment by Stripe on the live site."}</p>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
