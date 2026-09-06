import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface Props {
  file: File | null;
  className?: string;
  bars?: number;
  color?: string;
}

/**
 * Canvas-rendered mini waveform for a File. Decodes once via Web Audio,
 * downsamples to `bars` peaks, then draws. Falls back gracefully if the
 * browser cannot decode (some formats).
 */
export function WaveformThumb({ file, className, bars = 96, color = "#a78bfa" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPeaks(null);
    setFailed(false);
    if (!file) return;

    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const AC =
          (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        if (!AC) throw new Error("no AudioContext");
        const ac = new AC();
        const audio = await ac.decodeAudioData(buf.slice(0));
        const ch = audio.getChannelData(0);
        const step = Math.max(1, Math.floor(ch.length / bars));
        const out: number[] = [];
        for (let i = 0; i < bars; i++) {
          let peak = 0;
          const start = i * step;
          const end = Math.min(ch.length, start + step);
          for (let j = start; j < end; j++) {
            const v = Math.abs(ch[j]);
            if (v > peak) peak = v;
          }
          out.push(peak);
        }
        try { ac.close(); } catch { /* ignore */ }
        if (!cancelled) setPeaks(out);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => { cancelled = true; };
  }, [file, bars]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !peaks) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth * dpr;
    const h = c.clientHeight * dpr;
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    const barW = w / peaks.length;
    ctx.fillStyle = color;
    const maxPeak = Math.max(...peaks, 0.0001);
    for (let i = 0; i < peaks.length; i++) {
      const norm = peaks[i] / maxPeak;
      const bh = Math.max(1.5 * dpr, norm * h);
      const x = i * barW + barW * 0.15;
      const y = (h - bh) / 2;
      ctx.fillRect(x, y, barW * 0.7, bh);
    }
  }, [peaks, color]);

  if (!file) return null;

  return (
    <div className={cn("w-full h-14 rounded-lg bg-ink-900/60 border border-white/5 overflow-hidden", className)}>
      {failed ? (
        <div className="h-full grid place-items-center text-[10px] text-ink-500">
          Preview unavailable
        </div>
      ) : !peaks ? (
        <div className="h-full grid place-items-center text-[10px] text-ink-500 shimmer">
          Analysing waveform…
        </div>
      ) : (
        <canvas ref={canvasRef} className="w-full h-full" />
      )}
    </div>
  );
}
