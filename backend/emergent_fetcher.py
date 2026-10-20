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
PY_IMPORT = re.compile(r"""^\s*(?:from\s+([\w\.]+)\s+import\s+(\([^)]*\)|[^\n]+)|import\s+([\w\.]+))""", re.M)


class EmergentFetchError(RuntimeError):
    pass


async def _login(url: str, password: str) -> str:
    """Authenticate to code-server. Returns the code-server-session cookie header.

    code-server sets the cookie with Domain=<internal-cluster-host>, which httpx
    (correctly per RFC) discards. We must parse the raw Set-Cookie header.

    Emergent preview containers idle-scale to zero; when hit while cold they
    return a 2.4KB 'Starting IDE...' HTML placeholder for up to ~90 seconds.
    We detect that and retry with backoff.
    """
    base = url.rstrip("/")
    async with httpx.AsyncClient(follow_redirects=False, timeout=25) as c:
        # Pre-warm: hit / to nudge Emergent to spin up a hibernated container
        try:
            await c.get(f"{base}/", headers={"User-Agent": UA})
        except Exception:
            pass
        for attempt in range(12):  # up to ~90s of wake-up retries
            r = await c.post(
                f"{base}/login",
                headers={"User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded"},
                content=f"password={urllib.parse.quote(password)}",
            )
            if r.status_code not in (200, 302, 303):
                raise EmergentFetchError(f"Login failed: HTTP {r.status_code}")
            # Look for the code-server session cookie in raw Set-Cookie headers
            getter = r.headers.multi_items if hasattr(r.headers, "multi_items") else r.headers.items
            for k, v in getter():
                if k.lower() == "set-cookie" and "code-server-session=" in v:
                    first = v.split(";", 1)[0].strip()
                    if first.startswith("code-server-session="):
                        return first
            # No session cookie yet. If the body is the "Starting IDE..." wake-up
            # placeholder, wait and retry. Otherwise assume the password is wrong.
            body = r.text[:400]
            if "Starting IDE" in body or "Loading Editor" in body:
                await asyncio.sleep(7)
                continue
            # Non-placeholder response with no cookie → password issue
            raise EmergentFetchError(
                "code-server rejected the password. Open the Emergent preview tab, "
                "copy the current code-server password, then paste it into "
                "project Settings → Emergent source → password field. "
                "(Emergent rotates passwords periodically.)"
            )
    raise EmergentFetchError(
        "Emergent workspace is still waking up after 90s. "
        "Open the Emergent preview tab in your browser once to wake the container, "
        "then click Refetch again."
    )


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


async def recover_from_sourcemap(app_url: str, dest: Path, workspace_root: str = "/app",
                                  subdir: str = "frontend") -> int:
    """Rebuild frontend sources from the running CRA dev-server bundle source map.

    Webpack dev source maps embed `sourcesContent`, so this recovers the real files
    even when the Emergent code-server is hibernating. Returns the file count.
    """
    base = app_url.rstrip("/")
    async with httpx.AsyncClient(timeout=300, headers={"User-Agent": UA}) as c:
        r = await c.get(f"{base}/static/js/bundle.js.map")
    if r.status_code != 200:
        raise EmergentFetchError(f"bundle source map fetch failed: HTTP {r.status_code}")
    data = r.json()
    prefix = f"{workspace_root.rstrip('/')}/{subdir.strip('/')}/"
    saved = 0
    for src, content in zip(data.get("sources", []), data.get("sourcesContent") or []):
        if not content or not src.startswith(prefix) or "node_modules" in src:
            continue
        rel = src[len(prefix):]
        if rel.startswith("webpack/"):
            continue
        out = dest / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(content)
        saved += 1
    log.info("sourcemap recovery: %d files into %s", saved, dest)
    return saved


async def discover_expo_sources(app_url: str, workspace_root: str = "/app") -> list[str]:
    """Expo Router apps have no import graph from a single entry (routes are
    file-based), so we read the Metro dev source map of the running preview and
    take every non-node_modules source path."""
    base = app_url.rstrip("/")
    url = (f"{base}/node_modules/expo-router/entry.map"
           "?platform=web&dev=true&hot=false&lazy=false&transform.routerRoot=app")
    async with httpx.AsyncClient(timeout=300, headers={"User-Agent": UA}) as c:
        r = await c.get(url)
    if r.status_code != 200:
        raise EmergentFetchError(f"Expo source map fetch failed: HTTP {r.status_code}")
    root = workspace_root.rstrip("/") + "/"
    return sorted({s for s in r.json().get("sources", [])
                   if s.startswith(root) and "node_modules" not in s})


ASSET_EXT = r"png|jpg|jpeg|svg|webp|ico|avif|gif|mp4|webm|woff2?|ttf|pdf|html"
# "/brand/gz-van-apron.webp", src="/img/hero.png", url(/fonts/x.woff2) — any depth
ASSET_ABS = re.compile(r'["\'`(]/((?:[A-Za-z0-9_\-.]+/)*[A-Za-z0-9_\-.]+\.(?:' + ASSET_EXT + r'))["\'`)?#]')
# `${CDN}/gz-van-apron.webp` — tail only; joined with the file's own base constants
ASSET_TAIL = re.compile(r'\$\{[A-Za-z0-9_.\[\]\'"]+\}/((?:[A-Za-z0-9_\-.]+/)*[A-Za-z0-9_\-.]+\.(?:' + ASSET_EXT + r'))')
ASSET_BASE = re.compile(r'=\s*["\'`]/([A-Za-z0-9_\-./]*[A-Za-z0-9_\-])["\'`]')
# `/img/${name}.webp` — literal dir + interpolated basename; names come from the
# plain string literals in the same file.
ASSET_TMPL = re.compile(r'["\'`]/((?:[A-Za-z0-9_\-.]+/)*)\$\{[^}]+\}\.(' + ASSET_EXT + r')["\'`]')
BARE_STR = re.compile(r'["\']([A-Za-z0-9_\-]{2,40})["\']')


