import { Crown, HeartGem, Dragonfly, Sparkle } from "./Decor.jsx";

// Title block used at the top of the simple content pages (same look as "Shop Angels").
export default function PageHead({ title, children }) {
  return (
    <header className="dj-shop__head dj-pagehead">
      <Dragonfly size={90} className="dj-abs dj-float dj-hide-md" style={{ right: "14%", top: "10px" }} flip />
      <Sparkle size={14} className="dj-abs dj-twinkle" style={{ left: "30%", top: "20px" }} />
      <Crown size={30} />
      <h1 className="dj-h1 dj-h1--shop">{title}</h1>
      {children && <p>{children}</p>}
      <HeartGem size={15} />
    </header>
  );
}
