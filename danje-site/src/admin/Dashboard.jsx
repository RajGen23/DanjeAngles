import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, Minus, Info } from "lucide-react";
import { useData, money, fmtDateTime, dayKey } from "./useData.js";
import { TimeChart, BarList, Funnel } from "./Charts.jsx";
import { products as catalog } from "../data/angels.js";

export const PERIODS = [[7, "7 days"], [30, "30 days"], [90, "90 days"]];

export function PeriodPicker({ value, onChange }) {
  return (
    <div className="ad-seg" role="radiogroup" aria-label="Time period">
      {PERIODS.map(([d, l]) => (
        <button key={d} role="radio" aria-checked={value === d} className={value === d ? "is-on" : ""} onClick={() => onChange(d)}>{l}</button>
      ))}
    </div>
  );
}

export function Delta({ now, before, invert }) {
  if (before == null || !isFinite(before)) return null;
  if (before === 0) return now > 0 ? <span className="ad-delta is-up"><ArrowUpRight size={13} /> new</span> : null;
  const pct = ((now - before) / before) * 100;
  const flat = Math.abs(pct) < 0.5;
  const up = pct > 0;
  const good = invert ? !up : up;
  return (
    <span className={`ad-delta ${flat ? "" : good ? "is-up" : "is-down"}`}>
      {flat ? <Minus size={13} /> : up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {Math.abs(pct).toFixed(0)}% vs previous
    </span>
  );
}

export function StatusPill({ status }) {
  const map = { paid: ["ok", "Paid"], pending: ["warn", "Pending"], expired: ["muted", "Expired"], failed: ["bad", "Failed"], cancelled: ["muted", "Cancelled"] };
  const [tone, label] = map[status] || ["muted", status];
  return <span className={`ad-pill ad-pill--${tone}`}>{label}</span>;
}

export function AddonNotice() {
  return (
    <div className="ad-card ad-notice">
      <Info size={18} />
      <div>
        <strong>Visitor and wishlist tracking isn’t switched on yet</strong>
        <p>The store’s backend doesn’t record visits or wishlists today. Add the analytics add-on in <code>backend-addon/analytics.py</code> to the API (see its README), and these numbers will start filling in.</p>
      </div>
    </div>
  );
}

const bySlug = (s) => catalog.find((p) => p.slug === s);

export function inPeriod(orders, days, offset = 0) {
  const end = new Date(); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - offset * days);
  const start = new Date(end); start.setDate(start.getDate() - days + 1); start.setHours(0, 0, 0, 0);
  return orders.filter((o) => { const t = o.created ? new Date(o.created) : null; return t && t >= start && t <= end; });
}

