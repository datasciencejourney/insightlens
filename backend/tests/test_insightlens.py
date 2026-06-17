"""InsightLens backend API tests (iteration 3: disambiguation + lang + OCR hint)."""
import io
import os
import zipfile

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    from pathlib import Path
    env = Path("/app/frontend/.env").read_text()
    for ln in env.splitlines():
        if ln.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = ln.split("=", 1)[1].strip()
            break
BASE_URL = (BASE_URL or "").rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


# ---- /api/health --------------------------------------------------------
class TestHealth:
    def test_health_ok(self, api):
        r = api.get(f"{BASE_URL}/api/health", timeout=15)
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}


# ---- /api/insights — disambiguation (iteration 3) -----------------------
class TestDisambiguation:
    """Server-side DISAMBIGUATION should rewrite confusable labels."""

    def test_mouse_is_computer_mouse(self, api):
        r = api.get(f"{BASE_URL}/api/insights", params={"label": "mouse"}, timeout=40)
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "Computer mouse", f"expected Computer mouse, got {d['title']}"
        # summary should mention pointing/hand-held device language, NOT rodent
        s = (d["summary"] or "").lower()
        assert "pointing" in s or "hand-held" in s or "hand held" in s, f"summary not about computer mouse: {s[:160]}"
        assert "rodent" not in s

    def test_tub_is_bathtub(self, api):
        r = api.get(f"{BASE_URL}/api/insights", params={"label": "tub"}, timeout=40)
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "Bathtub", f"expected Bathtub, got {d['title']}"
        s = (d["summary"] or "").lower()
        assert "tuberculosis" not in s

    def test_ashcan_is_trashcan(self, api):
        r = api.get(f"{BASE_URL}/api/insights", params={"label": "ashcan"}, timeout=40)
        assert r.status_code == 200
        d = r.json()
        # acceptable variants
        assert d["title"] in ("Waste container", "Trash can", "Wastebasket", "Garbage can"), (
            f"unexpected title: {d['title']}"
        )

    def test_remote_is_remote_control(self, api):
        r = api.get(f"{BASE_URL}/api/insights", params={"label": "remote"}, timeout=40)
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "Remote control", f"expected Remote control, got {d['title']}"


# ---- /api/insights — language param -------------------------------------
class TestLanguageParam:
    def test_banana_es(self, api):
        r = api.get(f"{BASE_URL}/api/insights",
                    params={"label": "banana", "lang": "es"}, timeout=40)
        assert r.status_code == 200
        d = r.json()
        assert d["title"], "title missing for es"
        assert d["summary"] and len(d["summary"]) > 20

    def test_banana_hi(self, api):
        r = api.get(f"{BASE_URL}/api/insights",
                    params={"label": "banana", "lang": "hi"}, timeout=40)
        assert r.status_code == 200
        d = r.json()
        assert d["title"], "title missing for hi"
        assert d["summary"] and len(d["summary"]) > 10


# ---- /api/insights — OCR hint -------------------------------------------
class TestOcrHint:
    def test_toothpaste_hint_colgate(self, api):
        r = api.get(f"{BASE_URL}/api/insights",
                    params={"label": "toothpaste", "hint": "colgate toothpaste"}, timeout=40)
        assert r.status_code == 200
        d = r.json()
        title = (d["title"] or "").lower()
        assert "colgate" in title, f"hint should have routed to Colgate, got {d['title']}"

    def test_snack_hint_maggi(self, api):
        r = api.get(f"{BASE_URL}/api/insights",
                    params={"label": "snack", "hint": "maggi noodles"}, timeout=40)
        assert r.status_code == 200
        d = r.json()
        title = (d["title"] or "").lower()
        assert "maggi" in title, f"hint should have routed to Maggi, got {d['title']}"


# ---- /api/insights — regression: still works for food --------------------
class TestInsightsFood:
    def test_potato(self, api):
        r = api.get(f"{BASE_URL}/api/insights", params={"label": "potato"}, timeout=40)
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "Potato"
        # OpenFoodFacts is intermittently 503; nutrition is best-effort
        assert isinstance(d["recipes"], list) and len(d["recipes"]) > 0


class TestInsightsFallback:
    def test_bogus(self, api):
        bogus = "zzznonsense"
        r = api.get(f"{BASE_URL}/api/insights", params={"label": bogus}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        # The spoken fallback may say "I see a ..." or use the (possibly wiki-searched) title
        assert d["spoken"]
        assert isinstance(d["recipes"], list)


# ---- /api/source.zip ----------------------------------------------------
class TestSourceZip:
    def test_zip_download(self, api):
        r = api.get(f"{BASE_URL}/api/source.zip", timeout=60)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/zip")
        assert len(r.content) > 50 * 1024
        zf = zipfile.ZipFile(io.BytesIO(r.content))
        names = zf.namelist()
        for req in ("insightlens/backend/server.py", "insightlens/frontend/src/App.js"):
            assert req in names, f"missing {req} in zip"
