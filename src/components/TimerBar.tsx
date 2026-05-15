"use client";
import { useEffect, useState } from "react";

export function TimerBar({
  startedAt, durationSec, state,
}: { startedAt?: number; durationSec: number; state: "idle" | "running" | "expired" }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (state !== "running") return;
    let raf = 0;
    const tick = () => { setNow(Date.now()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  let pct = 0;
  if (state === "idle") pct = 0;
  else if (state === "expired") pct = 100;
  else if (startedAt) {
    pct = Math.min(100, ((now - startedAt) / (durationSec * 1000)) * 100);
  }

  return (
    <div className="w-full h-2 bg-white/10 overflow-hidden rounded">
      <div
        className="h-full bg-yellow-400 shadow-[0_0_12px_rgba(245,197,24,0.6)] transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
