# GitHub source feature: repos/branches listing, set/clear source, github-fetch error paths.
# SAFE: never triggers a successful github-fetch (live production apps). Always clears source at end.
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
PID = "novabet-api"
REPO = "RajGen23/CarRenatlEliteAus"


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    requests.delete(f"{API}/projects/{PID}/github-source", timeout=30)


# --- listing ---
def test_list_repos():
    r = requests.get(f"{API}/github/repos", timeout=60)
    assert r.status_code == 200
    repos = r.json()["repos"]
    names = {x["full_name"] for x in repos}
    assert REPO in names and "RajGen23/lalu-yadav" in names
    for x in repos:
        assert isinstance(x["private"], bool) and x["default_branch"]


def test_branches_slug():
    r = requests.get(f"{API}/github/branches", params={"repo": REPO}, timeout=30)
    assert r.status_code == 200 and "main" in r.json()["branches"]


def test_branches_url():
    r = requests.get(f"{API}/github/branches", params={"repo": f"https://github.com/{REPO}.git"}, timeout=30)
    assert r.status_code == 200 and "main" in r.json()["branches"]


def test_branches_bad_repo():
    r = requests.get(f"{API}/github/branches", params={"repo": "RajGen23/does-not-exist-xyz"}, timeout=30)
    assert r.status_code == 400
    r = requests.get(f"{API}/github/branches", params={"repo": "garbage"}, timeout=30)
    assert r.status_code == 400 and "owner/repo" in r.json()["detail"]


# --- set / clear ---
def test_set_source_bad_repo():
    r = requests.post(f"{API}/projects/{PID}/github-source", json={"repo": "RajGen23/nope-xyz-404"}, timeout=30)
    assert r.status_code == 400 and "not found" in r.json()["detail"]


def test_set_source_unknown_project():
    r = requests.post(f"{API}/projects/no-such-proj/github-source", json={"repo": REPO}, timeout=30)
    assert r.status_code == 404


def test_fetch_no_source():
    requests.delete(f"{API}/projects/{PID}/github-source", timeout=30)
    r = requests.post(f"{API}/projects/{PID}/github-fetch", timeout=30)
    assert r.status_code == 400 and "not configured" in r.json()["detail"]


def test_set_source_default_branch_and_persist():
    r = requests.post(f"{API}/projects/{PID}/github-source",
                      json={"repo": f"https://github.com/{REPO}", "branch": "", "folder": "/backend/"}, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d == {"repo": REPO, "branch": "main", "folder": "backend"}
    p = next(x for x in requests.get(f"{API}/projects", timeout=30).json() if x["id"] == PID)
    assert p["github_source_repo"] == REPO and p["github_source_branch"] == "main" and p["github_source_folder"] == "backend"


def test_fetch_bad_folder_400():
    r = requests.post(f"{API}/projects/{PID}/github-source", json={"repo": REPO, "folder": "nope"}, timeout=30)
    assert r.status_code == 200
    r = requests.post(f"{API}/projects/{PID}/github-fetch", timeout=120)
    assert r.status_code == 400, r.text
    assert "Folder 'nope' not found" in r.json()["detail"]


def test_fetch_bad_branch_400():
    r = requests.post(f"{API}/projects/{PID}/github-source", json={"repo": REPO, "branch": "no-such-branch-xyz"}, timeout=30)
    assert r.status_code == 200  # NOTE: branch is not validated on save
    r = requests.post(f"{API}/projects/{PID}/github-fetch", timeout=60)
    assert r.status_code == 400 and "Download failed" in r.json()["detail"]


def test_clear_source():
    r = requests.delete(f"{API}/projects/{PID}/github-source", timeout=30)
    assert r.status_code == 200 and r.json()["cleared"] is True
    p = next(x for x in requests.get(f"{API}/projects", timeout=30).json() if x["id"] == PID)
    assert not p.get("github_source_repo")
