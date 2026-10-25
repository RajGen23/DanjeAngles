import { Link } from "react-router-dom";

export default function Logo({ className = "" }) {
  return (
    <Link to="/" className={`dj-logo ${className}`} aria-label="DanJe Angels — home">
      <span className="dj-logo__word">
        Dan<span style={{ color: "#e5368f" }}>J</span>
        <span style={{ color: "#2a9fe0" }}>e</span>{" "}
        <span style={{ color: "#f6cf13" }}>A</span>
        <span style={{ color: "#8a1ff0" }}>n</span>gels
      </span>
      <span className="dj-logo__tag">Bringing Heaven to Earth</span>
    </Link>
  );
}
