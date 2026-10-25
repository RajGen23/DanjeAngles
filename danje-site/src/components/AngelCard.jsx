import { Link } from "react-router-dom";
import { Crown } from "./Decor.jsx";

export default function AngelCard({ angel, crown = false, meet = false }) {
  return (
    <Link to={`/product/${angel.slug}`} className={`dj-angel dj-angel--${angel.tone}`}>
      {crown && <Crown size={22} className="dj-angel__crown" />}
      <div className={`dj-angel__img ${angel.cutout ? "is-cutout" : ""}`}>
        <img src={angel.art || angel.image} alt={`${angel.name}, the ${angel.virtue} angel`} loading="lazy" />
      </div>
      <h3 className="dj-angel__name">{angel.name}</h3>
      <div className="dj-angel__virtue">{angel.virtue}</div>
      <div className="dj-angel__verse">{angel.verse}</div>
      {meet && <span className="dj-angel__meet">Meet {angel.name} →</span>}
    </Link>
  );
}
