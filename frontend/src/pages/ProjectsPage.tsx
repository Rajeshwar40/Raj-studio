import { Link } from "react-router-dom";
import { CalendarDays, Music4 } from "lucide-react";
import { useHistory } from "@/hooks/useHistory";
import { fmtDate, truncate } from "@/lib/format";
import { EmptyState } from "./HistoryPage";

/** Projects = grouped view of history by title; strictly local to the browser. */
export function ProjectsPage() {
  const { history } = useHistory();

  const groups = new Map<
    string,
    { title: string; count: number; latestAt: number; sampleId: string }
  >();
  for (const h of history) {
    const key = (h.title || "Untitled").trim();
    const prev = groups.get(key);
    if (prev) {
      prev.count += 1;
      if (h.createdAt > prev.latestAt) {
        prev.latestAt = h.createdAt;
        prev.sampleId = h.id;
      }
    } else {
      groups.set(key, { title: key, count: 1, latestAt: h.createdAt, sampleId: h.id });
    }
  }
  const rows = Array.from(groups.values()).sort((a, b) => b.latestAt - a.latestAt);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        message="Generate a track and give it a title — projects group your related runs together automatically."
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 lg:py-8">
      <div className="text-xs uppercase tracking-[0.2em] text-brand-400 font-semibold">
        Raj Studio · Projects
      </div>
      <h1 className="text-2xl sm:text-3xl font-semibold text-ink-100">Projects</h1>
      <p className="text-sm text-ink-400 mt-1">
        Grouped by project title. Backed by your browser's local storage.
      </p>

      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((p) => (
          <div key={p.title} className="card p-5 hover:brightness-110 transition">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-base font-semibold text-ink-100 truncate">
                  {truncate(p.title, 46)}
                </div>
                <div className="text-xs text-ink-400 mt-1 flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {fmtDate(p.latestAt)}
                </div>
              </div>
              <span className="chip">{p.count} run{p.count > 1 ? "s" : ""}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Link to="/history" className="btn-secondary h-8 text-xs">
                View runs
              </Link>
              <Link to="/" className="btn-ghost h-8 text-xs">
                <Music4 className="h-3.5 w-3.5" /> New run
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
