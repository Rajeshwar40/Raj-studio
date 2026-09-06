/**
 * Central API client for the ACE-Step FastAPI backend.
 *
 * Uses the browser `fetch` API — no heavy HTTP dependencies. Base URL is read
 * from the runtime settings store (which falls back to VITE_API_URL). API keys
 * are optional and only sent when the user configures one.
 */
import type {
  ApiEnvelope,
  FormatInputResponse,
  GenerateMusicRequest,
  HealthPayload,
  ModelInventory,
  QueryResultEntry,
  QueryResultItem,
  RandomSamplePayload,
  ReleaseTaskResponse,
} from "@/types/api";

export interface ClientOptions {
  baseUrl: string;
  apiKey?: string;
  /** Milliseconds. Defaults to 20s for regular endpoints. */
  timeoutMs?: number;
}

export class ApiError extends Error {
  status: number;
  code?: number;
  detail?: unknown;
  constructor(message: string, status: number, code?: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function headers(opts: ClientOptions, extra?: Record<string, string>): HeadersInit {
  const h: Record<string, string> = { ...(extra || {}) };
  if (opts.apiKey) h["Authorization"] = `Bearer ${opts.apiKey}`;
  return h;
}

async function request<T>(
  opts: ClientOptions,
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const t = window.setTimeout(
    () => controller.abort(),
    init.timeoutMs ?? opts.timeoutMs ?? 20_000,
  );
  let res: Response;
  try {
    res = await fetch(joinUrl(opts.baseUrl, path), {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ApiError("Request timed out", 0);
    }
    throw new ApiError(
      `Network error: ${(err as Error).message || "unknown"}`,
      0,
      undefined,
      err,
    );
  } finally {
    window.clearTimeout(t);
  }

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    const message =
      (isJson && (body?.error || body?.detail || body?.message)) ||
      (typeof body === "string" && body) ||
      `HTTP ${res.status}`;
    throw new ApiError(String(message), res.status, undefined, body);
  }

  // Envelope endpoints wrap the payload as {data, code, error, ...}.
  if (isJson && body && typeof body === "object" && "data" in body && "code" in body) {
    const env = body as ApiEnvelope<T>;
    if (env.code && env.code !== 200) {
      throw new ApiError(env.error || `API returned code ${env.code}`, 200, env.code, env);
    }
    return env.data;
  }
  return body as T;
}

/** Parse the JSON-encoded string in QueryResultEntry.result. */
export function parseResultString(raw: string | null | undefined): QueryResultItem[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as QueryResultItem[]) : [];
  } catch {
    return [];
  }
}

