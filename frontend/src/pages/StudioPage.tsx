import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban, ChevronRight, Clock, Download, HelpCircle, Loader2, Music4, RefreshCcw,
  RotateCcw, Search, Sparkles, Wand2,
} from "lucide-react";
import { api, ApiError, audioUrl, pollTask } from "@/api/client";
import { useSettings } from "@/hooks/useSettings";
import { useHistory } from "@/hooks/useHistory";
import { useToast } from "@/components/Toast";
import { AudioPlayer } from "@/components/AudioPlayer";
import { HeroBanner } from "@/components/HeroBanner";
import { AudioSlot } from "@/components/AudioSlot";
import {
  ModeSelector, modeIsSimple, modeNeedsSourceAudio, modeToTaskType,
  type GenerationMode,
} from "@/components/ModeSelector";
import { Collapsible } from "@/components/ui/Collapsible";
import { AutoBadge } from "@/components/ui/AutoBadge";
import {
  NumberField, SelectField, Switch, TextArea, TextField,
} from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { fmtDate, fmtDuration, safeFilename, truncate } from "@/lib/format";
import {
  AUDIO_FORMATS, KEY_SCALES, TIME_SIGNATURES, VOCAL_LANGUAGES,
} from "@/lib/constants";
import type {
  AudioFormat, GenerateMusicRequest, QueryResultEntry, QueryResultItem,
} from "@/types/api";

/* -------------------------------------------------------------------------- */
/* Form state                                                                 */
/* -------------------------------------------------------------------------- */

interface FormState {
  title: string;
  simpleQuery: string;               // Simple mode: description used by /v1/create_sample
  prompt: string;
  negative_prompt: string;
  lyrics: string;
  vocal_language: string;
  instrumental: boolean;
  bpm: string;
  key_scale: string;
  time_signature: string;
  audio_duration: string;
  batch_size: string;
  inference_steps: string;
  guidance_scale: string;
  seed: string;
  use_random_seed: boolean;
  audio_format: AudioFormat;
  // LM Code Hints
  thinking: boolean;
  auto_gen: boolean;                 // sample_mode
  use_format: boolean;
  hint_retake: boolean;
  hint_edit: boolean;
  // Remix / repaint
  audio_cover_strength: string;
  cover_noise_strength: string;
  repainting_start: string;
  repainting_end: string;
  repaint_mode: "conservative" | "balanced" | "aggressive";
  repaint_strength: string;
  // Advanced
  cfg_interval_start: string;
  cfg_interval_end: string;
  shift: string;
  use_adg: boolean;
  infer_method: "ode" | "sde";
  use_tiled_decode: boolean;
}

const DEFAULTS: FormState = {
  title: "",
  simpleQuery: "",
  prompt: "",
  negative_prompt: "",
  lyrics: "",
  vocal_language: "unknown",
  instrumental: false,
  bpm: "",
  key_scale: "",
  time_signature: "",
  audio_duration: "",
  batch_size: "1",
  inference_steps: "27",
  guidance_scale: "7.0",
  seed: "-1",
  use_random_seed: true,
  audio_format: "mp3",
  thinking: false,
  auto_gen: false,
  use_format: false,
  hint_retake: false,
  hint_edit: false,
  audio_cover_strength: "1.0",
  cover_noise_strength: "0.0",
  repainting_start: "0.0",
  repainting_end: "",
  repaint_mode: "balanced",
  repaint_strength: "0.5",
  cfg_interval_start: "0.0",
  cfg_interval_end: "1.0",
  shift: "3.0",
  use_adg: false,
  infer_method: "ode",
  use_tiled_decode: true,
};

function toRequest(
  f: FormState,
  mode: GenerationMode,
  refPath: string | null,
  srcPath: string | null,
  extra?: Partial<GenerateMusicRequest>,
): GenerateMusicRequest {
  const num = (v: string): number | undefined => {
    const t = v.trim();
    if (t === "") return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  };
  const isSimple = modeIsSimple(mode);
  const req: GenerateMusicRequest = {
    prompt: f.prompt.trim(),
    lyrics: f.instrumental ? "[instrumental]" : f.lyrics,
    lm_negative_prompt: f.negative_prompt.trim() || undefined,
    task_type: modeToTaskType(mode),
    vocal_language: f.instrumental ? "instrumental" : f.vocal_language,
    bpm: num(f.bpm) ?? null,
    key_scale: f.key_scale.trim(),
    time_signature: f.time_signature.trim(),
    audio_duration: num(f.audio_duration) ?? null,
    batch_size: num(f.batch_size) ?? 1,
    inference_steps: num(f.inference_steps) ?? 27,
    guidance_scale: num(f.guidance_scale) ?? 7,
    use_random_seed: f.use_random_seed,
    seed: f.use_random_seed ? -1 : (num(f.seed) ?? -1),
    audio_format: f.audio_format,
    thinking: f.thinking,
    // AutoGen == sample_mode; when on, LM fills in caption/lyrics/metas.
    sample_mode: isSimple || f.auto_gen,
    sample_query: isSimple ? f.simpleQuery.trim() : "",
    use_format: f.use_format,
    audio_cover_strength: num(f.audio_cover_strength),
    cover_noise_strength: num(f.cover_noise_strength),
    repainting_start: num(f.repainting_start),
    repainting_end: num(f.repainting_end) ?? null,
    repaint_mode: f.repaint_mode,
    repaint_strength: num(f.repaint_strength),
    cfg_interval_start: num(f.cfg_interval_start),
    cfg_interval_end: num(f.cfg_interval_end),
    shift: num(f.shift),
    use_adg: f.use_adg,
    infer_method: f.infer_method,
    use_tiled_decode: f.use_tiled_decode,
  };
  if (refPath) req.reference_audio_path = refPath;
  if (srcPath) req.src_audio_path = srcPath;
  return { ...req, ...extra };
}

