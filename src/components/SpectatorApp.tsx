"use client";
import { useEffect, useState } from "react";
import { useGameClient } from "@/lib/use-socket";
import { BoardView } from "./views/BoardView";
import { QuestionView } from "./views/QuestionView";
import { ResultsView } from "./views/ResultsView";
import { SoundEffects } from "./SoundEffects";
import { AutoplayGate } from "./AutoplayGate";
import type { Pack } from "@/lib/types";

export function SpectatorApp() {
  const { state } = useGameClient("spectator");
  const [pack, setPack] = useState<Pack | null>(null);

  useEffect(() => {
    if (!state) { setPack(null); return; }
    if (pack?.id === state.packId) return;
    fetch(`/api/pack/${state.packId}`).then(r => r.json()).then(setPack);
  }, [state?.packId]);

  return (
    <AutoplayGate>
      <SoundEffects />
      {!state && <main className="min-h-screen flex items-center justify-center text-2xl">Ожидание игры...</main>}
      {state && !pack && <main className="p-8">Загрузка...</main>}
      {state && pack && state.phase === "board" && <BoardView state={state} pack={pack} isHost={false} />}
      {state && pack && state.phase === "question" && <QuestionView state={state} pack={pack} isHost={false} />}
      {state && pack && state.phase === "results" && <ResultsView state={state} isHost={false} />}
      {state && state.phase === "creating" && (
        <main className="min-h-screen flex items-center justify-center text-2xl">Игра создаётся...</main>
      )}
    </AutoplayGate>
  );
}
