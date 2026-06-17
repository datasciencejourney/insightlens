import { Link } from "react-router-dom";
import { ChevronLeft, Activity, Cpu, Sparkles } from "lucide-react";

export default function StatusBar({ fps, modelReady, listening }) {
  return (
    <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4 text-xs font-mono uppercase tracking-[0.2em]"
         data-testid="status-bar">
      <Link to="/"
            className="inline-flex items-center gap-1.5 text-neutral-300 hover:text-white transition-colors px-2 py-1.5 bg-black/40 backdrop-blur border border-white/10"
            data-testid="status-back-link">
        <ChevronLeft className="h-3.5 w-3.5" /> back
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        <Pill icon={<Sparkles className="h-3 w-3" />}
              label="claude vision"
              tone="ok" testid="status-claude" />
        <Pill icon={<Cpu className="h-3 w-3" />}
              label={modelReady ? "model · ready" : "model · loading"}
              tone={modelReady ? "ok" : "warn"} testid="status-model" />
        <Pill icon={<Activity className="h-3 w-3" />}
              label={`${fps || 0} fps`}
              tone="muted" testid="status-fps" />
        <Pill label={listening ? "scanning" : "idle"}
              tone={listening ? "ok" : "muted"} testid="status-listening" />
      </div>
    </div>
  );
}

function Pill({ icon, label, tone = "muted", testid }) {
  const tones = {
    ok:   "text-emerald-400 border-emerald-400/30",
    warn: "text-amber-400 border-amber-400/30",
    muted:"text-neutral-300 border-white/10",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1.5 bg-black/40 backdrop-blur border ${tones[tone]}`}
          data-testid={testid}>
      {icon}{label}
    </span>
  );
}
