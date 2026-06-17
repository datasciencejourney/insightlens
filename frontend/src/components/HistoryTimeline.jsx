export default function HistoryTimeline({ items, currentLabel, onPick }) {
  if (!items.length) return null;
  return (
    <div className="absolute left-0 right-0 bottom-[calc(45vh+12px)] sm:bottom-[calc(380px+12px)] z-20 px-4 sm:px-6"
         data-testid="history-timeline">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {items.map((it, i) => {
          const active = it.label === currentLabel;
          return (
            <button key={`${it.label}-${i}`}
                    onClick={() => onPick(it.label)}
                    className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 border text-[11px] font-mono uppercase tracking-[0.18em] transition-colors ${active ? "bg-white text-black border-white" : "bg-black/50 backdrop-blur text-neutral-200 border-white/15 hover:border-white/40"}`}
                    data-testid={`history-chip-${it.label.replace(/\s+/g, "-")}`}>
              <span className={`h-1 w-1 rounded-full ${active ? "bg-black" : "bg-emerald-400"}`} />
              {it.label}
              <span className="text-neutral-400/80">·{Math.round(it.score * 100)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
