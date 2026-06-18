import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { ScanLine, GraduationCap } from "lucide-react";
import CameraView from "@/components/CameraView";
import InsightPanel from "@/components/InsightPanel";
import StatusBar from "@/components/StatusBar";
import SettingsSheet from "@/components/SettingsSheet";
import HistoryTimeline from "@/components/HistoryTimeline";
import IdentifyButton from "@/components/IdentifyButton";
import AlternatesStrip from "@/components/AlternatesStrip";
import TeachDialog from "@/components/TeachDialog";
import { useObjectDetection } from "@/hooks/useObjectDetection";
import { useSpeech } from "@/hooks/useSpeech";
import { useOcr } from "@/hooks/useOcr";
import { fetchInsights, identifyImage } from "@/lib/api";
import { ahash } from "@/lib/phash";
import { lookup as lookupOverride, reinforce, teach, TEACH_THRESHOLD } from "@/lib/overrides";

function captureFullFrame(videoEl) {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) return null;
  const MAX = 1280;
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  const scale = vw > MAX ? MAX / vw : 1;
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").drawImage(videoEl, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.88).split(",")[1];
}

async function identifyWithClaude(videoEl) {
  const imageData = captureFullFrame(videoEl);
  if (!imageData) return null;
  return identifyImage(imageData);
}

const STABLE_FRAMES   = 2;
const HISTORY_CAP     = 8;
const AUTO_COOLDOWN_MS = 6000;
const LIVE_GUESS_MIN   = 0.20;
const AUTO_MIN_SCORE   = 0.30;

