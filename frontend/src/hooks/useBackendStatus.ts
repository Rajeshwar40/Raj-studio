import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/api/client";
import { useSettings } from "@/hooks/useSettings";
import type { HealthPayload } from "@/types/api";

export type BackendStatus = "checking" | "online" | "offline";

interface Result {
  status: BackendStatus;
  health: HealthPayload | null;
  error: string | null;
  refresh: () => void;
  lastCheckedAt: number | null;
}

/** Periodically probe /health so the header dot reflects real state. */
export function useBackendStatus(intervalMs = 15_000): Result {
  const { clientOpts } = useSettings();
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const check = useCallback(async () => {
    inFlight.current?.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;
    setStatus((s) => (s === "online" ? s : "checking"));
    try {
      const payload = await api.health(clientOpts);
      if (ctrl.signal.aborted) return;
      setHealth(payload);
      setStatus("online");
      setError(null);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setError(msg);
      setStatus("offline");
    } finally {
      setLastCheckedAt(Date.now());
    }
  }, [clientOpts]);

  useEffect(() => {
    check();
    const t = window.setInterval(check, intervalMs);
    return () => {
      window.clearInterval(t);
      inFlight.current?.abort();
    };
  }, [check, intervalMs]);

  return { status, health, error, refresh: check, lastCheckedAt };
}
