import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import { products } from "../data/angels.js";
import { track } from "../track.js";

export default function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    const t = q.trim(); if (t.length < 3) return;
    const h = setTimeout(() => track("search", { query: t.slice(0, 60) }), 1200);
    return () => clearTimeout(h);
  }, [q]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return products.filter((p) => p.featured).slice(0, 6);
    return products.filter((p) =>
      [p.name, p.category_label, p.virtue, p.short_description, p.scripture].join(" ").toLowerCase().includes(t));
  }, [q]);

  if (!open) return null;
  return (
    <div className="dj-search" role="dialog" aria-modal="true" aria-label="Search the shop">
      <div className="dj-search__scrim" onClick={onClose} />
      <div className="dj-search__panel">
        <div className="dj-search__bar">
          <Search size={20} />
          <input id="site-search" ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search angels, wall art, scriptures…" />
          <button onClick={onClose} aria-label="Close search"><X size={20} /></button>
        </div>
        <p className="dj-search__label">{q.trim() ? `${results.length} result${results.length === 1 ? "" : "s"}` : "Popular angels"}</p>
        {results.length ? (
          <ul className="dj-search__list">
            {results.map((p) => (
              <li key={p.id}>
                <Link to={`/product/${p.slug}`} onClick={onClose}>
                  <span className="dj-search__img"><img src={p.image} alt="" /></span>
                  <span className="dj-search__txt"><strong>{p.name}</strong><small>{p.category_label} · ${p.price.toFixed(2)}</small></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dj-search__empty">No angels match “{q}”. Try “healing”, “wall art” or an angel’s name.</p>
        )}
      </div>
    </div>
  );
}
