import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Search, User, ShoppingBag, ChevronDown, Menu, X } from "lucide-react";
import Logo from "./Logo.jsx";
import SearchOverlay from "./SearchOverlay.jsx";
import { useCart } from "../cart.jsx";

const shopMenu = [
  { to: "/shop", label: "All Angels" },
  { to: "/shop?type=angels", label: "Angel Dolls" },
  { to: "/shop?type=vinyl-dolls", label: "Vinyl Dolls" },
  { to: "/shop?type=wall-art", label: "Angel Wall Art" },
];
const links = [
  { to: "/about", label: "About Us" },
  { to: "/faith", label: "Faith & Purpose" },
  { to: "/every-child", label: "Angels for Every Child" },
  { to: "/reviews", label: "Reviews" },
];

export default function Header() {
  const { count, setOpen: setCartOpen } = useCart();
  const [open, setOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const acctRef = useRef(null);
  const { pathname, search } = useLocation();

  useEffect(() => { setOpen(false); setShopOpen(false); setAcctOpen(false); }, [pathname, search]);
  useEffect(() => {
    if (!acctOpen) return;
    const off = (e) => !acctRef.current?.contains(e.target) && setAcctOpen(false);
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [acctOpen]);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <header className={`dj-header ${open ? "is-open" : ""}`}>
      <div className="dj-header__inner">
        <Logo />
        <nav className="dj-nav" aria-label="Main">
          <div className={`dj-nav__drop ${shopOpen ? "is-open" : ""}`} onMouseEnter={() => setShopOpen(true)} onMouseLeave={() => setShopOpen(false)}>
            <NavLink to="/shop" className={({ isActive }) => `dj-nav__link ${isActive ? "is-active" : ""}`}>Shop Angels</NavLink>
            <button className="dj-nav__caret" aria-label="Show shop categories" aria-expanded={shopOpen} onClick={() => setShopOpen((o) => !o)}>
              <ChevronDown size={14} strokeWidth={2} />
            </button>
            <div className="dj-nav__menu">
              {shopMenu.map((m) => <Link key={m.to} to={m.to}>{m.label}</Link>)}
            </div>
          </div>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `dj-nav__link ${isActive ? "is-active" : ""}`}>{l.label}</NavLink>
          ))}
        </nav>
        <div className="dj-header__icons">
          <button aria-label="Search" onClick={() => setSearchOpen(true)}><Search size={19} strokeWidth={1.7} /></button>
          <div className="dj-acct" ref={acctRef}>
            <button aria-label="Account" aria-expanded={acctOpen} onClick={() => setAcctOpen((o) => !o)}><User size={19} strokeWidth={1.7} /></button>
            {acctOpen && (
              <div className="dj-acct__pop" role="dialog" aria-label="Account">
                <strong>Welcome to the family</strong>
                <p>You don’t need an account to order. Your receipt and order updates arrive by email after checkout.</p>
                <Link to="/contact" className="dj-btn dj-btn--outline-pink">Help with an order</Link>
              </div>
            )}
          </div>
          <button aria-label={`Cart, ${count} items`} className="dj-cart" onClick={() => setCartOpen(true)}>
            <ShoppingBag size={19} strokeWidth={1.7} />
            <span className="dj-cart__badge">{count}</span>
          </button>
          <button className="dj-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </header>
  );
}