function validate(f: FormState, mode: GenerationMode, hasSrcFile: boolean): string | null {
  if (modeIsSimple(mode)) {
    if (!f.simpleQuery.trim()) return "Describe the song you want in Simple mode.";
    return null;
  }
  if (!f.prompt.trim() && !f.lyrics.trim() && mode === "custom") {
    return "Provide a music style prompt or lyrics (or both).";
  }
  const d = f.audio_duration.trim() === "" ? NaN : Number(f.audio_duration);
  if (!Number.isNaN(d) && (!Number.isFinite(d) || d <= 0 || d > 600)) {
    return "Duration must be blank (auto) or between 1 and 600 seconds.";
  }
  const steps = Number(f.inference_steps);
  if (!Number.isFinite(steps) || steps < 1 || steps > 200) {
    return "Inference steps must be between 1 and 200.";
  }
  const g = Number(f.guidance_scale);
  if (!Number.isFinite(g) || g < 0 || g > 30) {
    return "Guidance scale must be between 0 and 30.";
  }
  if (modeNeedsSourceAudio(mode) && !hasSrcFile) {
    return "This mode requires uploading source audio.";
  }
  return null;
}

interface GenerationState {
  taskId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  progressPct: number;
  stage: string;
  progressText: string;
  startedAt: number;
  elapsedMs: number;
  items: QueryResultItem[];
  error?: string;
  kind: "generate" | "analyze";
}

/* -------------------------------------------------------------------------- */
/* Studio page                                                                */
/* -------------------------------------------------------------------------- */

