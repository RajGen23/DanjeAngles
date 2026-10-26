# Backend add-ons for the DanJe' Angels admin panel

The store's FastAPI backend already has orders, products, reviews, subscribers and contact
messages, and the new admin panel (`/admin`) uses those endpoints as they are. It does **not**
record visitors or wishlists, so this add-on adds two endpoints:

| Endpoint | Who calls it | What it does |
|---|---|---|
| `POST /api/track/event` | the storefront (`src/track.js`) | stores one anonymous event (page view, product view, add to basket, wishlist add/remove, checkout start, search) |
| `GET /api/admin/analytics?days=30` | the admin panel | visitors per day, live visitors, top pages, devices, traffic sources, wishlist leaderboard, basket adds, searches, shopper funnel |

## Install (about 5 minutes)

1. Copy `analytics.py` next to `server.py` in the backend.
2. In `server.py`, after `db` is created and after the admin dependency used by the
   `/api/admin/*` routes is defined, add:

   ```python
   from analytics import build_analytics_router
   app.include_router(build_analytics_router(db, get_current_admin))
   ```

   Replace `get_current_admin` with the function the existing admin routes pass to `Depends(...)`.
   The router already uses the `/api` prefix; if you include it into `api_router`
   (which has `/api` itself) pass `prefix=""`.
3. Make sure `CORS_ORIGINS` includes the shop's web address (it already does for the Railway web service).
4. Redeploy the API. Events are written to a new `analytics_events` collection; a TTL index
   deletes events older than 400 days.

No new Python packages are needed (FastAPI, Pydantic and Motor are already installed).

## Check it works
- Open the shop and click around, then `GET /api/admin/analytics?days=1` with the admin token:
  `totals.visitors` should be at least 1.
- The admin dashboard's "Visitor and wishlist tracking isn't switched on yet" notice disappears.

## Privacy
Visitors get a random id stored in their browser. No IP address, name or email is stored.
Visitors with "Do Not Track" turned on are not tracked. Mention the anonymous analytics in the
shop's privacy policy.


---

# Team accounts, roles and passwords (`staff.py`)

The store's original backend has one admin login whose password lives in the server settings.
`staff.py` adds proper team accounts:

- each person signs in with their own email and password, and can **change their password** under *My account*
- owners can **add team members**, pick a **role**, tick extra or fewer **access areas**, **reset a password**, **deactivate** or **remove** someone
- roles: **Owner** (everything), **Manager** (everything except Team & access), **Orders & customers**, **Products & content**, **Viewer** (dashboard + visitors)
- passwords are hashed (PBKDF2-SHA256, 600,000 rounds); 5 wrong attempts lock the account for 15 minutes;
  changing or resetting a password signs that person out everywhere; the last owner can't be removed or downgraded

## Install

1. Copy `staff.py` (and `analytics.py`) next to `server.py`.
2. Add `STAFF_TOKEN_SECRET=<long random string>` to the API's environment on Railway.
3. In `server.py`:

   ```python
   from staff import Staff
   from analytics import build_analytics_router

   staff = Staff(db)
   app.include_router(staff.router)
   app.include_router(build_analytics_router(db, staff.require("analytics")))
   ```

4. Protect the existing admin routes with the matching area, so access is enforced by the server
   and not only hidden in the panel. Replace the current admin dependency on each route:

   | Existing route | Use |
   |---|---|
   | `GET /api/admin/orders` | `Depends(staff.require("orders"))` |
   | `POST/PATCH/DELETE /api/admin/products…`, `POST /api/admin/uploads` | `Depends(staff.require("products"))` |
   | `DELETE /api/admin/reviews/{id}` | `Depends(staff.require("reviews"))` |
   | `GET /api/admin/subscribers` | `Depends(staff.require("subscribers"))` |
   | `GET /api/admin/contact-messages` | `Depends(staff.require("messages"))` |
   | `…/api/admin/posts…` | `Depends(staff.require("products"))` |

5. Redeploy, open `/admin` and sign in with the existing `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
   That first sign-in creates the Owner account. Change the password straight away under *My account*.

Until `staff.py` is installed the panel falls back to the original single admin login; *Team & access*
and *Change password* show a note explaining what's needed.

## Tests
`pip install fastapi httpx mongomock-motor` then `python tests/test_staff.py` and `python tests/test_analytics.py`.
