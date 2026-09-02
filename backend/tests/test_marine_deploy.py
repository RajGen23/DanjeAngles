"""End-to-end regression tests for Marine deploy + Morning Soft + control panel."""
import os
import pytest
import requests

MARINE_API = "https://marine-api-production-3b34.up.railway.app"
MARINE_WEB = "https://marine-web-production.up.railway.app"
MORNINGSOFT_API = "https://morningsoft-api-production.up.railway.app"
MORNINGSOFT_WEB = "https://www.morningsofttissue.com"
PANEL_API = "https://app-vault-153.preview.emergentagent.com"

MARINE_ADMIN = {"email": "admin@mechanics.co.za", "password": "Mechanics#2026"}

TIMEOUT = 30


# --- Marine backend ---
class TestMarineBackend:
    def test_root(self):
        r = requests.get(f"{MARINE_API}/api/", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "MECHANICS" in str(body).upper() or "running" in str(body).lower(), body

    def test_products_list(self):
        r = requests.get(f"{MARINE_API}/api/products", timeout=TIMEOUT)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 39, f"expected 39 products, got {len(data)}"
        # sanity: no bare mongo _id leaked
        assert "_id" not in data[0]
        assert "id" in data[0]

    def test_brands(self):
        r = requests.get(f"{MARINE_API}/api/products/brands", timeout=TIMEOUT)
        assert r.status_code == 200
        brands = r.json()
        assert isinstance(brands, list) and len(brands) > 0

    def test_product_by_id(self):
        products = requests.get(f"{MARINE_API}/api/products", timeout=TIMEOUT).json()
        pid = products[0]["id"]
        r = requests.get(f"{MARINE_API}/api/products/{pid}", timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()["id"] == pid

    def test_protected_endpoints_reject_anon(self):
        # POST /api/products should require auth
        r = requests.post(
            f"{MARINE_API}/api/products",
            json={"name": "TEST_hack", "price": 1},
            timeout=TIMEOUT,
        )
        assert r.status_code in (401, 403, 422), f"expected auth reject, got {r.status_code} {r.text[:200]}"

        r2 = requests.delete(f"{MARINE_API}/api/products/does-not-exist", timeout=TIMEOUT)
        assert r2.status_code in (401, 403, 404), r2.status_code

    def test_cors_exact_origin(self):
        # Preflight from marine-web origin
        r = requests.options(
            f"{MARINE_API}/api/products",
            headers={
                "Origin": MARINE_WEB,
                "Access-Control-Request-Method": "GET",
            },
            timeout=TIMEOUT,
        )
        allow = r.headers.get("access-control-allow-origin", "")
        assert allow == MARINE_WEB, f"CORS ACAO must be exact origin, got '{allow}'"
        allow_creds = r.headers.get("access-control-allow-credentials", "")
        assert allow_creds.lower() == "true", f"ACAC must be true, got '{allow_creds}'"


# --- Marine enquiry + admin auth ---
class TestMarineFlows:
    def test_enquiry_submission(self):
        r = requests.post(
            f"{MARINE_API}/api/enquiries",
            json={
                "name": "TEST_Sender",
                "email": "test@example.com",
                "phone": "+27000000000",
                "message": "TEST enquiry - please ignore",
            },
            timeout=TIMEOUT,
        )
        assert r.status_code in (200, 201), f"{r.status_code} {r.text[:300]}"

    def test_admin_login_wrong_password(self):
        r = requests.post(
            f"{MARINE_API}/api/auth/login",
            json={"email": MARINE_ADMIN["email"], "password": "definitely-wrong"},
            timeout=TIMEOUT,
        )
        assert r.status_code in (400, 401, 403), r.status_code

    def test_admin_login_success(self):
        r = requests.post(
            f"{MARINE_API}/api/auth/login",
            json=MARINE_ADMIN,
            timeout=TIMEOUT,
        )
        # accept either token in body OR session cookie set
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        has_token = any(k in body for k in ("access_token", "token", "jwt")) or bool(r.cookies)
        assert has_token, f"no token/cookie returned: {body}"


# --- Morning Soft regression ---
class TestMorningSoftRegression:
    def test_ms_api_products(self):
        r = requests.get(f"{MORNINGSOFT_API}/api/products", timeout=TIMEOUT)
        assert r.status_code == 200
        body = r.json()
        # Morning Soft returns {categories, products}
        products = body.get("products") if isinstance(body, dict) else body
        assert isinstance(products, list) and len(products) > 0

    def test_ms_shop_html(self):
        r = requests.get(f"{MORNINGSOFT_WEB}/shop", timeout=TIMEOUT)
        assert r.status_code == 200
        assert len(r.text) > 500


# --- Control panel regression ---
class TestPanel:
    def test_projects(self):
        r = requests.get(f"{PANEL_API}/api/projects", timeout=TIMEOUT)
        assert r.status_code == 200
        projects = r.json()
        assert isinstance(projects, list)
        names = {p.get("name", "") for p in projects}
        expected = {"morningsoft-api", "morningsoft-web", "marine-api", "marine-web"}
        missing = expected - names
        assert not missing, f"missing projects: {missing} (found {names})"

    def test_stats(self):
        r = requests.get(f"{PANEL_API}/api/stats", timeout=TIMEOUT)
        assert r.status_code == 200

    def test_resources(self):
        r = requests.get(f"{PANEL_API}/api/resources", timeout=TIMEOUT)
        assert r.status_code == 200

    def test_domains(self):
        r = requests.get(f"{PANEL_API}/api/domains", timeout=TIMEOUT)
        assert r.status_code == 200
