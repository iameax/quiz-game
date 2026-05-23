"use client";
import { useEffect, useState } from "react";
import { useGameClient } from "@/lib/use-socket";
import { CreateView } from "./views/CreateView";
import { WelcomeView } from "./views/WelcomeView";
import { BoardView } from "./views/BoardView";
import { QuestionView } from "./views/QuestionView";
import { ResultsView } from "./views/ResultsView";
import { HostSoundPanel } from "./HostSoundPanel";
import { HostMenu } from "./HostMenu";
import type { Pack } from "@/lib/types";

export function HostApp() {
  const { state, packs, teams, error } = useGameClient("host");
  const [pack, setPack] = useState<Pack | null>(null);

  useEffect(() => {
    if (!state) { setPack(null); return; }
    if (pack?.id === state.packId) return;
    fetch(`/api/pack/${state.packId}`).then(r => r.json()).then(setPack);
  }, [state?.packId]);

  if (error) return <main className="p-8 text-red-400">{error}</main>;
  if (!state) return <CreateView packs={packs} teams={teams} />;
  if (!pack) return <main className="p-8">Загрузка пакета...</main>;
  return (
    <>
      {state.phase === "welcome" && <WelcomeView state={state} pack={pack} isHost />}
      {state.phase === "board" && <BoardView state={state} pack={pack} isHost />}
      {state.phase === "question" && <QuestionView state={state} pack={pack} isHost />}
      {state.phase === "results" && <ResultsView state={state} isHost />}
      {(state.phase === "welcome" || state.phase === "board") && <HostMenu state={state} />}
      {(state.phase === "board" || state.phase === "question") && <HostSoundPanel />}
    </>
  );
}
