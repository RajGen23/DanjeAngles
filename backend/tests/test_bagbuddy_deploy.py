"""BagBuddy Railway deploy regression tests.

Web: https://bagbuddy-web-production.up.railway.app
API: https://bagbuddy-api-production.up.railway.app
"""
import os
import re
import time
import requests
import pytest

API = "https://bagbuddy-api-production.up.railway.app"
WEB = "https://bagbuddy-web-production.up.railway.app"
ADMIN_EMAIL = "admin@bagbuddy.com"
ADMIN_PASSWORD = "BagBuddy2026!"


# --------- Fixtures ---------
@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_session():
    sess = requests.Session()
    r = sess.post(f"{API}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return sess


@pytest.fixture(scope="session")
def created_booking(s):
    """Create a real booking used across track + admin detail tests."""
    payload = _booking_payload()
    r = s.post(f"{API}/api/bookings", json=payload, timeout=20)
    assert r.status_code == 201, r.text
    data = r.json()
    return {"booking_id": data["booking_id"], "email": payload["customer"]["email"], "payload": payload, "response": data}


def _booking_payload(promo=None):
    return {
        "service_type": "airport_to_hotel",
        "pickup": {
            "type": "Airport", "airport": "IAH", "terminal": "C", "airline": "United",
            "flight_number": "UA123", "arrival_date": "2026-02-15", "arrival_time": "14:00",
            "baggage_claim": "C2", "address": "IAH Terminal C Baggage Claim",
            "date": "2026-02-15", "time": "14:30", "instructions": "QA TEST"
        },
        "delivery": {
            "recipient_name": "QA TEST Recipient", "phone": "+17135551234",
            "email": "qatest@bagbuddy.example", "address": "1200 Smith St, Houston TX",
            "hotel_name": "Marriott Marquis Houston", "room": "1701", "time": "17:00",
            "instructions": "QA TEST — leave at bell desk", "zone": "A"
        },
        "bags": [{"type": "Suitcase", "size": "Medium", "weight": "30 lb", "color": "Black"}],
        "customer": {
            "first_name": "QA", "last_name": "TEST", "phone": "+17135550001",
            "email": "qa.test.bagbuddy@example.com", "country": "United States"
        },
        "options": {"priority": False, "same_day": False},
        "promo_code": promo,
        "agreed_terms": True, "certified_no_prohibited": True,
    }


# --------- Health / meta ---------
class TestHealth:
    def test_root(self, s):
        r = s.get(f"{API}/api/", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["service"] == "BagBuddy API"
        assert j["status"] == "ok"

    def test_airports(self, s):
        r = s.get(f"{API}/api/airports", timeout=15)
        assert r.status_code == 200
        codes = {a["code"] for a in r.json()}
        assert {"IAH", "HOU"}.issubset(codes)
        for a in r.json():
            assert "_id" not in a

    def test_zones(self, s):
        r = s.get(f"{API}/api/zones", timeout=15)
        assert r.status_code == 200
        codes = {z["code"] for z in r.json()}
        # spec says A/B/C — code actually seeds A/B/C/D
        assert {"A", "B", "C"}.issubset(codes)


# --------- Pricing quote ---------
class TestPricing:
    def test_quote_basic(self, s):
        r = s.post(f"{API}/api/pricing/quote", json={
            "service_type": "airport_to_hotel", "pickup_type": "Airport",
            "zone": "A", "bag_count": 1, "bags": [{"type": "Suitcase", "size": "Medium"}],
            "priority": False, "same_day": False
        }, timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("lines", "subtotal", "tax", "total", "currency"):
            assert k in j
        # base 39 + airport 8 = 47 subtotal, tax 8.25%
        assert j["subtotal"] == 47.0
        assert round(j["total"], 2) == round(47.0 * 1.0825, 2)

    def test_quote_promo_welcome20(self, s):
        r = s.post(f"{API}/api/pricing/quote", json={
            "service_type": "airport_to_hotel", "pickup_type": "Airport", "zone": "A",
            "bag_count": 2, "bags": [{"type": "Suitcase", "size": "Medium"},
                                     {"type": "Suitcase", "size": "Large"}],
            "priority": True, "same_day": False, "promo_code": "WELCOME20"
        }, timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["promo_code"] == "WELCOME20"
        assert j["discount"] > 0

    def test_quote_invalid_promo(self, s):
        r = s.post(f"{API}/api/pricing/quote", json={
            "service_type": "airport_to_hotel", "pickup_type": "Airport", "zone": "A",
            "bag_count": 1, "bags": [{"type": "Suitcase", "size": "Medium"}],
            "promo_code": "NOT_A_REAL_CODE"
        }, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j.get("promo_code") in (None, "")
        assert j["discount"] == 0


# --------- Bookings + track ---------
class TestBookingAndTrack:
    def test_booking_created(self, created_booking):
        d = created_booking["response"]
        assert re.match(r"^BB-HOU-\d{6}$", d["booking_id"]), d["booking_id"]
        assert d["status"] == "BOOKING CONFIRMED"
        assert "pricing" in d and d["pricing"]["total"] > 0
        assert "_id" not in d

    def test_booking_requires_terms(self, s):
        p = _booking_payload()
        p["agreed_terms"] = False
        r = s.post(f"{API}/api/bookings", json=p, timeout=15)
        assert r.status_code == 400

    def test_track_success(self, s, created_booking):
        r = s.post(f"{API}/api/track", json={
            "booking_id": created_booking["booking_id"],
            "contact": created_booking["email"],
        }, timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["booking_id"] == created_booking["booking_id"]
        assert "_id" not in j
        assert j["status"]

    def test_track_wrong_contact(self, s, created_booking):
        r = s.post(f"{API}/api/track", json={
            "booking_id": created_booking["booking_id"],
            "contact": "wrong@example.com",
        }, timeout=15)
        assert r.status_code == 403

    def test_track_unknown(self, s):
        r = s.post(f"{API}/api/track", json={"booking_id": "BB-HOU-999999", "contact": "x@y.com"}, timeout=15)
        assert r.status_code == 404


# --------- Agent applications + messages ---------
class TestForms:
    def test_agent_application(self, s):
        r = s.post(f"{API}/api/agent-applications", json={
            "first_name": "QA", "last_name": "TEST", "email": "qa.agent@example.com",
            "phone": "+17135559999", "city": "Houston", "vehicle_type": "SUV",
            "availability": "Weekends", "preferred_airports": ["IAH"],
            "background_check_consent": True,
        }, timeout=15)
        assert r.status_code == 201, r.text
        j = r.json()
        assert j["status"] == "PENDING"
        assert "_id" not in j

    def test_agent_application_requires_consent(self, s):
        r = s.post(f"{API}/api/agent-applications", json={
            "first_name": "QA", "last_name": "TEST", "email": "qa.agent2@example.com",
            "phone": "+17135550000", "city": "Houston", "vehicle_type": "Sedan",
            "availability": "Weekdays", "background_check_consent": False,
        }, timeout=15)
        assert r.status_code == 400

    def test_message(self, s):
        r = s.post(f"{API}/api/messages", json={
            "name": "QA TEST", "email": "qa.msg@example.com",
            "subject": "QA TEST subject", "message": "QA TEST — please ignore"
        }, timeout=15)
        assert r.status_code == 201, r.text
        j = r.json()
        assert j["status"] == "NEW"
        assert "_id" not in j


# --------- Auth + admin ---------
class TestAuth:
    def test_wrong_password(self, s):
        r = s.post(f"{API}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong-pw-xyz"}, timeout=15)
        assert r.status_code == 401
        assert "detail" in r.json()

    def test_login_ok(self):
        sess = requests.Session()
        r = sess.post(f"{API}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200
        assert sess.cookies.get("access_token")

    def test_me_requires_auth(self, s):
        r = s.get(f"{API}/api/auth/me", timeout=15)
        assert r.status_code in (401, 403)


class TestAdmin:
    ENDPOINTS = [
        "/api/admin/stats", "/api/admin/bookings", "/api/admin/statuses",
        "/api/admin/agent-applications", "/api/admin/messages", "/api/admin/promo-codes",
    ]

    @pytest.mark.parametrize("path", ENDPOINTS)
    def test_unauth_rejected(self, s, path):
        r = s.get(f"{API}{path}", timeout=15)
        assert r.status_code in (401, 403), f"{path} returned {r.status_code}"

    @pytest.mark.parametrize("path", ENDPOINTS)
    def test_auth_ok(self, admin_session, path):
        r = admin_session.get(f"{API}{path}", timeout=15)
        assert r.status_code == 200, f"{path}: {r.status_code} {r.text[:200]}"
        body = r.text
        assert '"_id"' not in body, f"_id leaked in {path}"

    def test_admin_sees_created_booking(self, admin_session, created_booking):
        r = admin_session.get(f"{API}/api/admin/bookings?limit=50", timeout=15)
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("items", data.get("bookings", []))
        ids = [b.get("booking_id") for b in items]
        assert created_booking["booking_id"] in ids, f"created booking not in first page: {ids[:5]}"

    def test_admin_booking_detail(self, admin_session, created_booking):
        r = admin_session.get(f"{API}/api/admin/bookings/{created_booking['booking_id']}", timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["booking_id"] == created_booking["booking_id"]
        assert "_id" not in r.text or '"_id"' not in r.text

    def test_promo_codes_list(self, admin_session):
        r = admin_session.get(f"{API}/api/admin/promo-codes", timeout=15)
        assert r.status_code == 200
        codes = {c["code"] for c in r.json()}
        assert {"WELCOME20", "HOUSTON10", "HOTEL25"}.issubset(codes), codes


# --------- CORS ---------
class TestCORS:
    def test_exact_origin(self, s):
        origin = WEB
        r = s.options(f"{API}/api/pricing/quote", headers={
            "Origin": origin, "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"
        }, timeout=15)
        assert r.status_code in (200, 204), r.status_code
        allow_origin = r.headers.get("access-control-allow-origin")
        assert allow_origin == origin, f"expected exact origin, got {allow_origin}"
        allow_creds = (r.headers.get("access-control-allow-credentials") or "").lower()
        assert allow_creds == "true", f"expected credentials true, got {allow_creds}"


# --------- Frontend static pages ---------
class TestFrontend:
    PATHS = ["/", "/book", "/track", "/how-it-works", "/services", "/airports",
             "/business", "/about", "/faq", "/legal", "/become-agent", "/contact",
             "/admin", "/does-not-exist-xyz"]

    @pytest.mark.parametrize("path", PATHS)
    def test_page_loads(self, s, path):
        r = s.get(f"{WEB}{path}", timeout=15)
        assert r.status_code == 200, f"{path} → {r.status_code}"
        assert "<div id=\"root\">" in r.text or "<html" in r.text.lower()


# --------- Regression: control panel + other apps ---------
CONTROL_PANEL = "https://app-vault-153.preview.emergentagent.com"


class TestRegression:
    def test_control_panel_projects(self, s):
        r = s.get(f"{CONTROL_PANEL}/api/projects", timeout=20)
        assert r.status_code == 200
        projects = r.json()
        names = [p.get("name") for p in projects]
        assert "bagbuddy-api" in names, names
        assert "bagbuddy-web" in names, names
        assert len(projects) >= 6

    def test_control_panel_stats(self, s):
        for path in ["/api/stats", "/api/resources", "/api/domains"]:
            r = s.get(f"{CONTROL_PANEL}{path}", timeout=20)
            assert r.status_code == 200, f"{path} → {r.status_code}"

    def test_dakevents(self, s):
        r = s.get("https://dakevents-web-production.up.railway.app/", timeout=15)
        assert r.status_code == 200
        r = s.get("https://dakevents-api-production.up.railway.app/api/vendors?limit=1&skip=0", timeout=20)
        assert r.status_code == 200
        j = r.json()
        total = j.get("total") if isinstance(j, dict) else None
        assert total and total >= 1333, f"vendor total {total}"

    def test_marine(self, s):
        r = s.get("https://marine-api-production-3b34.up.railway.app/api/products", timeout=20)
        assert r.status_code == 200
        j = r.json()
        items = j if isinstance(j, list) else j.get("items", j.get("products", []))
        total = j.get("total") if isinstance(j, dict) else len(items)
        assert (total or len(items)) >= 800

    def test_morningsoft(self, s):
        r = s.get("https://www.morningsofttissue.com/shop", timeout=20)
        assert r.status_code == 200
