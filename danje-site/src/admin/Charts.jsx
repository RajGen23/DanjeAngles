// Small dependency-free SVG charts for the admin dashboard.
// Single series each (so no legend), one y-axis, recessive grid, hover tooltip.
import { useMemo, useRef, useState } from "react";

const fmtDate = (d) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/** data: [{date, value}] ; kind: "area" | "bar" */
export function TimeChart({ data, kind = "area", format = (v) => v.toLocaleString(), tickFormat, label, height = 220 }) {
  const tf = tickFormat || ((v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${+v.toFixed(0)}`));
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const W = 720, H = height, L = 52, R = 12, T = 12, B = 26;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const iw = W - L - R, ih = H - T - B;
  const x = (i) => L + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const bw = Math.max(2, iw / data.length - 2);
  const xb = (i) => L + (i * iw) / data.length + 1;
  const y = (v) => T + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const step = Math.ceil(data.length / 6);

  const path = useMemo(() => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(""), [data, max]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMove = (e) => {
    const box = ref.current.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = kind === "bar" ? Math.floor(((px - L) / iw) * data.length) : Math.round(((px - L) / iw) * (data.length - 1));
    setHover(i >= 0 && i < data.length ? i : null);
  };
  const h = hover != null ? data[hover] : null;
  const hx = hover != null ? (kind === "bar" ? xb(hover) + bw / 2 : x(hover)) : 0;

  return (
    <div className="ad-chart">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="ad-grid" />
            <text x={L - 8} y={y(t) + 4} className="ad-tick" textAnchor="end">{tf(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (i % step === 0 || i === data.length - 1) && (
          <text key={d.date} x={kind === "bar" ? xb(i) + bw / 2 : x(i)} y={H - 6} className="ad-tick" textAnchor="middle">{fmtDate(d.date)}</text>
        ))}
        {kind === "area" ? (
          <>
            <path d={`${path}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`} className="ad-area" />
            <path d={path} className="ad-line" />
            {data.length > 0 && <circle cx={x(data.length - 1)} cy={y(data[data.length - 1].value)} r="4" className="ad-dot" />}
          </>
        ) : (
          data.map((d, i) => {
            const top = y(d.value), hgt = Math.max(0, y(0) - top);
            const r = Math.min(4, bw / 2, hgt);
            return <path key={d.date} className={`ad-bar ${hover === i ? "is-hover" : ""}`}
              d={`M${xb(i)},${y(0)}V${top + r}Q${xb(i)},${top} ${xb(i) + r},${top}H${xb(i) + bw - r}Q${xb(i) + bw},${top} ${xb(i) + bw},${top + r}V${y(0)}Z`} />;
          })
        )}
        {h && (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={T} y2={y(0)} className="ad-cross" />
            {kind === "area" && <circle cx={hx} cy={y(h.value)} r="5" className="ad-dot ad-dot--hover" />}
          </g>
        )}
      </svg>
      {h && (
        <div className="ad-tip" style={{ left: `${(hx / W) * 100}%` }}>
          <span>{fmtDate(h.date)}</span>
          <strong>{format(h.value)}</strong>
        </div>
      )}
    </div>
  );
}

/** rows: [{label, value, sub?, image?}] — horizontal bars, values in text ink */
export function BarList({ rows, format = (v) => v.toLocaleString(), empty = "No data yet." }) {
  const max = Math.max(...rows.map((r) => r.value), 0) || 1;
  if (!rows.length) return <p className="ad-empty">{empty}</p>;
  return (
    <ul className="ad-barlist">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r.value)}`}>
          {r.image && <img src={r.image} alt="" />}
          <div className="ad-barlist__body">
            <div className="ad-barlist__row"><span className="ad-barlist__label">{r.label}</span><strong>{format(r.value)}</strong></div>
            <div className="ad-barlist__track"><i style={{ width: `${(r.value / max) * 100}%` }} /></div>
            {r.sub && <small>{r.sub}</small>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** steps: [{label, value}] — conversion funnel */
export function Funnel({ steps }) {
  const top = steps[0]?.value || 1;
  return (
    <ol className="ad-funnel">
      {steps.map((s, i) => (
        <li key={s.label}>
          <div className="ad-funnel__row"><span>{s.label}</span><strong>{s.value.toLocaleString()}</strong></div>
          <div className="ad-barlist__track"><i style={{ width: `${Math.max(1.5, (s.value / top) * 100)}%` }} /></div>
          {i > 0 && <small>{steps[i - 1].value ? ((s.value / steps[i - 1].value) * 100).toFixed(1) : "0"}% of previous step</small>}
        </li>
      ))}
    </ol>
  );
}
