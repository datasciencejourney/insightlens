/*
 * useObjectDetection
 * ------------------
 * Two-stage detector with graceful degradation.
 *
 *   - COCO-SSD (small, ~5 MB) loads first.  The app is considered "ready"
 *     as soon as this lands, so the user can start tapping Identify even
 *     while the heavier classifier is still streaming in.
 *   - MobileNet v2 @ alpha 0.5 (smaller variant, ~3 MB) loads in the
 *     background.  When it's not yet (or never) loaded, we fall back to
 *     using the COCO-SSD coarse class name directly.
 *   - If anything fails to fetch (CDN hiccup, ad-blocker, offline) we
 *     surface a structured `error` instead of crashing the page.  The
 *     UI shows a retry button.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as mobilenet from "@tensorflow-models/mobilenet";

// COCO-SSD fires on a hand/arm holding the object as "person" — that's
// noise for an object-identification app, and if its box wins the focus
// contest it hijacks the crop away from the thing actually being held.
const EXCLUDED_CLASSES = new Set(["person"]);

function cleanImagenetLabel(raw) {
  if (!raw) return null;
  const first = raw.split(",")[0].trim();
  return first.replace(/\s*\([^)]*\)\s*/g, "").trim().toLowerCase();
}

export function useObjectDetection(videoRef, {
  enabled = true,
  intervalMs = 700,
  minScore = 0.45,
  // MobileNet/ImageNet's 1000 classes don't cover every everyday object
  // (there is no generic "book" class, for instance), so on crops it
  // doesn't have a good match for, its top-1 guess is often confident-
  // sounding noise (a plain book or a pale mouse can land on "shower
  // curtain", "envelope", etc). Below this probability we don't trust
  // it enough to override the COCO-SSD detector's coarse label, which
  // comes from a vocabulary that actually contains "book", "mouse", and
  // so on, and is usually right.
  classifierMinScore = 0.55,
} = {}) {
  const [detector, setDetector] = useState(null);
  const [classifier, setClassifier] = useState(null);
  const [loading, setLoading] = useState(true);           // ready when detector is up
  const [classifierLoading, setClassifierLoading] = useState(true);
  const [error, setError] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [topGuess, setTopGuess] = useState(null);
  const [fps, setFps] = useState(0);
  const cropCanvasRef = useRef(null);
  const lastCropRef = useRef(null);
  const timer = useRef(null);
  const lastTick = useRef(performance.now());
  const [reloadKey, setReloadKey] = useState(0);

  const captureCrop = useCallback(() => {
    const src = cropCanvasRef.current;
    if (!src) return null;
    const out = document.createElement("canvas");
    out.width = src.width;
    out.height = src.height;
    out.getContext("2d").drawImage(src, 0, 0);
    lastCropRef.current = out;
    return out;
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setClassifierLoading(true);
    setReloadKey(k => k + 1);
  }, []);

  // load detector (required) + classifier (optional, can fail)
  useEffect(() => {
    let cancelled = false;
    cropCanvasRef.current = document.createElement("canvas");

    (async () => {
      try {
        await tf.ready();
        try { await tf.setBackend("webgl"); } catch { /* fall back */ }
      } catch (e) {
        if (!cancelled) setError({ kind: "tfjs", message: "couldn't initialize tensorflow.js — try refreshing" });
        return;
      }

      // ---- stage 1: detector (required) ---------------------------------
      try {
        const det = await cocoSsd.load({ base: "mobilenet_v2" });
        if (cancelled) return;
        setDetector(det);
        setLoading(false);                  // app is now usable
      } catch (e) {
        if (!cancelled) setError({
          kind: "detector",
          message: "couldn't download the object detector — check your connection or any ad-blockers, then retry",
        });
        return;
      }

      // ---- stage 2: classifier (optional, in the background) ------------
      try {
        const clf = await mobilenet.load({ version: 2, alpha: 1.0 });
        if (cancelled) return;
        setClassifier(clf);
      } catch (e) {
        // not fatal — we just won't have fine-grained labels
        console.warn("mobilenet failed to load — running with coarse labels only", e);
      } finally {
        if (!cancelled) setClassifierLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [reloadKey]);

  // detection + classification loop
  useEffect(() => {
    if (!detector || !enabled || !videoRef.current) return;
    const v = videoRef.current;
    const canvas = cropCanvasRef.current;

    async function tick() {
      if (v.readyState >= 2 && v.videoWidth > 0) {
        try {
          // ---- stage 1: bounding boxes -----------------------------------
          const preds = await detector.detect(v, 10);
          const filtered = preds
            .filter(p => p.score >= minScore && !EXCLUDED_CLASSES.has(p.class))
            .map(p => ({ label: p.class, score: p.score, bbox: p.bbox }));
          setBoxes(filtered);

          const winner = pickFocus(filtered, v.videoWidth, v.videoHeight);
          const region = winner
            ? cropTo(canvas, v, winner.bbox)
            : drawFull(canvas, v);

          // ---- stage 2: fine-grained classification ----------------------
          if (classifier) {
            const cls = await classifier.classify(region, 3);
            const alternates = (cls || []).map(c => ({
              label: cleanImagenetLabel(c.className),
              score: c.probability,
            })).filter(x => x.label);
            const best = alternates[0];

            if (best && best.score >= classifierMinScore) {
              // confident fine-grained guess — trust it as the primary label
              setTopGuess({
                label: best.label,
                score: best.score,
                alternates: alternates.slice(1),
                via: winner ? winner.label : "frame",
                bbox: winner ? winner.bbox : null,
              });
            } else if (winner) {
              // classifier wasn't confident enough (common for objects
              // outside ImageNet's vocabulary, like "book") — trust the
              // COCO-SSD coarse label instead, but keep the classifier's
              // guesses around as alternates in case the user wants them
              setTopGuess({
                label: winner.label,
                score: winner.score,
                alternates: alternates.filter(a => a.label !== winner.label),
                via: winner.label,
                bbox: winner.bbox,
              });
            } else {
              setTopGuess(null);
            }
          } else if (winner) {
            // classifier not available — fall back to the coarse detector label
            setTopGuess({
              label: winner.label,
              score: winner.score,
              alternates: [],
              via: winner.label,
              bbox: winner.bbox,
            });
          } else {
            setTopGuess(null);
          }

          const now = performance.now();
          const dt = now - lastTick.current;
          lastTick.current = now;
          if (dt > 0) setFps(Math.min(60, Math.round(1000 / dt)));
        } catch (e) {
          // models can throw briefly during page navigation — silent retry
        }
      }
      timer.current = setTimeout(tick, intervalMs);
    }
    tick();
    return () => clearTimeout(timer.current);
  }, [detector, classifier, enabled, videoRef, intervalMs, minScore, classifierMinScore]);

  return { loading, classifierLoading, error, boxes, topGuess, fps, captureCrop, retry };
}

function pickFocus(boxes, vw, vh) {
  if (!boxes.length) return null;
  const frameArea = vw * vh;
  const scored = boxes.map(b => {
    const [, , w, h] = b.bbox;
    const areaRatio = (w * h) / frameArea;
    return { ...b, focus: b.score * Math.min(1, areaRatio * 6) };
  });
  scored.sort((a, b) => b.focus - a.focus);
  return scored[0];
}

function cropTo(canvas, video, bbox) {
  const [x, y, w, h] = bbox;
  const pad = 0.08;
  const sx = Math.max(0, x - w * pad);
  const sy = Math.max(0, y - h * pad);
  const sw = Math.min(video.videoWidth  - sx, w + 2 * w * pad);
  const sh = Math.min(video.videoHeight - sy, h + 2 * h * pad);
  const size = 224;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, size, size);
  return canvas;
}

function drawFull(canvas, video) {
  const size = 224;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, size, size);
  return canvas;
}
