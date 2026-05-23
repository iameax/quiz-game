"use client";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket-client";
import type { SoundKind } from "@/lib/types";

const SOUNDS: { kind: SoundKind; icon: string; label: string }[] = [
  { kind: "applause", icon: "👏", label: "Аплодисменты" },
  { kind: "wow", icon: "😲", label: "Вау" },
];

export function HostSoundPanel() {
  const play = (kind: SoundKind) => {
    getSocket("host").emit("host:play-sound", { kind });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = Number(e.key) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= SOUNDS.length) return;
      e.preventDefault();
      play(SOUNDS[idx].kind);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex gap-2 p-2 bg-slate-900/80 border border-white/10 rounded-lg backdrop-blur">
      {SOUNDS.map((s, i) => (
        <button
          key={s.kind}
          onClick={() => play(s.kind)}
          title={`${s.label} (${i + 1})`}
          className="relative w-12 h-12 flex items-center justify-center text-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 rounded-lg transition cursor-pointer"
        >
          {s.icon}
          <span className="absolute -top-1 -right-1 text-[10px] leading-none px-1 py-0.5 bg-amber-400 text-slate-900 rounded font-bold">
            {i + 1}
          </span>
        </button>
      ))}
    </div>
  );
}
