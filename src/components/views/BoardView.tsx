"use client";
import { Fragment } from "react";
import { getSocket } from "@/lib/socket-client";
import type { HydratedGameState, Pack } from "@/lib/types";

export function BoardView({ state, pack, isHost }: { state: HydratedGameState; pack: Pack; isHost: boolean }) {
  const onClick = (catIdx: number, valIdx: number) => {
    if (!isHost) return;
    if (state.board[`${catIdx}_${valIdx}`] === "used") return;
    getSocket("host").emit("host:select-question", { catIdx, valIdx });
  };

  const numCols = pack.categories[0].questions.length;

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 p-6">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `220px repeat(${numCols}, 1fr)` }}
        >
          {pack.categories.map((cat, catIdx) => (
            <Fragment key={`row-${catIdx}`}>
              <div className="flex items-center justify-center text-center font-bold p-3 bg-gradient-to-b from-blue-800 to-blue-900 rounded text-lg uppercase tracking-wide">
                {cat.name}
              </div>
              {cat.questions.map((q, valIdx) => {
                const used = state.board[`${catIdx}_${valIdx}`] === "used";
                return (
                  <button
                    key={`cell-${catIdx}-${valIdx}`}
                    onClick={() => onClick(catIdx, valIdx)}
                    disabled={used || !isHost}
                    className={`p-6 rounded text-5xl font-extrabold transition ${
                      used
                        ? "bg-blue-950/30 text-transparent"
                        : "bg-gradient-to-b from-blue-600 to-blue-800 text-yellow-300 shadow-[inset_0_0_20px_rgba(0,0,0,0.4),0_0_12px_rgba(245,197,24,0.15)] hover:from-blue-500 hover:to-blue-700"
                    } ${isHost && !used ? "cursor-pointer" : "cursor-default"}`}
                  >
                    {q.value}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="p-4 border-t border-white/10 flex gap-6 justify-around bg-black/30">
        {state.teams.map(t => (
          <div key={t.id} className="flex items-center gap-3">
            {t.logoUrl && <img src={t.logoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-yellow-400/40" />}
            <div>
              <div className="font-semibold text-lg">{t.name}</div>
              <div className="text-yellow-400 text-3xl font-bold">{state.scores[t.id]}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