def _public_asset_refs(text: str, workspace_root: str) -> list[str]:
    """Assets under frontend/public that no import statement points at.

    Static references live in markup and string constants, so the import BFS never
    reaches them: they have to be recovered from the source text itself.
    """
    public = f"{workspace_root.rstrip('/')}/frontend/public"
    rels = {m.group(1) for m in ASSET_ABS.finditer(text)}
    tails = {m.group(1) for m in ASSET_TAIL.finditer(text)}
    if tails:
        bases = {m.group(1) for m in ASSET_BASE.finditer(text)}
        rels |= {f"{b}/{t}" for b in bases for t in tails} | tails
    tmpls = {(m.group(1), m.group(2)) for m in ASSET_TMPL.finditer(text)}
    if tmpls:
        names = {m.group(1) for m in BARE_STR.finditer(text)}
        rels |= {f"{d}{n}.{ext}" for d, ext in tmpls for n in names}
    return [f"{public}/{r}" for r in rels if ".." not in r]


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
        # Expo / React Native (expo-router) projects
        "frontend/app.json", "frontend/tsconfig.json", "frontend/babel.config.js",
        "frontend/metro.config.js", "frontend/expo-env.d.ts",
        "frontend/app/_layout.tsx", "frontend/app/index.tsx",
        "frontend/assets/images/icon.png", "frontend/assets/images/favicon.png",
        "frontend/assets/images/splash.png", "frontend/assets/images/adaptive-icon.png",
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
                          extra_paths: Optional[list[str]] = None,
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
    queue: list[str] = _seed_paths(workspace_root, subdir) + list(extra_paths or [])

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
                for _ in range(3):  # retry if we hit the 'Starting IDE' placeholder
                    try:
                        q = urllib.parse.quote(path, safe="/")
                        r = await client.get(f"{base}/vscode-remote-resource?path={q}")
                    except Exception as e:
                        log.debug("fetch fail %s: %s", path, e)
                        return None
                    if r.status_code != 200:
                        return None
                    if r.content.startswith(b"<!DOCTYPE") or r.content.startswith(b"<html"):
                        if b"Starting IDE" in r.content[:400] or b"Loading Editor" in r.content[:400]:
                            await asyncio.sleep(5)
                            continue
                        return None
                    return r.content
                return None

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
                if lower.endswith((".js", ".jsx", ".ts", ".tsx", ".html", ".css")):
                    for cand in _public_asset_refs(text, workspace_root):
                        if cand not in visited:
                            queue.append(cand)
                if lower.endswith((".js", ".jsx", ".ts", ".tsx")):
                    for m in JS_IMPORT.finditer(text):
                        for cand in _resolve_js(m.group(1), path, workspace_root):
                            if cand not in visited:
                                queue.append(cand)
                    for m in JS_REQUIRE.finditer(text):
                        for cand in _resolve_js(m.group(1), path, workspace_root):
                            if cand not in visited:
                                queue.append(cand)
                elif lower.endswith("app.json"):
                    # Expo config references icons/splash that nothing imports
                    for m in re.finditer(r'"\./([A-Za-z0-9_./-]+\.(?:png|jpg|jpeg|ico))"', text):
                        cand = f"{workspace_root.rstrip('/')}/frontend/{m.group(1)}"
                        if cand not in visited:
                            queue.append(cand)
                elif lower.endswith(".py"):
                    for m in PY_IMPORT.finditer(text):
                        mod = m.group(1) or m.group(3)
                        cands = _resolve_py(mod, workspace_root)
                        if m.group(1):
                            # `from pkg import a, b` may name submodules pkg/a.py
                            for name in re.findall(r"\b(\w+)\b(?:\s+as\s+\w+)?", m.group(2).split("#")[0]):
                                if name != "as":
                                    cands += _resolve_py(f"{mod}.{name}", workspace_root)
                        for cand in cands:
                            if cand not in visited:
                                queue.append(cand)

        # Backend data (catalog/seed modules) can point at frontend/public assets
        # that no frontend file references — scan backend .py read-only.
        if subdir and subdir.startswith("frontend"):
            py_queue = [f"{workspace_root.rstrip('/')}/backend/server.py"]
            py_seen: set[str] = set()
            assets: list[str] = []
            while py_queue and len(py_seen) < 200:
                batch, py_queue = py_queue[:12], py_queue[12:]
                batch = [p for p in batch if p not in py_seen]
                py_seen.update(batch)
                bodies = await asyncio.gather(*(fetch_one(p) for p in batch), return_exceptions=True)
                for body in bodies:
                    if isinstance(body, Exception) or not body:
                        continue
                    text = body.decode("utf-8", errors="ignore")
                    assets += [a for a in _public_asset_refs(text, workspace_root) if a not in visited]
                    for m in PY_IMPORT.finditer(text):
                        mod = m.group(1) or m.group(3)
                        cands = _resolve_py(mod, workspace_root)
                        if m.group(1):
                            for name in re.findall(r"\b(\w+)\b(?:\s+as\s+\w+)?", m.group(2).split("#")[0]):
                                cands += _resolve_py(f"{mod}.{name}", workspace_root)
                        py_queue += [c for c in cands if c not in py_seen and c.endswith(".py")]
            assets = list(dict.fromkeys(assets))
            bodies = await asyncio.gather(*(fetch_one(p) for p in assets), return_exceptions=True)
            for path, body in zip(assets, bodies):
                if not isinstance(body, Exception) and body:
                    save(path, body)

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
