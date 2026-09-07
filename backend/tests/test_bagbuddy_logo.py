"""Focused test for the reported logo bug fix.

Bug: /bagbuddy-logo.png used to return the SPA index.html fallback because the
Emergent workspace fetcher didn't walk public/ assets referenced by URL string.
Fix: fetcher now regex-scans js/jsx/ts/tsx/html for src|href="/foo.png".

This asserts the deployed static asset is a real PNG (~277KB) with correct
content-type — NOT an HTML fallback — from multiple entry paths.
"""
import requests
import pytest

WEB = "https://bagbuddy-web-production.up.railway.app"
LOGO_PATH = "/bagbuddy-logo.png"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


class TestLogoAsset:
    def test_logo_returns_png_bytes(self, s):
        r = s.get(f"{WEB}{LOGO_PATH}", timeout=20)
        assert r.status_code == 200, r.status_code
        ctype = r.headers.get("content-type", "")
        assert "image/png" in ctype, f"content-type={ctype!r}"
        assert r.content[:8] == PNG_MAGIC, "response is not a PNG (likely HTML fallback)"
        # ~277KB per file-of-reference
        assert 200_000 < len(r.content) < 400_000, f"unexpected size {len(r.content)}"
        # Not the SPA index
        assert b"<html" not in r.content[:200].lower()

    def test_logo_head(self, s):
        r = s.head(f"{WEB}{LOGO_PATH}", timeout=15)
        assert r.status_code == 200
        assert "image/png" in r.headers.get("content-type", "")
        clen = int(r.headers.get("content-length", "0"))
        assert clen > 200_000, f"content-length={clen}"

    @pytest.mark.parametrize("referer_page", ["/", "/admin", "/book", "/track"])
    def test_logo_reachable_from_all_referers(self, s, referer_page):
        # First load the page, then load the logo — simulate browser flow
        r_page = s.get(f"{WEB}{referer_page}", timeout=15)
        assert r_page.status_code == 200
        r_logo = s.get(f"{WEB}{LOGO_PATH}", headers={"Referer": f"{WEB}{referer_page}"}, timeout=15)
        assert r_logo.status_code == 200
        assert r_logo.content[:8] == PNG_MAGIC, f"non-PNG served for {referer_page}"

    def test_html_references_logo(self, s):
        """Sanity: the shipped bundle still references /bagbuddy-logo.png."""
        # Home HTML
        r = s.get(f"{WEB}/", timeout=15)
        assert r.status_code == 200
        # Fetch the main JS bundle referenced in the HTML
        import re
        m = re.findall(r'src="(/static/js/[^"]+\.js)"', r.text)
        assert m, "no js bundle found in index.html"
        # At least one bundle should reference the logo path
        found = False
        for js in m[:5]:
            jr = s.get(f"{WEB}{js}", timeout=30)
            if jr.status_code == 200 and "/bagbuddy-logo.png" in jr.text:
                found = True
                break
        assert found, "no js bundle references /bagbuddy-logo.png"
