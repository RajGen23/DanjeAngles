"""Migrate the live MECHANICS catalogue (828 products) from the Emergent preview into the
Railway deployment via the admin API."""
import asyncio, json, sys
import httpx

SRC = "https://marine-engine-store.preview.emergentagent.com/api"
DST = "https://marine-api-production-3b34.up.railway.app/api"
EMAIL, PASSWORD = "admin@mechanics.co.za", "Mechanics#2026"
FIELDS = ("name", "brand", "category", "condition", "price", "image",
          "description", "specs", "featured", "available")


async def main():
    async with httpx.AsyncClient(timeout=90) as c:
        src = (await c.get(f"{SRC}/products")).json()
        print("source products:", len(src))

        tok = (await c.post(f"{DST}/auth/login",
                            json={"email": EMAIL, "password": PASSWORD})).json()["access_token"]
        h = {"Authorization": f"Bearer {tok}"}

        existing = (await c.get(f"{DST}/products")).json()
        print("existing on Railway:", len(existing))
        for p in existing:
            await c.delete(f"{DST}/products/{p['id']}", headers=h)
        print("cleared")

        sem = asyncio.Semaphore(8)
        failures = []

        async def push(p):
            body = {k: p.get(k) for k in FIELDS if p.get(k) is not None}
            async with sem:
                for _ in range(3):
                    r = await c.post(f"{DST}/products", json=body, headers=h)
                    if r.status_code < 300:
                        return
                    await asyncio.sleep(1)
                failures.append((p.get("name"), r.status_code, r.text[:120]))

        for i in range(0, len(src), 100):
            await asyncio.gather(*(push(p) for p in src[i:i + 100]))
            print("pushed", min(i + 100, len(src)))

        final = (await c.get(f"{DST}/products")).json()
        print("final count:", len(final), "failures:", len(failures))
        for f in failures[:5]:
            print(f)

asyncio.run(main())
