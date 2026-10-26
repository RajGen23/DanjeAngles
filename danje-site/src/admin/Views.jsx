import { useMemo, useRef, useState } from "react";
import { Search, Download, X, Star, Trash2, Plus, Upload, Check, RefreshCw } from "lucide-react";
import { useData, money, fmtDateTime } from "./useData.js";
import { downloadCSV } from "./adminApi.js";
import { TimeChart, BarList } from "./Charts.jsx";
import { PeriodPicker, StatusPill, AddonNotice, inPeriod } from "./Dashboard.jsx";
import { products as catalog } from "../data/angels.js";

const bySlug = (s) => catalog.find((p) => p.slug === s);
const Loading = () => <div className="ad-card"><div className="ad-skel" /></div>;
const Err = ({ d }) => <div className="ad-card ad-error">{d.error} <button className="ad-link" onClick={d.reload}>Try again</button></div>;

/* ------------------------------ Orders ------------------------------ */
export function Orders({ client, onAuthError }) {
  const d = useData(() => client.orders(), [client], onAuthError);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [days, setDays] = useState(90);
  const [open, setOpen] = useState(null);
  const [limit, setLimit] = useState(50);

  const list = useMemo(() => {
    if (!d.data) return [];
    const t = q.trim().toLowerCase();
    return inPeriod(d.data, days).filter((o) => (status === "all" || o.status === status) &&
      (!t || [o.name, o.email, o.id, ...o.items.map((i) => i.name)].join(" ").toLowerCase().includes(t)));
  }, [d.data, q, status, days]);

  if (d.error) return <Err d={d} />;
  if (!d.data) return <Loading />;
  const counts = inPeriod(d.data, days).reduce((c, o) => ({ ...c, [o.status]: (c[o.status] || 0) + 1 }), {});
  const total = list.filter((o) => o.status === "paid").reduce((s, o) => s + o.amount, 0);

  return (
    <div className="ad-stack">
      <div className="ad-toolbar">
        <PeriodPicker value={days} onChange={setDays} />
        <div className="ad-seg">
          {[["all", "All"], ["paid", "Paid"], ["pending", "Pending"], ["expired", "Expired"]].map(([k, l]) => (
            <button key={k} className={status === k ? "is-on" : ""} onClick={() => setStatus(k)}>{l}{k !== "all" && counts[k] ? ` · ${counts[k]}` : ""}</button>
          ))}
        </div>
        <label className="ad-search"><Search size={15} /><input id="order-search" placeholder="Search name, email, product" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <button className="ad-btn" onClick={() => downloadCSV("danje-orders.csv", list.map((o) => ({ order: o.id, date: o.created, name: o.name, email: o.email, status: o.status, items: o.items.map((i) => `${i.qty}x ${i.name}`).join("; "), total: o.amount.toFixed(2), currency: o.currency })))}><Download size={15} /> Export CSV</button>
      </div>
      <p className="ad-muted">{list.length} order{list.length === 1 ? "" : "s"} · {money(total)} paid</p>
      <div className="ad-card ad-tablewrap">
        {list.length ? (
          <table className="ad-table ad-table--click">
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Date</th><th>Status</th><th className="num">Total</th></tr></thead>
            <tbody>{list.slice(0, limit).map((o) => (
              <tr key={o.id} onClick={() => setOpen(o)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(o)}>
                <td className="ad-mono">{o.id.slice(-8)}</td>
                <td>{o.name || "Guest"}<small>{o.email}</small></td>
                <td>{o.items.reduce((s, i) => s + i.qty, 0)} item{o.items.reduce((s, i) => s + i.qty, 0) === 1 ? "" : "s"}</td>
                <td>{fmtDateTime(o.created)}</td><td><StatusPill status={o.status} /></td><td className="num">{money(o.amount, o.currency)}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <p className="ad-empty">No orders match these filters.</p>}
      </div>
      {list.length > limit && <button className="ad-btn" onClick={() => setLimit((l) => l + 50)}>Show 50 more ({list.length - limit} left)</button>}
      {open && (
        <div className="ad-drawer" role="dialog" aria-label="Order details">
          <div className="ad-drawer__scrim" onClick={() => setOpen(null)} />
          <aside className="ad-drawer__panel">
            <header><div><h2>Order {open.id.slice(-8)}</h2><StatusPill status={open.status} /></div><button onClick={() => setOpen(null)} aria-label="Close"><X size={18} /></button></header>
            <dl className="ad-dl">
              <dt>Customer</dt><dd>{open.name || "Guest"}<br /><span className="ad-select">{open.email || "No email"}</span></dd>
              <dt>Placed</dt><dd>{fmtDateTime(open.created)}</dd>
              {open.session && <><dt>Stripe session</dt><dd className="ad-mono ad-select">{open.session}</dd></>}
            </dl>
            <ul className="ad-lines">{open.items.map((i) => (
              <li key={i.slug}>{i.image && <img src={i.image} alt="" />}<span>{i.name}<small>{i.qty} × {money(i.price)}</small></span><strong>{money(i.qty * i.price)}</strong></li>
            ))}</ul>
            <div className="ad-total"><span>Total charged</span><strong>{money(open.amount, open.currency)}</strong></div>
            {open.status === "paid" && <p className="ad-muted">Refunds and shipping labels are handled in your Stripe dashboard.</p>}
          </aside>
        </div>
      )}
    </div>
  );
}

/* --------------------------- Visitors & wishlist --------------------------- */
export function Visitors({ client, onAuthError }) {
  const [days, setDays] = useState(30);
  const d = useData(() => client.analytics(days), [client, days], onAuthError);
  if (d.error) return <Err d={d} />;
  if (d.loading && !d.data) return <Loading />;
  const a = d.data;
  if (!a) return <><div className="ad-toolbar"><PeriodPicker value={days} onChange={setDays} /></div><AddonNotice /></>;
  const dev = Object.entries(a.devices || {}).map(([k, v]) => ({ label: k[0].toUpperCase() + k.slice(1), value: v }));
  const share = (v) => (a.totals.visitors ? `${((v / a.totals.visitors) * 100).toFixed(0)}%` : "");
  return (
    <div className="ad-stack">
      <div className="ad-toolbar"><PeriodPicker value={days} onChange={setDays} /><span className="ad-live"><i /> {a.live_visitors} on the site now</span><button className="ad-btn" onClick={d.reload}><RefreshCw size={14} /> Refresh</button></div>
      <section className="ad-kpis ad-kpis--4">
        <div className="ad-kpi"><span>Visitors</span><strong>{a.totals.visitors.toLocaleString()}</strong></div>
        <div className="ad-kpi"><span>Page views</span><strong>{a.totals.pageviews.toLocaleString()}</strong></div>
        <div className="ad-kpi"><span>Pages per visit</span><strong>{a.totals.avg_pages}</strong></div>
        <div className="ad-kpi"><span>Wishlist adds</span><strong>{a.wishlist_total.adds.toLocaleString()}</strong></div>
      </section>
      <section className="ad-card">
        <header className="ad-card__head"><h2>Visitors per day</h2></header>
        <TimeChart data={a.days.map((x) => ({ date: x.date, value: x.visitors }))} label="Visitors per day" />
      </section>
      <div className="ad-grid3">
        <section className="ad-card"><header className="ad-card__head"><h2>Wishlist leaderboard</h2><span className="ad-muted">Net saves</span></header>
          <BarList rows={a.wishlist.map((w) => ({ label: bySlug(w.slug)?.name || w.slug, value: w.net, sub: `${w.adds} added · ${w.removes} removed`, image: bySlug(w.slug)?.image }))} /></section>
        <section className="ad-card"><header className="ad-card__head"><h2>Added to basket</h2></header>
          <BarList rows={a.cart_adds.map((c) => ({ label: bySlug(c.slug)?.name || c.slug, value: c.count, image: bySlug(c.slug)?.image }))} /></section>
        <section className="ad-card"><header className="ad-card__head"><h2>Top pages</h2></header>
          <BarList rows={a.top_pages.slice(0, 10).map((p) => ({ label: p.path.startsWith("/product/") ? bySlug(p.path.split("/")[2])?.name || p.path : p.path === "/" ? "Home" : p.path, value: p.views }))} /></section>
      </div>
      <div className="ad-grid3">
        <section className="ad-card"><header className="ad-card__head"><h2>Where visitors come from</h2></header>
          <BarList rows={a.referrers.map((r) => ({ label: r.source, value: r.visitors, sub: share(r.visitors) }))} /></section>
        <section className="ad-card"><header className="ad-card__head"><h2>Devices</h2></header>
          <BarList rows={dev.map((x) => ({ ...x, sub: share(x.value) }))} /></section>
        <section className="ad-card"><header className="ad-card__head"><h2>What people search for</h2></header>
          <BarList rows={(a.searches || []).map((s) => ({ label: `“${s.query}”`, value: s.count }))} empty="No searches yet." /></section>
      </div>
      <p className="ad-muted">Visitors are counted anonymously (no names, emails or IP addresses are stored). Wishlists live in each shopper’s browser; these numbers count saves and removals.</p>
    </div>
  );
}

/* ------------------------------ Products ------------------------------ */
const CATS = [["angels", "Angel Dolls"], ["vinyl-dolls", "Vinyl Dolls"], ["wall-art", "Angel Wall Art"]];
const blank = { slug: "", name: "", category: "angels", category_label: "Angel Dolls", short_description: "", description: "", scripture: "", price: "", image: "", gallery: [], materials: [], featured: false, in_stock: true };

function ProductForm({ client, onSaved, onCancel }) {
  const [f, setF] = useState(blank);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const upload = async (file) => {
    if (!file) return; setBusy(true); setErr("");
    try { const r = await client.uploadImage(file); setF((x) => ({ ...x, image: r.url || r.path || r.file_url || "" })); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const save = async (e) => {
    e.preventDefault();
    const slug = (f.slug || f.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!f.name.trim() || !slug || !(parseFloat(f.price) > 0)) { setErr("Name and a price above 0 are required."); return; }
    setBusy(true); setErr("");
    const body = { ...f, slug, price: parseFloat(f.price), category_label: CATS.find((c) => c[0] === f.category)?.[1] || f.category, gallery: f.image ? [f.image] : [] };
    try { onSaved(await client.createProduct(body) || body); } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };
  return (
    <form className="ad-card ad-form" onSubmit={save} noValidate>
      <h2>New product</h2>
      <div className="ad-form__grid">
        <label>Name<input id="np-name" value={f.name} onChange={set("name")} placeholder="Janai — Healing (Purple)" /></label>
        <label>Price (USD)<input id="np-price" type="number" min="0" step="0.01" value={f.price} onChange={set("price")} /></label>
        <label>Category<select id="np-cat" value={f.category} onChange={set("category")}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>Web address (slug)<input id="np-slug" value={f.slug} onChange={set("slug")} placeholder="made from the name if empty" /></label>
      </div>
      <label>Short description<input id="np-short" value={f.short_description} onChange={set("short_description")} /></label>
      <label>Description<textarea id="np-desc" rows={4} value={f.description} onChange={set("description")} /></label>
      <label>Scripture<input id="np-scripture" value={f.scripture} onChange={set("scripture")} placeholder="“…” — Psalm 91:11" /></label>
      <div className="ad-form__img">
        {f.image ? <img src={f.image} alt="" /> : <span>No image</span>}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files[0])} />
        <button type="button" className="ad-btn" onClick={() => fileRef.current.click()}><Upload size={15} /> Upload photo</button>
      </div>
      <div className="ad-form__checks">
        <label><input type="checkbox" checked={f.in_stock} onChange={set("in_stock")} /> In stock</label>
        <label><input type="checkbox" checked={f.featured} onChange={set("featured")} /> Featured on home page</label>
      </div>
      {err && <p className="ad-error">{err}</p>}
      <div className="ad-row"><button className="ad-btn ad-btn--primary" disabled={busy}>{busy ? "Saving…" : "Add product"}</button><button type="button" className="ad-btn ad-btn--ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function ProductRow({ p, client, onChange }) {
  const [price, setPrice] = useState(String(p.price));
  const [state, setState] = useState("");
  const save = async (patch) => {
    setState("saving");
    try { await client.updateProduct(p.slug, patch); onChange({ ...p, ...patch }); setState("saved"); setTimeout(() => setState(""), 1400); }
    catch (e) { setState(e.message); }
  };
  const dirty = parseFloat(price) !== p.price;
  return (
    <tr>
      <td><div className="ad-prod"><img src={bySlug(p.slug)?.image || p.image} alt="" /><span>{p.name}<small>{p.category_label}</small></span></div></td>
      <td>
        <div className="ad-price"><span>$</span><input aria-label={`Price for ${p.name}`} type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
          {dirty && <button className="ad-btn ad-btn--sm ad-btn--primary" onClick={() => parseFloat(price) > 0 && save({ price: parseFloat(price) })}>Save</button>}</div>
      </td>
      <td><button className={`ad-toggle ${p.in_stock ? "is-on" : ""}`} role="switch" aria-checked={p.in_stock} aria-label={`${p.name} in stock`} onClick={() => save({ in_stock: !p.in_stock })}><i /></button> <span className="ad-muted">{p.in_stock ? "In stock" : "Sold out"}</span></td>
      <td><button className={`ad-toggle ${p.featured ? "is-on" : ""}`} role="switch" aria-checked={p.featured} aria-label={`${p.name} featured`} onClick={() => save({ featured: !p.featured })}><i /></button></td>
      <td className="ad-state">{state === "saving" ? "Saving…" : state === "saved" ? <span className="ad-ok"><Check size={14} /> Saved</span> : state ? <span className="ad-error">{state}</span> : ""}</td>
    </tr>
  );
}

export function Products({ client, onAuthError }) {
  const d = useData(() => client.products(), [client], onAuthError);
  const [adding, setAdding] = useState(false);
  if (d.error) return <Err d={d} />;
  if (!d.data) return <Loading />;
  return (
    <div className="ad-stack">
      <div className="ad-toolbar"><span className="ad-muted">{d.data.length} products · {d.data.filter((p) => !p.in_stock).length} sold out</span><button className="ad-btn ad-btn--primary" onClick={() => setAdding(true)}><Plus size={15} /> New product</button></div>
      {adding && <ProductForm client={client} onCancel={() => setAdding(false)} onSaved={(p) => { d.setData((l) => [p, ...l]); setAdding(false); }} />}
      <div className="ad-card ad-tablewrap">
        <table className="ad-table">
          <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Featured</th><th /></tr></thead>
          <tbody>{d.data.map((p) => <ProductRow key={p.slug} p={p} client={client} onChange={(np) => d.setData((l) => l.map((x) => (x.slug === np.slug ? np : x)))} />)}</tbody>
        </table>
      </div>
      <p className="ad-muted">Changes save to the store straight away. To change photos or long descriptions of existing products, use the store’s current admin until editing is added here.</p>
    </div>
  );
}

/* ------------------------------ Reviews ------------------------------ */
export function Reviews({ client, onAuthError }) {
  const d = useData(() => client.reviews(), [client], onAuthError);
  const [confirm, setConfirm] = useState(null);
  const [err, setErr] = useState("");
  if (d.error) return <Err d={d} />;
  if (!d.data) return <Loading />;
  const avg = d.data.length ? d.data.reduce((s, r) => s + r.rating, 0) / d.data.length : 0;
  const del = async (id) => {
    setErr("");
    try { await client.deleteReview(id); d.setData((l) => l.filter((r) => r.id !== id)); setConfirm(null); } catch (e) { setErr(e.message); }
  };
  return (
    <div className="ad-stack">
      <section className="ad-kpis ad-kpis--4">
        <div className="ad-kpi"><span>Reviews</span><strong>{d.data.length}</strong></div>
        <div className="ad-kpi"><span>Average rating</span><strong>{avg.toFixed(1)} ★</strong></div>
        <div className="ad-kpi"><span>5-star</span><strong>{d.data.filter((r) => r.rating === 5).length}</strong></div>
        <div className="ad-kpi"><span>3 stars or less</span><strong>{d.data.filter((r) => r.rating <= 3).length}</strong></div>
      </section>
      {err && <p className="ad-card ad-error">{err}</p>}
      <div className="ad-list">
        {d.data.length ? d.data.map((r) => (
          <article key={r.id} className="ad-card ad-review">
            <div className="ad-review__head">
              <span className="ad-stars" aria-label={`${r.rating} of 5 stars`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} fill={n <= r.rating ? "#e8a623" : "none"} stroke="#e8a623" />)}</span>
              <strong>{r.name}</strong><span className="ad-muted">{r.email} · {fmtDateTime(r.created_at)}</span>
            </div>
            <p>{r.comment}</p>
            <div className="ad-review__foot">
              <span className="ad-chip">{bySlug(r.product_slug)?.name || r.product_slug}</span>
              {confirm === r.id ? (
                <span className="ad-row"><span className="ad-muted">Delete this review for good?</span><button className="ad-btn ad-btn--sm ad-btn--danger" onClick={() => del(r.id)}>Delete</button><button className="ad-btn ad-btn--sm" onClick={() => setConfirm(null)}>Keep</button></span>
              ) : <button className="ad-btn ad-btn--sm" onClick={() => setConfirm(r.id)}><Trash2 size={13} /> Delete</button>}
            </div>
          </article>
        )) : <p className="ad-card ad-empty">No reviews yet.</p>}
      </div>
    </div>
  );
}

/* ------------------------------ Subscribers ------------------------------ */
export function Subscribers({ client, onAuthError }) {
  const d = useData(() => client.subscribers(), [client], onAuthError);
  const [q, setQ] = useState("");
  if (d.error) return <Err d={d} />;
  if (!d.data) return <Loading />;
  const list = d.data.filter((s) => !q || `${s.name} ${s.email}`.toLowerCase().includes(q.toLowerCase()));
  const month = d.data.filter((s) => s.created_at && Date.now() - new Date(s.created_at) < 30 * 864e5).length;
  return (
    <div className="ad-stack">
      <section className="ad-kpis ad-kpis--4">
        <div className="ad-kpi"><span>Subscribers</span><strong>{d.data.length}</strong></div>
        <div className="ad-kpi"><span>Joined in last 30 days</span><strong>{month}</strong></div>
      </section>
      <div className="ad-toolbar">
        <label className="ad-search"><Search size={15} /><input id="sub-search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <button className="ad-btn" onClick={() => downloadCSV("danje-subscribers.csv", d.data.map((s) => ({ email: s.email, name: s.name || "", joined: s.created_at || "" })))}><Download size={15} /> Export CSV</button>
      </div>
      <div className="ad-card ad-tablewrap">
        <table className="ad-table"><thead><tr><th>Email</th><th>Name</th><th>Joined</th></tr></thead>
          <tbody>{list.map((s) => <tr key={s.id || s.email}><td className="ad-select">{s.email}</td><td>{s.name || "—"}</td><td>{fmtDateTime(s.created_at)}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}

/* ------------------------------ Messages ------------------------------ */
export function Messages({ client, onAuthError }) {
  const d = useData(() => client.messages(), [client], onAuthError);
  const [open, setOpen] = useState(null);
  if (d.error) return <Err d={d} />;
  if (!d.data) return <Loading />;
  const list = [...d.data].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return (
    <div className="ad-list">
      {list.length ? list.map((m) => (
        <article key={m.id} className={`ad-card ad-msg ${open === m.id ? "is-open" : ""}`}>
          <button className="ad-msg__head" onClick={() => setOpen(open === m.id ? null : m.id)} aria-expanded={open === m.id}>
            <strong>{m.subject || "(no subject)"}</strong><span>{m.name} · {fmtDateTime(m.created_at)}</span>
          </button>
          {open === m.id && (
            <div className="ad-msg__body">
              <p>{m.message}</p>
              <p className="ad-muted">Reply to <span className="ad-select">{m.email}</span></p>
            </div>
          )}
        </article>
      )) : <p className="ad-card ad-empty">No messages yet.</p>}
    </div>
  );
}
