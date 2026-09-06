import { Sparkles } from "lucide-react";
import { AUTHOR } from "@/lib/constants";

/**
 * Thin always-visible attribution strip that sits above the header.
 * Small, elegant — not a marquee. Signals the maker without shouting.
 */
export function TopBanner() {
  return (
    <div className="relative z-40 border-b border-white/5 bg-ink-950/85 backdrop-blur-xl">
      {/* subtle animated hairline underline */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent animate-pulse-slow" />
      <div className="mx-auto max-w-[100rem] px-4 sm:px-6 h-8 flex items-center justify-center gap-3 text-[11px] tracking-wide">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-70 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
        </span>
        <span className="text-ink-400">
          Developed by{" "}
          <span className="text-transparent bg-clip-text bg-brand-gradient font-semibold">
            {AUTHOR}
          </span>
        </span>
        <span className="text-ink-700 hidden sm:inline">•</span>
        <span className="text-ink-500 hidden sm:inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-brand-400" />
          Powered by ACE-Step V1.5
        </span>
      </div>
    </div>
  );
}
