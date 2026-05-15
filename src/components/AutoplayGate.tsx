"use client";
import { useState } from "react";

export function AutoplayGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  if (unlocked) return <>{children}</>;
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold text-yellow-300 tracking-wide">Квиз готов</h1>
      <button
        onClick={() => {
          new Audio().play().catch(() => {});
          setUnlocked(true);
        }}
        className="px-10 py-5 bg-yellow-400 text-black text-2xl font-bold rounded shadow-[0_0_36px_rgba(245,197,24,0.5)]"
      >
        Нажмите чтобы присоединиться
      </button>
    </main>
  );
}
