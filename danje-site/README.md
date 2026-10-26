# DanJe Angels — Home, Shop & About redesign

React 18 + react-router-dom 6, plain CSS (no Tailwind needed). Matches the three customer mockups and is responsive (desktop / tablet / phone).

## Run it
    npm install
    npm run dev        # http://localhost:5173  (/, /shop, /about)
    npm run build      # static build in dist/

## What's where
    src/danje.css                 all styles (colours/fonts as CSS variables at the top)
    src/components/Header.jsx     logo + nav + search/account/cart, burger menu under 1060px
    src/components/JoinBand.jsx   "Join the DanJe' Angels Family" footer band (all pages)
    src/components/Decor.jsx      crown, dragonfly, stars, dotted trails, gold divider (SVG)
    src/components/AngelCard.jsx  coloured angel card (Meet the Angels) -> links to product
    src/pages/Home.jsx | Shop.jsx | About.jsx | Product.jsx (/product/:slug)
    src/cart.jsx                  minimal cart + wishlist state (badge, hearts, Add to Cart)
    src/data/angels.js            the 13 real products copied from the live store API
    public/img/products/          real product photos from the store (plush dolls cut out)

## Products
Names, descriptions, scriptures, prices, materials and photos come from the live store
(dananjels-dolls-api .../api/products, 13 products). Slugs are the same as the live site,
so /product/<slug> links keep working. When merged, replace the `products` array with the
API response; the extra display fields (virtue, color, title, sub, image) are derived in angels.js.

## Merging into the live site (CRA/craco frontend)
1. Copy src/components, src/pages, src/data, src/cart.jsx, src/danje.css and public/img into the site's frontend.
2. `yarn add @fontsource/crimson-pro @fontsource/jost lucide-react` and copy the font imports from src/main.jsx.
3. Point the site's routes for /, /shop, /about and /product/:slug at these pages and render <Header/> + <JoinBand/> around them.
4. Swap src/cart.jsx for the site's existing cart context so Add to Cart goes to the real Stripe checkout.

## Still placeholders (cut from the mockups)
- founders-*.jpg / founders-hero-cut.webp — founder photos (low resolution)
- angel-linc-linc.jpg — the store has no Linc-Linc photo (its DB entry uses Janai's picture)
- prod-gift.jpg — "And More to Come!" tile
- hero-home.jpg, bg-shop.jpg — castle/cloud backgrounds rebuilt from the mockups

## Connecting to the live store backend
Build with the store API so checkout, newsletter, contact and reviews are real:

    VITE_API_URL=https://dananjels-dolls-api-production.up.railway.app npm run build

- Basket: saved in the browser; shipping $7.99, free from $75 (same rules as the live store).
- Checkout: POST /api/checkout/session {items:[{slug,quantity}], origin_url, customer_email} -> redirects to Stripe.
- Stripe return pages: /checkout/success?session_id={CHECKOUT_SESSION_ID} and /checkout/cancel
  (point the backend's success/cancel URLs here; success polls /api/checkout/status/{id}).
- Newsletter -> POST /api/newsletter, Contact -> POST /api/contact, Reviews -> GET/POST /api/products/{slug}/reviews.
- Without VITE_API_URL (design preview) these show a friendly "preview" note instead.

## Live store issues found in testing (25 Oct 2026)
1. Checkout is broken: POST /api/checkout/session returns 503. STRIPE_API_KEY on Railway is
   "sk_test_emergent" (only works inside Emergent). Set a real Stripe secret key on dananjels-dolls-api.
2. The live /contact page renders nothing (blank between header and footer).
3. GET /api/products/{slug}/reviews returns reviewers' email addresses publicly. Strip "email" from the public response.

## Store admin panel (`/admin`)
React pages under `src/admin/`, served by the same site at `/admin` (also linked as "Staff sign-in" in the footer).

- **Dashboard:** revenue, paid orders, average order, visitors, conversion rate, wishlist adds (7/30/90 days, vs previous period),
  revenue per day, visitors per day, live visitors, best sellers, most wishlisted, shopper funnel, latest orders.
- **Orders:** filter by period and status, search, order detail panel, CSV export.
- **Visitors & Wishlist:** visitors per day, wishlist leaderboard, basket adds, top pages, traffic sources, devices, searches.
- **Products:** edit price, stock and featured status inline; add a product with photo upload.
- **Reviews:** all reviews with ratings, delete with confirmation. **Subscribers:** list + CSV export. **Messages:** contact form inbox.
- **Team & access / My account:** team members, roles, per-person access, password reset and change.
- **Sample data mode** to explore the panel without the backend (clearly labelled).

Uses the store's existing admin API. Visitor/wishlist numbers and team accounts need the two add-ons in
`backend-addon/` (see its README). The storefront sends anonymous events from `src/track.js` when built with `VITE_API_URL`.
