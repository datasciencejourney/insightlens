import { GraduationCap } from "lucide-react";
export default function AlternatesStrip({ alternates = [], via, onPick }) {
  if (!alternates.length) return null;
  const [top, ...rest] = alternates;
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(45vh+96px)] sm:bottom-[calc(380px+96px)] z-20 flex flex-col items-center gap-2 px-3 max-w-[92vw]"
         data-testid="alternates-strip">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Chip primary label={top.label} score={top.score} via={via}
              taught={top.taught}
              onClick={() => onPick(top.label)} testid="alt-chip-0" />
        {rest.slice(0, 3).map((a, i) => (
          <Chip key={a.label} label={a.label} score={a.score}
                onClick={() => onPick(a.label)} testid={`alt-chip-${i + 1}`} />
        ))}
      </div>
      <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-neutral-500">
        not what you see? tap the right one — three taps and i&apos;ll remember
      </p>
    </div>
  );
}

function Chip({ primary, label, score, via, taught, onClick, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`group inline-flex items-center gap-2 px-3 py-1.5 border text-[11px] font-mono uppercase tracking-[0.18em] transition-colors ${
        primary
          ? (taught ? "bg-emerald-400 text-black border-emerald-400" : "bg-white text-black border-white")
          : "bg-black/60 backdrop-blur text-neutral-200 border-white/15 hover:border-white/40 hover:text-white"
      }`}
    >
      {taught
        ? <GraduationCap className="h-3 w-3" />
        : <span className={`h-1 w-1 rounded-full ${primary ? "bg-black" : "bg-emerald-400"}`} />}
      {label}
      {!taught && (
        <span className={primary ? "text-emerald-700" : "text-emerald-400"}>
          {Math.round((score || 0) * 100)}%
        </span>
      )}
      {primary && !taught && via && via !== "frame" && (
        <span className="text-neutral-500 normal-case tracking-normal">via {via}</span>
      )}
    </button>
  );
}
