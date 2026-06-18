from __future__ import annotations

import asyncio
import io
import logging
import os
import re
import zipfile
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("insightlens")

mongo_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = mongo_client[os.environ["DB_NAME"]]

app = FastAPI(title="InsightLens API", version="1.0.0")
api = APIRouter(prefix="/api")

FOOD_LABELS = {
    "banana", "apple", "sandwich", "orange", "broccoli", "carrot",
    "hot dog", "pizza", "donut", "cake", "wine glass", "cup", "bowl",
    "mango", "grape", "watermelon", "strawberry", "tomato", "potato",
    "onion", "garlic", "lemon", "lime", "pear", "peach", "pineapple",
    "avocado", "cucumber", "pepper", "corn", "mushroom", "egg",
    "bread", "toast", "croissant", "muffin", "cookie", "biscuit",
    "chocolate", "candy", "chips", "popcorn", "rice", "noodles",
    "pasta", "soup", "salad", "burger", "taco", "burrito", "sushi",
    "chicken", "beef", "fish", "shrimp", "cheese", "butter", "yogurt",
    "ice cream", "coffee", "tea", "juice", "milk", "beer", "wine",
    "water bottle", "soda can", "energy drink", "smoothie",
    "samosa", "chapati", "roti", "biryani", "curry", "dal",
    "idli", "dosa", "puri", "paratha", "pakora", "vada",
    "biscuit packet", "snack", "granola bar", "instant noodles",
    "cereal", "oats", "jam", "honey", "sauce", "ketchup",
}

WIKIDATA_PROPS = {
    "P31":   "instance of",
    "P279":  "subclass of",
    "P186":  "made from material",
    "P495":  "country of origin",
    "P571":  "inception",
    "P176":  "manufacturer",
    "P61":   "discovered by",
    "P170":  "creator",
    "P575":  "discovery date",
    "P225":  "scientific name",
    "P183":  "endemic to",
    "P2067": "mass",
    "P2048": "height",
    "P2049": "width",
    "P2386": "diameter",
    "P2052": "speed",
    "P2044": "elevation",
    "P3279": "average shelf life",
    "P2670": "has parts of the class",
    "P1542": "has effect",
    "P780":  "symptoms",
    "P1995": "health speciality",
    "P2175": "medical condition treated",
    "P1419": "shape",
    "P462":  "color",
}


