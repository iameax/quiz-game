"use client";
import { useEffect, useState } from "react";

export function TimerBar({
  startedAt, elapsedMs, durationSec, state,
}: { startedAt?: number; elapsedMs: number; durationSec: number; state: "idle" | "running" | "paused" | "expired" }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (state !== "running") return;
    let raf = 0;
    const tick = () => { setNow(Date.now()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  const totalMs = durationSec * 1000;
  let pct = 0;
  if (state === "idle") pct = 0;
  else if (state === "expired") pct = 100;
  else if (state === "paused") {
    pct = Math.min(100, (elapsedMs / totalMs) * 100);
  } else if (startedAt) {
    pct = Math.min(100, ((elapsedMs + (now - startedAt)) / totalMs) * 100);
  }

  return (
    <div className="w-full h-2 bg-white/10 overflow-hidden rounded">
      <div
        className={`h-full shadow-[0_0_12px_rgba(245,197,24,0.6)] transition-none ${state === "paused" ? "bg-yellow-400/50" : "bg-yellow-400"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
