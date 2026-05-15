"use client";
import { getSocket } from "@/lib/socket-client";
import type { HydratedGameState } from "@/lib/types";

export function ResultsView({ state, isHost }: { state: HydratedGameState; isHost: boolean }) {
  const sorted = [...state.teams].sort((a, b) => state.scores[b.id] - state.scores[a.id]);
  return (
    <main className="min-h-screen flex flex-col p-8">
      <h1 className="text-5xl font-bold mb-10 text-center tracking-wide">Результаты</h1>
      <div className="flex-1 flex flex-col items-center gap-6">
        {sorted.map((t, idx) => (
          <div
            key={t.id}
            className={`flex items-center gap-5 p-5 rounded bg-white/5 transition-all ${
              idx === 0
                ? "scale-125 border-2 border-yellow-400 shadow-[0_0_36px_rgba(245,197,24,0.6)] bg-yellow-400/10"
                : "border border-white/10"
            }`}
          >
            {t.logoUrl && <img src={t.logoUrl} alt="" className="w-14 h-14 rounded-full object-cover border border-yellow-400/40" />}
            <div className="text-2xl font-semibold">{t.name}</div>
            <div className="text-yellow-400 text-4xl font-bold tabular-nums">{state.scores[t.id]}</div>
          </div>
        ))}
      </div>
      {isHost && (
        <button
          onClick={() => getSocket("host").emit("host:new-game")}
          className="mt-8 mx-auto px-8 py-4 bg-yellow-400 text-black font-bold text-xl rounded shadow-[0_0_24px_rgba(245,197,24,0.4)]"
        >
          Новая игра
        </button>
      )}
    </main>
  );
}
