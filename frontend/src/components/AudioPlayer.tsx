import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmtDuration } from "@/lib/format";

interface Props {
  src: string;
  className?: string;
  onError?: (message: string) => void;
}

export function AudioPlayer({ src, className, onError }: Props) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setReady(false);
    setError(null);
  }, [src]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.volume = volume;
    el.muted = muted;
  }, [volume, muted]);

  const toggle = async () => {
    const el = ref.current;
    if (!el) return;
    try {
      if (el.paused) {
        await el.play();
        setPlaying(true);
      } else {
        el.pause();
        setPlaying(false);
      }
    } catch (e) {
      const msg = (e as Error).message || "Playback failed";
      setError(msg);
      onError?.(msg);
    }
  };

  const seek = (v: number) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = v;
    setCurrent(v);
  };

  return (
    <div className={cn("card p-4", className)}>
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
          setReady(true);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setError("Failed to load audio");
          onError?.("Failed to load audio");
        }}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={!ready || !!error}
          className="btn-primary h-11 w-11 rounded-full p-0"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={current}
            onChange={(e) => seek(parseFloat(e.target.value))}
            disabled={!ready}
            className="w-full accent-brand-500 cursor-pointer"
            aria-label="Seek"
          />
          <div className="flex justify-between text-xs text-ink-300 mt-1 font-mono">
            <span>{fmtDuration(current)}</span>
            <span>{fmtDuration(duration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="btn-ghost h-9 w-9 p-0 rounded-full"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (v > 0) setMuted(false);
            }}
            className="w-20 accent-brand-500 hidden sm:block"
            aria-label="Volume"
          />
        </div>
      </div>
      {error && (
        <div className="text-xs text-rose-300 mt-2" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
