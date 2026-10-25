import { Link } from "react-router-dom";
import { Mail, Instagram, Facebook } from "lucide-react";
import { family } from "../data/angels.js";
import { Crown } from "./Decor.jsx";

export default function SiteFooter() {
  return (
    <footer className="dj-footer">
      <div className="dj-container dj-footer__grid">
        <div className="dj-footer__brand">
          <Link to="/" className="dj-footer__logo" aria-label="DanJe Angels — home">
            Dan<span style={{ color: "#ff6fb3" }}>J</span><span style={{ color: "#5cc2ff" }}>e</span>{" "}
            <span style={{ color: "#ffd84a" }}>A</span><span style={{ color: "#b98bff" }}>n</span>gels
          </Link>
          <p>Christian angel dolls and wall art, created to remind every child they are loved, protected, strong, and royalty in God’s kingdom.</p>
          <blockquote>“Let the little children come to me.” <cite>Matthew 19:14</cite></blockquote>
        </div>
        <nav className="dj-footer__col" aria-label="Explore">
          <h3>Explore</h3>
          <Link to="/">Home</Link>
          <Link to="/#family">Meet the Angels</Link>
          <Link to="/shop">Shop</Link>
          <Link to="/about">Our Story</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <nav className="dj-footer__col" aria-label="The Angels">
          <h3>The Angels</h3>
          {family.map((a) => <Link key={a.slug} to={`/product/${a.slug}`}>{a.name}</Link>)}
        </nav>
        <div className="dj-footer__col">
          <h3>Be in Touch</h3>
          <span className="dj-footer__mail"><Mail size={16} /> <span className="dj-selectable">hello@danjeangels.com</span></span>
          <div className="dj-footer__social">
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={17} /></a>
            <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={17} /></a>
          </div>
        </div>
      </div>
      <div className="dj-container dj-footer__bottom">
        <span>© 2026 DanJe’ Angels. Made with prayer and care.</span>
        <span className="dj-footer__tag"><Crown size={14} /> Bringing Heaven to Earth</span>
      </div>
    </footer>
  );
}
