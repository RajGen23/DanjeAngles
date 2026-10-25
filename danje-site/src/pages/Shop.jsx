import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Star, Shield, Heart, Cross, Crown as CrownIcon, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { products, categories, colors, productTypes, priceRanges } from "../data/angels.js";
import { useCart } from "../cart.jsx";
import { Crown, Dragonfly, Trail, HeartGem, ButterflyIcon, Sparkle, GoldStar } from "../components/Decor.jsx";

const PER_PAGE = 8;
const icons = {
  star: <Star size={15} fill="#f5b82e" stroke="#e4a321" />,
  shield: <Shield size={15} strokeWidth={1.6} />,
  heart: <Heart size={15} strokeWidth={1.6} />,
  butterfly: <ButterflyIcon size={15} />,
  cross: <Cross size={15} strokeWidth={1.6} />,
  crown: <CrownIcon size={15} strokeWidth={1.6} />,
};

function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`dj-filter ${open ? "is-open" : ""}`}>
      <button className="dj-filter__head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {title} <ChevronDown size={15} />
      </button>
      {open && <div className="dj-filter__body">{children}</div>}
    </div>
  );
}

export function ProductCard({ p }) {
  const { liked, toggleLike } = useCart();
  const isLiked = liked.has(p.id);
  return (
    <article className={`dj-prod dj-prod--${p.category}`}>
      <button
        className={`dj-prod__like ${isLiked ? "is-liked" : ""}`}
        aria-label={isLiked ? "Remove from wishlist" : "Add to wishlist"}
        onClick={() => toggleLike(p.id)}
      >
        <Heart size={14} strokeWidth={1.8} fill={isLiked ? "currentColor" : "none"} />
      </button>
      <Link to={`/product/${p.slug}`} className="dj-prod__link">
        <div className="dj-prod__img"><img src={p.image} alt={p.name} loading="lazy" /></div>
        <div className="dj-prod__body">
          <h3>{p.title}</h3>
          <span className="dj-prod__sub">{p.sub}</span>
          <span className="dj-prod__price">${p.price.toFixed(2)}</span>
        </div>
      </Link>
    </article>
  );
}

