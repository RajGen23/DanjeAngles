"""Tests for auto-heal behavior in GET /api/projects and regression checks."""
import os
import asyncio
import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/frontend/.env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def db():
    c = AsyncIOMotorClient(MONGO_URL)
    return c[DB_NAME]


def _get_projects(api):
    r = api.get(f"{BASE_URL}/api/projects", timeout=60)
    assert r.status_code == 200, r.text
    return r.json()


def test_projects_listed(api):
    projs = _get_projects(api)
    names = {p["name"] for p in projs}
    assert "morningsoft-api" in names
    assert "morningsoft-web" in names


def test_autoheal_flips_deploying_to_running(api, db):
    # Baseline
    projs_before = {p["name"]: p for p in _get_projects(api)}
    assert projs_before["morningsoft-api"]["status"] == "running"

    # Force stuck state directly in mongo
    async def force_deploying():
        await db.projects.update_one(
            {"name": "morningsoft-api"}, {"$set": {"status": "deploying"}}
        )
        doc = await db.projects.find_one({"name": "morningsoft-api"}, {"_id": 0})
        return doc

    doc = asyncio.get_event_loop().run_until_complete(force_deploying())
    assert doc["status"] == "deploying", "Setup: mongo should now show deploying"

    # Call the list endpoint — auto-heal should query Railway and flip it
    projs_after = {p["name"]: p for p in _get_projects(api)}
    api_proj = projs_after["morningsoft-api"]

    # Verify auto-heal fired: status flipped away from 'deploying'
    assert api_proj["status"] != "deploying", (
        f"Auto-heal did not fire — status still {api_proj['status']!r}"
    )
    assert api_proj["status"] == "running", (
        f"Expected 'running' since Railway reports SUCCESS, got {api_proj['status']!r}"
    )

    # Verify mongo has been updated too
    async def get_mongo():
        return await db.projects.find_one({"name": "morningsoft-api"}, {"_id": 0})

    persisted = asyncio.get_event_loop().run_until_complete(get_mongo())
    assert persisted["status"] == "running", (
        f"Mongo not updated by auto-heal: {persisted['status']!r}"
    )


def test_both_projects_have_emergent_source(api):
    projs = {p["name"]: p for p in _get_projects(api)}
    assert projs["morningsoft-api"].get("emergent_source_url")
    assert projs["morningsoft-web"].get("emergent_source_url")


def test_env_endpoint(api):
    projs = {p["name"]: p for p in _get_projects(api)}
    pid = projs["morningsoft-api"]["id"]
    r = api.get(f"{BASE_URL}/api/projects/{pid}/env", timeout=60)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_deployments_endpoint(api):
    projs = {p["name"]: p for p in _get_projects(api)}
    pid = projs["morningsoft-api"]["id"]
    r = api.get(f"{BASE_URL}/api/projects/{pid}/deployments", timeout=60)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_delete_nonexistent_returns_404(api):
    r = api.delete(f"{BASE_URL}/api/projects/does-not-exist-xxxxxx", timeout=30)
    assert r.status_code == 404


def test_redeploy_nonexistent_returns_404(api):
    r = api.post(
        f"{BASE_URL}/api/projects/does-not-exist-xxxxxx/action",
        json={"action": "redeploy"},
        timeout=30,
    )
    assert r.status_code == 404


def test_github_toggle_endpoint(api):
    projs = {p["name"]: p for p in _get_projects(api)}
    pid = projs["morningsoft-api"]["id"]
    orig = projs["morningsoft-api"].get("github_sync", False)
    r = api.post(
        f"{BASE_URL}/api/projects/{pid}/github",
        json={"enabled": bool(orig)},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    assert r.json().get("github_sync") == bool(orig)


def test_urls_endpoint(api):
    projs = {p["name"]: p for p in _get_projects(api)}
    pid = projs["morningsoft-api"]["id"]
    r = api.post(f"{BASE_URL}/api/projects/{pid}/urls", json={}, timeout=30)
    assert r.status_code == 200, r.text


def test_mongo_deprovision_when_none_returns_404(api):
    projs = {p["name"]: p for p in _get_projects(api)}
    pid = projs["morningsoft-web"]["id"]
    if projs["morningsoft-web"].get("mongo_service_id"):
        pytest.skip("mongo already provisioned")
    r = api.delete(f"{BASE_URL}/api/projects/{pid}/mongo", timeout=30)
    assert r.status_code == 404
