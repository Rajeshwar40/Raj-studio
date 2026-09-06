import { cn } from "@/lib/cn";

interface Props {
  className?: string;
  compact?: boolean;
}

export function Logo({ className, compact = false }: Props) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative h-9 w-9 rounded-xl bg-brand-gradient shadow-glow grid place-items-center overflow-hidden">
        <span className="font-black text-white text-lg tracking-tight leading-none">R</span>
        <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-accent-magenta blur-[1px] opacity-90" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-semibold text-ink-100 tracking-tight">Raj Studio</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
            AI Music Studio
          </div>
        </div>
      )}
    </div>
  );
}
