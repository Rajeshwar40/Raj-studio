import { useState } from "react";
import { Search } from "lucide-react";
import { useHistory } from "@/hooks/useHistory";
import { useSettings } from "@/hooks/useSettings";
import { ResultCard } from "./StudioPage";
import { EmptyState } from "./HistoryPage";

export function LibraryPage() {
  const { history } = useHistory();
  const { clientOpts } = useSettings();
  const [query, setQuery] = useState("");

  const tracks = history.flatMap((h) =>
    h.items.map((it, idx) => ({
      key: `${h.id}-${idx}`,
      title: `${h.title}${h.items.length > 1 ? ` · take ${idx + 1}` : ""}`,
      item: it,
      request: h.request,
      when: h.createdAt,
    })),
  );

  if (tracks.length === 0) {
    return (
      <EmptyState
        title="Your Audio Library is empty"
        message="Successful generations will appear here as playable tracks. Files stay on the backend; the library indexes them locally."
      />
    );
  }

  const filtered = query.trim()
    ? tracks.filter((t) =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        (t.request.prompt || "").toLowerCase().includes(query.toLowerCase()),
      )
    : tracks;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 lg:py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-brand-400 font-semibold">
            Raj Studio · Library
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-ink-100">Audio library</h1>
          <p className="text-sm text-ink-400 mt-1">
            All the tracks you've generated with this browser.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search title or prompt"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {filtered.map((t) => (
          <ResultCard
            key={t.key}
            baseUrl={clientOpts.baseUrl}
            title={t.title}
            item={t.item}
            request={t.request}
            compact
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-sm text-ink-400 mt-6 text-center">No matches.</div>
      )}
    </div>
  );
}
