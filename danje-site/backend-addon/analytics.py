"""
DanJe' Angels — visitor & wishlist analytics add-on for the existing FastAPI backend.

Adds:
  POST /api/track/event          public, called by the storefront (src/track.js)
  GET  /api/admin/analytics      admin only, powers the admin "Dashboard" and "Visitors & Wishlist" pages

Install (in backend/server.py, after `db` and the admin auth dependency exist):

    from analytics import build_analytics_router
    app.include_router(build_analytics_router(db, require_admin))   # or api_router.include_router(...) without the /api prefix, see below

`require_admin` must be the same FastAPI dependency the existing /api/admin/* routes use
(look for the function those routes pass to Depends(...), e.g. get_current_admin / require_admin).

Privacy: stores a random visitor id, session id, page path, device class, referrer host and the
event type. No IP addresses, names or emails. Events older than RETENTION_DAYS are deleted
automatically by a MongoDB TTL index.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Literal, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field

RETENTION_DAYS = 400
LIVE_WINDOW_MIN = 5

EventType = Literal["pageview", "product_view", "cart_add", "wishlist_add", "wishlist_remove", "checkout_start", "search"]
_DEVICES = {"mobile", "tablet", "desktop"}


class TrackEvent(BaseModel):
    type: EventType
    path: str = Field("/", max_length=200)
    slug: Optional[str] = Field(None, max_length=120)
    qty: Optional[int] = Field(None, ge=0, le=100)
    value: Optional[float] = Field(None, ge=0, le=100000)
    query: Optional[str] = Field(None, max_length=60)
    referrer: Optional[str] = Field("", max_length=500)
    visitor_id: str = Field(..., min_length=1, max_length=64)
    session_id: str = Field(..., min_length=1, max_length=64)
    device: Optional[str] = Field("desktop", max_length=10)


def _ref_source(ref: str) -> str:
    if not ref:
        return "Direct"
    host = (urlparse(ref).hostname or "").lower().removeprefix("www.").removeprefix("m.").removeprefix("l.")
    for key, label in (("instagram", "instagram.com"), ("facebook", "facebook.com"), ("google", "google.com"),
                       ("pinterest", "pinterest.com"), ("tiktok", "tiktok.com"), ("youtube", "youtube.com"), ("bing", "bing.com")):
        if key in host:
            return label
    return host or "Other"


def build_analytics_router(db: Any, require_admin: Callable, prefix: str = "/api") -> APIRouter:
    router = APIRouter(prefix=prefix)
    events = db.analytics_events
    state = {"indexed": False}

    async def ensure_indexes() -> None:
        if state["indexed"]:
            return
        await events.create_index("ts", expireAfterSeconds=RETENTION_DAYS * 86400)
        await events.create_index([("type", 1), ("ts", -1)])
        await events.create_index([("visitor_id", 1), ("ts", -1)])
        state["indexed"] = True

    @router.post("/track/event", status_code=204)
    async def track_event(ev: TrackEvent, request: Request):
        await ensure_indexes()
        doc = ev.model_dump() if hasattr(ev, "model_dump") else ev.dict()
        doc["device"] = doc.get("device") if doc.get("device") in _DEVICES else "desktop"
        doc["source"] = _ref_source(doc.pop("referrer", "") or "")
        doc["path"] = doc["path"].split("?")[0][:200]
        doc["ts"] = datetime.now(timezone.utc)
        await events.insert_one(doc)
        return None

    async def window_stats(start: datetime, end: datetime) -> dict:
        match = {"ts": {"$gte": start, "$lt": end}}
        visitors = len(await events.distinct("visitor_id", {**match, "type": {"$in": ["pageview", "product_view"]}}))
        wish_adds = await events.count_documents({**match, "type": "wishlist_add"})
        return {"visitors": visitors, "wishlist_adds": wish_adds}

    @router.get("/admin/analytics")
    async def admin_analytics(days: int = Query(30, ge=1, le=365), _admin=Depends(require_admin)):
        await ensure_indexes()
        now = datetime.now(timezone.utc)
        start_day = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
        match = {"ts": {"$gte": start_day}}
        views = {"type": {"$in": ["pageview", "product_view"]}}

        per_day = await events.aggregate([
            {"$match": {**match, **views}},
            {"$group": {"_id": {"d": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts"}}},
                        "pageviews": {"$sum": 1}, "visitors": {"$addToSet": "$visitor_id"}}},
            {"$project": {"_id": 0, "date": "$_id.d", "pageviews": 1, "visitors": {"$size": "$visitors"}}},
        ]).to_list(None)
        by_date = {r["date"]: r for r in per_day}
        series = []
        for i in range(days):
            d = (start_day + timedelta(days=i)).strftime("%Y-%m-%d")
            series.append({"date": d, "visitors": by_date.get(d, {}).get("visitors", 0), "pageviews": by_date.get(d, {}).get("pageviews", 0)})

        visitors = len(await events.distinct("visitor_id", {**match, **views}))
        sessions = len(await events.distinct("session_id", {**match, **views}))
        pageviews = await events.count_documents({**match, **views})

        async def count_by(field: str, extra: dict, limit: int = 20) -> list:
            return await events.aggregate([
                {"$match": {**match, **extra, field: {"$ne": None}}},
                {"$group": {"_id": f"${field}", "n": {"$sum": 1}}},
                {"$sort": {"n": -1}}, {"$limit": limit},
            ]).to_list(None)

        async def unique_visitors_by(field: str) -> list:
            return await events.aggregate([
                {"$match": {**match, **views}},
                {"$group": {"_id": {"k": f"${field}", "v": "$visitor_id"}}},
                {"$group": {"_id": "$_id.k", "n": {"$sum": 1}}},
                {"$sort": {"n": -1}},
            ]).to_list(None)

        top_pages = [{"path": r["_id"], "views": r["n"]} for r in await count_by("path", views)]
        devices = {r["_id"]: r["n"] for r in await unique_visitors_by("device")}
        referrers = [{"source": r["_id"], "visitors": r["n"]} for r in await unique_visitors_by("source")][:8]
        adds = {r["_id"]: r["n"] for r in await count_by("slug", {"type": "wishlist_add"}, 100)}
        rems = {r["_id"]: r["n"] for r in await count_by("slug", {"type": "wishlist_remove"}, 100)}
        wishlist = sorted(({"slug": s, "adds": adds.get(s, 0), "removes": rems.get(s, 0), "net": adds.get(s, 0) - rems.get(s, 0)}
                           for s in set(adds) | set(rems)), key=lambda w: -w["net"])
        cart = [{"slug": r["_id"], "count": r["n"]} for r in await count_by("slug", {"type": "cart_add"}, 50)]
        searches = [{"query": r["_id"], "count": r["n"]} for r in await count_by("query", {"type": "search"}, 15)]

        async def uniq(t: str) -> int:
            return len(await events.distinct("visitor_id", {**match, "type": t}))

        live = len(await events.distinct("visitor_id", {"ts": {"$gte": now - timedelta(minutes=LIVE_WINDOW_MIN)}}))
        prev = await window_stats(start_day - timedelta(days=days), start_day)

        return {
            "days": series,
            "totals": {"visitors": visitors, "pageviews": pageviews, "sessions": sessions,
                       "avg_pages": round(pageviews / sessions, 1) if sessions else 0},
            "previous": prev,
            "live_visitors": live,
            "top_pages": top_pages,
            "devices": {k: devices.get(k, 0) for k in ("mobile", "desktop", "tablet")},
            "referrers": referrers,
            "wishlist": wishlist,
            "wishlist_total": {"adds": sum(adds.values()), "removes": sum(rems.values())},
            "cart_adds": cart,
            "searches": searches,
            "funnel": {"visitors": visitors, "product_views": await uniq("product_view"),
                       "cart_adds": await uniq("cart_add"), "checkout_starts": await uniq("checkout_start")},
        }

    return router
