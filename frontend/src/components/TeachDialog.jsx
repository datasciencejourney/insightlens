import { useEffect, useRef, useState } from "react";
import { GraduationCap, Sparkles, X } from "lucide-react";
export default function TeachDialog({ open, onOpenChange, onSave, disabled }) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValue("");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => inputRef.current?.focus());
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onSave(v);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <div
        className="relative w-full max-w-md mx-4 bg-neutral-950 border border-white/15 p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
          aria-label="close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-xl font-light tracking-tight mb-1">
          <GraduationCap className="h-5 w-5" /> teach the lens
        </div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-500 mb-5">
          tell me what i&apos;m looking at — i&apos;ll remember it on this device
        </p>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="e.g. matchstick, aloo paratha, my dog Bruno"
          className="w-full bg-black border border-white/15 text-white placeholder:text-neutral-500 px-3 py-2 text-sm outline-none focus:border-white/50 transition-colors mb-3"
          data-testid="teach-input"
          autoComplete="off"
          spellCheck={false}
        />

        <p className="text-[11px] text-neutral-500 leading-relaxed mb-5">
          <Sparkles className="h-3 w-3 inline mr-1 align-baseline" />
          saved locally only · no upload, no account. works for people,
          dishes, your own things — anything Wikipedia or TheMealDB has a page for.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
            data-testid="teach-cancel"
          >
            cancel
          </button>
          <button
            onClick={submit}
            disabled={disabled || !value.trim()}
            className="px-5 py-2 bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="teach-save"
          >
            save & identify
          </button>
        </div>
      </div>
    </div>
  );
}