/** Build a browser-loadable URL for an audio file returned by the backend. */
export function audioUrl(
  opts: ClientOptions,
  filePathOrUrl: string,
): string {
  if (!filePathOrUrl) return "";
  if (/^https?:\/\//i.test(filePathOrUrl)) return filePathOrUrl;
  // Backend already returns "/v1/audio?path=..." for local files
  if (filePathOrUrl.startsWith("/")) return joinUrl(opts.baseUrl, filePathOrUrl);
  return joinUrl(opts.baseUrl, `/v1/audio?path=${encodeURIComponent(filePathOrUrl)}`);
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

export const api = {
  async health(opts: ClientOptions): Promise<HealthPayload> {
    return request<HealthPayload>(opts, "/health", {
      method: "GET",
      headers: headers(opts),
      timeoutMs: 6_000,
    });
  },

  async models(opts: ClientOptions): Promise<ModelInventory> {
    return request<ModelInventory>(opts, "/v1/models", {
      method: "GET",
      headers: headers(opts),
      timeoutMs: 10_000,
    });
  },

  async randomSample(
    opts: ClientOptions,
    sampleType: "simple_mode" | "custom_mode" = "custom_mode",
  ): Promise<RandomSamplePayload> {
    return request<RandomSamplePayload>(opts, "/create_random_sample", {
      method: "POST",
      headers: headers(opts, { "Content-Type": "application/json" }),
      body: JSON.stringify({ sample_type: sampleType }),
      timeoutMs: 10_000,
    });
  },

  /**
   * Create a full song sample from a free-text description using the 5Hz LM.
   * Simple-mode "Click Me" in Gradio → POST /v1/create_sample.
   */
  async createSample(
    opts: ClientOptions,
    payload: {
      query: string;
      instrumental?: boolean;
      vocal_language?: string;
      temperature?: number;
    },
  ): Promise<{
    caption: string;
    lyrics: string;
    bpm?: number | null;
    key_scale?: string;
    time_signature?: string;
    duration?: number | null;
    vocal_language?: string;
  }> {
    return request(opts, "/v1/create_sample", {
      method: "POST",
      headers: headers(opts, { "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
      timeoutMs: 180_000,
    });
  },

  async formatInput(
    opts: ClientOptions,
    payload: {
      prompt: string;
      lyrics: string;
      temperature?: number;
      param_obj?: Record<string, unknown>;
    },
  ): Promise<FormatInputResponse> {
    return request<FormatInputResponse>(opts, "/format_input", {
      method: "POST",
      headers: headers(opts, { "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
      timeoutMs: 120_000,
    });
  },

  /** Submit a JSON generation job. */
  async releaseTaskJson(
    opts: ClientOptions,
    payload: GenerateMusicRequest,
  ): Promise<ReleaseTaskResponse> {
    return request<ReleaseTaskResponse>(opts, "/release_task", {
      method: "POST",
      headers: headers(opts, { "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
      timeoutMs: 30_000,
    });
  },

  /**
   * Submit a generation job as multipart/form-data — used when an audio file
   * needs to be uploaded (reference_audio / src_audio for cover / repaint).
   */
  async releaseTaskMultipart(
    opts: ClientOptions,
    payload: GenerateMusicRequest,
    files: { reference_audio?: File | null; src_audio?: File | null } = {},
  ): Promise<ReleaseTaskResponse> {
    const form = new FormData();
    // Backend RequestParser accepts flat form fields; JSON-encode complex ones.
    for (const [k, v] of Object.entries(payload)) {
      if (v === undefined || v === null) continue;
      if (typeof v === "object") {
        form.append(k, JSON.stringify(v));
      } else if (typeof v === "boolean") {
        form.append(k, v ? "true" : "false");
      } else {
        form.append(k, String(v));
      }
    }
    if (files.reference_audio) form.append("reference_audio", files.reference_audio);
    if (files.src_audio) form.append("src_audio", files.src_audio);

    return request<ReleaseTaskResponse>(opts, "/release_task", {
      method: "POST",
      headers: headers(opts), // let the browser set the multipart boundary
      body: form,
      timeoutMs: 120_000,
    });
  },

  async queryResult(
    opts: ClientOptions,
    taskIds: string[],
  ): Promise<QueryResultEntry[]> {
    return request<QueryResultEntry[]>(opts, "/query_result", {
      method: "POST",
      headers: headers(opts, { "Content-Type": "application/json" }),
      body: JSON.stringify({ task_id_list: taskIds }),
      timeoutMs: 15_000,
    });
  },
};

/**
 * Poll /query_result until the given task reaches a terminal state.
 * Terminal statuses from server_utils.STATUS_MAP: 1 = succeeded, 2 = failed.
 *
 * NB: There is no server-side cancel endpoint. Callers that need to bail out
 * should abort via the AbortSignal — polling stops and the task keeps running
 * server-side. This limitation is surfaced to the user in the Studio UI.
 */
export async function pollTask(
  opts: ClientOptions,
  taskId: string,
  {
    intervalMs = 1500,
    onUpdate,
    signal,
  }: {
    intervalMs?: number;
    onUpdate?: (entry: QueryResultEntry, items: QueryResultItem[]) => void;
    signal?: AbortSignal;
  } = {},
): Promise<{ entry: QueryResultEntry; items: QueryResultItem[] }> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal?.aborted) throw new ApiError("Polling aborted by client", 0);
    const list = await api.queryResult(opts, [taskId]);
    const entry = list[0];
    if (!entry) {
      throw new ApiError("Task not found", 404);
    }
    const items = parseResultString(entry.result);
    onUpdate?.(entry, items);
    if (entry.status === 1) {
      return { entry, items };
    }
    if (entry.status === 2) {
      const errMsg =
        (items[0]?.error as string | null | undefined) ||
        entry.progress_text ||
        "Generation failed";
      throw new ApiError(errMsg, 200);
    }
    await new Promise<void>((resolve, reject) => {
      const t = window.setTimeout(resolve, intervalMs);
      if (signal) {
        signal.addEventListener(
          "abort",
          () => {
            window.clearTimeout(t);
            reject(new ApiError("Polling aborted by client", 0));
          },
          { once: true },
        );
      }
    });
  }
}
