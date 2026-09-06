/**
 * Types mirrored from the ACE-Step FastAPI backend.
 * Source of truth:
 *   - acestep/api/http/release_task_models.py :: GenerateMusicRequest
 *   - acestep/api/http/query_result_service.py :: response shape
 *   - acestep/api/http/model_service_routes.py :: /health, /v1/models
 */

export interface ApiEnvelope<T> {
  data: T;
  code: number;
  error: string | null;
  timestamp: number;
  extra: unknown;
}

export type TaskType =
  | "text2music"
  | "audio2audio"
  | "retake"
  | "repaint"
  | "edit"
  | "extend";

export type AudioFormat = "mp3" | "flac" | "opus" | "aac" | "wav" | "wav32";

export type LmBackend = "vllm" | "pt" | "mlx";

export type RepaintMode = "conservative" | "balanced" | "aggressive";
export type DcwMode = "low" | "high" | "double" | "pix";
export type ChunkMaskMode = "explicit" | "auto";
export type InferMethod = "ode" | "sde";

/** Payload accepted by POST /release_task (JSON form). */
export interface GenerateMusicRequest {
  prompt?: string;
  global_caption?: string;
  lyrics?: string;

  thinking?: boolean;
  sample_mode?: boolean;
  sample_query?: string;
  use_format?: boolean;
  model?: string | null;

  bpm?: number | null;
  key_scale?: string;
  time_signature?: string;
  vocal_language?: string;
  inference_steps?: number;
  guidance_scale?: number;
  use_random_seed?: boolean;
  seed?: number | string;

  reference_audio_path?: string | null;
  src_audio_path?: string | null;
  audio_duration?: number | null;
  batch_size?: number | null;

  repainting_start?: number;
  repainting_end?: number | null;

  instruction?: string;
  audio_cover_strength?: number;
  cover_noise_strength?: number;
  audio_code_string?: string;
  task_type?: TaskType | string;
  chunk_mask_mode?: ChunkMaskMode;

  repaint_latent_crossfade_frames?: number;
  repaint_wav_crossfade_sec?: number;
  repaint_mode?: RepaintMode;
  repaint_strength?: number;

  analysis_only?: boolean;
  full_analysis_only?: boolean;
  extract_codes_only?: boolean;

  use_adg?: boolean;
  cfg_interval_start?: number;
  cfg_interval_end?: number;
  infer_method?: InferMethod;
  shift?: number;
  timesteps?: string | null;

  dcw_enabled?: boolean | null;
  dcw_mode?: DcwMode;
  dcw_scaler?: number;
  dcw_high_scaler?: number;
  dcw_wavelet?: string;

  audio_format?: AudioFormat;
  use_tiled_decode?: boolean;

  lm_model_path?: string | null;
  lm_backend?: LmBackend;

  constrained_decoding?: boolean;
  constrained_decoding_debug?: boolean;
  use_cot_caption?: boolean;
  use_cot_language?: boolean;
  is_format_caption?: boolean;
  allow_lm_batch?: boolean;
  track_name?: string | null;
  track_classes?: string[] | null;

  lm_temperature?: number;
  lm_cfg_scale?: number;
  lm_top_k?: number | null;
  lm_top_p?: number | null;
  lm_repetition_penalty?: number;
  lm_negative_prompt?: string;
}

export interface ReleaseTaskResponse {
  task_id: string;
  status: "queued" | string;
  queue_position: number;
}

/** Nested item inside `result` string returned by /query_result. */
export interface QueryResultItem {
  file: string;
  wave?: string;
  status: number;
  create_time: number;
  env?: string;
  prompt?: string;
  lyrics?: string;
  metas?: {
    bpm?: number | null;
    duration?: number | null;
    genres?: string;
    keyscale?: string;
    timesignature?: string;
  };
  progress?: number;
  stage?: string;
  error?: string | null;
}

export interface QueryResultEntry {
  task_id: string;
  /** JSON-encoded string of QueryResultItem[] */
  result: string;
  status: number;
  progress_text?: string;
}

export interface HealthPayload {
  status: string;
  service: string;
  version: string;
  models_initialized: boolean;
  llm_initialized: boolean;
  loaded_model: string | null;
  loaded_lm_model: string | null;
}

export interface ModelInventoryModel {
  name: string;
  loaded: boolean;
  is_default: boolean;
  path?: string;
  slot?: number;
  supported_tasks?: string[];
}

export interface ModelInventory {
  models: ModelInventoryModel[];
  default_model: string | null;
  loaded_model?: string | null;
  loaded_lm_model?: string | null;
  llm_initialized?: boolean;
  [key: string]: unknown;
}

export interface FormatInputResponse {
  caption: string;
  lyrics: string;
  bpm?: number | null;
  key_scale?: string;
  time_signature?: string;
  duration?: number | null;
  vocal_language?: string;
}

export interface RandomSamplePayload {
  prompt?: string;
  lyrics?: string;
  bpm?: number | null;
  key_scale?: string;
  time_signature?: string;
  vocal_language?: string;
  audio_duration?: number | null;
  guidance_scale?: number;
  inference_steps?: number;
  audio_format?: AudioFormat;
  [key: string]: unknown;
}
