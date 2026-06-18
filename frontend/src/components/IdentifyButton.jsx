import { Scan, Loader2 } from "lucide-react";

/*
 * IdentifyButton
 * --------------
 * Big circular capture button.
 *  - inner ring shows how close we are to a "stable" identification
 *  - in auto mode the label changes from "identify" -> "auto"
 */
export default function IdentifyButton({ onClick, disabled, loading, progress = 0, auto = false }) {
  const pct = Math.round(progress * 100);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid="identify-button"
      className={`group relative h-[72px] w-[72px] rounded-full border ${disabled ? "border-white/15 opacity-50" : "border-white/30 hover:border-white"} bg-black/70 backdrop-blur transition-all active:scale-95`}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
        <circle
          cx="36" cy="36" r="32"
          fill="none"
          stroke="rgb(16 185 129)"
          strokeWidth="2"
          strokeDasharray={2 * Math.PI * 32}
          strokeDashoffset={2 * Math.PI * 32 * (1 - progress)}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-300"
        />
      </svg>

      <span className="absolute inset-0 grid place-items-center">
        {loading
          ? <Loader2 className="h-5 w-5 animate-spin" />
          : <Scan className="h-5 w-5 group-hover:text-white text-white/80 transition-colors" />}
      </span>

      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400 whitespace-nowrap">
        {auto ? `auto · ${pct}%` : "identify"}
      </span>
    </button>
  );
}