export function StudioPage() {
  const { settings, clientOpts } = useSettings();
  const history = useHistory();
  const toast = useToast();

  const [mode, setMode] = useState<GenerationMode>("custom");
  const [form, setForm] = useState<FormState>(() => ({
    ...DEFAULTS,
    audio_format: settings.defaultFormat,
    inference_steps: String(settings.defaultInferenceSteps),
    guidance_scale: String(settings.defaultGuidanceScale),
  }));
  const [refFile, setRefFile] = useState<File | null>(null);
  const [srcFile, setSrcFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<null | "generate" | "sample" | "enhanceCaption" | "enhanceLyrics" | "createSample" | "analyze">(null);
  const [gen, setGen] = useState<GenerationState | null>(null);
  const [savedResults, setSavedResults] = useState<
    { title: string; entry: QueryResultEntry | null; items: QueryResultItem[]; taskId: string; request: GenerateMusicRequest }[]
  >([]);
  const [analysisText, setAnalysisText] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!gen || (gen.status !== "queued" && gen.status !== "running")) return;
    timerRef.current = window.setInterval(() => {
      setGen((prev) => (prev ? { ...prev, elapsedMs: Date.now() - prev.startedAt } : prev));
    }, 250);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [gen]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const patch = (p: Partial<FormState>) => setForm((prev) => ({ ...prev, ...p }));

  const resetAllToAuto = () => {
    patch({
      bpm: "",
      key_scale: "",
      time_signature: "",
      audio_duration: "",
      vocal_language: "unknown",
    });
    toast.info("Reset to auto", "The backend will infer these values.");
  };

  const clearForm = () => {
    setForm({
      ...DEFAULTS,
      audio_format: settings.defaultFormat,
      inference_steps: String(settings.defaultInferenceSteps),
      guidance_scale: String(settings.defaultGuidanceScale),
    });
    setRefFile(null);
    setSrcFile(null);
    setAnalysisText(null);
  };

  /* ------- LLM-backed helpers ---------------------------------------------- */

  const requestRandomSample = async () => {
    setBusy("sample");
    try {
      const payload = await api.randomSample(clientOpts, mode === "simple" ? "simple_mode" : "custom_mode");
      patch({
        prompt: (payload.prompt as string) || form.prompt,
        lyrics: (payload.lyrics as string) || form.lyrics,
        bpm: payload.bpm != null ? String(payload.bpm) : form.bpm,
        key_scale: (payload.key_scale as string) || form.key_scale,
        time_signature: (payload.time_signature as string) || form.time_signature,
        vocal_language: (payload.vocal_language as string) || form.vocal_language,
        audio_duration: payload.audio_duration != null ? String(payload.audio_duration) : form.audio_duration,
        guidance_scale: payload.guidance_scale != null ? String(payload.guidance_scale) : form.guidance_scale,
        inference_steps: payload.inference_steps != null ? String(payload.inference_steps) : form.inference_steps,
      });
      toast.success("Sample loaded");
    } catch (e) {
      toast.error("Failed to load sample", e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const enhance = async (target: "caption" | "lyrics") => {
    setBusy(target === "caption" ? "enhanceCaption" : "enhanceLyrics");
    try {
      const res = await api.formatInput(clientOpts, {
        prompt: form.prompt,
        lyrics: form.lyrics,
        param_obj: {
          bpm: form.bpm ? Number(form.bpm) : undefined,
          key: form.key_scale || undefined,
          time_signature: form.time_signature || undefined,
          language: form.vocal_language,
          duration: form.audio_duration ? Number(form.audio_duration) : undefined,
        },
      });
      if (target === "caption") {
        patch({
          prompt: res.caption || form.prompt,
          bpm: res.bpm != null ? String(res.bpm) : form.bpm,
          key_scale: res.key_scale || form.key_scale,
          time_signature: res.time_signature || form.time_signature,
          vocal_language: res.vocal_language || form.vocal_language,
          audio_duration: res.duration ? String(res.duration) : form.audio_duration,
        });
        toast.success("Caption enhanced");
      } else {
        patch({ lyrics: res.lyrics || form.lyrics });
        toast.success("Lyrics enhanced");
      }
    } catch (e) {
      toast.error("Enhancement failed", e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const createSampleFromDescription = async () => {
    if (!form.simpleQuery.trim()) {
      toast.warning("Add a description", "Describe the song you want first.");
      return;
    }
    setBusy("createSample");
    try {
      const res = await api.createSample(clientOpts, {
        query: form.simpleQuery,
        instrumental: form.instrumental,
        vocal_language: form.vocal_language,
      });
      patch({
        prompt: res.caption || form.prompt,
        lyrics: res.lyrics || form.lyrics,
        bpm: res.bpm != null ? String(res.bpm) : form.bpm,
        key_scale: res.key_scale || form.key_scale,
        time_signature: res.time_signature || form.time_signature,
        vocal_language: res.vocal_language || form.vocal_language,
        audio_duration: res.duration ? String(res.duration) : form.audio_duration,
      });
      toast.success("Sample created", "Fields have been filled from your description.");
    } catch (e) {
      toast.error("Create sample failed", e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  /* ------- generate + analyze --------------------------------------------- */

  const submit = async (opts?: { analyze?: boolean; extractCodes?: boolean }) => {
    if (busy) return;
    const err = validate(form, mode, !!srcFile);
    if (err) { toast.warning("Cannot submit", err); return; }

    const kind: "generate" | "analyze" = opts?.analyze ? "analyze" : "generate";
    setBusy(kind === "analyze" ? "analyze" : "generate");
    setSavedResults([]);
    setAnalysisText(null);
    setGen(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const extras: Partial<GenerateMusicRequest> = {};
      if (opts?.analyze) extras.analysis_only = true;
      if (opts?.extractCodes) extras.extract_codes_only = true;
      const payload = toRequest(form, mode, null, null, extras);
      const hasFile = !!refFile || !!srcFile;
      const submitRes = hasFile
        ? await api.releaseTaskMultipart(clientOpts, payload, {
            reference_audio: refFile,
            src_audio: srcFile,
          })
        : await api.releaseTaskJson(clientOpts, payload);

      setGen({
        taskId: submitRes.task_id,
        status: "queued",
        progressPct: 0,
        stage: `queued (position ${submitRes.queue_position})`,
        progressText: kind === "analyze" ? "Queued: analysing source audio" : "Job queued on backend",
        startedAt: Date.now(),
        elapsedMs: 0,
        items: [],
        kind,
      });

      const { entry, items } = await pollTask(clientOpts, submitRes.task_id, {
        intervalMs: 1500,
        signal: ctrl.signal,
        onUpdate: (e, its) => {
          const first = its[0];
          setGen((prev) =>
            prev
              ? {
                  ...prev,
                  status:
                    e.status === 1 ? "succeeded"
                    : e.status === 2 ? "failed"
                    : first?.stage === "queued" ? "queued" : "running",
                  progressPct: typeof first?.progress === "number" ? Math.min(100, first!.progress! * 100) : prev.progressPct,
                  stage: first?.stage || (e.status === 0 ? "running" : prev.stage),
                  progressText: e.progress_text || prev.progressText,
                  items: its,
                }
              : prev,
          );
        },
      });

      if (kind === "analyze") {
        const first = items[0] as any;
        const analysisPayload = first?.analysis ?? first?.metas ?? first ?? null;
        setAnalysisText(
          typeof analysisPayload === "string"
            ? analysisPayload
            : JSON.stringify(analysisPayload, null, 2),
        );
        // If backend inferred metadata, splash it into the form.
        if (first?.metas) {
          const m = first.metas;
          patch({
            bpm: m.bpm != null ? String(m.bpm) : form.bpm,
            key_scale: m.keyscale || form.key_scale,
            time_signature: m.timesignature || form.time_signature,
            audio_duration: m.duration ? String(m.duration) : form.audio_duration,
          });
        }
        setGen((prev) => prev ? { ...prev, status: "succeeded", progressPct: 100, stage: "analysis done" } : prev);
        toast.success("Analysis complete");
        return;
      }

      const validItems = items.filter((it) => it.file);
      setGen((prev) => prev
        ? { ...prev, status: "succeeded", progressPct: 100, stage: "done", items: validItems.length ? validItems : items }
        : prev,
      );

      if (validItems.length === 0) {
        toast.warning("Generation returned no audio", "Backend reported success but did not include a file.");
      } else {
        toast.success("Generation complete", `${validItems.length} track${validItems.length > 1 ? "s" : ""} ready.`);
        if (settings.keepHistory) {
          history.add({
            id: submitRes.task_id,
            title: (form.title || truncate(form.prompt || form.simpleQuery, 60) || "Untitled").trim(),
            createdAt: Date.now(),
            request: payload,
            items: validItems,
            filePaths: validItems.map((it) => it.file),
            status: "succeeded",
          });
        }
        setSavedResults([{
          title: (form.title || truncate(form.prompt || form.simpleQuery, 60) || "Untitled").trim(),
          entry, items: validItems, taskId: submitRes.task_id, request: payload,
        }]);
      }
    } catch (e) {
      if ((e as ApiError).message === "Polling aborted by client") {
        setGen((prev) => prev ? { ...prev, status: "failed", error: "Cancelled by user" } : prev);
        toast.info("Cancelled", "Stopped watching this job. It may still finish on the server.");
      } else {
        const msg = e instanceof ApiError ? e.message : (e as Error).message;
        setGen((prev) => prev ? { ...prev, status: "failed", error: msg } : prev);
        toast.error(kind === "analyze" ? "Analysis failed" : "Generation failed", msg);
      }
    } finally {
      setBusy(null);
    }
  };

  const cancel = () => abortRef.current?.abort();

  const reuseSettings = (req: GenerateMusicRequest) => {
    patch({
      prompt: req.prompt || "",
      lyrics: req.lyrics === "[instrumental]" ? "" : (req.lyrics || ""),
      instrumental: req.lyrics === "[instrumental]",
      negative_prompt: req.lm_negative_prompt && req.lm_negative_prompt !== "NO USER INPUT" ? req.lm_negative_prompt : "",
      vocal_language: req.vocal_language || "unknown",
      bpm: req.bpm != null ? String(req.bpm) : "",
      key_scale: req.key_scale || "",
      time_signature: req.time_signature || "",
      audio_duration: req.audio_duration != null ? String(req.audio_duration) : "",
      batch_size: req.batch_size != null ? String(req.batch_size) : "1",
      inference_steps: req.inference_steps != null ? String(req.inference_steps) : "27",
      guidance_scale: req.guidance_scale != null ? String(req.guidance_scale) : "7.0",
      seed: req.seed != null ? String(req.seed) : "-1",
      use_random_seed: req.use_random_seed ?? true,
      audio_format: (req.audio_format as AudioFormat) || settings.defaultFormat,
    });
    toast.info("Settings reused");
  };

  const percent = gen?.progressPct ?? 0;
  const requiresLlm = form.thinking || form.use_format || form.auto_gen || mode === "simple";
  const isSimple = modeIsSimple(mode);
  const needsSource = modeNeedsSourceAudio(mode);

  return (
    <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 py-6 lg:py-8">
      <HeroBanner />

      <div className="mt-6 flex flex-col gap-3">
        <SectionLabel>Generation mode</SectionLabel>
        <ModeSelector value={mode} onChange={setMode} />
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        {/* Form column */}
        <div className="lg:col-span-2 space-y-5">

          {/* --- Simple mode: description input + Create Sample ------------- */}
          {isSimple && (
            <div className="card-interactive p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold text-ink-100">Describe your song</div>
                  <div className="text-xs text-ink-400 mt-0.5">
                    The 5Hz LM will draft caption, lyrics and metadata for you.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary h-9"
                  onClick={requestRandomSample}
                  disabled={!!busy}
                >
                  {busy === "sample" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span>Random idea</span>
                </button>
              </div>
              <TextArea
                placeholder="e.g. A melancholic lo-fi hip-hop beat with jazzy piano, rainy-night mood, female vocals in English"
                value={form.simpleQuery}
                onChange={(e) => patch({ simpleQuery: e.target.value })}
                rows={4}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn-primary h-10"
                  onClick={createSampleFromDescription}
                  disabled={!!busy || !form.simpleQuery.trim()}
                >
                  {busy === "createSample" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  <span>Create sample from description</span>
                </button>
                <label className="flex items-center gap-2 text-xs text-ink-300 cursor-pointer ml-auto">
                  <input
                    type="checkbox"
                    className="accent-brand-500"
                    checked={form.instrumental}
                    onChange={(e) => patch({ instrumental: e.target.checked })}
                  />
                  Instrumental
                </label>
              </div>
            </div>
          )}

          {/* --- Source Audio (Remix / Repaint) ---------------------------- */}
          {needsSource && (
            <div className="card-interactive p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-ink-100">Source audio</div>
                  <div className="text-xs text-ink-400 mt-0.5">
                    The track that will be {mode === "remix" ? "restyled" : "repainted"}.
                  </div>
                </div>
              </div>
              <AudioSlot
                title="Source track"
                subtitle="Upload the track you want to work with."
                file={srcFile}
                onChange={setSrcFile}
                required
                withPlayer
                actions={
                  <>
                    <button
                      type="button"
                      className="btn-secondary h-9"
                      onClick={() => submit({ analyze: true })}
                      disabled={!!busy || !srcFile}
                      title="Detect BPM, key, duration and other metadata"
                    >
                      {busy === "analyze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      <span>Analyze</span>
                    </button>
                  </>
                }
              />
              {analysisText && (
                <details className="text-xs text-ink-300" open>
                  <summary className="cursor-pointer text-ink-200 hover:text-ink-100">
                    Analysis result
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-xs bg-ink-900/60 border border-white/5 rounded-lg p-3 max-h-64 overflow-auto">
{analysisText}
                  </pre>
                </details>
              )}
              {mode === "repaint" && (
                <div className="grid sm:grid-cols-3 gap-3 pt-2">
                  <NumberField label="Repaint start (s)" min={0} step={0.1}
                    value={form.repainting_start}
                    onChange={(e) => patch({ repainting_start: e.target.value })} />
                  <NumberField label="Repaint end (s)" min={0} step={0.1} placeholder="Full length"
                    value={form.repainting_end}
                    onChange={(e) => patch({ repainting_end: e.target.value })} />
                  <SelectField
                    label="Repaint mode"
                    value={form.repaint_mode}
                    onChange={(e) => patch({ repaint_mode: e.target.value as FormState["repaint_mode"] })}
                    options={[
                      { value: "conservative", label: "Conservative" },
                      { value: "balanced", label: "Balanced" },
                      { value: "aggressive", label: "Aggressive" },
                    ]}
                  />
                </div>
              )}
            </div>
          )}

          {/* --- Compose (Custom / Remix / Repaint share this) ------------- */}
          {!isSimple && (
            <div className="card-interactive p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold text-ink-100">Compose your track</div>
                  <div className="text-xs text-ink-400 mt-0.5">
                    Fields map directly to the ACE-Step backend request contract.
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary h-9"
                    onClick={requestRandomSample}
                    disabled={!!busy}
                  >
                    {busy === "sample" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    <span>Random sample</span>
                  </button>
                </div>
              </div>

              <TextField
                label="Project title"
                placeholder="Optional — saved to your history"
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                maxLength={120}
              />

              <TextArea
                label={
                  <span className="flex items-center gap-2">
                    Music caption
                    <HelpTip text="Describe genre, mood, instruments, tempo. The clearer, the closer the model gets." />
                  </span>
                }
                placeholder="e.g. Warm indie folk with fingerpicked acoustic guitar and soft harmonies"
                value={form.prompt}
                onChange={(e) => patch({ prompt: e.target.value })}
                rows={3}
                trailing={
                  <button
                    type="button"
                    className="btn-ghost h-7 text-xs"
                    onClick={() => enhance("caption")}
                    disabled={!!busy || !form.prompt.trim()}
                    title="Use the 5Hz LM to enrich the caption"
                  >
                    {busy === "enhanceCaption" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    Enhance caption
                  </button>
                }
              />

              <TextArea
                label={
                  <span className="flex items-center gap-2">
                    Lyrics
                    <HelpTip text="Use [verse], [chorus], [bridge] tags to structure the song." />
                  </span>
                }
                placeholder={form.instrumental ? "Instrumental mode is on — lyrics disabled" : "One line per lyric line. Use [verse], [chorus] tags to structure."}
                value={form.instrumental ? "" : form.lyrics}
                onChange={(e) => patch({ lyrics: e.target.value })}
                rows={6}
                disabled={form.instrumental}
                trailing={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn-ghost h-7 text-xs"
                      onClick={() => enhance("lyrics")}
                      disabled={!!busy || !form.lyrics.trim() || form.instrumental}
                      title="Use the 5Hz LM to enhance lyrics"
                    >
                      {busy === "enhanceLyrics" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      Enhance lyrics
                    </button>
                    <label className="flex items-center gap-2 text-xs text-ink-300 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-brand-500"
                        checked={form.instrumental}
                        onChange={(e) => patch({ instrumental: e.target.checked })}
                      />
                      Instrumental
                    </label>
                  </div>
                }
              />

              <TextField
                label="Negative prompt"
                placeholder="What the model should avoid (optional)"
                value={form.negative_prompt}
                onChange={(e) => patch({ negative_prompt: e.target.value })}
              />
            </div>
          )}

          {/* --- Optional Parameters --------------------------------------- */}
          <div className="card-interactive p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-ink-100">Optional parameters</div>
                <div className="text-xs text-ink-400 mt-0.5">
                  Leave blank to let the backend auto-fill.
                </div>
              </div>
              <button
                type="button"
                className="btn-ghost h-8 text-xs"
                onClick={resetAllToAuto}
                title="Clear BPM, key, time signature and duration so the backend infers them"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset all to Auto</span>
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <NumberField
                  label="BPM"
                  placeholder="Auto"
                  min={40}
                  max={240}
                  step={1}
                  value={form.bpm}
                  onChange={(e) => patch({ bpm: e.target.value })}
                />
                <AutoBadge active={!form.bpm.trim()} label="BPM Auto" className="mt-1" />
              </div>
              <div>
                <label className="label">Key / scale</label>
                <input
                  className="input mt-1.5"
                  list="key-scales"
                  placeholder="Auto (e.g. C major)"
                  value={form.key_scale}
                  onChange={(e) => patch({ key_scale: e.target.value })}
                />
                <datalist id="key-scales">
                  {KEY_SCALES.map((k) => <option key={k} value={k} />)}
                </datalist>
                <AutoBadge active={!form.key_scale.trim()} label="Key Auto" className="mt-1" />
              </div>
              <div>
                <label className="label">Time signature</label>
                <input
                  className="input mt-1.5"
                  list="time-signatures"
                  placeholder="Auto (e.g. 4/4)"
                  value={form.time_signature}
                  onChange={(e) => patch({ time_signature: e.target.value })}
                />
                <datalist id="time-signatures">
                  {TIME_SIGNATURES.map((k) => <option key={k} value={k} />)}
                </datalist>
                <AutoBadge active={!form.time_signature.trim()} label="TimeSig Auto" className="mt-1" />
              </div>
              <div>
                <SelectField
                  label="Vocal language"
                  value={form.vocal_language}
                  onChange={(e) => patch({ vocal_language: e.target.value })}
                  options={VOCAL_LANGUAGES.map((v) => ({ value: v.value, label: v.label }))}
                  disabled={form.instrumental}
                />
                <AutoBadge active={form.vocal_language === "unknown"} label="Language Auto" className="mt-1" />
              </div>
              <div>
                <NumberField
                  label="Duration (s)"
                  placeholder="Auto"
                  min={1}
                  max={600}
                  step={1}
                  value={form.audio_duration}
                  onChange={(e) => patch({ audio_duration: e.target.value })}
                />
                <AutoBadge active={!form.audio_duration.trim()} label="Duration Auto" className="mt-1" />
              </div>
              <NumberField
                label="Batch size"
                min={1}
                max={8}
                step={1}
                value={form.batch_size}
                onChange={(e) => patch({ batch_size: e.target.value })}
              />
              <NumberField
                label="Inference steps"
                min={1}
                max={200}
                step={1}
                value={form.inference_steps}
                onChange={(e) => patch({ inference_steps: e.target.value })}
              />
              <NumberField
                label="Guidance scale"
                min={0}
                max={30}
                step={0.1}
                value={form.guidance_scale}
                onChange={(e) => patch({ guidance_scale: e.target.value })}
              />
              <SelectField
                label="Audio format"
                value={form.audio_format}
                onChange={(e) => patch({ audio_format: e.target.value as AudioFormat })}
                options={AUDIO_FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }))}
              />
              <NumberField
                label="Seed"
                min={-1}
                step={1}
                value={form.seed}
                onChange={(e) => patch({ seed: e.target.value })}
                disabled={form.use_random_seed}
                hint="Ignored when random seed is on."
              />
              <div className="flex flex-col justify-end">
                <Switch
                  checked={form.use_random_seed}
                  onChange={(v) => patch({ use_random_seed: v })}
                  label="Random seed"
                  hint="Fresh seed each run."
                />
              </div>
            </div>
          </div>

          {/* --- Reference audio (all non-simple modes) -------------------- */}
          {!isSimple && (
            <Collapsible
              title="Reference audio"
              description="Optional — a style reference the model should imitate."
              defaultOpen={!!refFile}
            >
              <AudioSlot
                title="Reference track"
                subtitle="Drop a track or record from your microphone."
                file={refFile}
                onChange={setRefFile}
                withPlayer
              />
              {refFile && needsSource && (
                <div className="grid sm:grid-cols-3 gap-3 mt-4">
                  <NumberField label="Cover strength" min={0} max={1} step={0.01}
                    value={form.audio_cover_strength}
                    onChange={(e) => patch({ audio_cover_strength: e.target.value })} />
                  <NumberField label="Cover noise" min={0} max={1} step={0.01}
                    value={form.cover_noise_strength}
                    onChange={(e) => patch({ cover_noise_strength: e.target.value })} />
                  {mode === "repaint" && (
                    <NumberField label="Repaint strength" min={0} max={1} step={0.05}
                      value={form.repaint_strength}
                      onChange={(e) => patch({ repaint_strength: e.target.value })} />
                  )}
                </div>
              )}
            </Collapsible>
          )}

          {/* --- LM Code Hints --------------------------------------------- */}
          <Collapsible
            title="LM code hints"
            description="Fine-grained flags for how the language model conditions generation."
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <Switch
                checked={form.thinking}
                onChange={(v) => patch({ thinking: v })}
                label="Think (LM-DiT)"
                hint="Use the 5Hz LM to generate audio codes."
              />
              <Switch
                checked={form.auto_gen}
                onChange={(v) => patch({ auto_gen: v })}
                label="AutoGen"
                hint="Let the LM fill in caption / lyrics / metadata before generation."
              />
              <Switch
                checked={form.use_format}
                onChange={(v) => patch({ use_format: v })}
                label="Enhance input first"
                hint="Runs format_sample() on caption + lyrics automatically."
              />
              <Switch
                checked={form.hint_retake}
                onChange={(v) => patch({ hint_retake: v })}
                label="Retake hint"
                hint="Ask the LM to vary the take relative to the source."
              />
              <Switch
                checked={form.hint_edit}
                onChange={(v) => patch({ hint_edit: v })}
                label="Edit hint"
                hint="Ask the LM to edit rather than fully regenerate."
              />
            </div>
            {requiresLlm && (
              <div className="text-xs text-amber-300 mt-3 flex items-start gap-2">
                <span className="mt-0.5">⚠</span>
                <span>
                  These features require the 5Hz LM to be loaded. Set{" "}
                  <code className="text-amber-200 bg-ink-800 px-1 rounded">ACESTEP_INIT_LLM=true</code>{" "}
                  when starting the backend if it is not already loaded.
                </span>
              </div>
            )}
          </Collapsible>

          {/* --- Advanced -------------------------------------------------- */}
          <Collapsible
            title="Advanced generation parameters"
            description="Fine inference settings — defaults are safe."
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <SelectField
                label="Inference method"
                value={form.infer_method}
                onChange={(e) => patch({ infer_method: e.target.value as "ode" | "sde" })}
                options={[
                  { value: "ode", label: "ODE (deterministic)" },
                  { value: "sde", label: "SDE (stochastic)" },
                ]}
              />
              <NumberField
                label="Timestep shift"
                min={1} max={5} step={0.1}
                value={form.shift}
                onChange={(e) => patch({ shift: e.target.value })}
                hint="Base models only. Ignored on turbo."
              />
              <NumberField
                label="CFG interval start"
                min={0} max={1} step={0.01}
                value={form.cfg_interval_start}
                onChange={(e) => patch({ cfg_interval_start: e.target.value })}
              />
              <NumberField
                label="CFG interval end"
                min={0} max={1} step={0.01}
                value={form.cfg_interval_end}
                onChange={(e) => patch({ cfg_interval_end: e.target.value })}
              />
              <div className="flex flex-col justify-end">
                <Switch
                  checked={form.use_adg}
                  onChange={(v) => patch({ use_adg: v })}
                  label="Use ADG guidance"
                  hint="Adaptive Dual Guidance."
                />
              </div>
              <div className="flex flex-col justify-end">
                <Switch
                  checked={form.use_tiled_decode}
                  onChange={(v) => patch({ use_tiled_decode: v })}
                  label="Tiled decode"
                  hint="Reduces peak VRAM."
                />
              </div>
            </div>
          </Collapsible>

          {/* --- Actions --------------------------------------------------- */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-primary h-11 px-5 text-base flex-1 sm:flex-none min-w-[180px]"
              onClick={() => submit()}
              disabled={!!busy}
            >
              {busy === "generate" ? (
                <><Loader2 className="h-5 w-5 animate-spin" /><span>Generating…</span></>
              ) : (
                <><Music4 className="h-5 w-5" /><span>Generate music</span></>
              )}
            </button>
            <button type="button" className="btn-secondary h-11 px-4" onClick={clearForm} disabled={!!busy}>
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
            {(busy === "generate" || busy === "analyze") && (
              <button type="button" className="btn-secondary h-11 px-4" onClick={cancel}>
                <Ban className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Results column */}
        <div className="lg:col-span-1 space-y-5">
          <ProgressPanel gen={gen} onCancel={cancel} percent={percent} />
          <ResultsPanel
            baseUrl={clientOpts.baseUrl}
            saved={savedResults}
            onRegenerate={() => submit()}
            onReuse={reuseSettings}
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-[0.2em] text-brand-400 font-semibold">
      {children}
    </div>
  );
}

function HelpTip({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="inline-flex items-center text-ink-500 hover:text-ink-200 transition"
      aria-label={text}
    >
      <HelpCircle className="h-3.5 w-3.5" />
    </span>
  );
}

function ProgressPanel({
  gen, onCancel, percent,
}: {
  gen: GenerationState | null;
  onCancel: () => void;
  percent: number;
}) {
  if (!gen) {
    return (
      <div className="card p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-ink-400 font-semibold">Progress</div>
        <div className="mt-3 text-sm text-ink-300">
          No active job. Fill in the form and press <b>Generate</b> to start.
        </div>
      </div>
    );
  }
  const done = gen.status === "succeeded" || gen.status === "failed";
  const label =
    gen.status === "succeeded" ? "Complete"
    : gen.status === "failed" ? "Failed"
    : gen.status === "queued" ? "Queued" : "Running";
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.18em] text-ink-400 font-semibold">
          {gen.kind === "analyze" ? "Analysis" : "Progress"}
        </div>
        <span
          className={cn("chip",
            gen.status === "succeeded" && "border-emerald-500/40 text-emerald-300",
            gen.status === "failed" && "border-rose-500/40 text-rose-300",
            (gen.status === "queued" || gen.status === "running") && "border-brand-500/40 text-brand-300",
          )}
        >
          {(!done && <Loader2 className="h-3 w-3 animate-spin" />) || null}
          {label}
        </span>
      </div>
      <div className="text-xs text-ink-300">
        Task <span className="font-mono text-ink-200">{gen.taskId.slice(0, 10)}…</span>
      </div>
      <div className="h-2 rounded-full bg-ink-800 overflow-hidden">
        <div
          className={cn("h-full bg-brand-gradient transition-all",
            gen.status === "queued" || (gen.status === "running" && percent === 0) ? "shimmer" : "")}
          style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-ink-400">
        <span className="capitalize">{gen.stage}</span>
        <span className="flex items-center gap-1 font-mono">
          <Clock className="h-3 w-3" />
          {fmtDuration(gen.elapsedMs / 1000)}
        </span>
      </div>
      {gen.progressText && (
        <div className="text-xs text-ink-300 line-clamp-3 font-mono bg-ink-900/60 p-2 rounded-lg border border-white/5">
          {gen.progressText}
        </div>
      )}
      {gen.error && (
        <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">
          {gen.error}
        </div>
      )}
      {!done && (
        <button type="button" className="btn-secondary w-full h-9" onClick={onCancel}>
          <Ban className="h-4 w-4" />
          <span>Stop watching</span>
        </button>
      )}
    </div>
  );
}

function ResultsPanel({
  baseUrl, saved, onRegenerate, onReuse,
}: {
  baseUrl: string;
  saved: { title: string; entry: QueryResultEntry | null; items: QueryResultItem[]; taskId: string; request: GenerateMusicRequest }[];
  onRegenerate: () => void;
  onReuse: (req: GenerateMusicRequest) => void;
}) {
  if (saved.length === 0) {
    return (
      <div className="card p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-ink-400 font-semibold">Results</div>
        <div className="mt-3 text-sm text-ink-300">
          Generated tracks will appear here with a player, download and metadata.
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {saved.map((s) => (
        <div key={s.taskId} className="space-y-2">
          {s.items.map((it, i) => (
            <ResultCard
              key={`${s.taskId}-${i}`}
              title={`${s.title}${s.items.length > 1 ? ` · take ${i + 1}` : ""}`}
              baseUrl={baseUrl}
              item={it}
              request={s.request}
              onRegenerate={onRegenerate}
              onReuse={onReuse}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ResultCard({
  title, baseUrl, item, request, onRegenerate, onReuse, compact = false,
}: {
  title: string;
  baseUrl: string;
  item: QueryResultItem;
  request?: GenerateMusicRequest;
  onRegenerate?: () => void;
  onReuse?: (req: GenerateMusicRequest) => void;
  compact?: boolean;
}) {
  const url = useMemo(() => audioUrl({ baseUrl }, item.file), [baseUrl, item.file]);
  const meta = item.metas || {};
  const ext = (() => {
    const m = /\.([a-z0-9]+)(?:\?|$)/i.exec(item.file);
    return m ? m[1] : "mp3";
  })();
  const suggested = safeFilename(`${title}.${ext}`);

  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = suggested;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      toast.error("Download failed", (e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="card-interactive p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink-100 truncate">{title}</div>
          <div className="text-xs text-ink-400 truncate">
            {meta.genres && <span>{truncate(meta.genres, 60)}</span>}
            {meta.bpm ? <span> · {meta.bpm} BPM</span> : null}
            {meta.keyscale ? <span> · {meta.keyscale}</span> : null}
            {meta.duration ? <span> · {fmtDuration(meta.duration)}</span> : null}
          </div>
        </div>
        {!compact && item.create_time ? (
          <div className="text-[10px] text-ink-500 shrink-0">{fmtDate(item.create_time)}</div>
        ) : null}
      </div>
      <AudioPlayer src={url} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary h-9" onClick={download} disabled={downloading}>
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span>Download</span>
        </button>
        {onRegenerate && (
          <button type="button" className="btn-ghost h-9" onClick={onRegenerate}>
            <RefreshCcw className="h-4 w-4" />
            <span>Regenerate</span>
          </button>
        )}
        {onReuse && request && (
          <button type="button" className="btn-ghost h-9" onClick={() => onReuse(request)}>
            <ChevronRight className="h-4 w-4" />
            <span>Reuse settings</span>
          </button>
        )}
      </div>
      {item.lyrics && !compact && (
        <details className="text-xs text-ink-300">
          <summary className="cursor-pointer text-ink-200 hover:text-ink-100">Lyrics & metadata</summary>
          <pre className="mt-2 whitespace-pre-wrap text-ink-300 font-mono text-xs bg-ink-900/60 border border-white/5 rounded-lg p-3 max-h-64 overflow-auto">
{item.lyrics}
          </pre>
        </details>
      )}
    </div>
  );
}
