"""Emergent code-server workspace fetcher.

Given a code-server URL + password, downloads the workspace source via the
/vscode-remote-resource endpoint. Auth cookie is captured from a POST /login.
Follows imports (JS `@/` alias, relative paths; Python module resolution)
via BFS from a seed set of known Emergent scaffold paths.
"""
from __future__ import annotations

import asyncio
import logging
import re
import urllib.parse
from pathlib import Path
from typing import Optional

import httpx

log = logging.getLogger(__name__)

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")

# Common backend module names Python's stdlib + 3rd party libs (skip resolution)
STDLIB = {
    "os", "sys", "re", "json", "typing", "datetime", "pathlib", "logging",
    "uuid", "asyncio", "subprocess", "shutil", "tempfile", "zipfile",
    "collections", "functools", "itertools", "hashlib", "secrets",
    "string", "time", "traceback", "io", "base64", "urllib", "socket",
    "dotenv", "fastapi", "starlette", "motor", "pydantic", "httpx",
    "bcrypt", "jose", "jwt", "stripe", "email", "smtplib", "requests",
    "PIL", "boto3", "pymongo", "emergentintegrations", "openai", "anthropic",
    "google", "typing_extensions", "aiofiles", "cryptography", "passlib",
}

JS_IMPORT = re.compile(r"""(?:import|from)\s+(?:.*?\s+from\s+)?["']([^"']+)["']""")
JS_REQUIRE = re.compile(r"""require\(["']([^"']+)["']\)""")
PY_IMPORT = re.compile(r"""^\s*(?:from\s+([\w\.]+)\s+import|import\s+([\w\.]+))""", re.M)


class EmergentFetchError(RuntimeError):
    pass


async def _login(url: str, password: str) -> str:
    """Authenticate to code-server. Returns the code-server-session cookie header.

    code-server sets the cookie with Domain=<internal-cluster-host>, which httpx
    (correctly per RFC) discards. We must parse the raw Set-Cookie header.
    """
    async with httpx.AsyncClient(follow_redirects=False, timeout=20) as c:
        r = await c.post(
            f"{url.rstrip('/')}/login",
            headers={"User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded"},
            content=f"password={urllib.parse.quote(password)}",
        )
    if r.status_code not in (200, 302, 303):
        raise EmergentFetchError(f"Login failed: HTTP {r.status_code}")
    # Scan raw multi-value Set-Cookie headers
    getter = r.headers.multi_items if hasattr(r.headers, "multi_items") else r.headers.items
    for k, v in getter():
        if k.lower() == "set-cookie" and "code-server-session=" in v:
            # v may look like: 'code-server-session=xxx; Path=/; Domain=...; HttpOnly'
            first = v.split(";", 1)[0].strip()
            if first.startswith("code-server-session="):
                return first
    raise EmergentFetchError("Login response missing code-server-session cookie — password may be wrong")


def _resolve_js(spec: str, current_file: str, workspace_root: str) -> list[str]:
    if not spec.startswith((".", "/", "@/")):
        return []
    if spec.startswith("@/"):
        base = f"{workspace_root.rstrip('/')}/frontend/src/{spec[2:]}"
    elif spec.startswith("/"):
        base = spec
    else:
        base = str(Path(current_file).parent / spec)
    if re.search(r"\.[a-z]{2,4}$", spec):
        return [base]
    return [base + e for e in (".jsx", ".js", ".ts", ".tsx", ".css",
                                "/index.jsx", "/index.js")]


def _resolve_py(mod: str, workspace_root: str) -> list[str]:
    top = mod.split(".")[0]
    if top in STDLIB:
        return []
    parts = mod.split(".")
    base = f"{workspace_root.rstrip('/')}/backend/" + "/".join(parts)
    return [base + ".py", base + "/__init__.py"]


def _seed_paths(workspace_root: str, subdir: Optional[str] = None) -> list[str]:
    """Build seed list based on which subdir of the workspace we're fetching."""
    root = workspace_root.rstrip("/")
    scope = subdir.strip("/") if subdir else ""
    def _under(rel: str) -> bool:
        return not scope or rel.startswith(scope.rstrip("/"))

    paths: list[str] = []
    candidates = [
        # Root config
        ".emergent/emergent.yml", "README.md",
        # Backend
        "backend/server.py", "backend/seed.py", "backend/requirements.txt",
        "backend/pytest.ini", "backend/routes/__init__.py",
        # Frontend
        "frontend/package.json", "frontend/yarn.lock",
        "frontend/craco.config.js", "frontend/tailwind.config.js",
        "frontend/postcss.config.js", "frontend/components.json",
        "frontend/jsconfig.json",
        "frontend/public/index.html", "frontend/public/manifest.json",
        "frontend/public/robots.txt", "frontend/public/favicon.ico",
        "frontend/src/App.js", "frontend/src/App.css",
        "frontend/src/index.js", "frontend/src/index.css",
    ]
    for rel in candidates:
        if _under(rel):
            paths.append(f"{root}/{rel}")
    # Discovered from Morning Soft — safe to try; 404s are ignored
    for name in ("products", "checkout", "contact", "auth", "reviews",
                 "admin", "files", "content"):
        rel = f"backend/routes/{name}.py"
        if _under(rel):
            paths.append(f"{root}/{rel}")
    for name in ("Home", "Shop", "ProductDetail", "Cart", "CheckoutSuccess",
                 "CheckoutCancel", "About", "Contact", "Login", "Signup", "Admin"):
        rel = f"frontend/src/pages/{name}.js"
        if _under(rel):
            paths.append(f"{root}/{rel}")
        rel = f"frontend/src/pages/{name}.jsx"
        if _under(rel):
            paths.append(f"{root}/{rel}")
    for name in ("CartContext", "AuthContext", "ContentContext"):
        for ext in (".js", ".jsx"):
            rel = f"frontend/src/context/{name}{ext}"
            if _under(rel):
                paths.append(f"{root}/{rel}")
    return paths


