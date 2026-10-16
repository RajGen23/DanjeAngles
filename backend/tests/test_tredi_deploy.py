# TREDI live Railway deploy regression tests (read-only, no data mutation)
import pytest
import requests

API = "https://tredi-api-production.up.railway.app"
WEB = "https://tredi-web-production.up.railway.app"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/api/auth/login",
                      data={"username": "owner@tredi.app", "password": "tredi1234"}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"owner login failed {r.status_code}")
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def h(token):
    return {"Authorization": f"Bearer {token}"}


# Health / infra
def test_health():
    r = requests.get(f"{API}/api/health", timeout=30)
    assert r.status_code == 200


# Auth
def test_login_returns_token_and_user():
    r = requests.post(f"{API}/api/auth/login",
                      data={"username": "owner@tredi.app", "password": "tredi1234"}, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d["access_token"], str) and len(d["access_token"]) > 20
    assert d["user"]["email"] == "owner@tredi.app"
    assert d["user"]["role"] == "owner"


def test_login_wrong_password():
    r = requests.post(f"{API}/api/auth/login",
                      data={"username": "owner@tredi.app", "password": "wrong"}, timeout=30)
    assert r.status_code in (400, 401)


def test_me(h):
    r = requests.get(f"{API}/api/auth/me", headers=h, timeout=30)
    assert r.status_code == 200
    assert r.json()["email"] == "owner@tredi.app"


def test_unauth_rejected():
    r = requests.get(f"{API}/api/customers", timeout=30)
    assert r.status_code in (401, 403)


# Business data
def test_business(h):
    r = requests.get(f"{API}/api/business", headers=h, timeout=30)
    assert r.status_code == 200
    assert "Tredi Ventures" in r.text


def _list(resp):
    d = resp.json()
    if isinstance(d, list):
        return d
    for k in ("items", "data", "results", "customers", "invoices"):
        if isinstance(d.get(k), list):
            return d[k]
    return []


def test_customers(h):
    r = requests.get(f"{API}/api/customers", headers=h, timeout=30)
    assert r.status_code == 200
    rows = _list(r)
    assert len(rows) > 0
    assert any("Adeola" in (c.get("name") or "") for c in rows)


def test_customer_detail(h):
    rows = _list(requests.get(f"{API}/api/customers", headers=h, timeout=30))
    cid = rows[0].get("id") or rows[0].get("_id")
    r = requests.get(f"{API}/api/customers/{cid}", headers=h, timeout=30)
    assert r.status_code == 200
    assert r.json().get("name") == rows[0]["name"] or rows[0]["name"] in r.text


def test_items(h):
    r = requests.get(f"{API}/api/items", headers=h, timeout=30)
    assert r.status_code == 200
    assert len(_list(r)) > 0


def test_invoices_and_detail(h):
    r = requests.get(f"{API}/api/invoices", headers=h, timeout=30)
    assert r.status_code == 200
    rows = _list(r)
    assert len(rows) > 0
    iid = rows[0].get("id") or rows[0].get("_id")
    d = requests.get(f"{API}/api/invoices/{iid}", headers=h, timeout=30)
    assert d.status_code == 200


@pytest.mark.parametrize("path", ["/api/dashboard", "/api/sales", "/api/expenses",
                                  "/api/accounts", "/api/reports/summary", "/api/suppliers"])
def test_misc_reads(h, path):
    r = requests.get(f"{API}{path}", headers=h, timeout=30)
    assert r.status_code == 200, r.text[:200]


# Super admin
def test_superadmin_login():
    r = requests.post(f"{API}/api/admin/auth/login",
                      json={"email": "superadmin@tredi.app", "password": "tredi1234"}, timeout=30)
    if r.status_code == 422:
        r = requests.post(f"{API}/api/admin/auth/login",
                          data={"username": "superadmin@tredi.app", "password": "tredi1234"}, timeout=30)
    assert r.status_code == 200, r.text[:300]
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok
    o = requests.get(f"{API}/api/admin/overview", headers={"Authorization": f"Bearer {tok}"}, timeout=30)
    assert o.status_code == 200, o.text[:300]


# Web hosting / SPA fallback
@pytest.mark.parametrize("path", ["/", "/admin/login", "/customers", "/some/deep/route"])
def test_web_spa_fallback(path):
    r = requests.get(f"{WEB}{path}", timeout=30)
    assert r.status_code == 200
    assert "<div id=\"root\"" in r.text or "expo" in r.text.lower()


def test_web_bundle_points_to_railway_api():
    html = requests.get(f"{WEB}/", timeout=30).text
    import re
    js = re.findall(r'src="(/_expo/static/js/web/[^"]+\.js)"', html)
    assert js, "no expo bundle found"
    body = requests.get(f"{WEB}{js[0]}", timeout=60).text
    assert "tredi-api-production.up.railway.app" in body
    assert "preview.emergentagent.com" not in body
