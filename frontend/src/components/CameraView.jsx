import { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";

export default function CameraView({ facingMode, videoRef, boxes, onStateChange }) {
  const containerRef = useRef(null);
  const localRef = useRef(null);
  if (!videoRef) videoRef = localRef;
  const [err, setErr] = useState(null);
  const [streamReady, setStreamReady] = useState(false);
  const [renderSize, setRenderSize] = useState({ w: 0, h: 0, videoW: 1, videoH: 1 });

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let stream;
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width:  { ideal: 1280 },
            height: { ideal: 720  },
          },
          audio: false,
        });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamReady(true);
        onStateChange?.({ ready: true, error: null });
      } catch (e) {
        const msg = e.message || "camera access denied";
        setErr(msg);
        onStateChange?.({ ready: false, error: msg });
      }
    }
    start();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [facingMode, onStateChange, retryCount]);

  useEffect(() => {
    function measure() {
      if (!videoRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setRenderSize({
        w: rect.width,
        h: rect.height,
        videoW: videoRef.current.videoWidth || 1,
        videoH: videoRef.current.videoHeight || 1,
      });
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    videoRef.current?.addEventListener("loadedmetadata", measure);
    return () => ro.disconnect();
  }, [streamReady]);

  const overlay = (() => {
    const { w, h, videoW, videoH } = renderSize;
    if (!w || !h) return { sx: 1, sy: 1, offX: 0, offY: 0 };
    const containerRatio = w / h;
    const videoRatio = videoW / videoH;
    let drawW, drawH;
    if (videoRatio > containerRatio) {
      drawH = h;
      drawW = videoRatio * h;
    } else {
      drawW = w;
      drawH = w / videoRatio;
    }
    return {
      sx: drawW / videoW,
      sy: drawH / videoH,
      offX: (w - drawW) / 2,
      offY: (h - drawH) / 2,
    };
  })();

  return (
    <div ref={containerRef} className="absolute inset-0 bg-black overflow-hidden">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
        data-testid="camera-video"
      />

      {err && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-8"
             data-testid="camera-error">
          <CameraOff className="h-9 w-9 text-neutral-500" />
          <div>
            <p className="text-sm font-medium text-white mb-1">Camera access blocked</p>
            <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
              Click the camera icon in your browser&apos;s address bar (or visit
              <strong className="text-neutral-300"> Site Settings</strong>) and
              set Camera to <strong className="text-neutral-300">Allow</strong>, then tap retry.
            </p>
          </div>
          <button
            onClick={() => { setErr(null); setStreamReady(false); setRetryCount(c => c + 1); }}
            className="mt-1 px-5 py-2 bg-white text-black text-xs font-mono uppercase tracking-widest hover:bg-neutral-200 transition-colors"
          >
            retry
          </button>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none">
        {boxes.map((b, i) => {
          const [x, y, w, h] = b.bbox;
          const left = overlay.offX + x * overlay.sx;
          const top  = overlay.offY + y * overlay.sy;
          const boxW = w * overlay.sx;
          const boxH = h * overlay.sy;
          const flipped = facingMode === "user";
          return (
            <div key={`${b.label}-${i}`}
                 style={{
                   left: flipped ? renderSize.w - left - boxW : left,
                   top, width: boxW, height: boxH,
                 }}
                 className="absolute"
                 data-testid={`bbox-${b.label.replace(/\s+/g, "-")}`}>
              <span className="corner-bracket tl" />
              <span className="corner-bracket tr" />
              <span className="corner-bracket bl" />
              <span className="corner-bracket br" />
              <div className="absolute -top-6 left-0 inline-flex items-center gap-2 px-2 py-1 bg-black/70 backdrop-blur text-[10px] font-mono uppercase tracking-[0.18em]">
                {b.label}
                <span className="text-emerald-400">{Math.round(b.score * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
