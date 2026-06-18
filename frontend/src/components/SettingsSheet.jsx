import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCcw, Trash2, GraduationCap } from "lucide-react";
import { useState } from "react";
import { listAll, remove, clearAll } from "@/lib/overrides";

export default function SettingsSheet({
  voiceOn, setVoiceOn,
  autoMode, setAutoMode,
  rate, setRate,
  pitch, setPitch,
  minScore, setMinScore,
  facingMode, setFacingMode,
  lang, setLang,
  useOcrHint, setUseOcrHint,
  foodMode, setFoodMode,
}) {
  const [_, force] = useState(0);
  const overrides = listAll();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="h-10 w-10 grid place-items-center bg-black/40 backdrop-blur border border-white/15 hover:bg-white/10 transition-colors"
                data-testid="settings-trigger">
          <Settings className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="right"
                    className="bg-neutral-950 border-l border-white/10 text-white w-[88%] sm:max-w-md overflow-y-auto"
                    data-testid="settings-sheet">
        <SheetHeader>
          <SheetTitle className="text-white font-light text-xl tracking-tight">controls</SheetTitle>
          <SheetDescription className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-500">
            tune the lens
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8 mt-8">
          <Row label="auto-identify" hint="lens captures itself once the guess is stable">
            <Switch checked={autoMode} onCheckedChange={setAutoMode} data-testid="settings-auto-toggle" />
          </Row>

          <Row label="read text on label" hint="uses on-device OCR to read brand names — much more accurate for packaged items">
            <Switch checked={useOcrHint} onCheckedChange={setUseOcrHint} data-testid="settings-ocr-toggle" />
          </Row>

          <Row label="food mode" hint="prefer recipes & nutrition over generic facts — useful at the dinner table">
            <Switch checked={foodMode} onCheckedChange={setFoodMode} data-testid="settings-food-toggle" />
          </Row>

          <Row label="voice output" hint="speak the spoken summary after identify">
            <Switch checked={voiceOn} onCheckedChange={setVoiceOn} data-testid="settings-voice-toggle" />
          </Row>

          <div>
            <Label className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400">
              language
            </Label>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[
                ["en", "english"],
                ["hi", "हिन्दी"],
                ["es", "español"],
                ["fr", "français"],
              ].map(([code, name]) => (
                <Button key={code}
                        onClick={() => setLang(code)}
                        className={`rounded-none border text-xs ${lang === code ? "bg-white text-black" : "bg-transparent text-white border-white/15 hover:bg-white/10"}`}
                        data-testid={`settings-lang-${code}`}>
                  {name}
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-500 mt-2">switches Wikipedia + voice locale</p>
          </div>

          <Row label="speech rate" value={rate.toFixed(2)}>
            <Slider min={0.5} max={1.5} step={0.05} value={[rate]}
                    onValueChange={v => setRate(v[0])}
                    disabled={!voiceOn} data-testid="settings-rate-slider" />
          </Row>

          <Row label="speech pitch" value={pitch.toFixed(2)}>
            <Slider min={0.6} max={1.4} step={0.05} value={[pitch]}
                    onValueChange={v => setPitch(v[0])}
                    disabled={!voiceOn} data-testid="settings-pitch-slider" />
          </Row>

          <Row label="confidence floor" value={`${Math.round(minScore * 100)}%`}
               hint="reject weak detections below this">
            <Slider min={0.3} max={0.85} step={0.05} value={[minScore]}
                    onValueChange={v => setMinScore(v[0])}
                    data-testid="settings-score-slider" />
          </Row>

          <div className="border-t border-white/10 pt-6">
            <Label className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400">
              camera
            </Label>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button
                onClick={() => setFacingMode("environment")}
                className={`rounded-none border ${facingMode === "environment" ? "bg-white text-black" : "bg-transparent text-white border-white/15 hover:bg-white/10"}`}
                data-testid="settings-cam-back"
              >back</Button>
              <Button
                onClick={() => setFacingMode("user")}
                className={`rounded-none border ${facingMode === "user" ? "bg-white text-black" : "bg-transparent text-white border-white/15 hover:bg-white/10"}`}
                data-testid="settings-cam-front"
              >front</Button>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="ghost"
              className="mt-4 w-full justify-start text-neutral-400 hover:text-white rounded-none"
              data-testid="settings-restart-cam"
            >
              <RefreshCcw className="h-3.5 w-3.5 mr-2" /> restart camera
            </Button>
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400 flex items-center gap-1.5">
                <GraduationCap className="h-3 w-3" /> memorized · {overrides.length}
              </Label>
              {overrides.length > 0 && (
                <button
                  onClick={() => { clearAll(); force(n => n + 1); }}
                  className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 hover:text-amber-400 transition-colors"
                  data-testid="settings-clear-memory"
                >clear all</button>
              )}
            </div>
            {overrides.length === 0 ? (
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                nothing remembered yet. tap an alternate chip three times — or
                use the teach button — to lock in a label.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {overrides.slice(0, 20).map((e, i) => (
                  <div key={e.hash + e.label}
                       className="flex items-center justify-between gap-2 text-xs border border-white/10 px-2 py-1.5"
                       data-testid={`memorized-row-${i}`}>
                    <span className="truncate">{e.label}</span>
                    <span className="flex items-center gap-2 text-neutral-500 font-mono shrink-0">
                      <span className="text-[10px]">×{e.count}</span>
                      <button
                        onClick={() => { remove(e.hash, e.label); force(n => n + 1); }}
                        className="hover:text-amber-400 transition-colors"
                        aria-label="forget"
                      ><Trash2 className="h-3 w-3" /></button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, hint, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400">
          {label}
        </Label>
        {value !== undefined && (
          <span className="text-xs font-mono text-white">{value}</span>
        )}
      </div>
      {children}
      {hint && <p className="text-[11px] text-neutral-500 mt-2">{hint}</p>}
    </div>
  );
}
