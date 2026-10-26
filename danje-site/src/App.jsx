import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header.jsx";
import JoinBand from "./components/JoinBand.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import FlyingAngels from "./components/FlyingAngels.jsx";
import Home from "./pages/Home.jsx";
import Shop from "./pages/Shop.jsx";
import About from "./pages/About.jsx";
import Product from "./pages/Product.jsx";
import { CartProvider } from "./cart.jsx";
import { track } from "./track.js";
import AdminApp from "./admin/AdminApp.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import Contact from "./pages/Contact.jsx";
import { Faith, EveryChild, Reviews, NotFound } from "./pages/InfoPages.jsx";
import CheckoutResult from "./pages/CheckoutResult.jsx";

function ScrollTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) return el.scrollIntoView({ behavior: "smooth" });
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  useEffect(() => { track(pathname.startsWith("/product/") ? "product_view" : "pageview", pathname.startsWith("/product/") ? { slug: pathname.split("/")[2] } : {}); }, [pathname]);
  return null;
}

// Home has its own newsletter band, so the "Join the family" band shows on the other pages.
function JoinArea() {
  const { pathname } = useLocation();
  return pathname !== "/" ? <JoinBand /> : null;
}

function HeaderWithCart() {
  return <Header />;
}

export default function App() {
  const { pathname } = useLocation();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return <AdminApp />;
  return (
    <CartProvider>
    <div className="dj">
      <ScrollTop />
      {/* The sky artwork scrolls with this wrapper: castle at the top, flowers at the bottom. */}
      <div className="dj-page">
      <HeaderWithCart />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/about" element={<About />} />
          <Route path="/product/:slug" element={<Product />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faith" element={<Faith />} />
          <Route path="/every-child" element={<EveryChild />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/checkout/success" element={<CheckoutResult />} />
          <Route path="/checkout/cancel" element={<CheckoutResult cancelled />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <JoinArea />
      </div>
      <SiteFooter />
      <FlyingAngels />
      <CartDrawer />
    </div>
    </CartProvider>
  );
}
