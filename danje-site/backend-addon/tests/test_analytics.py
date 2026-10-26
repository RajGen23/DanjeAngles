import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient
from analytics import build_analytics_router
db = AsyncMongoMockClient()["t"]
async def require_admin(authorization: str = Header(None)):
    if authorization != "Bearer ok": raise HTTPException(401)
app = FastAPI(); app.include_router(build_analytics_router(db, require_admin))
c = TestClient(app)
ev = lambda **k: c.post("/api/track/event", json={"visitor_id":"v1","session_id":"s1","path":"/","type":"pageview", **k})
assert ev().status_code == 204
assert ev(visitor_id="v2", device="mobile", referrer="https://l.instagram.com/x").status_code == 204
assert ev(type="product_view", path="/product/danje-protector-pink", slug="danje-protector-pink").status_code == 204
assert ev(type="wishlist_add", slug="danje-protector-pink").status_code == 204
assert ev(type="wishlist_add", slug="danje-protector-pink", visitor_id="v2").status_code == 204
assert ev(type="wishlist_remove", slug="danje-protector-pink").status_code == 204
assert ev(type="cart_add", slug="linaii-faith-yellow", qty=1, value=45).status_code == 204
assert ev(type="search", query="heal").status_code == 204
assert ev(type="bogus").status_code == 422
assert c.get("/api/admin/analytics").status_code == 401
r = c.get("/api/admin/analytics?days=7", headers={"Authorization":"Bearer ok"}); print(r.status_code)
j = r.json(); import json; print(json.dumps({k:j[k] for k in ['totals','previous','live_visitors','devices','referrers','wishlist','wishlist_total','cart_adds','searches','funnel','top_pages']}))
print(j['days'][-1])
