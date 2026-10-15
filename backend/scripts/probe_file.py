import asyncio, os, sys, urllib.parse
import httpx
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from emergent_fetcher import _login, UA  # noqa

URL = "https://vscode-99fb6e7f-0472-418f-bef7-4eefe91aac0f.preview.emergentagent.com"
PWD = "1d78b278"
PATHS = sys.argv[1:]


async def main():
    cookie = await _login(URL, PWD)
    async with httpx.AsyncClient(timeout=25, headers={"User-Agent": UA, "Cookie": cookie, "Referer": URL}) as c:
        for p in PATHS:
            r = await c.get(f"{URL}/vscode-remote-resource?path={urllib.parse.quote(p, safe='/')}")
            ok = r.status_code == 200 and not r.content.startswith(b"<")
            print("=" * 25, p, r.status_code, len(r.content), "OK" if ok else "MISS")
            if ok:
                print(r.text)

asyncio.run(main())
