"use client";
import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket-client";

const map: Record<string, string> = {
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  "timer-end": "/sounds/timer-end.mp3",
  select: "/sounds/select.mp3",
};

export function SoundEffects() {
  const audios = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    Object.entries(map).forEach(([k, src]) => {
      const a = new Audio(src);
      a.preload = "auto";
      audios.current[k] = a;
    });
    const s = getSocket("spectator");
    const handler = ({ kind }: { kind: string }) => {
      const a = audios.current[kind];
      if (!a) return;
      a.currentTime = 0;
      a.play().catch(() => {/* autoplay blocked; gate handles unlock */});
    };
    s.on("sound", handler);
    return () => { s.off("sound", handler); };
  }, []);

  return null;
}
