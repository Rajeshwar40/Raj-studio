import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useBackendStatus } from "@/hooks/useBackendStatus";

export function StatusPill({ className }: { className?: string }) {
  const { status, health, error, refresh } = useBackendStatus();

  const meta = (() => {
    if (status === "online") {
      return {
        Icon: CheckCircle2,
        text: "Connected",
        dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]",
        color: "text-emerald-300",
        border: "border-emerald-500/30",
      };
    }
    if (status === "checking") {
      return {
        Icon: Loader2,
        text: "Checking…",
        dot: "bg-brand-400 animate-pulse",
        color: "text-brand-300",
        border: "border-brand-500/30",
      };
    }
    return {
      Icon: AlertCircle,
      text: "Offline",
      dot: "bg-rose-400",
      color: "text-rose-300",
      border: "border-rose-500/30",
    };
  })();

  const modelLine = health?.loaded_model ? `Model: ${health.loaded_model}` : "";
  const title = status === "offline"
    ? `Backend offline${error ? ` — ${error}` : ""}. Click to retry.`
    : modelLine || undefined;

  return (
    <button
      type="button"
      onClick={refresh}
      title={title}
      className={cn(
        "chip cursor-pointer",
        meta.color,
        meta.border,
        "hover:brightness-125 transition",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      <meta.Icon className={cn("h-3.5 w-3.5", status === "checking" && "animate-spin")} />
      <span>{meta.text}</span>
    </button>
  );
}
