import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import PageHead from "../components/PageHead.jsx";
import { checkoutStatus } from "../api.js";
import { useCart } from "../cart.jsx";

// Stripe sends shoppers back here. Point the backend's success/cancel URLs at
// /checkout/success?session_id={CHECKOUT_SESSION_ID} and /checkout/cancel.
export default function CheckoutResult({ cancelled = false }) {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { clear } = useCart();
  const [status, setStatus] = useState(cancelled ? "cancelled" : sessionId ? "checking" : "unknown");

  useEffect(() => {
    if (cancelled || !sessionId) return;
    let tries = 0, stop = false;
    const poll = async () => {
      try {
        const res = await checkoutStatus(sessionId);
        if (res?.payment_status === "paid") { setStatus("paid"); clear(); return; }
        if (res?.status === "expired") { setStatus("failed"); return; }
      } catch { /* retry */ }
      if (!stop && ++tries < 8) setTimeout(poll, 2000); else if (!stop) setStatus("pending");
    };
    poll();
    return () => { stop = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelled, sessionId]);

  const copy = {
    checking: [Loader2, "Confirming your order…", "This only takes a moment."],
    paid: [CheckCircle2, "Thank you for your order!", "Your angels are on their way. A receipt has been sent to your email."],
    pending: [Loader2, "We’re still confirming your payment", "You’ll get an email as soon as it goes through."],
    failed: [XCircle, "Your payment didn’t go through", "Nothing was charged. Your basket is saved, so you can try again."],
    cancelled: [XCircle, "Checkout cancelled", "Nothing was charged. Your basket is saved for when you’re ready."],
    unknown: [CheckCircle2, "Thank you!", "If you placed an order, a receipt is on its way to your email."],
  }[status];
  const [Icon, title, text] = copy;

  return (
    <section className="dj-shop dj-sky">
      <div className="dj-container">
        <PageHead title={title}>{text}</PageHead>
        <div className="dj-center dj-result">
          <Icon size={56} className={status === "checking" || status === "pending" ? "dj-spin" : ""} />
          <Link to="/shop" className="dj-btn dj-btn--purple">Keep shopping</Link>
        </div>
      </div>
    </section>
  );
}
