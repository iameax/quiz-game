"use client";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket-client";
import type { HydratedGameState, Pack } from "@/lib/types";

const FADE_MS = 400;

export function WelcomeView({ state, pack, isHost }: { state: HydratedGameState; pack: Pack; isHost: boolean }) {
  const step = state.welcomeStep ?? 0;

  const [displayStep, setDisplayStep] = useState(step);
  const [visible, setVisible] = useState(true);
  const prevStep = useRef(step);

  useEffect(() => {
    if (step === prevStep.current) return;
    prevStep.current = step;
    setVisible(false);
    const t = setTimeout(() => {
      setDisplayStep(step);
      setVisible(true);
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (!isHost) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      getSocket("host").emit("host:welcome-advance");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isHost]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-8 bg-linear-to-br from-slate-950 via-blue-950 to-slate-950">
      <div
        className="transition-opacity ease-in-out"
        style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
      >
        {displayStep === 0 ? (
          <div className="space-y-8">
            <h1 className="text-6xl md:text-8xl font-extrabold bg-linear-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(245,197,24,0.25)]">
              Добро пожаловать<br />в Исламскую викторину
            </h1>
            <p className="text-2xl md:text-3xl text-white/70 font-light">
              Устраивайтесь поудобнее
            </p>
          </div>
        ) : (
          <h2 className="text-6xl md:text-8xl font-extrabold text-yellow-300 drop-shadow-[0_0_25px_rgba(245,197,24,0.35)]">
            {pack.categories[displayStep - 1]?.name}
          </h2>
        )}
      </div>

      {isHost && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-sm uppercase tracking-widest">
          Пробел — далее
        </div>
      )}
    </main>
  );
}
