import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { getReviews, postReview, API_ENABLED } from "../api.js";

export default function ProductReviews({ slug, name }) {
  const [list, setList] = useState([]);
  const [f, setF] = useState({ name: "", email: "", rating: 5, comment: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setList([]); setMsg(""); setErr("");
    if (!API_ENABLED) return;
    getReviews(slug).then((r) => setList(Array.isArray(r) ? r.filter((x) => x.approved !== false) : [])).catch(() => {});
  }, [slug]);

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email) || f.comment.trim().length < 5) {
      setErr("Please add your name, a valid email and a short review."); return;
    }
    setBusy(true);
    try {
      const res = await postReview(slug, { name: f.name.trim(), email: f.email.trim(), rating: Number(f.rating), comment: f.comment.trim() });
      setMsg(res?.preview ? "Thanks! This design preview doesn’t save reviews; on the live site it goes to the store for approval." : "Thank you! Your review will appear once it’s approved.");
      setF({ name: "", email: "", rating: 5, comment: "" });
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };

  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;

  return (
    <section className="dj-pdp__reviews">
      <h2 className="dj-h2 dj-center">Reviews</h2>
      {list.length > 0 ? (
        <>
          <p className="dj-center dj-pdp__avg">{avg.toFixed(1)} out of 5 · {list.length} review{list.length === 1 ? "" : "s"}</p>
          <div className="dj-reviews__grid">
            {list.map((r) => (
              <figure key={r.id} className="dj-review dj-tone--purple">
                <div className="dj-review__stars">{[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < r.rating ? "#f5b82e" : "none"} stroke="#f5b82e" />)}</div>
                <blockquote>“{r.comment}”</blockquote>
                <figcaption><span className="dj-review__avatar">{r.name.slice(0, 1)}</span><strong>{r.name}</strong></figcaption>
              </figure>
            ))}
          </div>
        </>
      ) : (
        <p className="dj-center dj-pdp__avg">No reviews yet — be the first to share how {name} blessed your family.</p>
      )}
      <form className="dj-card dj-reviewform" onSubmit={submit} noValidate>
        <h3 className="dj-h3">Write a review</h3>
        <div className="dj-form-row">
          <label className="dj-label">Name<input id="review-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="dj-label">Email (never shown)<input id="review-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        </div>
        <div className="dj-label">Rating
          <div className="dj-starpick" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} role="radio" aria-checked={f.rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setF({ ...f, rating: n })}>
                <Star size={22} fill={n <= f.rating ? "#f5b82e" : "none"} stroke="#f5b82e" />
              </button>
            ))}
          </div>
        </div>
        <label className="dj-label">Your review<textarea id="review-comment" rows={4} value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} /></label>
        {err && <p className="dj-form-error" role="alert">{err}</p>}
        {msg && <p className="dj-form-note" role="status">{msg}</p>}
        <button className="dj-btn dj-btn--purple" disabled={busy}>{busy ? "Sending…" : "Submit review"}</button>
      </form>
    </section>
  );
}
