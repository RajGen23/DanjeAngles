"""Migrate DakEvents content from the Emergent preview DB into the Railway deployment.

Copies vendors (delta by name+city), categories, events, offers and the admin
settings (login hero, home hero, promo banners, bottom promo, app config).
User-generated data (users, tickets, reviews, conversations) is intentionally
left alone.
"""
import asyncio, sys
import httpx

SRC = "https://shaadi-connect-27.preview.emergentagent.com/api"
DST = "https://dakevents-api-production.up.railway.app/api"
EMAIL, PASSWORD = "admin@dakevents.demo", "Admin@2026"


async def token(c, base):
    r = await c.post(f"{base}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['token']}"}


async def all_vendors(c, base):
    out, skip = [], 0
    while True:
        d = (await c.get(f"{base}/vendors", params={"limit": 500, "skip": skip})).json()
        out.extend(d["items"])
        skip += 500
        if skip >= d["total"] or not d["items"]:
            return out


async def main():
    async with httpx.AsyncClient(timeout=120) as c:
        sh, dh = await token(c, SRC), await token(c, DST)

        # ---- vendors (delta) ----
        src_v = await all_vendors(c, SRC)
        dst_v = await all_vendors(c, DST)
        key = lambda v: ((v.get("name") or "").strip().lower(), (v.get("city") or "").strip().lower())
        have = {key(v) for v in dst_v}
        missing = [v for v in src_v if key(v) not in have]
        print(f"vendors: source={len(src_v)} target={len(dst_v)} missing={len(missing)}")

        sem = asyncio.Semaphore(6)
        failed = []

        async def push_vendor(v):
            body = {k: val for k, val in v.items()
                    if k not in ("vendor_id", "created_at", "_id")}
            async with sem:
                r = await c.post(f"{DST}/admin/vendors", json=body, headers=dh)
                if r.status_code >= 300:
                    failed.append((v.get("name"), r.status_code, r.text[:100]))

        for i in range(0, len(missing), 100):
            await asyncio.gather(*(push_vendor(v) for v in missing[i:i + 100]))
            print("  pushed", min(i + 100, len(missing)))

        # ---- categories ----
        s_cats = (await c.get(f"{SRC}/admin/categories", headers=sh)).json()["items"]
        d_cats = (await c.get(f"{DST}/admin/categories", headers=dh)).json()["items"]
        d_keys = {x["key"] for x in d_cats}
        for cat in s_cats:
            if cat["key"] in d_keys:
                continue
            body = {k: cat.get(k) for k in ("key", "en", "fr", "icon", "image", "active")}
            r = await c.post(f"{DST}/admin/categories", json=body, headers=dh)
            print("  category", cat["key"], r.status_code)

        # ---- events ----
        s_ev = (await c.get(f"{SRC}/admin/events", headers=sh)).json()
        s_ev = s_ev.get("items") or s_ev.get("events") or []
        d_ev = (await c.get(f"{DST}/admin/events", headers=dh)).json()
        d_ids = {e["event_id"] for e in (d_ev.get("items") or d_ev.get("events") or [])}
        for ev in s_ev:
            if ev["event_id"] in d_ids:
                await c.put(f"{DST}/admin/events/{ev['event_id']}", json=ev, headers=dh)
                continue
            r = await c.post(f"{DST}/admin/events", json=ev, headers=dh)
            print("  event", ev.get("title"), r.status_code)

        # ---- offers ----
        s_of = (await c.get(f"{SRC}/admin/offers", headers=sh)).json()["items"]
        d_of = (await c.get(f"{DST}/admin/offers", headers=dh)).json()["items"]
        d_oid = {o["offer_id"] for o in d_of}
        for of in s_of:
            if of["offer_id"] in d_oid:
                await c.put(f"{DST}/admin/offers/{of['offer_id']}", json=of, headers=dh)
                continue
            r = await c.post(f"{DST}/admin/offers", json=of, headers=dh)
            print("  offer", of.get("title"), r.status_code)

        # ---- settings ----
        lh = (await c.get(f"{SRC}/settings/login-hero")).json()
        if lh.get("image"):
            await c.put(f"{DST}/admin/settings/login-hero", json={"image": lh["image"]}, headers=dh)
        hh = (await c.get(f"{SRC}/settings/home-hero")).json()
        for img in hh.get("images") or []:
            await c.post(f"{DST}/admin/settings/home-hero/images",
                         json={"image": img.get("image") if isinstance(img, dict) else img},
                         headers=dh)
        for b in (await c.get(f"{SRC}/settings/promo-banners")).json().get("items") or []:
            body = {k: v for k, v in b.items() if k not in ("banner_id", "created_at")}
            await c.post(f"{DST}/admin/settings/promo-banners", json=body, headers=dh)
        bp = (await c.get(f"{SRC}/settings/bottom-promo")).json()
        if bp:
            await c.put(f"{DST}/admin/settings/bottom-promo", json=bp, headers=dh)
        ac = (await c.get(f"{SRC}/settings/app-config")).json()
        if ac:
            await c.put(f"{DST}/admin/settings/app-config", json=ac, headers=dh)
        print("settings copied")

        # ---- demo accounts that are not auto-seeded on startup ----
        for acct in ({"email": "test@dak.demo", "password": "test123", "name": "Aïcha Test"},):
            r = await c.post(f"{DST}/auth/register", json=acct)
            print("  demo account", acct["email"], r.status_code,
                  "" if r.status_code < 300 else r.text[:80])

        # ---- verify ----
        final = await all_vendors(c, DST)
        print("FINAL vendors:", len(final), "failed pushes:", len(failed))
        for f in failed[:5]:
            print("  ", f)

if __name__ == "__main__":
    asyncio.run(main())
