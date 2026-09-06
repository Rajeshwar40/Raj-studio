import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { GenerateMusicRequest, QueryResultItem } from "@/types/api";

export interface HistoryEntry {
  id: string;              // task_id from backend
  title: string;
  createdAt: number;       // ms epoch
  request: GenerateMusicRequest;
  items: QueryResultItem[];
  /** file paths as returned by the backend (relative to API base URL) */
  filePaths: string[];
  status: "succeeded" | "failed";
  error?: string;
}

const STORAGE_KEY = "raj-studio/history/v1";
const MAX_ENTRIES = 100;

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

interface Ctx {
  history: HistoryEntry[];
  add: (entry: HistoryEntry) => void;
  remove: (id: string) => void;
  clear: () => void;
  get: (id: string) => HistoryEntry | undefined;
}

const HistoryContext = createContext<Ctx | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      /* ignore quota errors */
    }
  }, [history]);

  const add = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      const filtered = prev.filter((e) => e.id !== entry.id);
      const next = [entry, ...filtered];
      return next.slice(0, MAX_ENTRIES);
    });
  }, []);
  const remove = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);
  const clear = useCallback(() => setHistory([]), []);
  const get = useCallback(
    (id: string) => history.find((e) => e.id === id),
    [history],
  );

  return (
    <HistoryContext.Provider value={{ history, add, remove, clear, get }}>
      {children}
    </HistoryContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHistory(): Ctx {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
}