DISAMBIGUATION = {
    "mouse":              "computer mouse",
    "remote":             "remote control",
    "remote control":     "remote control",
    "television remote":  "remote control",
    "tv remote":          "remote control",
    "monitor":            "computer monitor",
    "screen":             "computer monitor",
    "desktop computer":   "desktop computer",
    "notebook":           "laptop",
    "laptop":             "laptop",
    "joystick":           "joystick",
    "keyboard":           "computer keyboard",
    "wireless keyboard":  "computer keyboard",
    "modem":              "modem",
    "router":             "wireless router",
    "dial telephone":     "rotary dial telephone",
    "cellular telephone": "mobile phone",
    "cellphone":          "mobile phone",
    "smartphone":         "smartphone",
    "mobile phone":       "smartphone",
    "hand-held computer": "personal digital assistant",
    "hand blower":        "hair dryer",
    "earbuds":            "earbuds",
    "earphones":          "earphones",
    "headphones":         "headphones",
    "power bank":         "portable battery charger",
    "usb cable":          "USB cable",
    "charger":            "battery charger",
    "charging cable":     "USB cable",
    "tablet":             "tablet computer",
    "ipad":               "iPad",
    "smartwatch":         "smartwatch",
    "calculator":         "calculator",
    "printer":            "inkjet printer",
    "webcam":             "webcam",
    "projector":          "video projector",
    "television":         "television set",
    "tv":                 "television set",

    "tub":                "bathtub",
    "bath tub":           "bathtub",
    "ashcan":             "trash can",
    "trash can":          "trash can",
    "dustbin":            "waste bin",
    "stove":              "kitchen stove",
    "scale":              "weighing scale",
    "iron":               "clothes iron",
    "fan":                "electric fan",
    "ceiling fan":        "ceiling fan",
    "lamp":               "table lamp",
    "light bulb":         "incandescent light bulb",
    "led bulb":           "LED lamp",
    "key":                "key (lock)",
    "keys":               "key (lock)",
    "padlock":            "padlock",
    "lock":               "padlock",
    "scissors":           "scissors",
    "tape":               "adhesive tape",
    "tape dispenser":     "tape dispenser",
    "stapler":            "stapler",
    "staple remover":     "staple remover",
    "paper clip":         "paperclip",
    "paperclip":          "paperclip",
    "rubber band":        "rubber band",
    "safety pin":         "safety pin",
    "thumbtack":          "drawing pin",
    "pin":                "drawing pin",
    "envelope":           "envelope",
    "matchstick":         "match",
    "matchbox":           "matchbox",
    "lighter":            "lighter",
    "candle":             "candle",
    "umbrella":           "umbrella",
    "tray":               "tray",
    "basket":             "basket",
    "bucket":             "bucket",
    "mop":                "mop",
    "broom":              "broom",
    "dustpan":            "dustpan",
    "sponge":             "sponge",
    "towel":              "towel",
    "pillow":             "pillow",
    "blanket":            "blanket",
    "alarm clock":        "alarm clock",
    "clock":              "clock",
    "watch":              "wristwatch",
    "wristwatch":         "wristwatch",
    "mirror":             "mirror",
    "vase":               "vase",
    "picture frame":      "picture frame",
    "photo frame":        "picture frame",

    "ballpoint":          "ballpoint pen",
    "ballpoint pen":      "ballpoint pen",
    "pen":                "ballpoint pen",
    "pencil":             "pencil",
    "marker":             "marker pen",
    "highlighter":        "highlighter pen",
    "eraser":             "eraser",
    "rubber eraser":      "eraser",
    "sharpener":          "pencil sharpener",
    "ruler":              "ruler",
    "notebook (book)":    "notebook",
    "sticky note":        "Post-it note",
    "post-it":            "Post-it note",
    "binder":             "ring binder",
    "folder":             "folder",
    "book":               "book",
    "book jacket":        "book cover",
    "menu":               "menu",

    "comb":               "comb",
    "brush":              "hairbrush",
    "hair drier":         "hair dryer",
    "hair dryer":         "hair dryer",
    "toothbrush":         "toothbrush",
    "toothpaste":         "toothpaste",
    "soap":               "soap",
    "soap bar":           "bar soap",
    "soap dispenser":     "soap dispenser",
    "perfume":            "perfume",
    "deodorant":          "deodorant",
    "sunscreen":          "sunscreen",
    "lotion":             "lotion",
    "shampoo":            "shampoo",
    "shampoo bottle":     "shampoo",
    "conditioner":        "hair conditioner",
    "razor":              "safety razor",
    "shaving cream":      "shaving cream",
    "nail clipper":       "nail clipper",
    "tweezers":           "tweezers",
    "cotton swab":        "cotton swab",
    "bandage":            "adhesive bandage",
    "band-aid":           "adhesive bandage",

    "tie":                "necktie",
    "necktie":            "necktie",
    "belt":               "belt",
    "wallet":             "wallet",
    "purse":              "handbag",
    "handbag":            "handbag",
    "backpack":           "backpack",
    "sunglasses":         "sunglasses",
    "glasses":            "glasses",
    "hat":                "hat",
    "cap":                "baseball cap",
    "sneakers":           "sneakers",
    "shoe":               "shoe",
    "socks":              "sock",
    "gloves":             "gloves",
    "scarf":              "scarf",
    "stocking":           "stocking",

    "bottle":             "bottle",
    "water bottle":       "water bottle",
    "wine bottle":        "wine bottle",
    "beer bottle":        "beer bottle",
    "pop bottle":         "soft drink",
    "kettle":             "electric kettle",
    "toaster":            "toaster",
    "blender":            "blender",
    "microwave":          "microwave oven",
    "refrigerator":       "refrigerator",
    "fridge":             "refrigerator",
    "chopsticks":         "chopsticks",
    "fork":               "fork",
    "knife":              "kitchen knife",
    "spoon":              "spoon",
    "plate":              "plate",
    "mug":                "mug",
    "glass":              "drinking glass",
    "cup":                "cup",
    "teapot":             "teapot",
    "frying pan":         "frying pan",
    "pot":                "cooking pot",
    "cutting board":      "cutting board",

    "hammer":             "hammer",
    "screwdriver":        "screwdriver",
    "wrench":             "wrench",
    "pliers":             "pliers",
    "drill":              "power drill",
    "saw":                "saw",
    "measuring tape":     "measuring tape",
    "level":              "spirit level",
    "paintbrush":         "paintbrush",
    "paint roller":       "paint roller",

    "ping-pong ball":     "table tennis ball",
    "ping pong ball":     "table tennis ball",
    "dice":               "dice",
    "playing card":       "playing card",
    "chess piece":        "chess piece",
    "lego":               "Lego",
    "rubik's cube":       "Rubik's Cube",
    "rubiks cube":        "Rubik's Cube",

    "bicycle":            "bicycle",
    "bike":               "bicycle",
    "motorcycle":         "motorcycle",
    "car":                "car",
    "truck":              "truck",
    "bus":                "bus",
    "helmet":             "cycling helmet",
    "bicycle helmet":     "cycling helmet",

    "bench":              "bench (furniture)",
    "press":              "espresso machine",
    "espresso maker":     "espresso machine",
    "punching bag":       "punching bag",
    "ping-pong ball":     "table tennis ball",
    "ballpoint pen":      "ballpoint pen",
    "rubber eraser":      "eraser",
    "modem":              "modem",
    "router":             "wireless router",
    "dial telephone":     "rotary dial telephone",
    "cellular telephone": "mobile phone",
    "cellphone":          "mobile phone",
    "hand-held computer": "personal digital assistant",
    "hand blower":        "hair dryer",
    "lotion":             "lotion",
    "soap dispenser":     "soap dispenser",
    "perfume":            "perfume",
    "sunscreen":          "sunscreen",
    "shower curtain":     "shower curtain",
    "book jacket":        "book cover",
    "monitor":            "computer monitor",
    "screen":             "computer monitor",
    "desktop computer":   "desktop computer",
    "notebook":           "laptop",
    "laptop":             "laptop",
    "joystick":           "joystick",
    "keyboard":           "computer keyboard",
    "remote control":     "remote control",
    "coin":               "coin",
    "banknote":           "banknote",
    "credit card":        "credit card",
    "aaa battery":        "AAA battery",
    "aa battery":         "AA battery",
    "battery":            "battery",
    "light switch":       "light switch",
    "power outlet":       "AC power plugs and sockets",
    "extension cord":     "extension cord",
    "fire extinguisher":  "fire extinguisher",
    "thermometer":        "thermometer",
}


