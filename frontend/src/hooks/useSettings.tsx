import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AudioFormat } from "@/types/api";
import type { ClientOptions } from "@/api/client";

export interface Settings {
  baseUrl: string;
  apiKey: string;
  defaultFormat: AudioFormat;
  defaultInferenceSteps: number;
  defaultGuidanceScale: number;
  defaultDuration: number;
  keepHistory: boolean;
}

const DEFAULT_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  "http://127.0.0.1:8001";
const DEFAULT_API_KEY = (import.meta.env.VITE_API_KEY as string | undefined) || "";

const DEFAULTS: Settings = {
  baseUrl: DEFAULT_BASE_URL,
  apiKey: DEFAULT_API_KEY,
  defaultFormat: "mp3",
  defaultInferenceSteps: 27,
  defaultGuidanceScale: 7.0,
  defaultDuration: 60,
  keepHistory: true,
};

const STORAGE_KEY = "raj-studio/settings/v1";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  clientOpts: ClientOptions;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage may be blocked; non-fatal */
    }
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);
  const reset = useCallback(() => setSettings(DEFAULTS), []);

  const clientOpts = useMemo<ClientOptions>(
    () => ({
      baseUrl: settings.baseUrl.trim() || DEFAULT_BASE_URL,
      apiKey: settings.apiKey.trim() || undefined,
    }),
    [settings.baseUrl, settings.apiKey],
  );

  return (
    <SettingsContext.Provider value={{ settings, update, reset, clientOpts }}>
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
