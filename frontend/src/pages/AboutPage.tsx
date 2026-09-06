import { Github, Sparkles } from "lucide-react";
import { APP_NAME, APP_VERSION, AUTHOR, REPO_URL } from "@/lib/constants";
import { useBackendStatus } from "@/hooks/useBackendStatus";

export function AboutPage() {
  const { health, status } = useBackendStatus(30_000);
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 lg:py-8">
      <div className="text-xs uppercase tracking-[0.2em] text-brand-400 font-semibold">
        Raj Studio · About
      </div>
      <h1 className="text-2xl sm:text-3xl font-semibold text-ink-100">
        {APP_NAME} <span className="text-ink-500 text-lg align-middle">v{APP_VERSION}</span>
      </h1>

      <div className="mt-6 card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-gradient shadow-glow grid place-items-center shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="text-sm text-ink-200 leading-relaxed">
            {APP_NAME} is a modern web studio for the ACE-Step V1.5 music generation model.
            It talks to a local (or self-hosted) FastAPI backend to submit generation jobs,
            stream progress, and manage the resulting audio.
          </div>
        </div>
        <div className="text-sm text-ink-300">
          <div>
            Developed by{" "}
            <span className="text-ink-100 font-semibold">{AUTHOR}</span>.
          </div>
          <div>
            Powered by{" "}
            <a
              href="https://github.com/woct0rdho/ACE-Step-v1.5"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-300 hover:text-brand-200 underline underline-offset-4"
            >
              ACE-Step V1.5
            </a>
            .
          </div>
        </div>
        {REPO_URL && (
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary h-9 w-fit"
          >
            <Github className="h-4 w-4" />
            <span>Source repository</span>
          </a>
        )}
      </div>

      <div className="mt-6 card p-6 space-y-3">
        <div className="text-sm font-semibold text-ink-100">Backend</div>
        <ul className="text-sm text-ink-300 space-y-1">
          <li>
            Status: <span className="capitalize text-ink-200">{status}</span>
          </li>
          <li>
            Service:{" "}
            <span className="text-ink-200 font-mono">
              {health?.service || "—"} {health?.version ? `v${health.version}` : ""}
            </span>
          </li>
          <li>
            Loaded DiT:{" "}
            <span className="text-ink-200 font-mono">{health?.loaded_model || "—"}</span>
          </li>
          <li>
            Loaded LM:{" "}
            <span className="text-ink-200 font-mono">{health?.loaded_lm_model || "—"}</span>
          </li>
        </ul>
      </div>

      <div className="mt-6 card p-6">
        <div className="text-sm font-semibold text-ink-100">Notes & limitations</div>
        <ul className="mt-2 text-sm text-ink-300 space-y-2 list-disc pl-5">
          <li>
            <span className="text-ink-200 font-medium">No server-side cancel:</span> the ACE-Step
            backend has no cancel endpoint. "Stop watching" only stops the browser from polling —
            the job may still finish on the server.
          </li>
          <li>
            <span className="text-ink-200 font-medium">Local-only history:</span> projects, history
            and library are stored in this browser (<code>localStorage</code>). They are lost when
            you clear site data.
          </li>
          <li>
            <span className="text-ink-200 font-medium">LLM features:</span> Enhance-input and
            thinking-mode need the 5Hz LM. If it is not loaded, the backend returns an error
            explaining how to enable it.
          </li>
        </ul>
      </div>
    </div>
  );
}
