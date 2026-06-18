# InsightLens

Point your camera at anything. Hear the facts most people don't know — read aloud, hands-free.

I built this because I wanted something that felt like the AR-glasses moment from every sci-fi movie, but using only the free parts of the web. No OpenAI key, no AWS bill, no Apple Vision Pro. Just a browser, a quantized object detector, and Wikipedia.

Open it on your phone, tap **start the lens**, point the back camera at something — a piece of fruit, a packaged snack, whatever's nearby. Every four seconds it identifies what it sees, pulls in facts you probably didn't know, and reads them aloud. Hands-free.

---

## What it does

Detection runs entirely in your browser via TensorFlow.js + COCO-SSD — nothing gets uploaded. It knows 80 object classes, which covers most everyday things you'd point a camera at.

The interesting part is what happens after detection. Instead of just labeling something "banana," it goes and finds:

- Sentences from Wikipedia filtered for numbers, dates, or phrases like "however," "originated," or "discovered" — the kind of detail that makes you go *huh, I didn't know that*
- Structured properties from Wikidata: country of origin, scientific name, material, manufacturer, discovery date
- Nutrition info, Nova-group, and Nutri-score from Open Food Facts when you're pointing at food
- A DuckDuckGo abstract as fallback if Wikipedia comes up short

Everything gets spoken aloud using the browser's built-in speech API. No recordings, no cloud TTS, no buttons to press.

The UI tries to feel like a HUD rather than a debug screen — bounding boxes rendered as four corner brackets, a draggable info sheet at the bottom, and a small chip history so you can jump back to something you saw a moment ago.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Tailwind, shadcn/ui, lucide-react |
| Detection | TensorFlow.js + COCO-SSD |
| Speech | Web Speech API (browser native) |
| Backend | FastAPI + httpx |
| Storage | MongoDB (logs detections; nothing personal) |
| APIs | Wikipedia REST, Wikidata, Open Food Facts, DuckDuckGo |

## Getting started

**Prerequisites:** Node 18+, Yarn, Python 3.11+, and a running MongoDB instance. If you don't want to set up Mongo, just comment out the `db.detections.insert_one` call in `server.py`.

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# create .env with:
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=insightlens
# CORS_ORIGINS=*
uvicorn server:app --reload --port 8001
```

**Frontend**

```bash
cd frontend
yarn
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
yarn start
```

Open `http://localhost:3000` in your browser. To test on your phone over LAN, you'll need HTTPS for camera access on iOS — `ngrok http 3000` is the quickest path.

## How it works

1. The browser requests the back camera via `getUserMedia`
2. TensorFlow.js loads `lite_mobilenet_v2` (~6 MB) and runs inference on the live video every ~600ms
3. Every 4 seconds, the top detection is sent to `/api/insights?label=...`
4. The backend fans out in parallel — Wikipedia, Wikidata, DuckDuckGo, and Open Food Facts for food items
5. The aggregated response renders in the bottom sheet; the `spoken` field goes straight to `speechSynthesis`

## Project layout

```
insightlens/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   └── Studio.jsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/api.js
│   ├── package.json
│   └── .env
└── README.md
```

## Known limits

COCO-SSD knows 80 classes. It won't recognize "mango," "samosa," or "laptop charger" — for finer-grained detection, swap in a MobileNet classifier or a custom YOLO model exported to TFJS. Wikipedia summaries are English-only for now, though localizing is just a matter of changing the locale in the API path. iOS Safari requires HTTPS for camera access.

## Roadmap

- Swap in a 1000-class MobileNet for finer recognition
- Offline mode with last-N insights cached in IndexedDB
- Multilingual voice and Wikipedia locale switching
- On-device OCR classifier so it can read labels and prices

## License

MIT — do whatever you want with it.