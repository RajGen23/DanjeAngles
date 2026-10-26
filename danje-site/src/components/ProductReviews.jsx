import { useEffect, useState } from "react";
import { Star, PenLine, X, Check } from "lucide-react";
import { getReviews, postReview, API_ENABLED } from "../api.js";

const Stars = ({ value, size = 15 }) => (
  <span className="dj-rv__stars" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} fill={n <= Math.round(value) ? "#f5b82e" : "none"} stroke="#f5b82e" />)}
  </span>
);
const when = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "");

export default function ProductReviews({ slug, name }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", rating: 5, comment: "" });
  const [hover, setHover] = useState(0);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setList([]); setMsg(""); setErr(""); setOpen(false);
    if (!API_ENABLED) return;
    getReviews(slug).then((r) => setList(Array.isArray(r) ? r.filter((x) => x.approved !== false) : [])).catch(() => {});
  }, [slug]);

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email) || f.comment.trim().length < 5) {
      setErr("Please add your name, a valid email and a few words about your angel."); return;
    }
    setBusy(true);
    try {
      const res = await postReview(slug, { name: f.name.trim(), email: f.email.trim(), rating: Number(f.rating), comment: f.comment.trim() });
      setMsg(res?.preview ? "Thank you! This design preview doesn’t save reviews; on the live site it goes to the store for approval." : "Thank you! Your review will appear once it’s approved.");
      setF({ name: "", email: "", rating: 5, comment: "" }); setOpen(false);
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };

  const count = list.length;
  const avg = count ? list.reduce((s, r) => s + r.rating, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: list.filter((r) => r.rating === n).length }));

  return (
    <section className="dj-rv" aria-labelledby="reviews-title">
      <aside className="dj-rv__summary">
        <h2 id="reviews-title" className="dj-h2">Reviews</h2>
        {count ? (
          <>
            <div className="dj-rv__avg"><strong>{avg.toFixed(1)}</strong><div><Stars value={avg} size={18} /><span>Based on {count} review{count === 1 ? "" : "s"}</span></div></div>
            <ul className="dj-rv__dist">
              {dist.map(({ n, c }) => (
                <li key={n}><span>{n} <Star size={11} fill="#f5b82e" stroke="#f5b82e" /></span><i><b style={{ width: `${(c / count) * 100}%` }} /></i><em>{c}</em></li>
              ))}
            </ul>
          </>
        ) : (
          <p className="dj-rv__none">No reviews yet. Be the first to share how {name} blessed your family.</p>
        )}
        {!open && <button className="dj-btn dj-btn--purple dj-rv__write" onClick={() => { setOpen(true); setMsg(""); }}><PenLine size={16} /> Write a review</button>}
        {msg && <p className="dj-rv__thanks" role="status"><Check size={16} /> {msg}</p>}
      </aside>

      <div className="dj-rv__main">
        {open && (
          <form className="dj-rv__form" onSubmit={submit} noValidate>
            <div className="dj-rv__formhead">
              <h3 className="dj-h3">Share your experience</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close review form"><X size={18} /></button>
            </div>
            <div className="dj-rv__rate" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} role="radio" aria-checked={f.rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onMouseEnter={() => setHover(n)} onClick={() => setF({ ...f, rating: n })}>
                  <Star size={28} fill={n <= (hover || f.rating) ? "#f5b82e" : "none"} stroke="#f5b82e" />
                </button>
              ))}
              <span>{["", "Not for us", "It’s okay", "Good", "Lovely", "We love it!"][hover || f.rating]}</span>
            </div>
            <div className="dj-form-row">
              <label className="dj-label">Your name<input id="review-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></label>
              <label className="dj-label"><span>Email <small>(never shown)</small></span><input id="review-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></label>
            </div>
            <label className="dj-label">Your review<textarea id="review-comment" rows={4} value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} placeholder={`How has ${name} blessed your family?`} /></label>
            {err && <p className="dj-form-error" role="alert">{err}</p>}
            <div className="dj-rv__actions">
              <button className="dj-btn dj-btn--purple" disabled={busy}>{busy ? "Sending…" : "Submit review"}</button>
              <button type="button" className="dj-btn dj-btn--outline-pink" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        )}

        {count > 0 ? (
          <ul className="dj-rv__list">
            {list.map((r) => (
              <li key={r.id} className="dj-rv__item">
                <div className="dj-rv__who">
                  <span className="dj-rv__avatar">{r.name.slice(0, 1).toUpperCase()}</span>
                  <div><strong>{r.name}</strong><small>{when(r.created_at)}</small></div>
                  <Stars value={r.rating} />
                </div>
                <p>{r.comment}</p>
              </li>
            ))}
          </ul>
        ) : !open && (
          <div className="dj-rv__empty">
            <Stars value={0} size={26} />
            <p>Your review helps other families find the right angel.</p>
          </div>
        )}
      </div>
    </section>
  );
}
