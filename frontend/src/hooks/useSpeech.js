/*
 * useSpeech
 * ---------
 * Tiny wrapper around the browser's SpeechSynthesis API.
 * - exposes `speak(text)` and `cancel()`
 * - tracks `speaking` so the UI can pulse / animate
 * - lets us swap voice / rate / pitch from the settings sheet
 */
import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeech({ rate = 1, pitch = 1, voiceName = null, enabled = true, lang = "en-US" } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);

  // load voices (chrome populates them async)
  useEffect(() => {
    const synth = synthRef.current;
    if (!synth) return;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => synth.removeEventListener?.("voiceschanged", load);
  }, []);

  const speak = useCallback((text) => {
    const synth = synthRef.current;
    if (!synth || !enabled || !text) return;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      u.pitch = pitch;
      u.lang = lang;
      // try to find a voice that matches the requested locale prefix (e.g. "hi", "es")
      const prefix = (lang || "en").split("-")[0].toLowerCase();
      const v = voices.find(v => v.name === voiceName)
              || voices.find(v => v.lang?.toLowerCase().startsWith(prefix))
              || voices.find(v => /en[-_]/i.test(v.lang));
      if (v) u.voice = v;
      u.onstart = () => setSpeaking(true);
      u.onend   = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    } catch {
      // ignore — speech is non-critical
    }
  }, [enabled, rate, pitch, voiceName, voices, lang]);

  const cancel = useCallback(() => {
    synthRef.current?.cancel();
    setSpeaking(false);
  }, []);

  return { speak, cancel, speaking, voices };
}