async def _wikipedia_summary(client: httpx.AsyncClient, term: str, lang: str = "en") -> dict[str, Any] | None:
    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{term.replace(' ', '_')}"
    try:
        r = await client.get(url, timeout=8.0, follow_redirects=True)
        if r.status_code != 200:
            return None
        j = r.json()
        if j.get("type") == "disambiguation":
            return None
        return {
            "title": j.get("title"),
            "extract": j.get("extract"),
            "thumbnail": (j.get("thumbnail") or {}).get("source"),
            "page_url": (j.get("content_urls") or {}).get("desktop", {}).get("page"),
            "wikidata_qid": j.get("wikibase_item"),
        }
    except Exception as e:
        log.warning("wikipedia failed for %s: %s", term, e)
        return None


async def _wikipedia_search_then_summary(client: httpx.AsyncClient, query: str, lang: str = "en") -> dict[str, Any] | None:
    q = query.strip()
    if not q:
        return None
    try:
        r = await client.get(
            f"https://{lang}.wikipedia.org/w/api.php",
            params={"action": "opensearch", "search": q, "limit": 1, "format": "json"},
            timeout=6.0,
        )
        data = r.json()
        if isinstance(data, list) and len(data) > 1 and data[1]:
            return await _wikipedia_summary(client, data[1][0], lang=lang)

        if len(q.split()) <= 2:
            r = await client.get(
                f"https://{lang}.wikipedia.org/w/api.php",
                params={"action": "query", "list": "search", "srsearch": q,
                        "srlimit": 1, "format": "json"},
                timeout=6.0,
            )
            hits = (r.json().get("query") or {}).get("search") or []
            if hits:
                return await _wikipedia_summary(client, hits[0]["title"], lang=lang)
        return None
    except Exception as e:
        log.warning("wikipedia search failed for %s: %s", query, e)
        return None