export default function Studio() {
  const [voiceOn, setVoiceOn]     = useState(() => readBool("il.voice", true));
  const [autoMode, setAutoMode]   = useState(() => readBool("il.auto", false));
  const [rate, setRate]           = useState(() => readNum("il.rate", 1.0));
  const [pitch, setPitch]         = useState(() => readNum("il.pitch", 1.0));
  const [minScore, setMinScore]   = useState(() => readNum("il.score", 0.35));
  const [facingMode, setFacingMode] = useState(() => localStorage.getItem("il.cam") || "environment");
  const [lang, setLang]           = useState(() => localStorage.getItem("il.lang") || "en");
  const [useOcrHint, setUseOcrHint] = useState(() => readBool("il.ocr", true));
  const [foodMode, setFoodMode]   = useState(() => readBool("il.food", false));

  useEffect(() => { localStorage.setItem("il.voice", voiceOn); }, [voiceOn]);
  useEffect(() => { localStorage.setItem("il.auto", autoMode); }, [autoMode]);
  useEffect(() => { localStorage.setItem("il.rate", rate); }, [rate]);
  useEffect(() => { localStorage.setItem("il.pitch", pitch); }, [pitch]);
  useEffect(() => { localStorage.setItem("il.score", minScore); }, [minScore]);
  useEffect(() => { localStorage.setItem("il.cam", facingMode); }, [facingMode]);
  useEffect(() => { localStorage.setItem("il.lang", lang); }, [lang]);
  useEffect(() => { localStorage.setItem("il.ocr", useOcrHint); }, [useOcrHint]);
  useEffect(() => { localStorage.setItem("il.food", foodMode); }, [foodMode]);

  const videoRef = useRef(null);
  const { loading, classifierLoading, error: detectError, boxes, topGuess, fps, captureCrop, retry } = useObjectDetection(
    videoRef,
    { enabled: true, minScore, intervalMs: 400 },
  );

  const speechLangMap = { en: "en-US", hi: "hi-IN", es: "es-ES", fr: "fr-FR" };
  const { speak, speaking } = useSpeech({ rate, pitch, enabled: voiceOn, lang: speechLangMap[lang] });
  const { runOcr, ocrLoading } = useOcr();

  const [currentLabel, setCurrentLabel] = useState(null);
  const [insight, setInsight] = useState(null);
  const [fetching, setFetching] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [cameraReady, setCameraReady] = useState(false);
  const onCameraState = useCallback((s) => setCameraReady(!!s.ready), []);

  const [memoryHit, setMemoryHit] = useState(null);
  const [teachOpen, setTeachOpen] = useState(false);
  const lastHashCheckedRef = useRef(null);

  useEffect(() => {
    if (!topGuess) {
      setMemoryHit(null);
      return;
    }
    const crop = captureCrop();
    const hash = ahash(crop);
    if (!hash) { setMemoryHit(null); return; }
    if (lastHashCheckedRef.current === hash) return;
    lastHashCheckedRef.current = hash;
    const hit = lookupOverride(hash);
    if (hit && (hit.count || 0) >= TEACH_THRESHOLD) {
      setMemoryHit({ label: hit.label, count: hit.count });
    } else {
      setMemoryHit(null);
    }
  }, [topGuess, captureCrop]);

  const streakRef = useRef({ label: null, count: 0 });
  const lastAnnounceAt = useRef(0);
  const inflightFor = useRef(null);

  const primaryLabel =
  (memoryHit && (topGuess?.score ?? 0) < 0.85)
    ? memoryHit.label
    : (topGuess?.label || memoryHit?.label || null);

  const stableLabel = useMemo(() => {
    if (!primaryLabel) return null;
    if (!memoryHit && (topGuess?.score ?? 0) < AUTO_MIN_SCORE) return null;
    return streakRef.current.label === primaryLabel && streakRef.current.count >= STABLE_FRAMES
      ? primaryLabel
      : null;
  }, [primaryLabel, memoryHit, topGuess]);

  useEffect(() => {
    if (!primaryLabel) {
      streakRef.current = { label: null, count: 0 };
      return;
    }
    const s = streakRef.current;
    if (s.label === primaryLabel) s.count += 1;
    else streakRef.current = { label: primaryLabel, count: 1 };
  }, [primaryLabel]);

  const identify = useCallback(async (label, { withOcr = false, reinforceHash = false } = {}) => {
    if (!label || inflightFor.current === label) return;
    inflightFor.current = label;
    setFetching(label);
    setError(null);

    const crop = captureCrop();
    const hash = crop ? ahash(crop) : null;

    let hint = null;
    if (withOcr && useOcrHint && crop) {
      try { hint = await runOcr(crop); } catch {}
    }

    try {
      const data = await fetchInsights(label, { lang, hint, food: foodMode ? 1 : 0 });
      setInsight(data);
      setCurrentLabel(label);
      setHistory(h => {
        const without = h.filter(x => x.label !== label);
        return [{ label, score: topGuess?.score || 0.9, at: Date.now() }, ...without].slice(0, HISTORY_CAP);
      });
      lastAnnounceAt.current = Date.now();
      if (voiceOn && data.spoken) speak(data.spoken);
      if (reinforceHash && hash) {
        const entry = reinforce(hash, label);
        if (entry?.count === TEACH_THRESHOLD) {
          toast.success(`got it — i'll remember "${label}" next time`);
        }
      }
    } catch {
      setError("couldn't reach the insight service — retrying soon");
    } finally {
      inflightFor.current = null;
      setFetching(null);
    }
  }, [speak, topGuess?.score, voiceOn, lang, runOcr, captureCrop, useOcrHint, foodMode]);

  useEffect(() => {
    if (!autoMode || !stableLabel) return;
    if (stableLabel === currentLabel) return;
    if (Date.now() - lastAnnounceAt.current < AUTO_COOLDOWN_MS) return;
    setFetching("analysing…");
    identifyWithClaude(videoRef.current).then(visionLabel => {
      const label = visionLabel || stableLabel;
      identify(label, { withOcr: true });
    }).catch(() => {
      identify(stableLabel, { withOcr: true });
    });
  }, [autoMode, stableLabel, currentLabel, identify, videoRef]);

  const onIdentifyClick = useCallback(async () => {
    if (primaryLabel && primaryLabel === currentLabel && insight) {
      speak(insight.spoken);
      return;
    }

    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      toast("nothing in frame yet — centre an object first");
      return;
    }

    setFetching("analysing…");
    setError(null);
    let label = null;
    try {
      label = await identifyWithClaude(video);
    } catch {}

    if (!label) label = primaryLabel;

    if (!label) {
      setFetching(null);
      toast("nothing in frame yet — centre an object first");
      return;
    }

    identify(label, { withOcr: true });
  }, [primaryLabel, currentLabel, insight, speak, identify, videoRef]);

  const onAlternatePick = useCallback((label) => {
    identify(label, { withOcr: false, reinforceHash: true });
  }, [identify]);

  const onTeachSave = useCallback((label) => {
    const crop = captureCrop();
    const hash = ahash(crop);
    if (hash) {
      teach(hash, label);
      toast.success(`saved "${label}" to this device`);
    }
    identify(label, { withOcr: false });
  }, [captureCrop, identify]);

  const announcedReady = useRef(false);
  useEffect(() => {
    if (!loading && !announcedReady.current) {
      announcedReady.current = true;
      toast.success("lens ready · aim, then tap identify", { duration: 2400 });
    }
  }, [loading]);

  const onPickHistory = useCallback(async (label) => {
    if (label === currentLabel && insight) {
      speak(insight.spoken);
      return;
    }
    await identify(label, { withOcr: false });
  }, [currentLabel, insight, speak, identify]);

  const guessConfidence = topGuess?.score ?? 0;
  const streakProgress = streakRef.current.label === primaryLabel
    ? Math.min(1, streakRef.current.count / STABLE_FRAMES)
    : 0;

  const alternates = useMemo(() => {
    const list = [];
    if (memoryHit) {
      list.push({ label: memoryHit.label, score: 1.0, taught: true });
    }
    if (topGuess?.label && !list.find(x => x.label === topGuess.label)) {
      list.push({ label: topGuess.label, score: topGuess.score });
    }
    for (const a of (topGuess?.alternates || [])) {
      if (!list.find(x => x.label === a.label)) list.push(a);
    }
    return list.slice(0, 4);
  }, [memoryHit, topGuess]);

  const showLiveStuff = cameraReady && (memoryHit || (topGuess?.label && guessConfidence >= LIVE_GUESS_MIN));

  return (
    <div className="relative h-screen w-screen bg-black text-white overflow-hidden">
      <CameraView facingMode={facingMode} videoRef={videoRef} boxes={boxes} onStateChange={onCameraState} />

      <StatusBar fps={fps} modelReady={!loading} listening={!!topGuess?.label} />

      <div className="absolute top-16 right-4 sm:right-6 z-20">
        <SettingsSheet
          voiceOn={voiceOn} setVoiceOn={setVoiceOn}
          autoMode={autoMode} setAutoMode={setAutoMode}
          rate={rate} setRate={setRate}
          pitch={pitch} setPitch={setPitch}
          minScore={minScore} setMinScore={setMinScore}
          facingMode={facingMode} setFacingMode={setFacingMode}
          lang={lang} setLang={setLang}
          useOcrHint={useOcrHint} setUseOcrHint={setUseOcrHint}
          foodMode={foodMode} setFoodMode={setFoodMode}
        />
      </div>

      {showLiveStuff && (
        <AlternatesStrip
          alternates={alternates}
          via={topGuess?.via}
          confidence={guessConfidence}
          onPick={onAlternatePick}
        />
      )}

      <HistoryTimeline items={history} currentLabel={currentLabel} onPick={onPickHistory} />

      {cameraReady && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(45vh+18px)] sm:bottom-[calc(380px+18px)] z-20 flex items-center gap-5">
          <IdentifyButton
            onClick={onIdentifyClick}
            disabled={loading || !!fetching}
            loading={!!fetching || ocrLoading}
            progress={streakProgress}
            auto={autoMode}
          />
          <button
            onClick={() => setTeachOpen(true)}
            disabled={loading || !!fetching}
            className="h-11 px-3 inline-flex items-center gap-2 bg-black/70 backdrop-blur border border-white/20 hover:border-white text-xs font-mono uppercase tracking-[0.18em] transition-colors disabled:opacity-40"
            data-testid="teach-open-button"
          >
            <GraduationCap className="h-4 w-4" />
            teach
          </button>
        </div>
      )}

      <TeachDialog
        open={teachOpen}
        onOpenChange={setTeachOpen}
        disabled={!!fetching}
        onSave={onTeachSave}
      />

      <div className="absolute bottom-0 inset-x-0 z-10 max-h-[45vh] sm:max-h-[380px] overflow-y-auto bg-black/85 backdrop-blur-2xl border-t border-white/10 px-5 sm:px-8 py-6"
           data-testid="insight-panel">
        <InsightPanel
          insight={insight}
          loading={fetching || (ocrLoading ? "reading text…" : null)}
          error={error}
          speaking={speaking}
          onSpeakAgain={() => insight && speak(insight.spoken)}
        />
      </div>

      {loading && !detectError && (
        <div className="absolute inset-0 z-30 bg-black/85 flex items-center justify-center"
             data-testid="model-loading-veil">
          <div className="text-center">
            <ScanLine className="h-6 w-6 mx-auto text-white/70 mb-3" />
            <div className="text-[10px] font-mono uppercase tracking-[0.35em] text-neutral-500 mb-2">
              warming up the lens
            </div>
            <div className="font-mono text-sm text-neutral-200">
              loading object detector · ~5 MB
            </div>
            <div className="mt-4 h-px w-40 bg-neutral-800 mx-auto overflow-hidden">
              <div className="h-full w-1/3 bg-white animate-pulse" />
            </div>
            <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-600 max-w-xs">
              identification powered by Claude Vision AI
            </p>
          </div>
        </div>
      )}

      {detectError && (
        <div className="absolute inset-0 z-30 bg-black/95 flex items-center justify-center px-6"
             data-testid="model-load-error">
          <div className="text-center max-w-sm">
            <div className="text-[10px] font-mono uppercase tracking-[0.35em] text-amber-400 mb-3">
              load failed
            </div>
            <p className="text-base text-neutral-200 mb-2">{detectError.message}</p>
            <p className="text-[11px] text-neutral-500 mb-6">
              the model weights are hosted on storage.googleapis.com.  some
              networks (corporate proxies, strict tracker blockers, very
              slow connections) drop the download mid-flight.
            </p>
            <button
              onClick={retry}
              className="bg-white text-black px-6 py-3 text-sm font-medium hover:bg-neutral-200 transition-colors"
              data-testid="retry-load-button"
            >try again</button>
          </div>
        </div>
      )}

      {!loading && classifierLoading && !detectError && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-black/70 backdrop-blur border border-white/15 text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-300"
             data-testid="classifier-loading-strip">
          loading fine-grained classifier… you can already use Teach + Identify
        </div>
      )}
    </div>
  );
}

function readBool(k, d) {
  const v = localStorage.getItem(k);
  return v === null ? d : v === "true";
}
function readNum(k, d) {
  const v = parseFloat(localStorage.getItem(k));
  return Number.isFinite(v) ? v : d;
}
