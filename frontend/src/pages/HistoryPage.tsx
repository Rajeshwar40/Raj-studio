import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, Music4, RefreshCcw, Sparkles, Trash2 } from "lucide-react";
import { useHistory } from "@/hooks/useHistory";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/components/Toast";
import { AudioPlayer } from "@/components/AudioPlayer";
import { audioUrl } from "@/api/client";
import { cn } from "@/lib/cn";
import { fmtDate, fmtDuration, safeFilename, truncate } from "@/lib/format";

export function HistoryPage() {
  const { history, remove, clear } = useHistory();
  const { clientOpts } = useSettings();
  const toast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);

  if (history.length === 0) {
    return (
      <EmptyState
        title="No history yet"
        message="Every generation you run will be listed here for quick playback and reuse."
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 lg:py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-brand-400 font-semibold">
            Raj Studio · History
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-ink-100">Your generations</h1>
          <p className="text-sm text-ink-400 mt-1">
            Stored locally in your browser. Nothing is uploaded to a server.
          </p>
        </div>
        <div>
          {confirmClear ? (
            <div className="flex gap-2">
              <button
                className="btn-secondary h-9"
                onClick={() => setConfirmClear(false)}
              >
                Cancel
              </button>
              <button
                className="btn h-9 bg-rose-500 text-white hover:brightness-110"
                onClick={() => {
                  clear();
                  setConfirmClear(false);
                  toast.info("History cleared");
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span>Confirm clear</span>
              </button>
            </div>
          ) : (
            <button className="btn-secondary h-9" onClick={() => setConfirmClear(true)}>
              <Trash2 className="h-4 w-4" />
              <span>Clear history</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {history.map((h) => {
          const first = h.items[0];
          const url = first?.file ? audioUrl(clientOpts, first.file) : "";
          return (
            <div key={h.id} className="card p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-ink-100 truncate">{h.title}</div>
                    <span
                      className={cn(
                        "chip",
                        h.status === "succeeded"
                          ? "border-emerald-500/40 text-emerald-300"
                          : "border-rose-500/40 text-rose-300",
                      )}
                    >
                      {h.status}
                    </span>
                  </div>
                  <div className="text-xs text-ink-400 mt-1">
                    {fmtDate(h.createdAt)} · task{" "}
                    <span className="font-mono text-ink-300">{h.id.slice(0, 8)}…</span>
                  </div>
                  <div className="text-xs text-ink-300 mt-1 truncate">
                    {truncate(h.request.prompt || h.request.lyrics || "", 160)}
                  </div>
                  {h.error && (
                    <div className="text-xs text-rose-300 mt-2">{h.error}</div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    to="/"
                    className="btn-secondary h-9"
                    onClick={() => {
                      // no-op nav; Studio reads history via context if needed
                    }}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    <span>Open in Studio</span>
                  </Link>
                  <button
                    onClick={() => {
                      remove(h.id);
                      toast.info("Removed from history");
                    }}
                    className="btn-ghost h-9"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {url && (
                <div className="mt-4 grid gap-3">
                  <AudioPlayer src={url} />
                  <div className="flex gap-2 flex-wrap">
                    {h.items.map((it, idx) => (
                      <a
                        key={`${h.id}-${idx}`}
                        href={audioUrl(clientOpts, it.file)}
                        download={safeFilename(`${h.title}-${idx + 1}.${(/\.([a-z0-9]+)(\?|$)/i.exec(it.file)?.[1]) || "mp3"}`)}
                        className="btn-secondary h-9"
                      >
                        <Download className="h-4 w-4" />
                        <span>
                          Track {idx + 1}
                          {it.metas?.duration ? ` · ${fmtDuration(it.metas.duration)}` : ""}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
      <div className="card p-12 text-center flex flex-col items-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-brand-gradient grid place-items-center shadow-glow">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div className="text-lg font-semibold text-ink-100">{title}</div>
        <div className="text-sm text-ink-400 max-w-md">{message}</div>
        <Link to="/" className="btn-primary h-10 px-5 mt-2">
          <Music4 className="h-4 w-4" />
          Open Studio
        </Link>
      </div>
    </div>
  );
}
