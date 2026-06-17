/*
 * useOcr
 * ------
 * Lazy wrapper around tesseract.js.  We only spin up the worker the first
 * time `runOcr()` is called so the initial bundle load stays light.
 *
 *   const { runOcr, ocrLoading, ocrReady } = useOcr();
 *   const text = await runOcr(canvasOrImageOrUrl);   // returns "" if nothing
 */
import { useCallback, useRef, useState } from "react";

let workerPromise = null;
async function getWorker(lang = "eng") {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const Tesseract = (await import("tesseract.js")).default;
    const w = await Tesseract.createWorker(lang);
    return w;
  })();
  return workerPromise;
}

// brand text on packaging is usually short, mostly letters, often UPPER.
// be tolerant — gibberish noise gets filtered here.
function looksLikeRealText(s) {
  if (!s) return false;
  const clean = s.replace(/[^A-Za-z0-9\s]/g, "").trim();
  if (clean.length < 4) return false;
  const letters = (clean.match(/[A-Za-z]/g) || []).length;
  return letters >= 4;
}

function cleanOcrText(raw) {
  return raw
    .replace(/[\r\n]+/g, " ")
    .replace(/[^A-Za-z0-9\s.&'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function useOcr() {
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrReady, setOcrReady] = useState(false);
  const cancelRef = useRef(false);

  const runOcr = useCallback(async (input) => {
    setOcrLoading(true);
    try {
      const w = await getWorker("eng");
      setOcrReady(true);
      if (cancelRef.current) return "";
      const { data } = await w.recognize(input);
      const txt = cleanOcrText(data?.text || "");
      return looksLikeRealText(txt) ? txt : "";
    } catch {
      return "";
    } finally {
      setOcrLoading(false);
    }
  }, []);

  return { runOcr, ocrLoading, ocrReady };
}
