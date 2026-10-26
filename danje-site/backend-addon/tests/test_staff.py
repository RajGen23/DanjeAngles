import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.update(STAFF_TOKEN_SECRET="x"*40, ADMIN_EMAIL="owner@shop.com", ADMIN_PASSWORD="OwnerPass#2026")
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient
from staff import Staff
from analytics import build_analytics_router
db = AsyncMongoMockClient()["t"]; staff = Staff(db)
app = FastAPI(); app.include_router(staff.router); app.include_router(build_analytics_router(db, staff.require("analytics")))
@app.get("/api/admin/orders")
async def orders(u=Depends(staff.require("orders"))): return []
c = TestClient(app)
def ok(cond, msg): print(("PASS " if cond else "FAIL ") + msg)
r = c.post("/api/staff/login", json={"email":"owner@shop.com","password":"wrong"}); ok(r.status_code==401,"bad pw rejected")
r = c.post("/api/staff/login", json={"email":"Owner@Shop.com","password":"OwnerPass#2026"}); ok(r.status_code==200 and r.json()["user"]["role"]=="owner","bootstrap owner")
T = {"Authorization":"Bearer "+r.json()["access_token"]}; oid=r.json()["user"]["id"]
ok(c.get("/api/staff/me", headers=T).json()["email"]=="owner@shop.com","me")
r = c.post("/api/staff/users", headers=T, json={"email":"pack@shop.com","name":"Pat","role":"orders","password":"PackerPass1!"}); ok(r.status_code==201 and r.json()["permissions"]==["dashboard","orders","subscribers","messages"],"add orders user")
pid=r.json()["id"]
ok(c.post("/api/staff/users", headers=T, json={"email":"pack@shop.com","role":"viewer","password":"PackerPass1!"}).status_code==409,"duplicate email")
ok(c.post("/api/staff/users", headers=T, json={"email":"x@shop.com","role":"viewer","password":"short"}).status_code==422,"short password")
P = {"Authorization":"Bearer "+c.post("/api/staff/login", json={"email":"pack@shop.com","password":"PackerPass1!"}).json()["access_token"]}
ok(c.get("/api/admin/orders", headers=P).status_code==200,"orders user can see orders")
ok(c.get("/api/admin/analytics", headers=P).status_code==403,"orders user blocked from analytics")
ok(c.get("/api/staff/users", headers=P).status_code==403,"orders user blocked from users")
r=c.patch(f"/api/staff/users/{pid}", headers=T, json={"permissions":["dashboard","orders","analytics"]}); ok(r.json()["permissions"]==["dashboard","orders","analytics"],"custom access")
ok(c.get("/api/admin/analytics", headers=P).status_code==200,"custom access works immediately")
ok(c.post("/api/staff/me/password", headers=P, json={"current_password":"nope","new_password":"NewPacker123!"}).status_code==400,"wrong current pw")
r=c.post("/api/staff/me/password", headers=P, json={"current_password":"PackerPass1!","new_password":"NewPacker123!"}); ok(r.status_code==200,"change pw")
ok(c.get("/api/staff/me", headers=P).status_code==401,"old token revoked after pw change")
P2={"Authorization":"Bearer "+r.json()["access_token"]}; ok(c.get("/api/staff/me", headers=P2).status_code==200,"new token works")
ok(c.post("/api/staff/login", json={"email":"pack@shop.com","password":"NewPacker123!"}).status_code==200,"login with new pw")
ok(c.patch(f"/api/staff/users/{oid}", headers=T, json={"role":"viewer"}).status_code==400,"last owner protected")
ok(c.delete(f"/api/staff/users/{oid}", headers=T).status_code==400,"can't delete self")
ok(c.post(f"/api/staff/users/{pid}/reset-password", headers=T, json={"new_password":"TempPass1234"}).status_code==200,"owner resets pw")
ok(c.get("/api/staff/me", headers=P2).status_code==401,"reset signs user out")
c.patch(f"/api/staff/users/{pid}", headers=T, json={"active":False}); ok(c.post("/api/staff/login", json={"email":"pack@shop.com","password":"TempPass1234"}).status_code==401,"deactivated can't log in")
for i in range(5): c.post("/api/staff/login", json={"email":"owner@shop.com","password":"bad"})
ok(c.post("/api/staff/login", json={"email":"owner@shop.com","password":"OwnerPass#2026"}).status_code==429,"lockout after 5 fails")
ok(c.delete(f"/api/staff/users/{pid}", headers=T).status_code==200,"delete user")
