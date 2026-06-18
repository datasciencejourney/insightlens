import { Link } from "react-router-dom";
import { ArrowUpRight, Camera, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden grain">
      <nav className="relative z-10 flex items-center justify-between gap-4 px-6 sm:px-10 py-6">
        <div className="flex items-center gap-3" data-testid="brand-mark">
          <div className="h-8 w-8 border border-white/40 flex items-center justify-center">
            <span className="text-[10px] font-mono tracking-widest">IL</span>
          </div>
          <span className="text-sm font-mono tracking-[0.25em] uppercase">InsightLens</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-300">
          <a
            href="https://www.linkedin.com/in/lovelyr"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 border border-white/15 bg-black/40 px-3 py-2 hover:border-white/40 hover:text-white transition-colors"
            data-testid="nav-linkedin-link"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/datasciencejourney/insightlens"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 border border-white/15 bg-black/40 px-3 py-2 hover:border-white/40 hover:text-white transition-colors"
            data-testid="nav-github-link"
          >
            Github
          </a>
          <a
            href="https://lovelyramchandani.netlify.app/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 border border-white/15 bg-black/40 px-3 py-2 hover:border-white/40 hover:text-white transition-colors"
            data-testid="nav-portfolio-link"
          >
            Portfolio
          </a>
        </div>
      </nav>

      <section className="relative z-10 px-6 sm:px-10 pt-8 sm:pt-16 pb-24">
        <div className="grid md:grid-cols-12 gap-12 max-w-7xl">
          <div className="md:col-span-7">
            <div className="flex items-center gap-2 mb-8">
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-neutral-400">
                runs entirely in your browser
              </p>
            </div>

            <h1 className="font-light leading-[0.95] tracking-tight text-5xl sm:text-6xl lg:text-7xl mb-8">
              point your camera<br />
              at the world.<br />
              <span className="text-neutral-500">we&apos;ll tell you<br /></span>
              <span className="italic font-normal">what it doesn&apos;t.</span>
            </h1>

            <p className="text-neutral-400 max-w-xl text-base sm:text-lg leading-relaxed mb-10">
              InsightLens uses Claude Vision AI to identify any object you point your camera at —
              from everyday items to food, gadgets and more. It then pulls non-obvious facts
              from Wikipedia, Wikidata and Open Food Facts, and reads them aloud hands-free.
              No API keys needed. No accounts. No tracking.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link to="/studio" data-testid="cta-start-button">
                <Button
                  className="bg-white text-black hover:bg-neutral-200 rounded-none px-7 py-6 text-sm font-medium tracking-wide cursor-pointer"
                  data-testid="start-camera-button"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  start the lens
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-6 max-w-xl border-t border-white/10 pt-8">
              <Feat icon={<Camera className="h-4 w-4" />}
                    h="Claude Vision"
                    p="AI-powered identification. Anything in front of your camera gets accurately named." />
              <Feat icon={<Sparkles className="h-4 w-4" />}
                    h="deep facts"
                    p="Wikidata properties + curated trivia, not surface bullet points." />
              <Feat icon={<Mic className="h-4 w-4" />}
                    h="hands-free"
                    p="Auto-narrates each new object — no buttons, no tapping." />
            </div>
          </div>

          <div className="md:col-span-5 relative">
            <div className="relative aspect-[4/5] border border-white/15 overflow-hidden">
              <div className="absolute inset-0 bg-neutral-950 flex items-center justify-center">
                <div className="relative w-32 h-32 border border-white/20 rounded-full flex items-center justify-center">
                  <div className="w-20 h-20 border border-white/15 rounded-full flex items-center justify-center">
                    <div className="w-10 h-10 border border-emerald-400/40 rounded-full" />
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-px w-px h-4 bg-white/20" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-px w-px h-4 bg-white/20" />
                  <div className="absolute left-0 top-1/2 -translate-y-px h-px w-4 bg-white/20" />
                  <div className="absolute right-0 top-1/2 -translate-y-px h-px w-4 bg-white/20" />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              <div className="absolute inset-6 pointer-events-none">
                <span className="corner-bracket tl" />
                <span className="corner-bracket tr" />
                <span className="corner-bracket bl" />
                <span className="corner-bracket br" />
                <div className="absolute bottom-3 left-3 text-[10px] font-mono uppercase tracking-[0.25em] text-white/70 bg-black/50 px-2 py-1">
                  obj_03 · lens · 0.94
                </div>
              </div>
            </div>
            <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-600">
                sample bounding overlay
            </p>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-6 sm:px-10 py-6 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-500">
          <span>MIT licensed</span>
        <span>no telemetry · no ads · 100% free APIs</span>
      </footer>
    </div>
  );
}

function Feat({ icon, h, p }) {
  return (
    <div>
      <div className="text-white/80 mb-3">{icon}</div>
      <p className="text-sm font-medium mb-1">{h}</p>
      <p className="text-xs text-neutral-500 leading-relaxed">{p}</p>
    </div>
  );
}