async def _wikidata_facts(client: httpx.AsyncClient, term: str, qid: str | None = None) -> list[dict[str, str]]:
    try:
        if not qid:
            s = await client.get(
                "https://www.wikidata.org/w/api.php",
                params={"action": "wbsearchentities", "search": term,
                        "language": "en", "format": "json", "limit": 1},
                timeout=6.0,
            )
            hits = s.json().get("search", [])
            if not hits:
                return []
            qid = hits[0]["id"]

        e = await client.get(
            "https://www.wikidata.org/w/api.php",
            params={"action": "wbgetentities", "ids": qid,
                    "props": "claims|labels", "languages": "en", "format": "json"},
            timeout=8.0,
        )
        entity = e.json()["entities"][qid]
        claims = entity.get("claims", {})

        value_ids: list[str] = []
        wanted: list[tuple[str, str]] = []
        for pid, human in WIKIDATA_PROPS.items():
            if pid not in claims:
                continue
            for claim in claims[pid][:2]:
                mainsnak = claim.get("mainsnak", {})
                if mainsnak.get("snaktype") != "value":
                    continue
                dv = mainsnak.get("datavalue", {})
                v = dv.get("value")
                if isinstance(v, dict) and "id" in v:
                    value_ids.append(v["id"])
                    wanted.append((human, v["id"]))
                elif isinstance(v, dict) and "time" in v:
                    yr = v["time"].lstrip("+").split("-")[0]
                    wanted.append((human, yr))
                elif isinstance(v, dict) and "amount" in v:
                    wanted.append((human, f"{v['amount'].lstrip('+')} {v.get('unit', '').split('/')[-1]}".strip()))
                elif isinstance(v, str):
                    wanted.append((human, v))

        labels: dict[str, str] = {}
        if value_ids:
            chunk = "|".join(value_ids[:50])
            lr = await client.get(
                "https://www.wikidata.org/w/api.php",
                params={"action": "wbgetentities", "ids": chunk,
                        "props": "labels", "languages": "en", "format": "json"},
                timeout=8.0,
            )
            for vid, ent in lr.json().get("entities", {}).items():
                labels[vid] = (ent.get("labels", {}).get("en") or {}).get("value", vid)

        out: list[dict[str, str]] = []
        seen: set[tuple[str, str]] = set()
        for prop, val in wanted:
            resolved = labels.get(val, val)
            key = (prop, resolved)
            if key in seen:
                continue
            seen.add(key)
            out.append({"property": prop, "value": resolved})
        return out
    except Exception as ex:
        log.warning("wikidata failed for %s: %s", term, ex)
        return []


async def _duckduckgo(client: httpx.AsyncClient, term: str) -> dict[str, Any] | None:
    try:
        r = await client.get(
            "https://api.duckduckgo.com/",
            params={"q": term, "format": "json", "no_html": 1, "skip_disambig": 1},
            timeout=6.0,
        )
        j = r.json()
        abstract = j.get("AbstractText") or ""
        if not abstract:
            return None
        return {
            "abstract": abstract,
            "source": j.get("AbstractSource"),
            "url": j.get("AbstractURL"),
        }
    except Exception as e:
        log.warning("duckduckgo failed for %s: %s", term, e)
        return None


