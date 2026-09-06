import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  title: ReactNode;
  description?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  right?: ReactNode;
}

export function Collapsible({ title, description, defaultOpen = false, children, right }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink-100">{title}</div>
          {description && <div className="text-xs text-ink-400 mt-0.5">{description}</div>}
        </div>
        <div className="flex items-center gap-3">
          {right}
          <ChevronDown
            className={cn("h-4 w-4 text-ink-300 transition-transform", open && "rotate-180")}
          />
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-white/5">
          <div className="pt-5 space-y-4">{children}</div>
        </div>
      )}
    </div>
  );
}
