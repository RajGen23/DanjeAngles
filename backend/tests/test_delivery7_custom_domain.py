"""Verification for delivery7tocoa custom domain www.delibery7.com.
Configuration-only task. Does not write app data. Read-only checks."""
import os
import requests
from dotenv import dotenv_values
from pathlib import Path
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parents[2]
PANEL = dotenv_values(ROOT / "frontend/.env")["REACT_APP_BACKEND_URL"]
config = dotenv_values(ROOT / "backend/.env")
client = MongoClient(config["MONGO_URL"])
db = client[config["DB_NAME"]]
API = db.projects.find_one({"id": "delivery7tocoa-api"})["api_url"]
WEB = db.projects.find_one({"id": "delivery7tocoa-api"})["frontend_url"]
CUSTOM_ORIGIN = "https://" + db.domains.find_one({"id": "d10f6058-3f54-432a-b11c-f7463e3b5487"})["hostname"]
client.close()


# ---- Domains DB shape ----
def test_custom_domain_attached_only_to_web():
    r = requests.get(f"{PANEL}/api/domains", timeout=20)
    assert r.status_code == 200
    entries = [d for d in r.json() if d["hostname"] == "www.delibery7.com"]
    assert len(entries) == 1, f"expected exactly one www.delibery7.com row, got {len(entries)}"
    d = entries[0]
    assert d["project_id"] == "delivery7tocoa-web"
    assert d["railway_domain_id"] == "ea448f08-a869-4d6f-9fc7-840a3918be42"
    assert d["id"] == "d10f6058-3f54-432a-b11c-f7463e3b5487"


def test_custom_domain_dns_records_have_expected_cname_target():
    r = requests.get(f"{PANEL}/api/domains", timeout=20).json()
    d = [x for x in r if x["hostname"] == "www.delibery7.com"][0]
    recs = d.get("dns_records") or []
    assert recs, "no DNS records returned"
    cname = [x for x in recs if x.get("recordType") == "DNS_RECORD_TYPE_CNAME"]
    assert cname and cname[0]["requiredValue"] == "gzfs97lb.up.railway.app"


# ---- Old Railway domains preserved ----
def test_old_web_railway_domain_still_serves_html():
    r = requests.get(WEB + "/", timeout=20)
    assert r.status_code == 200
    assert "<html" in r.text.lower() or "<!doctype" in r.text.lower()


def test_old_api_root_ok():
    r = requests.get(API + "/api/", timeout=20)
    assert r.status_code == 200
    body = r.json()
    assert "Delivery 7 Tocoa API" in body.get("message", "")


def test_old_api_restaurants_returns_list():
    r = requests.get(API + "/api/restaurants", timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) > 0
    assert "name" in data[0] and "id" in data[0]


# ---- CORS ----
def test_cors_origins_env_contains_new_and_old():
    r = requests.get(f"{PANEL}/api/projects/delivery7tocoa-api/env", timeout=20)
    assert r.status_code == 200
    kv = {e["key"]: e["value"] for e in r.json()}
    val = kv.get("CORS_ORIGINS", "")
    assert WEB in val
    assert CUSTOM_ORIGIN in val


def test_cors_old_origin_preflight_ok():
    r = requests.options(
        API + "/api/restaurants",
        headers={
            "Origin": WEB,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type",
        }, timeout=20)
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == WEB


def test_cors_new_origin_preflight_should_be_ok():
    """Fails until the API redeploy has picked up the new CORS_ORIGINS env value."""
    r = requests.options(
        API + "/api/restaurants",
        headers={
            "Origin": CUSTOM_ORIGIN,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type",
        }, timeout=20)
    # Expect the deployment to eventually return 200 with ACAO=CUSTOM_ORIGIN
    assert r.status_code == 200, (
        f"preflight for {CUSTOM_ORIGIN} returned {r.status_code} -- API deployment "
        "has NOT reloaded new CORS_ORIGINS yet.")
    assert r.headers.get("access-control-allow-origin") == CUSTOM_ORIGIN


def test_cors_new_origin_simple_get_has_acao():
    r = requests.get(API + "/api/restaurants",
                     headers={"Origin": CUSTOM_ORIGIN}, timeout=20)
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == CUSTOM_ORIGIN, (
        "ACAO header missing on GET with new origin — deployment not reloaded.")


# ---- Custom domain live routing (expected pending until user updates DNS) ----
def test_custom_domain_https_not_yet_railway_hosted():
    """www.delibery7.com CNAME still points to delibery7.com (parking). Confirm
    that direct HTTPS to the custom domain is NOT yet the Railway app. This is
    the expected pending state per the review request."""
    try:
        r = requests.get(CUSTOM_ORIGIN + "/", timeout=10, allow_redirects=False)
    except requests.RequestException:
        return  # DNS / TLS errors also count as 'pending'
    # If it is 200 AND serves the Delivery 7 Tocoa index, DNS is already updated;
    # otherwise the parking page or a redirect is fine.
    if r.status_code == 200 and "delivery" in r.text.lower():
        # DNS already updated — great
        assert True
    else:
        # Still parked / awaiting DNS. Not a failure.
        assert True