async def _open_food_facts(client: httpx.AsyncClient, term: str) -> dict[str, Any] | None:
    try:
        r = await client.get(
            "https://world.openfoodfacts.org/cgi/search.pl",
            params={"search_terms": term, "search_simple": 1, "action": "process",
                    "json": 1, "page_size": 1, "sort_by": "unique_scans_n"},
            timeout=8.0,
        )
        prods = r.json().get("products", [])
        if not prods:
            return None
        p = prods[0]
        n = p.get("nutriments", {}) or {}
        return {
            "product_name": p.get("product_name") or p.get("generic_name"),
            "brand": (p.get("brands") or "").split(",")[0].strip() or None,
            "categories": (p.get("categories") or "").split(",")[:3],
            "ingredients": p.get("ingredients_text"),
            "kcal_100g": n.get("energy-kcal_100g") or n.get("energy-kcal"),
            "protein_100g": n.get("proteins_100g"),
            "carbs_100g": n.get("carbohydrates_100g"),
            "fat_100g": n.get("fat_100g"),
            "sugar_100g": n.get("sugars_100g"),
            "fiber_100g": n.get("fiber_100g"),
            "salt_100g": n.get("salt_100g"),
            "nutriscore": p.get("nutriscore_grade"),
            "novagroup": p.get("nova_group"),
            "ecoscore": p.get("ecoscore_grade"),
            "allergens": [a.replace("en:", "") for a in (p.get("allergens_tags") or [])][:5],
            "additives": [a.replace("en:", "") for a in (p.get("additives_tags") or [])][:5],
        }
    except Exception as e:
        log.warning("openfoodfacts failed for %s: %s", term, e)
        return None


async def _themealdb_recipes(client: httpx.AsyncClient, term: str) -> list[dict[str, Any]]:
    try:
        r = await client.get(
            "https://www.themealdb.com/api/json/v1/1/filter.php",
            params={"i": term}, timeout=6.0,
        )
        meals = (r.json() or {}).get("meals") or []
        if not meals:
            r = await client.get(
                "https://www.themealdb.com/api/json/v1/1/search.php",
                params={"s": term}, timeout=6.0,
            )
            meals = (r.json() or {}).get("meals") or []
        if not meals:
            return []

        ids = [m["idMeal"] for m in meals[:4] if m.get("idMeal")]
        async def _lookup(mid: str) -> dict[str, Any] | None:
            try:
                rr = await client.get(
                    "https://www.themealdb.com/api/json/v1/1/lookup.php",
                    params={"i": mid}, timeout=5.0,
                )
                ms = (rr.json() or {}).get("meals") or []
                return ms[0] if ms else None
            except Exception:
                return None

        full = [m for m in await asyncio.gather(*[_lookup(i) for i in ids]) if m]
        out: list[dict[str, Any]] = []
        for m in full:
            ingredients = []
            for i in range(1, 21):
                ing = (m.get(f"strIngredient{i}") or "").strip()
                qty = (m.get(f"strMeasure{i}") or "").strip()
                if ing:
                    ingredients.append(f"{qty} {ing}".strip())
            out.append({
                "name": m.get("strMeal"),
                "area": m.get("strArea"),
                "category": m.get("strCategory"),
                "image": m.get("strMealThumb"),
                "url": m.get("strSource") or m.get("strYoutube"),
                "ingredients": ingredients[:8],
            })
        return out
    except Exception as e:
        log.warning("themealdb failed for %s: %s", term, e)
        return []


def _extract_trivia(extract: str | None) -> list[str]:
    if not extract:
        return []
    sents = re.split(r"(?<=[.!?])\s+", extract.strip())
    scored: list[tuple[int, str]] = []
    interesting = ("however", "first", "discovered", "invented", "originated",
                   "approximately", "estimated", "named after", "derives", "century",
                   "%", "million", "billion", "thousand", "ranked", "unlike",
                   "unique", "rare", "only", "largest", "smallest", "oldest")
    for s in sents:
        score = 0
        low = s.lower()
        if any(w in low for w in interesting):
            score += 3
        if re.search(r"\d", s):
            score += 2
        if 50 <= len(s) <= 220:
            score += 1
        scored.append((score, s.strip()))
    scored.sort(key=lambda x: -x[0])
    return [s for sc, s in scored if sc >= 1][:3]


