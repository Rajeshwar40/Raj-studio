import { cn } from "@/lib/cn";

interface Props {
  active: boolean;
  label?: string;
  className?: string;
}

/** Small "Auto" indicator shown below numeric fields when they are empty and
 * the backend will pick a value automatically (BPM Auto, Key Auto, etc.). */
export function AutoBadge({ active, label = "Auto", className }: Props) {
  if (!active) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase text-brand-300/90",
        className,
      )}
    >
      <span className="h-1 w-1 rounded-full bg-brand-400" />
      {label}
    </span>
  );
}
