import { AudioLines, Music, Repeat2, Wand2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type GenerationMode = "simple" | "custom" | "remix" | "repaint";

interface Props {
  value: GenerationMode;
  onChange: (v: GenerationMode) => void;
  className?: string;
}

const MODES: {
  id: GenerationMode;
  label: string;
  Icon: typeof Music;
  hint: string;
}[] = [
  { id: "simple",  label: "Simple",  Icon: Wand2,      hint: "Describe the song, LM fills in everything" },
  { id: "custom",  label: "Custom",  Icon: Music,      hint: "Full manual control (caption + lyrics + params)" },
  { id: "remix",   label: "Remix",   Icon: AudioLines, hint: "Cover / restyle an existing track" },
  { id: "repaint", label: "Repaint", Icon: Repeat2,    hint: "Regenerate a slice of an existing track" },
];

export function ModeSelector({ value, onChange, className }: Props) {
  return (
    <div className={cn("card p-2 flex flex-wrap gap-1", className)} role="tablist" aria-label="Generation mode">
      {MODES.map((m) => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m.id)}
            title={m.hint}
            className={cn(
              "flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all",
              active
                ? "bg-brand-gradient text-white shadow-glow"
                : "text-ink-300 hover:text-ink-100 hover:bg-white/5",
            )}
          >
            <m.Icon className="h-4 w-4" />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function modeToTaskType(mode: GenerationMode): string {
  switch (mode) {
    case "remix":   return "audio2audio";
    case "repaint": return "repaint";
    default:        return "text2music";
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function modeNeedsSourceAudio(mode: GenerationMode): boolean {
  return mode === "remix" || mode === "repaint";
}

// eslint-disable-next-line react-refresh/only-export-components
export function modeIsSimple(mode: GenerationMode): boolean {
  return mode === "simple";
}