// `embedded` renders the same shop section inside another page (the Home page).
export default function Shop({ embedded = false }) {
  const Title = embedded ? "h2" : "h1";
  const [params] = useSearchParams();
  const [cat, setCat] = useState("all");
  const [type, setType] = useState(() => params.get("type"));
  // follow ?type= when the header menu links to a category while already on the shop
  const urlType = params.get("type");
  useEffect(() => { if (!embedded) { setType(urlType); setPage(1); } }, [urlType, embedded]);
  const [color, setColor] = useState(null);
  const [price, setPrice] = useState(null);
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState("featured");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const reset = (fn) => (v) => { fn(v); setPage(1); };

  const list = useMemo(() => {
    let l = products.filter((p) =>
      (cat === "all" || p.virtue === cat) &&
      (!type || p.category === type) &&
      (!color || p.color === color) &&
      (!inStock || p.in_stock) &&
      (!price || (p.price >= price.min && p.price <= price.max))
    );
    if (sort === "low") l = [...l].sort((a, b) => a.price - b.price);
    if (sort === "high") l = [...l].sort((a, b) => b.price - a.price);
    if (sort === "name") l = [...l].sort((a, b) => a.title.localeCompare(b.title));
    return l;
  }, [cat, type, color, price, inStock, sort]);

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);
  const from = list.length ? (cur - 1) * PER_PAGE + 1 : 0;
  const to = Math.min(cur * PER_PAGE, list.length);

  const clear = () => { setCat("all"); setType(null); setColor(null); setPrice(null); setInStock(false); setPage(1); };

  const pageButtons = [];
  for (let i = 1; i <= Math.min(pages, 3); i++) pageButtons.push(i);

  return (
    <section className={`dj-shop dj-sky ${embedded ? "dj-shop--embedded" : ""}`} id={embedded ? "shop-angels" : undefined}>
      <Dragonfly size={112} className="dj-abs dj-float dj-hide-md" style={{ right: "15%", top: "calc(var(--shop-top) + 16px)" }} flip />
      <Trail className="dj-abs dj-hide-md" style={{ right: "23%", top: "calc(var(--shop-top) + 62px)" }} w={140} h={50} d="M136 8 C 100 40, 50 10, 4 44" />
      <Sparkle size={14} className="dj-abs dj-twinkle" style={{ left: "47%", top: "calc(var(--shop-top) + 10px)" }} />
      <GoldStar size={22} className="dj-abs dj-hide-md dj-shop__star" style={{ left: "19%", top: "calc(var(--shop-top) + 60px)" }} />
      <GoldStar size={18} className="dj-abs dj-hide-md dj-shop__star" style={{ left: "31%", top: "calc(var(--shop-top) + 48px)" }} />
      <GoldStar size={20} className="dj-abs dj-hide-md dj-shop__star" style={{ right: "31%", top: "calc(var(--shop-top) + 58px)" }} />
      <Trail className="dj-abs dj-hide-md" style={{ left: "21%", top: "calc(var(--shop-top) + 64px)" }} w={150} h={50} d="M4 30 C 40 50, 90 0, 146 26" />

      <div className="dj-container">
        <header className="dj-shop__head">
          <Crown size={30} />
          <Title className="dj-h1 dj-h1--shop">Shop Angels</Title>
          <p>Faith-filled companions to inspire, protect,<br />and remind every child they are loved by God.</p>
          <HeartGem size={15} />
        </header>

        <div className="dj-shop__panel">
          <aside className={`dj-side ${filtersOpen ? "is-open" : ""}`}>
            <div className="dj-side__box">
              <h2>Shop by Category</h2>
              <ul className="dj-cats">
                {categories.map((c) => (
                  <li key={c.id}>
                    <button className={cat === c.id ? "is-active" : ""} onClick={() => reset(setCat)(c.id)}>
                      <span className="dj-cats__ico">{icons[c.icon]}</span>{c.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="dj-side__box">
              <h2>Filter by</h2>
              <Collapsible title="Product Type" defaultOpen={!!type}>
                {productTypes.map((x) => (
                  <label key={x.id} className="dj-check">
                    <input type="radio" name="type" checked={type === x.id} onChange={() => reset(setType)(x.id)} /> {x.label}
                  </label>
                ))}
              </Collapsible>
              <div className="dj-filter dj-filter--static">
                <div className="dj-filter__label">Color</div>
                <div className="dj-swatches">
                  {colors.map((c) => (
                    <button
                      key={c.id}
                      className={`dj-swatch ${color === c.id ? "is-active" : ""}`}
                      style={{ background: c.hex }}
                      aria-label={c.id}
                      aria-pressed={color === c.id}
                      onClick={() => reset(setColor)(color === c.id ? null : c.id)}
                    />
                  ))}
                </div>
              </div>
              <Collapsible title="Price">
                {priceRanges.map((r) => (
                  <label key={r.id} className="dj-check">
                    <input type="radio" name="price" checked={price?.id === r.id} onChange={() => reset(setPrice)(r)} /> {r.label}
                  </label>
                ))}
              </Collapsible>
              <div className="dj-filter dj-filter--static">
                <div className="dj-filter__label">In Stock</div>
                <label className="dj-check">
                  <input type="checkbox" checked={inStock} onChange={(e) => reset(setInStock)(e.target.checked)} /> Show only in stock
                </label>
              </div>
              <button className="dj-clear" onClick={clear}>Clear Filters</button>
            </div>
          </aside>

          <div className="dj-results">
            <div className="dj-results__bar">
              <button className="dj-filtertoggle" onClick={() => setFiltersOpen((o) => !o)}>
                <SlidersHorizontal size={15} /> Filters
              </button>
              <span>Showing {from}–{to} of {list.length} angels</span>
              <label className="dj-sort">
                <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="Sort products">
                  <option value="featured">Sort by: Featured</option>
                  <option value="low">Sort by: Price, low to high</option>
                  <option value="high">Sort by: Price, high to low</option>
                  <option value="name">Sort by: Name</option>
                </select>
                <ChevronDown size={15} />
              </label>
            </div>

            {shown.length ? (
              <div className="dj-grid">
                {shown.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            ) : (
              <p className="dj-empty">No angels match those filters. <button onClick={clear}>Clear filters</button></p>
            )}

            {pages > 1 && (
              <nav className="dj-pages" aria-label="Pagination">
                <button disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>
                {pageButtons.map((n) => (
                  <button key={n} className={n === cur ? "is-active" : ""} onClick={() => setPage(n)}>{n}</button>
                ))}
                {pages > 3 && <span>…</span>}
                <button disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Next page"><ChevronRight size={15} /></button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