export default function Dashboard({ client, onAuthError, can = () => true, me }) {
  const [days, setDays] = useState(30);
  const orders = useData(() => (can("orders") ? client.orders() : Promise.resolve([])), [client], onAuthError);
  const an = useData(() => (can("analytics") ? client.analytics(days) : Promise.resolve(null)), [client, days], onAuthError);

  const stats = useMemo(() => {
    if (!orders.data) return null;
    const cur = inPeriod(orders.data, days), prev = inPeriod(orders.data, days, 1);
    const paid = cur.filter((o) => o.status === "paid"), paidPrev = prev.filter((o) => o.status === "paid");
    const rev = paid.reduce((s, o) => s + o.amount, 0), revPrev = paidPrev.reduce((s, o) => s + o.amount, 0);
    const series = [];
    for (let i = days - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); series.push({ date: dayKey(d), value: 0 }); }
    paid.forEach((o) => { const s = series.find((x) => x.date === dayKey(o.created)); if (s) s.value += o.amount; });
    const prodRev = {};
    paid.forEach((o) => o.items.forEach((i) => { prodRev[i.slug] = prodRev[i.slug] || { rev: 0, qty: 0 }; prodRev[i.slug].rev += i.price * i.qty; prodRev[i.slug].qty += i.qty; }));
    const top = Object.entries(prodRev).sort((a, b) => b[1].rev - a[1].rev).slice(0, 6)
      .map(([slug, v]) => ({ label: bySlug(slug)?.name || slug, value: v.rev, sub: `${v.qty} sold`, image: bySlug(slug)?.image }));
    return { rev, revPrev, count: paid.length, countPrev: paidPrev.length, aov: paid.length ? rev / paid.length : 0, aovPrev: paidPrev.length ? revPrev / paidPrev.length : 0,
      pending: cur.filter((o) => o.status === "pending").length, series, top, recent: orders.data.slice(0, 6) };
  }, [orders.data, days]);

  const a = an.data;
  const conv = stats && a?.totals?.visitors ? (stats.count / a.totals.visitors) * 100 : null;
  const convPrev = stats && a?.previous?.visitors ? (stats.countPrev / a.previous.visitors) * 100 : null;

  const canO = can("orders"), canA = can("analytics");
  if (!canO && !canA) return (
    <div className="ad-card ad-notice"><Info size={18} /><div><strong>Welcome{me?.name ? `, ${me.name.split(" ")[0]}` : ""}</strong>
      <p>Your account looks after {[can("products") && "products", can("reviews") && "reviews", can("subscribers") && "subscribers", can("messages") && "messages"].filter(Boolean).join(", ") || "parts of the store"}. Use the menu to get started. Sales and visitor numbers are only shown to people with access to orders or visitors.</p></div></div>
  );
  if (orders.error) return <div className="ad-card ad-error">{orders.error} <button className="ad-link" onClick={orders.reload}>Try again</button></div>;

  return (
    <div className="ad-stack">
      <div className="ad-toolbar"><PeriodPicker value={days} onChange={setDays} /><span className="ad-muted">Compared with the {days} days before</span></div>

      <section className={`ad-kpis ${canO && canA ? "" : "ad-kpis--3"}`}>
        {canO && <div className="ad-kpi"><span>Revenue</span><strong>{stats ? money(stats.rev) : "…"}</strong>{stats && <Delta now={stats.rev} before={stats.revPrev} />}</div>}
        {canO && <div className="ad-kpi"><span>Paid orders</span><strong>{stats ? stats.count : "…"}</strong>{stats && <Delta now={stats.count} before={stats.countPrev} />}</div>}
        {canO && <div className="ad-kpi"><span>Average order</span><strong>{stats ? money(stats.aov) : "…"}</strong>{stats && <Delta now={stats.aov} before={stats.aovPrev} />}</div>}
        {canA && <div className="ad-kpi"><span>Visitors</span><strong>{a ? a.totals.visitors.toLocaleString() : an.loading ? "…" : "—"}</strong>{a && <Delta now={a.totals.visitors} before={a.previous?.visitors} />}</div>}
        {canA && <div className="ad-kpi"><span>Conversion rate</span><strong>{conv != null ? `${conv.toFixed(2)}%` : an.loading ? "…" : "—"}</strong>{conv != null && <Delta now={conv} before={convPrev} />}</div>}
        {canA && <div className="ad-kpi"><span>Wishlist adds</span><strong>{a ? a.wishlist_total.adds.toLocaleString() : an.loading ? "…" : "—"}</strong>{a && <Delta now={a.wishlist_total.adds} before={a.previous?.wishlist_adds} />}</div>}
      </section>

      {canO && stats?.pending > 0 && <p className="ad-card ad-alert"><span className="ad-pill ad-pill--warn">Pending</span> {stats.pending} checkout{stats.pending > 1 ? "s" : ""} started but not paid in this period. <Link to="/admin/orders" className="ad-link">Review orders</Link></p>}
      {!an.loading && !a && can("analytics") && <AddonNotice />}

      <div className={canO && canA ? "ad-grid2" : "ad-stack"}>
        {canO && <section className="ad-card">
          <header className="ad-card__head"><h2>Revenue per day</h2><span className="ad-muted">Paid orders only</span></header>
          {stats ? <TimeChart data={stats.series} kind="bar" format={(v) => money(v)} tickFormat={(v) => (v >= 1000 ? `$${+(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`)} label="Revenue per day" /> : <div className="ad-skel" />}
        </section>}
        {canA && <section className="ad-card">
          <header className="ad-card__head"><h2>Visitors per day</h2>{a && <span className="ad-live"><i /> {a.live_visitors} on the site now</span>}</header>
          {a ? <TimeChart data={a.days.map((d) => ({ date: d.date, value: d.visitors }))} label="Visitors per day" /> : <div className="ad-skel">{!an.loading && "No visitor data yet"}</div>}
        </section>}
      </div>

      <div className={canO && canA ? "ad-grid3" : "ad-grid2"}>
        {canO && <section className="ad-card">
          <header className="ad-card__head"><h2>Best sellers</h2><span className="ad-muted">By revenue</span></header>
          {stats ? <BarList rows={stats.top} format={(v) => money(v)} empty="No paid orders in this period." /> : <div className="ad-skel" />}
        </section>}
        {canA && <section className="ad-card">
          <header className="ad-card__head"><h2>Most wishlisted</h2><Link to="/admin/visitors" className="ad-link">All</Link></header>
          {a ? <BarList rows={a.wishlist.slice(0, 6).map((w) => ({ label: bySlug(w.slug)?.name || w.slug, value: w.net, sub: `${w.adds} added · ${w.removes} removed`, image: bySlug(w.slug)?.image }))} /> : <div className="ad-skel">{!an.loading && "No wishlist data yet"}</div>}
        </section>}
        {canA && <section className="ad-card">
          <header className="ad-card__head"><h2>Shopper journey</h2></header>
          {a ? <Funnel steps={[
            { label: "Visitors", value: a.funnel.visitors }, { label: "Viewed a product", value: a.funnel.product_views },
            { label: "Added to basket", value: a.funnel.cart_adds }, { label: "Started checkout", value: a.funnel.checkout_starts },
            ...(canO ? [{ label: "Paid", value: stats?.count ?? 0 }] : []),
          ]} /> : <div className="ad-skel">{!an.loading && "No visitor data yet"}</div>}
        </section>}
      </div>

      {canO && <section className="ad-card">
        <header className="ad-card__head"><h2>Latest orders</h2><Link to="/admin/orders" className="ad-link">All orders</Link></header>
        {stats && (stats.recent.length ? (
          <div className="ad-tablewrap">
            <table className="ad-table">
              <thead><tr><th>Customer</th><th>Items</th><th>Date</th><th>Status</th><th className="num">Total</th></tr></thead>
              <tbody>{stats.recent.map((o) => (
                <tr key={o.id}><td>{o.name || o.email || "Guest"}<small>{o.name ? o.email : ""}</small></td><td>{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ") || "—"}</td><td>{fmtDateTime(o.created)}</td><td><StatusPill status={o.status} /></td><td className="num">{money(o.amount, o.currency)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="ad-empty">No orders yet. They’ll appear here as soon as someone checks out.</p>)}
      </section>}
    </div>
  );
}
