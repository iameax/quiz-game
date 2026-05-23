"use client";
import { Fragment, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket-client";
import type { HydratedGameState, Pack } from "@/lib/types";

type BoardFocus = { catIdx: number; valIdx: number };

export function stepBoardFocus(
  focus: BoardFocus | null,
  board: HydratedGameState["board"],
  numRows: number,
  numCols: number,
  dc: number,
  dv: number,
): BoardFocus | null {
  if (!focus) return focus;

  const isUnused = (catIdx: number, valIdx: number) => board[`${catIdx}_${valIdx}`] === "unused";
  let best: BoardFocus | null = null;
  let bestDistance = Infinity;
  let bestAxisDistance = Infinity;
  let bestCrossDistance = Infinity;

  for (let catIdx = 0; catIdx < numRows; catIdx++) {
    for (let valIdx = 0; valIdx < numCols; valIdx++) {
      if (catIdx === focus.catIdx && valIdx === focus.valIdx) continue;
      if (!isUnused(catIdx, valIdx)) continue;

      const rowDelta = catIdx - focus.catIdx;
      const colDelta = valIdx - focus.valIdx;

      if (dc < 0 && rowDelta >= 0) continue;
      if (dc > 0 && rowDelta <= 0) continue;
      if (dv < 0 && colDelta >= 0) continue;
      if (dv > 0 && colDelta <= 0) continue;

      const axisDistance = dc !== 0 ? Math.abs(rowDelta) : Math.abs(colDelta);
      const crossDistance = dc !== 0 ? Math.abs(colDelta) : Math.abs(rowDelta);
      const distance = axisDistance + crossDistance;

      if (
        distance < bestDistance ||
        (distance === bestDistance && axisDistance < bestAxisDistance) ||
        (distance === bestDistance && axisDistance === bestAxisDistance && crossDistance < bestCrossDistance)
      ) {
        best = { catIdx, valIdx };
        bestDistance = distance;
        bestAxisDistance = axisDistance;
        bestCrossDistance = crossDistance;
      }
    }
  }

  return best ?? focus;
}

export function BoardView({ state, pack, isHost }: { state: HydratedGameState; pack: Pack; isHost: boolean }) {
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState("");
  const [focus, setFocus] = useState<{ catIdx: number; valIdx: number } | null>(null);

  const onClick = (catIdx: number, valIdx: number) => {
    if (!isHost) return;
    if (state.board[`${catIdx}_${valIdx}`] === "used") return;
    getSocket("host").emit("host:select-question", { catIdx, valIdx });
  };

  const startEditScore = (teamId: string) => {
    if (!isHost) return;
    setEditingTeamId(teamId);
    setEditScore(String(state.scores[teamId] ?? 0));
  };
  const commitEditScore = () => {
    if (!editingTeamId) return;
    const n = Number(editScore);
    if (Number.isFinite(n)) {
      getSocket("host").emit("host:set-score", { teamId: editingTeamId, score: Math.trunc(n) });
    }
    setEditingTeamId(null);
  };
  const cancelEditScore = () => setEditingTeamId(null);

  const numCols = pack.categories[0].questions.length;
  const numRows = pack.categories.length;

  useEffect(() => {
    if (!isHost) return;
    if (focus && state.board[`${focus.catIdx}_${focus.valIdx}`] !== "used") return;
    for (let c = 0; c < numRows; c++) {
      for (let v = 0; v < numCols; v++) {
        if (state.board[`${c}_${v}`] !== "used") {
          setFocus({ catIdx: c, valIdx: v });
          return;
        }
      }
    }
    setFocus(null);
  }, [isHost, state.board, numRows, numCols, focus]);

  useEffect(() => {
    if (!isHost) return;
    if (editingTeamId) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setFocus(f => stepBoardFocus(f, state.board, numRows, numCols, -1, 0));
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocus(f => stepBoardFocus(f, state.board, numRows, numCols, 1, 0));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocus(f => stepBoardFocus(f, state.board, numRows, numCols, 0, -1));
          break;
        case "ArrowRight":
          e.preventDefault();
          setFocus(f => stepBoardFocus(f, state.board, numRows, numCols, 0, 1));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focus) onClick(focus.catIdx, focus.valIdx);
          break;
        case "Escape":
          if (process.env.NODE_ENV !== "development") break;
          e.preventDefault();
          getSocket("host").emit("host:new-game");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isHost, editingTeamId, numRows, numCols, focus, state.board]);

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
                const focused = isHost && focus?.catIdx === catIdx && focus?.valIdx === valIdx;
                return (
                  <button
                    key={`cell-${catIdx}-${valIdx}`}
                    onClick={() => { setFocus({ catIdx, valIdx }); onClick(catIdx, valIdx); }}
                    disabled={used || !isHost}
                    className={`p-6 rounded text-5xl font-extrabold transition outline-none ${
                      used
                        ? "bg-blue-950/30 text-transparent"
                        : "bg-gradient-to-b from-blue-600 to-blue-800 text-yellow-300 shadow-[inset_0_0_20px_rgba(0,0,0,0.4),0_0_12px_rgba(245,197,24,0.15)] hover:from-blue-500 hover:to-blue-700"
                    } ${focused ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-900" : ""} ${isHost && !used ? "cursor-pointer" : "cursor-default"}`}
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
            {t.logoUrl && <img src={t.logoUrl} alt="" className="w-24 h-16 rounded-lg object-cover border-2 border-yellow-400/40" />}
            <div>
              <div className="font-semibold text-lg">{t.name}</div>
              {editingTeamId === t.id ? (
                <input
                  type="number"
                  autoFocus
                  value={editScore}
                  onChange={e => setEditScore(e.target.value)}
                  onBlur={commitEditScore}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); commitEditScore(); }
                    else if (e.key === "Escape") { e.preventDefault(); cancelEditScore(); }
                  }}
                  className="w-28 bg-white/10 border border-amber-400/60 text-yellow-400 text-3xl font-bold rounded px-2 py-0.5 focus:outline-none focus:border-amber-400"
                />
              ) : (
                <div
                  onDoubleClick={() => startEditScore(t.id)}
                  title={isHost ? "Двойной клик: изменить" : undefined}
                  className={`text-yellow-400 text-3xl font-bold ${isHost ? "cursor-pointer select-none" : ""}`}
                >
                  {state.scores[t.id]}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
