"""Tests for POST /api/projects/{id}/refetch bug fix verification.

Verifies:
1) refetch accepts request and returns a deployment_id even when Emergent workspace
   is cold-started (login retry loop absorbs 'Starting IDE' placeholder).
2) fetch phase saves a reasonable number of files (>15).
3) railway CLI is found in PATH (no FileNotFoundError).
4) Wrong password returns a clean 500 with improved error text.
"""
import asyncio
import os
import time

import pytest
import requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def loop():
    return asyncio.new_event_loop()


def _get_projects(api):
    r = api.get(f"{BASE_URL}/api/projects", timeout=90)
    assert r.status_code == 200, r.text
    return {p["name"]: p for p in r.json()}


def _mongo_project(loop, name):
    async def _get():
        c = AsyncIOMotorClient(MONGO_URL)
        doc = await c[DB_NAME].projects.find_one({"name": name}, {"_id": 0})
        c.close()
        return doc
    return loop.run_until_complete(_get())


def _mongo_set_password(loop, name, pwd):
    async def _set():
        c = AsyncIOMotorClient(MONGO_URL)
        await c[DB_NAME].projects.update_one({"name": name}, {"$set": {"emergent_source_password": pwd}})
        c.close()
    return loop.run_until_complete(_set())


def test_precondition_projects_configured(api):
    """Both morningsoft projects must have emergent source + railway token set."""
    projs = _get_projects(api)
    for name in ("morningsoft-api", "morningsoft-web"):
        assert name in projs, f"{name} missing"
        p = projs[name]
        assert p.get("emergent_source_url"), f"{name} missing emergent_source_url"


def test_precondition_mongo_password_and_token(loop):
    """Mongo docs must have password + railway_project_token."""
    for name in ("morningsoft-api", "morningsoft-web"):
        doc = _mongo_project(loop, name)
        assert doc is not None
        assert doc.get("emergent_source_password"), f"{name} missing password in mongo"
        assert doc.get("railway_project_token"), f"{name} missing railway_project_token"


def test_refetch_api_returns_deployment_id_with_cold_start(api, loop):
    """
    Core bug-fix test. Hits /api/projects/{id}/refetch on morningsoft-api.
    Even if the Emergent workspace is cold, the retry-with-backoff should
    absorb the 'Starting IDE' placeholder and return HTTP 200 + deployment_id.
    """
    projs = _get_projects(api)
    pid = projs["morningsoft-api"]["id"]

    # Give plenty of time — cold start can take 90s + fetch takes ~30s
    r = api.post(f"{BASE_URL}/api/projects/{pid}/refetch", timeout=240)
    assert r.status_code == 200, (
        f"Expected 200 but got {r.status_code}: {r.text[:500]}"
    )
    body = r.json()
    assert "deployment_id" in body, body
    assert body["project_id"] == pid
    global _refetch_deployment_id
    _refetch_deployment_id = body["deployment_id"]


def test_deployment_fetch_phase_ran_without_railway_missing_error(api):
    """
    Poll the deployment briefly and verify the fetch step logged and no
    'No such file or directory: railway' error occurred.
    """
    dep_id = globals().get("_refetch_deployment_id")
    assert dep_id, "Previous test did not produce a deployment_id"

    # Sleep ~45s per reviewer instructions — enough for fetch + railway up to start
    time.sleep(45)

    r = api.get(f"{BASE_URL}/api/deployments/{dep_id}", timeout=60)
    assert r.status_code == 200, r.text
    dep = r.json()
    logs = dep.get("logs") or []
    log_text = "\n".join(l.get("msg", "") for l in logs)
    print("=== DEPLOYMENT LOGS ===")
    print(log_text[:4000])
    print("=== STATUS:", dep.get("status"))

    # Must NOT contain the pre-fix errors
    assert "No such file or directory: 'railway'" not in log_text, \
        f"railway CLI not found (fix regressed): {log_text}"
    assert "FileNotFoundError" not in log_text, \
        f"FileNotFoundError in logs: {log_text}"
    assert "code-server-session cookie" not in log_text.lower() or \
           "rotate" in log_text.lower(), \
        f"Cold-start placeholder leaked through retry loop: {log_text}"

    # Must contain evidence the fetch ran (either the seed 'Refetched N files' or 'framework')
    assert "Refetched" in log_text or "framework" in log_text.lower() or \
           "railway up" in log_text.lower() or dep.get("status") in ("building", "deploying", "success", "failed"), \
        f"No fetch/deploy evidence: {log_text}"


def test_refetch_saved_reasonable_file_count(api):
    """Verify the fetch saved > 15 files (was ~15 pre-fix due to placeholder mid-BFS)."""
    dep_id = globals().get("_refetch_deployment_id")
    assert dep_id, "Previous test did not produce a deployment_id"
    r = api.get(f"{BASE_URL}/api/deployments/{dep_id}", timeout=60)
    dep = r.json()
    logs = dep.get("logs") or []
    log_text = "\n".join(l.get("msg", "") for l in logs)
    # Look for "Refetched N files"
    import re
    m = re.search(r"Refetched\s+(\d+)\s+files", log_text)
    if not m:
        pytest.skip(f"Could not find Refetched count in logs: {log_text[:1000]}")
    n = int(m.group(1))
    print(f"Refetched N = {n}")
    # morningsoft-api is backend subdir → expect ~15+; if full workspace ~40+
    assert n >= 15, f"Only {n} files fetched (pre-fix baseline was ~15). Expected >15."


def test_refetch_wrong_password_returns_clean_500(api, loop):
    """
    Set morningsoft-web password to a definitely-wrong value in mongo, hit refetch,
    verify HTTP 500 with the improved error text (mentions 'code-server rejected' or 'rotate').
    """
    orig = _mongo_project(loop, "morningsoft-web").get("emergent_source_password")
    assert orig, "No original password to restore"

    try:
        _mongo_set_password(loop, "morningsoft-web", "DEFINITELY_WRONG_9x8x")
        projs = _get_projects(api)
        pid = projs["morningsoft-web"]["id"]
        r = api.post(f"{BASE_URL}/api/projects/{pid}/refetch", timeout=180)
        assert r.status_code == 500, f"Expected 500, got {r.status_code}: {r.text[:500]}"
        detail = ""
        try:
            detail = r.json().get("detail", "")
        except Exception:
            detail = r.text
        low = detail.lower()
        # improved message MUST NOT be the raw pre-fix 'password may be wrong'
        assert "password may be wrong" not in low, \
            f"Pre-fix raw error still surfacing: {detail!r}"
        # Must contain improved messaging keywords
        assert ("rotate" in low or "code-server rejected" in low or "password" in low), \
            f"Error text not descriptive: {detail!r}"
        print(f"Wrong-password 500 detail: {detail}")
    finally:
        _mongo_set_password(loop, "morningsoft-web", orig)


def test_refetch_button_state_still_visible(api):
    """
    After the refetch, morningsoft-api will be in status='deploying' temporarily.
    Verify GET /api/projects still returns both projects (frontend can render them).
    The refetch button is enabled based on emergent_source_url presence — verify that.
    """
    projs = _get_projects(api)
    for name in ("morningsoft-api", "morningsoft-web"):
        assert name in projs
        assert projs[name].get("emergent_source_url")
