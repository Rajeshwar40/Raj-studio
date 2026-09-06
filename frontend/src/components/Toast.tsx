import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Kind = "success" | "error" | "warning" | "info";
interface Toast {
  id: number;
  kind: Kind;
  title: string;
  description?: string;
  timeoutMs?: number;
}

interface Ctx {
  push: (t: Omit<Toast, "id">) => number;
  success: (title: string, description?: string) => number;
  error: (title: string, description?: string) => number;
  warning: (title: string, description?: string) => number;
  info: (title: string, description?: string) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<Ctx | null>(null);

const KIND_META: Record<Kind, { icon: typeof CheckCircle2; ring: string; text: string }> = {
  success: { icon: CheckCircle2, ring: "border-emerald-500/40", text: "text-emerald-300" },
  error: { icon: XCircle, ring: "border-rose-500/40", text: "text-rose-300" },
  warning: { icon: AlertTriangle, ring: "border-amber-500/40", text: "text-amber-300" },
  info: { icon: Info, ring: "border-brand-500/40", text: "text-brand-300" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">): number => {
      const id = nextId.current++;
      const toast: Toast = { id, timeoutMs: 5000, ...t };
      setItems((prev) => [...prev, toast]);
      if (toast.timeoutMs && toast.timeoutMs > 0) {
        window.setTimeout(() => dismiss(id), toast.timeoutMs);
      }
      return id;
    },
    [dismiss],
  );

  const ctx = useMemo<Ctx>(
    () => ({
      push,
      success: (title, description) => push({ kind: "success", title, description }),
      error: (title, description) => push({ kind: "error", title, description, timeoutMs: 7000 }),
      warning: (title, description) => push({ kind: "warning", title, description }),
      info: (title, description) => push({ kind: "info", title, description }),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
        role="region"
        aria-live="polite"
      >
        {items.map((t) => {
          const Meta = KIND_META[t.kind];
          const Icon = Meta.icon;
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto w-full max-w-sm rounded-2xl bg-ink-850/95 backdrop-blur border shadow-card px-4 py-3",
                Meta.ring,
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("h-5 w-5 shrink-0", Meta.text)} aria-hidden />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink-100">{t.title}</div>
                  {t.description && (
                    <div className="text-xs text-ink-300 mt-0.5 break-words">{t.description}</div>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-ink-400 hover:text-ink-100 transition"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