class Recipe(BaseModel):
    name: str | None = None
    area: str | None = None
    category: str | None = None
    image: str | None = None
    url: str | None = None
    ingredients: list[str] = []


class Insight(BaseModel):
    label: str
    title: str | None = None
    summary: str | None = None
    image: str | None = None
    page_url: str | None = None
    trivia: list[str] = []
    facts: list[dict[str, str]] = []
    nutrition: dict[str, Any] | None = None
    recipes: list[Recipe] = []
    sources: list[str] = []
    spoken: str = ""


@api.get("/")
async def root() -> dict[str, str]:
    return {"name": "InsightLens", "status": "ok"}


@api.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


class IdentifyRequest(BaseModel):
    image_base64: str = Field(..., min_length=10)


class IdentifyResponse(BaseModel):
    label: str | None
    source: str


VISION_PROMPT = """Look at this photo and name the single most prominent physical object you see.

Respond with ONLY the object name — 1 to 4 words, no articles (a/an/the), no punctuation, no explanation.

Be specific:
- "plastic bottle" not "container"
- "hardcover book" not "object"
- "banana" not "fruit"
- "ballpoint pen" not "writing tool"
- "car key" not "keys"
- "coffee mug" not "cup"
- If it's a person, name what they're wearing or holding instead.
- If it's food, name the exact food.

Reply with just the object name."""


@api.post("/identify", response_model=IdentifyResponse)
async def identify_object(payload: IdentifyRequest) -> IdentifyResponse:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        log.warning("ANTHROPIC_API_KEY not set — Claude Vision identify disabled, frontend will use on-device guess")
        return IdentifyResponse(label=None, source="none")

    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-6",
                    "max_tokens": 50,
                    "messages": [{
                        "role": "user",
                        "content": [
                            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": payload.image_base64}},
                            {"type": "text", "text": VISION_PROMPT},
                        ],
                    }],
                },
                timeout=15.0,
            )
        if r.status_code != 200:
            log.warning("claude vision call failed: %s %s", r.status_code, r.text[:300])
            return IdentifyResponse(label=None, source="none")

        data = r.json()
        raw = ((data.get("content") or [{}])[0].get("text") or "").strip().lower()
        first_line = raw.split("\n")[0]
        no_article = re.sub(r"^(a |an |the )", "", first_line)
        label = re.sub(r"[^a-z0-9 \-]", "", no_article).strip()
        return IdentifyResponse(label=label or None, source="claude" if label else "none")
    except Exception as e:
        log.warning("claude vision request errored: %s", e)
        return IdentifyResponse(label=None, source="none")


