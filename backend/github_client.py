"""GitHub source mirror — pushes each successful deploy to a per-project repo.

Uses the user's GITHUB_PAT (from /app/backend/.env). Repos are created under the
owner of the token and named `emergent-hosted-<slug>`. Each deploy is a fresh
force-push on the `main` branch with a commit tagged `Deploy v<N>`.
"""
from __future__ import annotations

import asyncio
import io
import logging
import re
import tarfile
import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional

import httpx

log = logging.getLogger(__name__)


def _pat() -> Optional[str]:
    return os.environ.get("GITHUB_PAT") or None


class GitHubError(RuntimeError):
    pass


async def whoami() -> Optional[dict]:
    tok = _pat()
    if not tok:
        return None
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get("https://api.github.com/user",
                        headers={"Authorization": f"Bearer {tok}",
                                 "Accept": "application/vnd.github+json"})
    if r.status_code != 200:
        return None
    return r.json()


async def ensure_repo(name: str, private: bool = True, description: str = "") -> dict:
    """Create the repo if it doesn't exist. Returns {owner, name, html_url, clone_url}."""
    tok = _pat()
    if not tok:
        raise GitHubError("GITHUB_PAT not configured")
    async with httpx.AsyncClient(timeout=30) as c:
        # Who am I?
        me = await c.get("https://api.github.com/user",
                         headers={"Authorization": f"Bearer {tok}",
                                  "Accept": "application/vnd.github+json"})
        if me.status_code != 200:
            raise GitHubError(f"Invalid GITHUB_PAT: {me.status_code} {me.text[:200]}")
        owner = me.json()["login"]
        # Does the repo already exist?
        r = await c.get(f"https://api.github.com/repos/{owner}/{name}",
                        headers={"Authorization": f"Bearer {tok}",
                                 "Accept": "application/vnd.github+json"})
        if r.status_code == 200:
            data = r.json()
            return {"owner": owner, "name": data["name"],
                    "html_url": data["html_url"], "clone_url": data["clone_url"]}
        # Create it
        r = await c.post("https://api.github.com/user/repos",
                         headers={"Authorization": f"Bearer {tok}",
                                  "Accept": "application/vnd.github+json"},
                         json={
                             "name": name,
                             "private": private,
                             "description": description or f"Auto-mirrored from selfhost — {name}",
                             "auto_init": True,
                         })
        if r.status_code == 403:
            raise GitHubError(
                f"PAT lacks permission to create repos. Either grant 'Administration: Read and write' "
                f"to your fine-grained PAT, use a Classic PAT with 'repo' scope, OR manually create the repo "
                f"at https://github.com/new named '{name}' (private) and retry — we can push to it."
            )
        if r.status_code >= 300:
            raise GitHubError(f"Repo create failed: {r.status_code} {r.text[:300]}")
        data = r.json()
        return {"owner": owner, "name": data["name"],
                "html_url": data["html_url"], "clone_url": data["clone_url"]}


def _headers() -> dict:
    tok = _pat()
    h = {"Accept": "application/vnd.github+json"}
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    return h


def parse_repo(value: str) -> str:
    """'https://github.com/o/r(.git)' or 'o/r' -> 'o/r'."""
    v = value.strip().rstrip("/")
    v = re.sub(r"^(https?://)?(www\.)?github\.com/", "", v)
    v = re.sub(r"\.git$", "", v)
    parts = v.split("/")
    if len(parts) < 2 or not all(parts[:2]):
        raise GitHubError("Use owner/repo or a github.com repo URL")
    return f"{parts[0]}/{parts[1]}"


async def get_repo(full: str) -> dict:
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(f"https://api.github.com/repos/{full}", headers=_headers())
    if r.status_code == 404:
        raise GitHubError(f"Repo {full} not found, or the panel's GitHub token can't see it")
    if r.status_code != 200:
        raise GitHubError(f"GitHub error {r.status_code}: {r.text[:200]}")
    return r.json()


