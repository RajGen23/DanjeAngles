"""Probe the best4medals Emergent workspace: list top-level files of /app."""
import asyncio, os, sys, urllib.parse
import httpx
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from emergent_fetcher import _login, UA  # noqa

URL = "https://vscode-610bdf3c-b8f4-4a3c-9d48-258dbae13ac1.preview.emergentagent.com"
PWD = "ad99ee38"

PATHS = [
    "/app/backend/server.py", "/app/backend/requirements.txt",
    "/app/frontend/package.json", "/app/package.json",
    "/app/frontend/.env", "/app/backend/.env",
    "/app/README.md", "/app/memory/PRD.md", "/app/test_result.md",
    "/app/frontend/src/App.js", "/app/frontend/src/App.jsx",
    "/app/astro.config.mjs", "/app/frontend/astro.config.mjs",
]


async def main():
    cookie = await _login(URL, PWD)
    async with httpx.AsyncClient(timeout=20, headers={"User-Agent": UA, "Cookie": cookie, "Referer": URL}) as c:
        for p in PATHS:
            q = urllib.parse.quote(p, safe="/")
            try:
                r = await c.get(f"{URL}/vscode-remote-resource?path={q}")
            except Exception as e:
                print(p, "ERR", e); continue
            ok = r.status_code == 200 and not r.content.startswith(b"<")
            print("=" * 20, p, r.status_code, len(r.content), "OK" if ok else "MISS")
            if ok:
                print(r.text[:2500])

asyncio.run(main())
