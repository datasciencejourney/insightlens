import { ExternalLink, Volume2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/*
 * InsightPanel
 * ------------
 * Bottom-sheet that renders whatever the backend returned for the current
 * detected object.  Keeps an information-dense Swiss layout: data labels in
 * uppercase mono, values in plain prose.
 */
export default function InsightPanel({ insight, loading, error, speaking, onSpeakAgain }) {
  if (!insight && !loading && !error) {
    return (
      <div className="space-y-2" data-testid="insight-empty">
        <p className="text-xs font-mono uppercase tracking-[0.25em] text-neutral-500">
          waiting for the lens to lock on…
        </p>
        <p className="text-[11px] text-neutral-600 leading-relaxed">
          aim the camera at any object — then tap <span className="text-neutral-400 font-mono">identify</span> for facts, history &amp; more.
        </p>
      </div>
    );
  }

  if (loading) {
    const displayLabel = (!loading || loading === "analysing…" || loading === "true" || loading === true)
      ? null
      : loading;
    return (
      <div className="flex items-center gap-3 text-sm text-neutral-400"
           data-testid="insight-loading">
        <Loader2 className="h-4 w-4 animate-spin" />
        {displayLabel
          ? <>digging up <span className="text-white font-mono">{displayLabel}</span>…</>
          : <span>analysing image…</span>
        }
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-amber-400" data-testid="insight-error">{error}</p>;
  }

  const { label, title, summary, image, page_url, trivia, facts, nutrition, recipes, sources } = insight;

  return (
    <div className="space-y-5" data-testid="insight-content">
      {/* header */}
      <div className="flex items-start gap-4">
        {image && (
          <img src={image} alt="" loading="lazy"
               className="hidden sm:block h-16 w-16 object-cover border border-white/15" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-500">detected</p>
            <span className="h-1 w-1 bg-emerald-400 rounded-full" />
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400">{label}</p>
          </div>
          <h2 className="text-xl sm:text-2xl font-medium tracking-tight">
            {title || label}
          </h2>
          {summary && (
            <p className="mt-2 text-sm text-neutral-300 leading-relaxed line-clamp-4">
              {summary}
            </p>
          )}
        </div>
        <button
          onClick={onSpeakAgain}
          className={`relative shrink-0 h-9 w-9 grid place-items-center border border-white/15 hover:bg-white/10 transition-colors ${speaking ? "speech-pulse" : ""}`}
          title="repeat aloud"
          data-testid="speak-again-button"
        >
          <Volume2 className="h-4 w-4" />
        </button>
      </div>

      {/* trivia */}
      {trivia?.length > 0 && (
        <div data-testid="insight-trivia">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-500 mb-2">
            beyond-the-obvious
          </p>
          <ul className="space-y-2">
            {trivia.map((t, i) => (
              <li key={i} className="text-sm text-neutral-200 leading-relaxed flex gap-3">
                <span className="text-emerald-400 font-mono text-xs pt-1">0{i+1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* structured facts (wikidata) */}
      {facts?.length > 0 && (
        <div data-testid="insight-facts">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-500 mb-2">
            structured facts
          </p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
            {facts.slice(0, 8).map((f, i) => (
              <div key={i} className="flex justify-between gap-3 py-1 border-b border-white/5 text-sm">
                <span className="text-neutral-500 capitalize">{f.property}</span>
                <span className="text-white text-right">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* nutrition */}
      {nutrition && (
        <div data-testid="insight-nutrition">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-500 mb-2">
            nutrition · per 100g
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["kcal",    nutrition.kcal_100g],
              ["protein", nutrition.protein_100g, "g"],
              ["carbs",   nutrition.carbs_100g,   "g"],
              ["fat",     nutrition.fat_100g,     "g"],
              ["sugar",   nutrition.sugar_100g,   "g"],
              ["fiber",   nutrition.fiber_100g,   "g"],
              ["salt",    nutrition.salt_100g,    "g"],
            ].filter(([, v]) => v !== undefined && v !== null).map(([k, v, u]) => (
              <div key={k} className="border border-white/10 p-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500">{k}</p>
                <p className="text-base font-mono mt-1">{Math.round(parseFloat(v) * 10) / 10}{u || ""}</p>
              </div>
            ))}
          </div>
          {(nutrition.nutriscore || nutrition.novagroup) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {nutrition.nutriscore && (
                <Badge variant="outline" className="border-white/20 rounded-none font-mono uppercase text-[10px]">
                  nutriscore {nutrition.nutriscore}
                </Badge>
              )}
              {nutrition.novagroup && (
                <Badge variant="outline" className="border-white/20 rounded-none font-mono uppercase text-[10px]">
                  nova {nutrition.novagroup}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* recipes */}
      {recipes?.length > 0 && (
        <div data-testid="insight-recipes">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-500 mb-2">
            recipes that use this
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {recipes.slice(0, 4).map((r, i) => (
              <a key={i}
                 href={r.url || "#"}
                 target="_blank" rel="noreferrer"
                 className="group flex gap-3 border border-white/10 p-2 hover:border-white/30 transition-colors"
                 data-testid={`recipe-card-${i}`}>
                {r.image && (
                  <img src={r.image} alt="" loading="lazy"
                       className="h-16 w-16 object-cover shrink-0 border border-white/10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate group-hover:underline">{r.name}</p>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 mt-0.5">
                    {[r.area, r.category].filter(Boolean).join(" · ")}
                  </p>
                  {r.ingredients?.length > 0 && (
                    <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                      {r.ingredients.slice(0, 4).join(", ")}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* sources */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        <div className="flex flex-wrap gap-2">
          {sources?.map(s => (
            <span key={s} className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500">
              · {s}
            </span>
          ))}
        </div>
        {page_url && (
          <a href={page_url} target="_blank" rel="noreferrer"
             className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-300 hover:text-white flex items-center gap-1"
             data-testid="insight-source-link">
            read more <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
