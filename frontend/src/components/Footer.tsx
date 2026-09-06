import { Github } from "lucide-react";

export function Footer({ repoUrl, version }: { repoUrl?: string; version: string }) {
  return (
    <footer className="mt-10 border-t border-white/5 py-6 text-xs text-ink-400">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <span>
            <span className="text-ink-200 font-medium">Raj Studio</span>{" "}
            <span className="text-ink-500">v{version}</span>
          </span>
          <span className="hidden sm:inline text-ink-600">·</span>
          <span>
            Developed by <span className="text-ink-100 font-medium">Rajeshwar Singh</span>
          </span>
          <span className="hidden sm:inline text-ink-600">·</span>
          <span>Powered by ACE-Step V1.5</span>
        </div>
        {repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-ink-100 transition"
          >
            <Github className="h-3.5 w-3.5" />
            <span>Source</span>
          </a>
        )}
      </div>
    </footer>
  );
}
