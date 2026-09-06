import { useEffect, useRef, useState } from "react";
import { Mic, Square, Upload, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { WaveformThumb } from "./WaveformThumb";
import { AudioPlayer } from "./AudioPlayer";
import { useToast } from "./Toast";
import { ACCEPTED_AUDIO_EXTS, ACCEPTED_AUDIO_MIME, MAX_UPLOAD_MB } from "@/lib/constants";

interface Props {
  title: string;
  subtitle?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  className?: string;
  /** Show inline audio player instead of just the waveform thumb. */
  withPlayer?: boolean;
  /** Show extra actions after the file loads (e.g. Analyze button). */
  actions?: React.ReactNode;
}

export function AudioSlot({
  title,
  subtitle,
  file,
  onChange,
  required,
  className,
  withPlayer = false,
  actions,
}: Props) {
  const toast = useToast();
  const [dragging, setDragging] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recElapsedMs, setRecElapsedMs] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setObjectUrl(null); return; }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => () => {
    stopStream();
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function validateAndSet(f: File) {
    const okType =
      ACCEPTED_AUDIO_MIME.includes(f.type) ||
      ACCEPTED_AUDIO_EXTS.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!okType) {
      toast.error("Unsupported audio file", `Allowed: ${ACCEPTED_AUDIO_EXTS.join(", ")}`);
      return;
    }
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast.error("File too large", `Maximum size is ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    onChange(f);
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSet(f);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) validateAndSet(f);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Recording not supported", "Your browser does not support the microphone API.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickRecorderMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const ext = extForMime(rec.mimeType);
        const recorded = new File(
          [blob],
          `recording-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`,
          { type: blob.type },
        );
        validateAndSet(recorded);
        stopStream();
        setRecording(false);
        if (timerRef.current) window.clearInterval(timerRef.current);
        setRecElapsedMs(0);
      };
      rec.start(250);
      setRecording(true);
      setRecElapsedMs(0);
      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecElapsedMs(Date.now() - startedAt);
      }, 200);
    } catch (e) {
      toast.error("Microphone denied", (e as Error).message);
      stopStream();
      setRecording(false);
    }
  };

  const stopRecording = () => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
  };

  const clear = () => onChange(null);

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        file
          ? "border-brand-500/40 bg-brand-500/5"
          : dragging
          ? "border-brand-400/70 bg-brand-500/10 border-dashed"
          : "border-dashed border-white/10 hover:border-white/20",
        className,
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink-100 flex items-center gap-1.5">
            {title}
            {required && <span className="text-rose-300 text-xs" aria-label="required">*</span>}
          </div>
          {subtitle && <div className="text-xs text-ink-400">{subtitle}</div>}
        </div>
        {file && (
          <button
            type="button"
            onClick={clear}
            className="btn-ghost h-8 w-8 p-0"
            aria-label="Clear audio"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!file && !recording && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="text-xs text-ink-400 text-center py-3">
            Drop audio here — or —
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="btn-secondary h-9 flex-1 cursor-pointer">
              <Upload className="h-4 w-4" />
              <span>Choose file</span>
              <input
                type="file"
                className="sr-only"
                accept={[...ACCEPTED_AUDIO_MIME, ...ACCEPTED_AUDIO_EXTS].join(",")}
                onChange={onFileInput}
              />
            </label>
            <button
              type="button"
              className="btn-secondary h-9"
              onClick={startRecording}
              title="Record from microphone"
            >
              <Mic className="h-4 w-4" />
              <span>Record</span>
            </button>
          </div>
        </div>
      )}

      {recording && (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-70 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
            <span className="text-sm text-ink-100 font-mono">
              Recording · {fmtRec(recElapsedMs)}
            </span>
          </div>
          <button type="button" className="btn-primary h-9" onClick={stopRecording}>
            <Square className="h-4 w-4" />
            <span>Stop</span>
          </button>
        </div>
      )}

      {file && (
        <div className="mt-3 space-y-2">
          <WaveformThumb file={file} />
          <div className="flex items-center justify-between text-xs text-ink-300 gap-2">
            <span className="truncate font-mono flex-1" title={file.name}>
              {file.name}
            </span>
            <span className="text-ink-500 shrink-0">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          {withPlayer && objectUrl && <AudioPlayer src={objectUrl} />}
          {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
        </div>
      )}
    </div>
  );
}

function fmtRec(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function pickRecorderMime(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(m)) {
      return m;
    }
  }
  return undefined;
}

function extForMime(mime?: string): string {
  if (!mime) return "webm";
  if (mime.startsWith("audio/webm")) return "webm";
  if (mime.startsWith("audio/mp4")) return "m4a";
  if (mime.startsWith("audio/ogg")) return "ogg";
  if (mime.startsWith("audio/mpeg")) return "mp3";
  return "webm";
}
