import { useCallback, useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as mobilenet from "@tensorflow-models/mobilenet";

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
  classifierMinScore = 0.55,
} = {}) {
  const [detector, setDetector] = useState(null);
  const [classifier, setClassifier] = useState(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    let cancelled = false;
    cropCanvasRef.current = document.createElement("canvas");

    (async () => {
      try {
        await tf.ready();
        try { await tf.setBackend("webgl"); } catch {}
      } catch (e) {
        if (!cancelled) setError({ kind: "tfjs", message: "couldn't initialize tensorflow.js — try refreshing" });
        return;
      }

      try {
        const det = await cocoSsd.load({ base: "mobilenet_v2" });
        if (cancelled) return;
        setDetector(det);
        setLoading(false);
      } catch (e) {
        if (!cancelled) setError({
          kind: "detector",
          message: "couldn't download the object detector — check your connection or any ad-blockers, then retry",
        });
        return;
      }

      try {
        const clf = await mobilenet.load({ version: 2, alpha: 1.0 });
        if (cancelled) return;
        setClassifier(clf);
      } catch (e) {
        console.warn("mobilenet failed to load — running with coarse labels only", e);
      } finally {
        if (!cancelled) setClassifierLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    if (!detector || !enabled || !videoRef.current) return;
    const v = videoRef.current;
    const canvas = cropCanvasRef.current;

    async function tick() {
      if (v.readyState >= 2 && v.videoWidth > 0) {
        try {
          const preds = await detector.detect(v, 10);
          const filtered = preds
            .filter(p => p.score >= minScore && !EXCLUDED_CLASSES.has(p.class))
            .map(p => ({ label: p.class, score: p.score, bbox: p.bbox }));
          setBoxes(filtered);

          const winner = pickFocus(filtered, v.videoWidth, v.videoHeight);
          const region = winner
            ? cropTo(canvas, v, winner.bbox)
            : drawFull(canvas, v);

          if (classifier) {
            const cls = await classifier.classify(region, 3);
            const alternates = (cls || []).map(c => ({
              label: cleanImagenetLabel(c.className),
              score: c.probability,
            })).filter(x => x.label);
            const best = alternates[0];

            if (best && best.score >= classifierMinScore) {
              setTopGuess({
                label: best.label,
                score: best.score,
                alternates: alternates.slice(1),
                via: winner ? winner.label : "frame",
                bbox: winner ? winner.bbox : null,
              });
            } else if (winner) {
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
