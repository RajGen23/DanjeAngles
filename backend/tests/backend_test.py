"""Backend tests for selfhost control panel."""
import io
import os
import time
import zipfile

import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ---- Stats ----
def test_stats(s):
    r = s.get(f"{API}/stats")
    assert r.status_code == 200
    d = r.json()
    for k in ("apps_running", "total_projects", "total_deployments", "storage_mb", "uptime_pct"):
        assert k in d


# ---- Projects ----
def test_projects_list_has_seed(s):
    r = s.get(f"{API}/projects")
    assert r.status_code == 200
    data = r.json()
    names = [p["name"] for p in data]
    # Seed projects should exist
    assert "portfolio-site" in names or "crm-dashboard" in names
    for p in data:
        assert "_id" not in p
        assert "id" in p and "status" in p


def test_project_actions(s):
    r = s.get(f"{API}/projects").json()
    target = next((p for p in r if p["name"] == "portfolio-site"), r[0])
    pid = target["id"]

    for action, expected in [("stop", "stopped"), ("start", "running"), ("restart", "running")]:
        rr = s.post(f"{API}/projects/{pid}/action", json={"action": action})
        assert rr.status_code == 200, rr.text
        assert rr.json()["status"] == expected

    # Verify persisted
    projects = s.get(f"{API}/projects").json()
    p = next(x for x in projects if x["id"] == pid)
    assert p["status"] == "running"


def test_project_action_invalid(s):
    r = s.get(f"{API}/projects").json()
    pid = r[0]["id"]
    rr = s.post(f"{API}/projects/{pid}/action", json={"action": "explode"})
    assert rr.status_code == 400


def test_project_action_not_found(s):
    rr = s.post(f"{API}/projects/nonexistent-id/action", json={"action": "start"})
    assert rr.status_code == 404


# ---- Deploy ----
def _make_zip():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as zf:
        zf.writestr("index.html", "<h1>test</h1>")
    buf.seek(0)
    return buf


def test_deploy_rejects_non_zip(s):
    files = {"file": ("app.txt", b"hello", "text/plain")}
    data = {"name": "TEST_notzip"}
    r = s.post(f"{API}/deploy", files=files, data=data)
    assert r.status_code == 400


def test_deploy_flow_and_persistence(s):
    files = {"file": ("myapp.zip", _make_zip(), "application/zip")}
    name = "TEST_deploy_app"
    r = s.post(f"{API}/deploy", files=files, data={"name": name})
    assert r.status_code == 200, r.text
    d = r.json()
    assert "deployment_id" in d and "project_id" in d
    did = d["deployment_id"]

    # Poll deployment progress
    final = None
    for _ in range(30):
        time.sleep(1)
        dr = s.get(f"{API}/deployments/{did}")
        assert dr.status_code == 200
        dep = dr.json()
        if dep["status"] == "live":
            final = dep
            break
    assert final is not None, "Deployment did not reach live status"
    assert final["progress"] == 100
    assert len(final["logs"]) > 5

    # project shows in list as running
    projects = s.get(f"{API}/projects").json()
    p = next((x for x in projects if x["name"] == name), None)
    assert p is not None
    assert p["status"] == "running"

    # Cleanup
    s.delete(f"{API}/projects/{p['id']}")


def test_deployments_list(s):
    r = s.get(f"{API}/deployments")
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d, list)
    # Should have entries, none with logs field
    for dep in d:
        assert "logs" not in dep


def test_get_deployment_not_found(s):
    r = s.get(f"{API}/deployments/no-such-id")
    assert r.status_code == 404


# ---- Resources ----
def test_resources(s):
    r = s.get(f"{API}/resources")
    assert r.status_code == 200
    d = r.json()
    assert len(d["points"]) == 24
    for k in ("cpu_now", "ram_now", "disk_now"):
        assert isinstance(d[k], (int, float))
    for pt in d["points"]:
        for k in ("cpu", "ram", "disk"):
            assert 0 <= pt[k] <= 100


# ---- Domains ----
def test_domain_invalid_format(s):
    r = s.post(f"{API}/domains", json={"hostname": "notadomain"})
    assert r.status_code == 400


def test_domain_add_duplicate_and_propagation(s):
    host = f"test-{int(time.time())}.example.com"
    r = s.post(f"{API}/domains", json={"hostname": host})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["dns_status"] == "propagating"
    domain_id = d["id"]

    # Duplicate
    r2 = s.post(f"{API}/domains", json={"hostname": host})
    assert r2.status_code == 409

    # Wait for propagation (~8s)
    time.sleep(10)
    domains = s.get(f"{API}/domains").json()
    found = next(x for x in domains if x["id"] == domain_id)
    assert found["dns_status"] == "active"

    # Delete
    rd = s.delete(f"{API}/domains/{domain_id}")
    assert rd.status_code == 200

    # Delete non-existent
    rd2 = s.delete(f"{API}/domains/{domain_id}")
    assert rd2.status_code == 404


def test_project_delete_creates_and_removes(s):
    # Create via deploy to safely delete
    files = {"file": ("tmp.zip", _make_zip(), "application/zip")}
    r = s.post(f"{API}/deploy", files=files, data={"name": "TEST_del_project"})
    pid = r.json()["project_id"]
    time.sleep(1)
    rd = s.delete(f"{API}/projects/{pid}")
    assert rd.status_code == 200
    # 404 on re-delete
    rd2 = s.delete(f"{API}/projects/{pid}")
    assert rd2.status_code == 404