async def fetch_workspace(url: str, password: str, workspace_root: str = "/app",
                          subdir: Optional[str] = None,
                          dest: Optional[Path] = None,
                          max_files: int = 2000) -> Path:
    """Fetch a workspace subtree to a local directory. Returns the dest path.

    subdir is a workspace-relative path (e.g. 'backend' or 'frontend').
    When set, only files under that subdir are saved and directory tree stripped.
    """
    cookie = await _login(url, password)
    base = url.rstrip("/")
    dest = dest or Path(f"/tmp/emergent_fetch_{urllib.parse.quote_plus(subdir or 'root')}_{int(asyncio.get_event_loop().time()*1000)}")
    dest.mkdir(parents=True, exist_ok=True)

    visited: set[str] = set()
    saved: set[str] = set()
    queue: list[str] = _seed_paths(workspace_root, subdir)

    async with httpx.AsyncClient(timeout=15, headers={
        "User-Agent": UA, "Cookie": cookie, "Referer": url,
    }) as client:
        # Simple parallel fetch worker with a small semaphore
        sem = asyncio.Semaphore(6)

        async def fetch_one(path: str) -> bytes | None:
            if path in visited:
                return None
            visited.add(path)
            async with sem:
                try:
                    q = urllib.parse.quote(path, safe="/")
                    r = await client.get(f"{base}/vscode-remote-resource?path={q}")
                except Exception as e:
                    log.debug("fetch fail %s: %s", path, e)
                    return None
            if r.status_code != 200:
                return None
            if r.content.startswith(b"<!DOCTYPE") or r.content.startswith(b"<html"):
                return None
            return r.content

        def save(path: str, body: bytes) -> Path | None:
            if path in saved:
                return None
            rel = path.lstrip("/")
            root_prefix = workspace_root.strip("/") + "/"
            if rel.startswith(root_prefix):
                rel = rel[len(root_prefix):]
            if subdir:
                sub_prefix = subdir.strip("/") + "/"
                if rel.startswith(sub_prefix):
                    rel = rel[len(sub_prefix):]
                elif rel == subdir.strip("/"):
                    return None  # directory itself, skip
                else:
                    return None  # outside our target subdir
            dst = dest / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_bytes(body)
            saved.add(path)
            return dst

        # Bounded BFS
        while queue and len(saved) < max_files:
            batch, queue = queue[:12], queue[12:]
            bodies = await asyncio.gather(*(fetch_one(p) for p in batch), return_exceptions=True)
            for path, body in zip(batch, bodies):
                if isinstance(body, Exception) or not body:
                    continue
                if not save(path, body):
                    continue
                lower = path.lower()
                try:
                    text = body.decode("utf-8", errors="ignore")
                except Exception:
                    continue
                if lower.endswith((".js", ".jsx", ".ts", ".tsx")):
                    for m in JS_IMPORT.finditer(text):
                        for cand in _resolve_js(m.group(1), path, workspace_root):
                            if cand not in visited:
                                queue.append(cand)
                    for m in JS_REQUIRE.finditer(text):
                        for cand in _resolve_js(m.group(1), path, workspace_root):
                            if cand not in visited:
                                queue.append(cand)
                elif lower.endswith(".py"):
                    for m in PY_IMPORT.finditer(text):
                        mod = m.group(1) or m.group(2)
                        for cand in _resolve_py(mod, workspace_root):
                            if cand not in visited:
                                queue.append(cand)

        # Fetch common product/asset images (best-effort)
        if not subdir or subdir.startswith("frontend"):
            asset_root = f"{workspace_root.rstrip('/')}/frontend/public"
            asset_paths = [f"{asset_root}/products/img_{i:02d}.png" for i in range(1, 31)]
            asset_paths += [f"{asset_root}/products/img_{i}.png" for i in range(1, 31)]
            asset_paths += [f"{asset_root}/products/ms_logo.png",
                            f"{asset_root}/products/hero_family.png"]
            bodies = await asyncio.gather(*(fetch_one(p) for p in asset_paths),
                                           return_exceptions=True)
            for path, body in zip(asset_paths, bodies):
                if not isinstance(body, Exception) and body:
                    save(path, body)

    log.info("emergent fetch: %d files saved to %s", len(saved), dest)
    return dest


def write_dockerfile(dest: Path, content: str, filename: str = "Dockerfile") -> None:
    (dest / filename).write_text(content)
