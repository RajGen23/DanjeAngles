import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Heart, Minus, Plus, ShoppingBag, Check, Sparkles } from "lucide-react";
import { productBySlug, products } from "../data/angels.js";
import { useCart } from "../cart.jsx";
import { Crown, GoldDivider, Dragonfly, Sparkle } from "../components/Decor.jsx";
import { ProductCard } from "./Shop.jsx";
import ProductReviews from "../components/ProductReviews.jsx";

export default function Product() {
  const { slug } = useParams();
  const p = productBySlug(slug);
  const { add, liked, toggleLike } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  useEffect(() => { setQty(1); setAdded(false); }, [slug]);

  if (!p) {
    return (
      <section className="dj-shop dj-sky dj-pdp">
        <div className="dj-container dj-center" style={{ padding: "120px 0" }}>
          <h1 className="dj-h2">We couldn’t find that angel.</h1>
          <p style={{ margin: "14px 0 24px" }}>It may have flown to another page.</p>
          <Link to="/shop" className="dj-btn dj-btn--purple">Back to the shop</Link>
        </div>
      </section>
    );
  }

  const [ref, ...versePrefix] = p.scripture.split(" — ").reverse();
  const verse = versePrefix.reverse().join(" — ");
  const related = [
    ...products.filter((x) => x.angel === p.angel && x.id !== p.id),
    ...products.filter((x) => x.category === p.category && x.angel !== p.angel),
  ].slice(0, 4);
  const isLiked = liked.has(p.id);

  const onAdd = () => { add(p.id, qty); setQty(1); setAdded(true); setTimeout(() => setAdded(false), 1800); };

  return (
    <section className="dj-shop dj-sky dj-pdp">
      <Dragonfly size={90} className="dj-abs dj-float dj-hide-md" style={{ right: "6%", top: "110px" }} flip />
      <Sparkle size={14} className="dj-abs dj-twinkle" style={{ left: "46%", top: "110px" }} />
      <div className="dj-container">
        <nav className="dj-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link><ChevronRight size={13} />
          <Link to="/shop">Shop Angels</Link><ChevronRight size={13} />
          <span>{p.title}</span>
        </nav>

        <div className="dj-pdp__panel">
          <div className={`dj-pdp__media dj-pdp__media--${p.color} dj-pdp__media--${p.category}`}>
            <Crown size={30} className="dj-pdp__crown" />
            <img src={p.image} alt={p.name} />
          </div>

          <div className="dj-pdp__info">
            <div className="dj-pdp__eyebrow">{p.category_label} · {p.virtue}</div>
            <h1 className="dj-h1 dj-pdp__title">{p.name}</h1>
            <div className="dj-pdp__price">${p.price.toFixed(2)}</div>
            <p className="dj-pdp__short">{p.short_description}</p>
            <GoldDivider width={160} />
            <p className="dj-pdp__desc">{p.description}</p>

            <blockquote className="dj-pdp__verse">
              <span>{verse}</span>
              <cite>{ref}</cite>
            </blockquote>

            <ul className="dj-pdp__facts">
              {p.materials.map((m) => <li key={m}><Check size={14} /> {m}</li>)}
              <li><Check size={14} /> {p.age_recommendation}</li>
              {p.handcrafted && <li><Sparkles size={14} /> Handcrafted</li>}
            </ul>

            <div className="dj-pdp__buy">
              <div className="dj-qty" aria-label="Quantity">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity"><Minus size={15} /></button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity"><Plus size={15} /></button>
              </div>
              <button className="dj-btn dj-btn--purple dj-pdp__add" onClick={onAdd} disabled={!p.in_stock}>
                {added ? <><Check size={17} /> Added to cart</> : <><ShoppingBag size={17} /> {p.in_stock ? "Add to Cart" : "Sold out"}</>}
              </button>
              <button className={`dj-pdp__like ${isLiked ? "is-liked" : ""}`} onClick={() => toggleLike(p.id)} aria-label="Add to wishlist">
                <Heart size={19} fill={isLiked ? "currentColor" : "none"} />
              </button>
            </div>
            <p className="dj-pdp__stock">{p.in_stock ? "In stock — ready to bring heaven home." : "Currently sold out."}</p>
          </div>
        </div>

        <ProductReviews slug={p.slug} name={p.title} />

        {related.length > 0 && (
          <div className="dj-pdp__related">
            <h2 className="dj-h2 dj-center">You may also love</h2>
            <div className="dj-grid">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
          </div>
        )}
      </div>
    </section>
  );
}
