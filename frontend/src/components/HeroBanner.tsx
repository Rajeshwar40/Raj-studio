import { useEffect, useMemo, useState } from "react";
import { Cpu, Radio, Sparkles, Waves } from "lucide-react";
import { cn } from "@/lib/cn";
import { useBackendStatus } from "@/hooks/useBackendStatus";

const TAGLINES = [
  "Compose. Generate. Vibe.",
  "Turn prompts into music.",
  "Studio-grade AI, in your browser.",
  "From lyric to loop in seconds.",
];

/**
 * Animated hero: huge title, rotating typewriter tagline, live waveform,
 * and status chips fed from the backend /health endpoint. Kept purposeful
 * — the motion is subtle, on-brand and never blocks interaction.
 */
export function HeroBanner() {
  const { status, health } = useBackendStatus();
  const [taglineIdx, setTaglineIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Typewriter effect that rotates through TAGLINES.
  useEffect(() => {
    const current = TAGLINES[taglineIdx];
    if (!deleting && typed === current) {
      const hold = window.setTimeout(() => setDeleting(true), 2200);
      return () => window.clearTimeout(hold);
    }
    if (deleting && typed === "") {
      setDeleting(false);
      setTaglineIdx((i) => (i + 1) % TAGLINES.length);
      return;
    }
    const step = deleting ? 34 : 62;
    const t = window.setTimeout(() => {
      setTyped((prev) =>
        deleting ? prev.slice(0, -1) : current.slice(0, prev.length + 1),
      );
    }, step);
    return () => window.clearTimeout(t);
  }, [typed, deleting, taglineIdx]);

  const statusChip = useMemo(() => {
    if (status === "online") {
      return {
        label: `Backend live · ${health?.loaded_model || "ready"}`,
        dot: "bg-emerald-400",
        border: "border-emerald-500/40 text-emerald-300",
      };
    }
    if (status === "checking") {
      return { label: "Warming up…", dot: "bg-brand-400 animate-pulse", border: "border-brand-500/40 text-brand-300" };
    }
    return { label: "Offline — check backend", dot: "bg-rose-400", border: "border-rose-500/40 text-rose-300" };
  }, [status, health]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-ink-900/60 shadow-card">
      {/* Layered ambient background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-90 pointer-events-none"
        style={{
          background:
            "radial-gradient(60rem 30rem at 15% 0%, rgba(139,92,246,0.28), transparent 60%), radial-gradient(50rem 25rem at 90% 20%, rgba(236,72,153,0.22), transparent 60%), linear-gradient(180deg, rgba(11,11,18,0) 0%, rgba(11,11,18,0.65) 100%)",
        }}
      />
      {/* Fine grid overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(80% 60% at 50% 40%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(80% 60% at 50% 40%, black 40%, transparent 100%)",
        }}
      />
      {/* Waveform sits behind content in the bottom strip */}
      <Waveform className="absolute inset-x-0 bottom-0 h-20 sm:h-24 w-full pointer-events-none opacity-50" />
      {/* Soft fade so text above the waveform stays legible */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-28 sm:h-32 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,11,18,0.85) 0%, rgba(11,11,18,0.35) 45%, rgba(11,11,18,0) 100%)",
        }}
      />

      <div className="relative px-6 sm:px-10 pt-10 sm:pt-14 pb-24 sm:pb-28 flex flex-col gap-6">
        {/* Top chips row */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
              statusChip.border,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", statusChip.dot)} />
            {statusChip.label}
          </span>
          {health?.loaded_lm_model && (
            <span className="chip">
              <Cpu className="h-3 w-3 text-brand-300" />
              LM {health.loaded_lm_model}
            </span>
          )}
          <span className="chip">
            <Radio className="h-3 w-3 text-accent-magenta" />
            Live
          </span>
          <span className="chip">
            <Sparkles className="h-3 w-3 text-brand-300" />
            v1.0
          </span>
        </div>

        {/* Wordmark */}
        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="font-black leading-none tracking-tighter text-6xl sm:text-7xl md:text-8xl">
              <span className="inline-block bg-brand-gradient bg-clip-text text-transparent drop-shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
                RAJ
              </span>{" "}
              <span className="inline-block text-ink-100">STUDIO</span>
            </h1>
            <span className="hidden md:inline-block text-ink-500 text-sm font-mono translate-y-[-0.6rem]">
              /ˈrɑːdʒ/ ˈstjuːdɪəʊ
            </span>
          </div>
          <div className="mt-3 h-6 text-base sm:text-lg text-ink-300 font-mono">
            <span className="text-brand-400">▸</span>{" "}
            <span>{typed}</span>
            <span className="inline-block w-[0.55ch] h-[1.05em] align-[-0.15em] ml-0.5 bg-brand-400 animate-pulse" />
          </div>
        </div>

        {/* Info line */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-300">
          <span className="inline-flex items-center gap-1.5">
            <Waves className="h-4 w-4 text-brand-400" />
            Text · lyrics · audio → music
          </span>
          <span className="text-ink-700 hidden sm:inline">•</span>
          <span>Multi-format export</span>
          <span className="text-ink-700 hidden sm:inline">•</span>
          <span>Runs locally on your machine</span>
        </div>
      </div>
    </section>
  );
}

/** Live-looking bar waveform. Deterministic bar heights driven by CSS-only
 * animation so it stays cheap (no per-frame React re-renders). */
function Waveform({ className }: { className?: string }) {
  const bars = 64;
  return (
    <svg
      viewBox={`0 0 ${bars * 6} 100`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="60%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      {Array.from({ length: bars }).map((_, i) => {
        const delay = (i * 0.055) % 1.6;
        // Deterministic pseudo-random heights so the waveform reads as musical, not noise.
        const seed = (Math.sin(i * 12.9898) * 43758.5453) % 1;
        const base = 22 + Math.abs(seed) * 34;
        return (
          <rect
            key={i}
            x={i * 6 + 1}
            y={50 - base / 2}
            width={4}
            height={base}
            rx={2}
            fill="url(#waveGrad)"
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              animation: `waveBar 1.6s ease-in-out ${delay}s infinite`,
            }}
          />
        );
      })}
    </svg>
  );
}