async def list_repos() -> list[dict]:
    if not _pat():
        return []
    out: list[dict] = []
    async with httpx.AsyncClient(timeout=20) as c:
        for page in (1, 2, 3):
            r = await c.get("https://api.github.com/user/repos", headers=_headers(),
                            params={"per_page": 100, "page": page, "sort": "updated"})
            if r.status_code != 200:
                break
            batch = r.json()
            out += [{"full_name": x["full_name"], "private": x["private"],
                     "default_branch": x["default_branch"]} for x in batch]
            if len(batch) < 100:
                break
    return out


async def list_branches(full: str) -> list[str]:
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(f"https://api.github.com/repos/{full}/branches",
                        headers=_headers(), params={"per_page": 100})
    if r.status_code != 200:
        raise GitHubError(f"Could not list branches ({r.status_code})")
    return [b["name"] for b in r.json()]


async def download_repo(full: str, branch: str, folder: Optional[str], dest: Path) -> tuple[Path, str]:
    """Download branch tarball, copy `folder` (or whole repo) into dest. Returns (dest, commit sha)."""
    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as c:
        r = await c.get(f"https://api.github.com/repos/{full}/tarball/{branch}", headers=_headers())
        if r.status_code != 200:
            raise GitHubError(f"Download failed for {full}@{branch}: HTTP {r.status_code}")
        sha_r = await c.get(f"https://api.github.com/repos/{full}/commits/{branch}", headers=_headers())
    sha = sha_r.json().get("sha", "")[:7] if sha_r.status_code == 200 else ""
    tmp = dest.parent / f"{dest.name}_tar"
    tmp.mkdir(parents=True, exist_ok=True)
    try:
        with tarfile.open(fileobj=io.BytesIO(r.content), mode="r:gz") as tf:
            tf.extractall(tmp, filter="data")
        roots = [p for p in tmp.iterdir() if p.is_dir()]
        if not roots:
            raise GitHubError("Empty repository archive")
        src = roots[0]
        if folder and folder.strip("/"):
            src = src / folder.strip("/")
            if not src.is_dir():
                raise GitHubError(f"Folder '{folder}' not found on branch {branch}")
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(src, dest)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return dest, sha


async def push_source(source_dir: str, repo_owner: str, repo_name: str,
                      commit_msg: str = "deploy") -> tuple[bool, str]:
    """Force-push the contents of source_dir as a single commit onto main.

    Uses `git` CLI in a temp dir; token is inlined into the remote URL for this run.
    """
    tok = _pat()
    if not tok:
        return False, "GITHUB_PAT not configured"
    src = Path(source_dir)
    if not src.is_dir():
        return False, f"Source not found: {source_dir}"

    workdir = src.parent / f"gitmirror_{src.name}"
    if workdir.exists():
        shutil.rmtree(workdir, ignore_errors=True)
    shutil.copytree(src, workdir, ignore=shutil.ignore_patterns(
        "__pycache__", "*.pyc", "node_modules", "build", "dist", ".DS_Store"))

    remote = f"https://x-access-token:{tok}@github.com/{repo_owner}/{repo_name}.git"
    env = os.environ.copy()
    env["GIT_AUTHOR_NAME"] = "selfhost bot"
    env["GIT_AUTHOR_EMAIL"] = "bot@selfhost.app"
    env["GIT_COMMITTER_NAME"] = "selfhost bot"
    env["GIT_COMMITTER_EMAIL"] = "bot@selfhost.app"

    async def run(*cmd: str) -> tuple[int, str]:
        proc = await asyncio.create_subprocess_exec(
            *cmd, cwd=str(workdir), env=env,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
        out, _ = await proc.communicate()
        return proc.returncode, (out or b"").decode(errors="replace")

    try:
        for cmd in (
            ("git", "init", "-b", "main"),
            ("git", "add", "-A"),
            ("git", "commit", "-m", commit_msg, "--allow-empty"),
            ("git", "remote", "add", "origin", remote),
            ("git", "push", "-u", "-f", "origin", "main"),
        ):
            code, out = await run(*cmd)
            if code != 0:
                # Return combined error but scrub token
                return False, out.replace(tok, "***")
        return True, "pushed"
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
