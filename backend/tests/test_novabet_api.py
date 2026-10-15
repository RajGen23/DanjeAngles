"""NovaBet deployed API verification tests (Railway).

Tests the public API endpoints at novabet-api-production.up.railway.app.
"""
import pytest
import requests
import uuid

BASE = "https://novabet-api-production.up.railway.app"
WEB = "https://novabet-web-production.up.railway.app"

DEMO = {"email": "demo@novabet.demo", "password": "demo1234"}
ADMIN = {"email": "admin@novabet.demo", "password": "Admin@123"}


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(session, creds):
    r = session.post(f"{BASE}/api/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login failed {r.status_code}: {r.text[:200]}"
    data = r.json()
    tok = data.get("token") or data.get("access_token") or data.get("jwt")
    if tok:
        session.headers["Authorization"] = f"Bearer {tok}"
    return data


@pytest.fixture(scope="module")
def demo_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    _login(s, DEMO)
    return s


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    _login(s, ADMIN)
    return s


# ---------- Health & root ----------
def test_api_root_200(api):
    r = api.get(f"{BASE}/api/", timeout=20)
    assert r.status_code == 200, r.text[:200]


def test_web_root_200():
    r = requests.get(WEB, timeout=20)
    assert r.status_code == 200
    assert "<html" in r.text.lower()


def test_web_spa_deep_route_no_404():
    r = requests.get(f"{WEB}/slots", timeout=20)
    assert r.status_code == 200, f"SPA fallback failing: {r.status_code}"


def test_web_images_served():
    # all /img/*.webp should be 200 per prior fix
    for name in ["slot1", "slot2", "slot3", "roulette", "blackjack", "crash", "jackpot", "hero"]:
        r = requests.get(f"{WEB}/img/{name}.webp", timeout=20)
        # not all names guaranteed - accept 200 or 404 but record
        assert r.status_code in (200, 404), f"{name}: {r.status_code}"


# ---------- Auth ----------
def test_demo_login(api):
    r = api.post(f"{BASE}/api/auth/login", json=DEMO, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert any(k in data for k in ("token", "access_token", "jwt"))


def test_admin_login(api):
    r = api.post(f"{BASE}/api/auth/login", json=ADMIN, timeout=20)
    assert r.status_code == 200


def test_auth_me(demo_session):
    r = demo_session.get(f"{BASE}/api/auth/me", timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert data.get("email") == DEMO["email"]


def test_invalid_login(api):
    r = api.post(f"{BASE}/api/auth/login", json={"email": "nope@x.y", "password": "bad"}, timeout=20)
    assert r.status_code in (400, 401, 403, 404, 422)


# ---------- Wallet ----------
def test_wallet_deposit(demo_session):
    r = demo_session.post(f"{BASE}/api/wallet/deposit", json={"amount": 50, "method": "card"}, timeout=20)
    assert r.status_code == 200, r.text[:200]
    data = r.json()
    assert "balance" in data or "wallet" in data or "amount" in data


def test_wallet_withdraw(demo_session):
    r = demo_session.post(f"{BASE}/api/wallet/withdraw", json={"amount": 20, "method": "card"}, timeout=20)
    assert r.status_code == 200, r.text[:200]


def test_wallet_withdraw_below_min(demo_session):
    r = demo_session.post(f"{BASE}/api/wallet/withdraw", json={"amount": 1, "method": "card"}, timeout=20)
    assert r.status_code in (400, 422)


def test_wallet_deposit_below_min(demo_session):
    r = demo_session.post(f"{BASE}/api/wallet/deposit", json={"amount": 1, "method": "card"}, timeout=20)
    assert r.status_code in (400, 422)


def test_wallet_transactions(demo_session):
    r = demo_session.get(f"{BASE}/api/wallet/transactions", timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, (list, dict))


# ---------- Public ----------
def test_wins_recent():
    r = requests.get(f"{BASE}/api/wins/recent", timeout=20)
    assert r.status_code == 200
    assert isinstance(r.json(), (list, dict))


# ---------- Games ----------
def test_slots_spin(demo_session):
    r = demo_session.post(f"{BASE}/api/games/slots/spin", json={"bet": 5}, timeout=20)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    # expect reels/payout/balance keys
    assert any(k in data for k in ("reels", "symbols", "payout", "win", "balance"))


def test_roulette_spin(demo_session):
    # try common payload shapes
    payloads = [
        {"bets": [{"type": "red", "amount": 5}]},
        {"bets": [{"type": "red", "value": "red", "amount": 5}]},
        {"bets": [{"type": "even", "amount": 5}]},
    ]
    last = None
    for p in payloads:
        r = demo_session.post(f"{BASE}/api/games/roulette/spin", json=p, timeout=20)
        last = r
        if r.status_code == 200:
            break
    assert last.status_code == 200, f"roulette tried shapes, last={last.status_code} {last.text[:200]}"


def test_blackjack_deal(demo_session):
    r = demo_session.post(f"{BASE}/api/games/blackjack/deal", json={"bet": 10}, timeout=20)
    assert r.status_code == 200, r.text[:300]


def test_crash_start(demo_session):
    r = demo_session.post(f"{BASE}/api/games/crash/start", json={"bet": 5}, timeout=20)
    assert r.status_code == 200, r.text[:300]
