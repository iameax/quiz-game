"use client";
import { getSocket } from "@/lib/socket-client";
import type { HydratedGameState, Team } from "@/lib/types";

type RankedTeam = { team: Team; score: number; place: number };

const PODIUM_STYLES: Record<number, { height: string; bg: string; border: string; shadow: string; text: string; label: string }> = {
  1: {
    height: "h-64",
    bg: "bg-gradient-to-b from-yellow-300 to-yellow-500",
    border: "border-yellow-200",
    shadow: "shadow-[0_0_48px_rgba(245,197,24,0.7)]",
    text: "text-yellow-300",
    label: "1",
  },
  2: {
    height: "h-48",
    bg: "bg-gradient-to-b from-slate-200 to-slate-400",
    border: "border-slate-200",
    shadow: "shadow-[0_0_32px_rgba(203,213,225,0.5)]",
    text: "text-slate-200",
    label: "2",
  },
  3: {
    height: "h-36",
    bg: "bg-gradient-to-b from-amber-500 to-amber-700",
    border: "border-amber-400",
    shadow: "shadow-[0_0_28px_rgba(217,119,6,0.5)]",
    text: "text-amber-400",
    label: "3",
  },
};

function PodiumColumn({ entry }: { entry: RankedTeam }) {
  const s = PODIUM_STYLES[entry.place];
  return (
    <div className="flex flex-col items-center gap-3 w-56">
      <div className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border ${s.border} ${s.shadow}`}>
        {entry.team.logoUrl && (
          <img src={entry.team.logoUrl} alt="" className="w-20 h-16 rounded-lg object-cover border border-white/20" />
        )}
        <div className="text-xl font-semibold text-center">{entry.team.name}</div>
        <div className={`text-4xl font-bold tabular-nums ${s.text}`}>{entry.score}</div>
      </div>
      <div className={`w-full ${s.height} ${s.bg} rounded-t-lg flex items-start justify-center pt-4 text-black/80`}>
        <div className="text-7xl font-black">{s.label}</div>
      </div>
    </div>
  );
}

export function ResultsView({ state, isHost }: { state: HydratedGameState; isHost: boolean }) {
  const ranked: RankedTeam[] = [...state.teams]
    .map((team) => ({ team, score: state.scores[team.id] }))
    .sort((a, b) => b.score - a.score)
    .map((r, idx) => ({ ...r, place: idx + 1 }));

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const first = top3.find((r) => r.place === 1);
  const second = top3.find((r) => r.place === 2);
  const third = top3.find((r) => r.place === 3);

  return (
    <main className="min-h-screen flex flex-col justify-center p-8">
      <h1 className="text-5xl font-bold mb-12 text-center tracking-wide">Результаты</h1>

      <div className="flex items-end justify-center gap-6">
        {second && <PodiumColumn entry={second} />}
        {first && <PodiumColumn entry={first} />}
        {third && <PodiumColumn entry={third} />}
      </div>

      {rest.length > 0 && (
        <div className="mt-10 flex flex-col items-center gap-3 max-w-2xl mx-auto w-full">
          {rest.map((r) => (
            <div
              key={r.team.id}
              className="flex items-center gap-4 p-3 rounded bg-white/5 border border-white/10 w-full"
            >
              <div className="text-2xl font-bold text-white/40 w-10 text-center tabular-nums">{r.place}</div>
              {r.team.logoUrl && (
                <img src={r.team.logoUrl} alt="" className="w-12 h-9 rounded object-cover border border-white/20" />
              )}
              <div className="text-xl font-semibold flex-1">{r.team.name}</div>
              <div className="text-yellow-400 text-2xl font-bold tabular-nums">{r.score}</div>
            </div>
          ))}
        </div>
      )}

      {isHost && (
        <button
          onClick={() => getSocket("host").emit("host:new-game")}
          className="mt-10 mx-auto px-8 py-4 bg-yellow-400 text-black font-bold text-xl rounded shadow-[0_0_24px_rgba(245,197,24,0.4)]"
        >
          Новая игра
        </button>
      )}
    </main>
  );
}
