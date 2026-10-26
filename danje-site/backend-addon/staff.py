"""
DanJe' Angels — staff accounts, roles and passwords for the admin panel.

Adds:
  POST   /api/staff/login                    sign in (email + password) -> token
  GET    /api/staff/me                       the signed-in user
  POST   /api/staff/me/password              change own password (needs current password)
  GET    /api/staff/users                    list team            (permission: users)
  POST   /api/staff/users                    add a team member    (permission: users)
  PATCH  /api/staff/users/{id}               change name/role/access/active (permission: users)
  POST   /api/staff/users/{id}/reset-password  set a new temporary password (permission: users)
  DELETE /api/staff/users/{id}               remove a team member (permission: users)

Roles (default access; an owner can tick extra/fewer areas per person):
  owner    everything, including Team & access
  manager  everything except Team & access
  orders   dashboard, orders, subscribers, messages
  content  dashboard, products, reviews
  viewer   dashboard and visitors (read only)

No extra packages: passwords use PBKDF2-SHA256 (600k rounds), tokens are HMAC-SHA256 signed.
Set STAFF_TOKEN_SECRET (any long random string) in the API's environment; JWT_SECRET is used if missing.

First sign-in: when there are no staff users yet, signing in with the backend's existing
ADMIN_EMAIL / ADMIN_PASSWORD environment values creates the first Owner account.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

PERMISSIONS = ["dashboard", "orders", "analytics", "products", "reviews", "subscribers", "messages", "users"]
ROLE_DEFAULTS = {
    "owner": PERMISSIONS,
    "manager": [p for p in PERMISSIONS if p != "users"],
    "orders": ["dashboard", "orders", "subscribers", "messages"],
    "content": ["dashboard", "products", "reviews"],
    "viewer": ["dashboard", "analytics"],
}
Role = Literal["owner", "manager", "orders", "content", "viewer"]
TOKEN_TTL = 12 * 3600
MIN_PASSWORD = 10
MAX_FAILS, LOCK_SECONDS = 5, 15 * 60


def _secret() -> bytes:
    s = os.environ.get("STAFF_TOKEN_SECRET") or os.environ.get("JWT_SECRET") or os.environ.get("SECRET_KEY")
    if not s:
        raise RuntimeError("Set STAFF_TOKEN_SECRET in the API environment")
    return s.encode()


def hash_password(pw: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 600_000)
    return f"pbkdf2_sha256$600000${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(pw: str, stored: str) -> bool:
    try:
        _, rounds, salt, dk = stored.split("$")
        test = hashlib.pbkdf2_hmac("sha256", pw.encode(), base64.b64decode(salt), int(rounds))
        return hmac.compare_digest(test, base64.b64decode(dk))
    except Exception:
        return False


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def make_token(user: dict) -> str:
    body = _b64(json.dumps({"sub": user["id"], "tv": user.get("token_version", 0), "exp": int(time.time()) + TOKEN_TTL}).encode())
    sig = _b64(hmac.new(_secret(), body.encode(), hashlib.sha256).digest())
    return f"{body}.{sig}"


def read_token(tok: str) -> Optional[dict]:
    try:
        body, sig = tok.split(".")
        if not hmac.compare_digest(_b64(hmac.new(_secret(), body.encode(), hashlib.sha256).digest()), sig):
            return None
        data = json.loads(_unb64(body))
        return data if data.get("exp", 0) > time.time() else None
    except Exception:
        return None


def public(u: dict) -> dict:
    return {k: u.get(k) for k in ("id", "email", "name", "role", "permissions", "active", "created_at", "last_login")}


class LoginIn(BaseModel):
    email: str = Field(..., max_length=200)
    password: str = Field(..., max_length=200)


class PasswordIn(BaseModel):
    current_password: str = Field(..., max_length=200)
    new_password: str = Field(..., min_length=MIN_PASSWORD, max_length=200)


class UserIn(BaseModel):
    email: str = Field(..., max_length=200)
    name: str = Field("", max_length=100)
    role: Role = "viewer"
    permissions: Optional[list[str]] = None
    password: str = Field(..., min_length=MIN_PASSWORD, max_length=200)


class UserPatch(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    role: Optional[Role] = None
    permissions: Optional[list[str]] = None
    active: Optional[bool] = None


class ResetIn(BaseModel):
    new_password: str = Field(..., min_length=MIN_PASSWORD, max_length=200)


class Staff:
    """Create once: `staff = Staff(db)`; include `staff.router`; protect routes with
    `Depends(staff.require("orders"))` (or `staff.require()` for any signed-in staff member)."""

    def __init__(self, db: Any, prefix: str = "/api"):
        self.users = db.staff_users
        self.router = APIRouter(prefix=prefix)
        self._routes()

    async def current(self, authorization: str = Header(None)) -> dict:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(401, "Sign in required")
        data = read_token(authorization.split(" ", 1)[1].strip())
        if not data:
            raise HTTPException(401, "Your session has expired. Please sign in again.")
        u = await self.users.find_one({"id": data["sub"]}, {"_id": 0})
        if not u or not u.get("active", True) or u.get("token_version", 0) != data.get("tv"):
            raise HTTPException(401, "Your session has expired. Please sign in again.")
        return u

    def require(self, permission: Optional[str] = None):
        async def dep(authorization: str = Header(None)) -> dict:
            u = await self.current(authorization)
            if permission and permission not in (u.get("permissions") or []):
                raise HTTPException(403, "You don't have access to this area. Ask the store owner.")
            return u
        return dep

    def _clean_perms(self, role: str, perms: Optional[list[str]]) -> list[str]:
        if role == "owner":
            return list(PERMISSIONS)
        base = perms if perms is not None else ROLE_DEFAULTS[role]
        return [p for p in PERMISSIONS if p in base]

    async def _owners(self) -> int:
        return await self.users.count_documents({"role": "owner", "active": True})

    def _routes(self) -> None:
        r = self.router

        @r.post("/staff/login")
        async def login(body: LoginIn):
            email = body.email.strip().lower()
            if await self.users.count_documents({}) == 0:
                env_email = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
                env_pw = os.environ.get("ADMIN_PASSWORD") or ""
                if env_email and email == env_email and hmac.compare_digest(body.password, env_pw):
                    await self.users.insert_one({
                        "id": str(uuid.uuid4()), "email": email, "name": "Store owner", "role": "owner",
                        "permissions": list(PERMISSIONS), "active": True, "password_hash": hash_password(env_pw),
                        "token_version": 0, "fails": 0, "locked_until": 0, "created_at": datetime.now(timezone.utc).isoformat(),
                    })
            u = await self.users.find_one({"email": email}, {"_id": 0})
            now = time.time()
            if u and u.get("locked_until", 0) > now:
                raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
            if not u or not u.get("active", True) or not verify_password(body.password, u.get("password_hash", "")):
                if u:
                    fails = u.get("fails", 0) + 1
                    await self.users.update_one({"id": u["id"]}, {"$set": {"fails": 0 if fails >= MAX_FAILS else fails,
                                                                          "locked_until": now + LOCK_SECONDS if fails >= MAX_FAILS else 0}})
                raise HTTPException(401, "That email and password don't match a team account.")
            await self.users.update_one({"id": u["id"]}, {"$set": {"fails": 0, "last_login": datetime.now(timezone.utc).isoformat()}})
            return {"access_token": make_token(u), "token_type": "bearer", "user": public(u)}

        @r.get("/staff/me")
        async def me(u=Depends(self.require())):
            return public(u)

        @r.post("/staff/me/password")
        async def change_password(body: PasswordIn, u=Depends(self.require())):
            if not verify_password(body.current_password, u["password_hash"]):
                raise HTTPException(400, "Your current password isn't right.")
            if body.new_password == body.current_password:
                raise HTTPException(400, "Choose a password you haven't used here before.")
            tv = u.get("token_version", 0) + 1
            await self.users.update_one({"id": u["id"]}, {"$set": {"password_hash": hash_password(body.new_password), "token_version": tv}})
            u["token_version"] = tv
            return {"access_token": make_token(u), "token_type": "bearer", "user": public(u)}

        @r.get("/staff/users")
        async def list_users(_=Depends(self.require("users"))):
            return [public(x) for x in await self.users.find({}, {"_id": 0}).sort("created_at", 1).to_list(500)]

        @r.post("/staff/users", status_code=201)
        async def add_user(body: UserIn, _=Depends(self.require("users"))):
            email = body.email.strip().lower()
            if "@" not in email:
                raise HTTPException(400, "Enter a valid email address.")
            if await self.users.find_one({"email": email}):
                raise HTTPException(409, "Someone on the team already uses that email.")
            u = {"id": str(uuid.uuid4()), "email": email, "name": body.name.strip(), "role": body.role,
                 "permissions": self._clean_perms(body.role, body.permissions), "active": True,
                 "password_hash": hash_password(body.password), "token_version": 0, "fails": 0, "locked_until": 0,
                 "created_at": datetime.now(timezone.utc).isoformat()}
            await self.users.insert_one(dict(u))
            return public(u)

        @r.patch("/staff/users/{uid}")
        async def edit_user(uid: str, body: UserPatch, me=Depends(self.require("users"))):
            u = await self.users.find_one({"id": uid}, {"_id": 0})
            if not u:
                raise HTTPException(404, "User not found")
            role = body.role or u["role"]
            losing_owner = u["role"] == "owner" and (role != "owner" or body.active is False)
            if losing_owner and await self._owners() <= 1:
                raise HTTPException(400, "The store needs at least one active owner.")
            if uid == me["id"] and body.active is False:
                raise HTTPException(400, "You can't deactivate your own account.")
            upd = {"role": role, "permissions": self._clean_perms(role, body.permissions if body.permissions is not None else (None if body.role else u["permissions"]))}
            if body.name is not None:
                upd["name"] = body.name.strip()
            if body.active is not None:
                upd["active"] = body.active
                if body.active is False:
                    upd["token_version"] = u.get("token_version", 0) + 1  # signs them out everywhere
            await self.users.update_one({"id": uid}, {"$set": upd})
            return public({**u, **upd})

        @r.post("/staff/users/{uid}/reset-password")
        async def reset(uid: str, body: ResetIn, _=Depends(self.require("users"))):
            u = await self.users.find_one({"id": uid}, {"_id": 0})
            if not u:
                raise HTTPException(404, "User not found")
            await self.users.update_one({"id": uid}, {"$set": {"password_hash": hash_password(body.new_password),
                                                              "token_version": u.get("token_version", 0) + 1, "fails": 0, "locked_until": 0}})
            return {"ok": True}

        @r.delete("/staff/users/{uid}")
        async def delete_user(uid: str, me=Depends(self.require("users"))):
            u = await self.users.find_one({"id": uid}, {"_id": 0})
            if not u:
                raise HTTPException(404, "User not found")
            if uid == me["id"]:
                raise HTTPException(400, "You can't remove your own account.")
            if u["role"] == "owner" and await self._owners() <= 1:
                raise HTTPException(400, "The store needs at least one active owner.")
            await self.users.delete_one({"id": uid})
            return {"ok": True}