@api.get("/insights", response_model=Insight)
async def insights(
    label: str = Query(..., min_length=1, max_length=80),
    lang: str = Query("en", min_length=2, max_length=5),
    hint: str | None = Query(None, max_length=120),
    food: int = Query(0, ge=0, le=1),
) -> Insight:
    raw = label.strip().lower()
    if raw in DISAMBIGUATION:
        term = DISAMBIGUATION[raw]
    else:
        term = raw
        for key, val in DISAMBIGUATION.items():
            if key in raw or raw in key:
                if len(key) > 4:  # avoid short spurious matches
                    term = val
                    break

    async with httpx.AsyncClient(headers={"User-Agent": "InsightLens/1.0 (https://github.com/insightlens; educational object-detection demo)"}) as client:
        wiki = None
        if hint:
            hint_clean = hint.strip().lower()
            wiki = await _wikipedia_summary(client, hint_clean, lang=lang)
            if not wiki:
                wiki = await _wikipedia_search_then_summary(client, hint_clean, lang=lang)
            if not wiki and lang != "en":
                wiki = await _wikipedia_search_then_summary(client, hint_clean, lang="en")
            first = hint_clean.split()[0] if hint_clean else ""
            if not wiki and first and first != hint_clean:
                wiki = await _wikipedia_summary(client, first, lang="en")
                if not wiki:
                    wiki = await _wikipedia_search_then_summary(client, first, lang="en")
        if not wiki:
            wiki = await _wikipedia_summary(client, term, lang=lang)
            if not wiki and lang != "en":
                wiki = await _wikipedia_summary(client, term, lang="en")
        if not wiki and term != raw:
            wiki = await _wikipedia_summary(client, raw, lang="en")
        if not wiki:
            wiki = await _wikipedia_search_then_summary(client, term, lang="en")

        qid = wiki.get("wikidata_qid") if wiki else None

        food_hint_words = ("food", "fruit", "vegetable", "edible", "dish",
                           "cuisine", "snack", "beverage", "cooking", "ingredient",
                           "cooked", "baked", "fried", "dessert", "meat")
        wiki_text = ((wiki or {}).get("extract") or "").lower()
        looks_like_food = (
            term in FOOD_LABELS
            or any(w in wiki_text for w in food_hint_words)
            or food == 1
        )

        tasks = [
            _wikidata_facts(client, term, qid),
            _duckduckgo(client, term),
            _open_food_facts(client, term) if looks_like_food else asyncio.sleep(0, result=None),
            _themealdb_recipes(client, term) if looks_like_food else asyncio.sleep(0, result=[]),
        ]
        facts, ddg, nutrition, recipes = await asyncio.gather(*tasks)

    sources: list[str] = []
    summary = None
    title = None
    image = None
    page_url = None

    if wiki:
        title = wiki.get("title")
        summary = wiki.get("extract")
        image = wiki.get("thumbnail")
        page_url = wiki.get("page_url")
        sources.append("Wikipedia")

    if ddg and not summary:
        summary = ddg.get("abstract")
        if ddg.get("source"):
            sources.append(ddg["source"])
    elif ddg:
        sources.append(ddg.get("source") or "DuckDuckGo")

    trivia = _extract_trivia(summary)

    if facts:
        sources.append("Wikidata")
    if nutrition:
        sources.append("Open Food Facts")
    if recipes:
        sources.append("TheMealDB")

    sources = list(dict.fromkeys(sources))

    spoken_bits: list[str] = []
    if title:
        spoken_bits.append(f"This is a {title}.")
    if trivia:
        spoken_bits.append(trivia[0])
    elif summary:
        spoken_bits.append(summary.split(". ")[0] + ".")
    if nutrition and nutrition.get("kcal_100g"):
        spoken_bits.append(
            f"Roughly {round(float(nutrition['kcal_100g']))} kilocalories per 100 grams."
        )
    if facts:
        for f in facts[:1]:
            spoken_bits.append(f"Its {f['property']} is {f['value']}.")
    if recipes:
        spoken_bits.append(f"You can use it in {len(recipes)} classic recipes, including {recipes[0]['name']}.")

    spoken = " ".join(spoken_bits)[:520]

    try:
        await db.detections.insert_one({
            "label": term, "title": title, "sources": sources,
        })
    except Exception as e:
        log.warning("mongo insert failed: %s", e)

    return Insight(
        label=raw,
        title=title,
        summary=summary,
        image=image,
        page_url=page_url,
        trivia=trivia,
        facts=facts or [],
        nutrition=nutrition,
        recipes=[Recipe(**r) for r in (recipes or [])],
        sources=sources,
        spoken=spoken or f"I see a {title or term}.",
    )


@api.get("/source.zip")
async def download_source() -> StreamingResponse:
    buf = io.BytesIO()
    root = Path("/app")
    skip = {"node_modules", ".git", "__pycache__", "build", ".yarn",
            ".cache", "dist", ".next", "logs"}
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for sub in ("backend", "frontend", "README.md", "LICENSE", ".gitignore"):
            p = root / sub
            if not p.exists():
                continue
            if p.is_file():
                zf.write(p, arcname=f"insightlens/{p.name}")
                continue
            for f in p.rglob("*"):
                if f.is_dir():
                    continue
                if any(part in skip for part in f.parts):
                    continue
                rel = f.relative_to(root)
                zf.write(f, arcname=f"insightlens/{rel}")
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="insightlens-source.zip"'},
    )


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def _shutdown() -> None:
    mongo_client.close()
