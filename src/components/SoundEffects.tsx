"use client";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket-client";
import type { HydratedGameState } from "@/lib/types";

const map: Record<string, string> = {
  correct: "/sounds/correct.mp3",
  correct2: "/sounds/correct2.mp3",
  wrong: "/sounds/wrong.mp3",
  "timer-end": "/sounds/timer-end.mp3",
  select: "/sounds/select.mp3",
  intro: "/sounds/intro.mp3",
  noanswer: "/sounds/noanswer.mp3",
  applause: "/sounds/applause.mp3",
  wow: "/sounds/wow.mp3",
};

const HIGH_VALUE_VALUES = new Set([400, 500]);

function pickClockKey(value: number | undefined): "clock" | "clock2" {
  return value && HIGH_VALUE_VALUES.has(value) ? "clock2" : "clock";
}

export function SoundEffects() {
  const audios = useRef<Record<string, HTMLAudioElement>>({});
  const clocks = useRef<Record<"clock" | "clock2", HTMLAudioElement | null>>({ clock: null, clock2: null });
  const categoriesRef = useRef<HTMLAudioElement | null>(null);
  const resultsRef = useRef<HTMLAudioElement | null>(null);
  const activeClock = useRef<"clock" | "clock2" | null>(null);
  const unlocked = useRef(false);
  const wantClock = useRef(false);
  const wantCategories = useRef(false);
  const wantResults = useRef(false);
  const prevTimerState = useRef<string | undefined>(undefined);
  const currentValue = useRef<number | undefined>(undefined);
  const [needsUnlock, setNeedsUnlock] = useState(false);

  useEffect(() => {
    Object.entries(map).forEach(([k, src]) => {
      const a = new Audio(src);
      a.preload = "auto";
      audios.current[k] = a;
    });
    (["clock", "clock2"] as const).forEach(k => {
      const a = new Audio(`/sounds/${k}.mp3`);
      a.preload = "auto";
      a.loop = true;
      clocks.current[k] = a;
    });
    {
      const a = new Audio("/sounds/categories.mp3");
      a.preload = "auto";
      a.loop = true;
      categoriesRef.current = a;
    }
    {
      const a = new Audio("/sounds/results.mp3");
      a.preload = "auto";
      a.loop = true;
      resultsRef.current = a;
    }

    const s = getSocket("spectator");
    const handler = ({ kind }: { kind: string }) => {
      let resolved = kind;
      if (kind === "correct" && currentValue.current && HIGH_VALUE_VALUES.has(currentValue.current)) {
        resolved = "correct2";
      }
      const a = audios.current[resolved];
      if (!a) return;
      a.currentTime = 0;
      a.play().catch(() => setNeedsUnlock(true));
    };
    const stopAllClocks = (reset: boolean) => {
      (Object.keys(clocks.current) as Array<"clock" | "clock2">).forEach(k => {
        const a = clocks.current[k];
        if (!a) return;
        if (!a.paused) a.pause();
        if (reset) a.currentTime = 0;
      });
    };
    const stateHandler = (state: HydratedGameState | null) => {
      const inCategories = state?.phase === "welcome" && (state?.welcomeStep ?? 0) >= 1;
      wantCategories.current = inCategories;
      const cat = categoriesRef.current;
      if (cat) {
        if (inCategories) {
          if (cat.paused) cat.play().catch(() => setNeedsUnlock(true));
        } else if (!cat.paused) {
          cat.pause();
          cat.currentTime = 0;
        }
      }
      const inResults = state?.phase === "results";
      wantResults.current = inResults;
      const res = resultsRef.current;
      if (res) {
        if (inResults) {
          if (res.paused) res.play().catch(() => setNeedsUnlock(true));
        } else if (!res.paused) {
          res.pause();
          res.currentTime = 0;
        }
      }
      const ts = state?.currentQuestion?.timerState;
      const value = state?.currentQuestion?.value;
      currentValue.current = value;
      const running = ts === "running";
      const paused = ts === "paused";
      wantClock.current = running;
      const prev = prevTimerState.current;
      prevTimerState.current = ts;
      if (running) {
        const key = pickClockKey(value);
        if (activeClock.current && activeClock.current !== key) {
          const old = clocks.current[activeClock.current];
          if (old) { old.pause(); old.currentTime = 0; }
        }
        activeClock.current = key;
        const c = clocks.current[key];
        if (!c) return;
        if (prev !== "paused") c.currentTime = 0;
        if (c.paused) c.play().catch(() => setNeedsUnlock(true));
      } else if (paused) {
        const key = activeClock.current;
        if (!key) return;
        const c = clocks.current[key];
        if (c && !c.paused) c.pause();
      } else {
        stopAllClocks(true);
        activeClock.current = null;
      }
    };
    s.on("sound", handler);
    s.on("state", stateHandler);
    return () => {
      s.off("sound", handler);
      s.off("state", stateHandler);
      stopAllClocks(false);
      const cat = categoriesRef.current;
      if (cat && !cat.paused) cat.pause();
      const res = resultsRef.current;
      if (res && !res.paused) res.pause();
    };
  }, []);

  const unlock = () => {
    if (unlocked.current) return;
    unlocked.current = true;
    Object.values(audios.current).forEach(a => {
      a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
    });
    (Object.values(clocks.current) as Array<HTMLAudioElement | null>).forEach(c => {
      if (!c) return;
      c.play().then(() => {
        const isActive = activeClock.current && clocks.current[activeClock.current] === c;
        if (!wantClock.current || !isActive) { c.pause(); c.currentTime = 0; }
      }).catch(() => {});
    });
    const cat = categoriesRef.current;
    if (cat) {
      cat.play().then(() => {
        if (!wantCategories.current) { cat.pause(); cat.currentTime = 0; }
      }).catch(() => {});
    }
    const res = resultsRef.current;
    if (res) {
      res.play().then(() => {
        if (!wantResults.current) { res.pause(); res.currentTime = 0; }
      }).catch(() => {});
    }
    setNeedsUnlock(false);
  };

  if (!needsUnlock) return null;
  return (
    <button
      onClick={unlock}
      className="fixed top-4 right-4 z-50 px-4 py-2 bg-amber-400 text-slate-900 font-semibold rounded-lg shadow-lg cursor-pointer"
    >
      🔊 Включить звук
    </button>
  );
}
