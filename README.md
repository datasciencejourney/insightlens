# InsightLens

> Point your phone camera at anything. Get the facts most people don't know — read aloud, hands-free. No keys. No accounts. No fees.

InsightLens is a tiny research toy that turns any phone or laptop with a webcam into a curiosity engine. Detection runs entirely in your browser; insights are aggregated server-side from a handful of free public APIs.

**Live demo:** open the deployed URL on your phone, tap *start the lens*, allow camera access, and aim the back camera at an object, a piece of fruit, or a packaged snack. Every four seconds a new object gets fresh insights and is spoken aloud automatically.

---

## Why this exists

I wanted something that felt like the AR-glasses scene from every sci-fi movie, but built with only the free corners of the open web. No OpenAI key, no AWS bill, no Apple Vision Pro. Just `getUserMedia`, a quantized object detector, and Wikipedia's public API.

## What it does

- **80 object classes**, in-browser, via TensorFlow.js + COCO-SSD (lite_mobilenet_v2).
- **Beyond-the-obvious facts** — Wikipedia summaries are filtered for sentences that contain numbers, dates, "however", "originated", "discovered" etc., then ranked.
- **Structured properties** from Wikidata for things like *country of origin, scientific name, made from material, discovery date, manufacturer*.
- **Nutrition + Nova-group + Nutri-score** from Open Food Facts whenever the object is a food.
- **DuckDuckGo Instant Answers** as a fallback abstract.
- **Hands-free voice narration** via the browser's `speechSynthesis` API — no buttons, no recordings, no cloud TTS.
- **Bounding boxes as four corner brackets** (so it feels like a HUD, not a debug viewer).
- **Mobile-first**, full-bleed camera, draggable insight sheet, back/front camera switch.

## Stack

| layer       | tech                                                |
| ----------- | --------------------------------------------------- |
| frontend    | React 19, Tailwind, shadcn/ui, lucide-react         |
| detection   | TensorFlow.js + @tensorflow-models/coco-ssd         |
| speech      | Web Speech API (browser native)                     |
| backend     | FastAPI + httpx                                     |
| storage     | MongoDB (logs detections; nothing personal)         |
| apis used   | Wikipedia REST · Wikidata · Open Food Facts · DDG   |

## Run it locally

### prerequisites
- Node 18+ and Yarn
- Python 3.11+
- a running MongoDB (or comment out the `db.detections.insert_one` call in `server.py`)

### backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# create .env with: MONGO_URL=mongodb://localhost:27017  DB_NAME=insightlens  CORS_ORIGINS=*
uvicorn server:app --reload --port 8001
```

### frontend
```bash
cd frontend
yarn
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
yarn start
```

Then open `http://localhost:3000` on your laptop, or use your laptop's LAN IP from your phone (you'll need HTTPS for camera access on iOS — `ngrok http 3000` is the quickest path).

## How it works (5-minute tour)

1. The browser asks for the back camera via `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })`.
2. TensorFlow.js loads `lite_mobilenet_v2` (≈6 MB) and runs inference on the live `<video>` every ~600 ms.
3. Every 4 seconds, the highest-confidence detection is sent to `/api/insights?label=...`.
4. The backend fans out in parallel: Wikipedia summary → trivia ranker, Wikidata search → property resolver, DuckDuckGo abstract, Open Food Facts (for food labels only).
5. The aggregated response is rendered in a bottom sheet and the `spoken` field is handed to `speechSynthesis`.
6. The label is added to a small in-memory history (chips above the sheet) so you can replay or jump back.

## Project layout

```
insightlens/
├── backend/
│   ├── server.py              # FastAPI app — insight aggregator
│   ├── requirements.txt
│   └── .env                   # MONGO_URL, DB_NAME, CORS_ORIGINS
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx    # marketing-ish intro screen
│   │   │   └── Studio.jsx     # main detection screen
│   │   ├── components/        # CameraView, InsightPanel, StatusBar, …
│   │   ├── hooks/             # useObjectDetection, useSpeech
│   │   └── lib/api.js
│   ├── package.json
│   └── .env
├── README.md
├── LICENSE
└── .gitignore
```

## Known limits

- COCO-SSD only knows 80 classes. It does not know "mango", "samosa", or "laptop charger". For richer detection swap in `mobilenet_v2` classification or a custom YOLO model exported to TFJS.
- Wikipedia summaries are English-only here. Wikipedia is multilingual — switch `en` in `/api/rest_v1/...` to localize.
- iOS Safari needs HTTPS for camera access.

## Roadmap

- swap in a 1000-class MobileNet for finer-grained recognition
- offline mode (cache last-N insights in IndexedDB)
- pick-your-language voice + Wikipedia locale
- a tiny on-device classifier for OCR (so it can read labels and prices)

## License

MIT — do whatever you want, just don't pretend you wrote it.
