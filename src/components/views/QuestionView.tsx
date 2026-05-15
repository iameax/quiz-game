"use client";
import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket-client";
import type { HydratedGameState, Pack } from "@/lib/types";
import { Markdown } from "@/components/Markdown";
import { TimerBar } from "@/components/TimerBar";

export function QuestionView({ state, pack, isHost }: { state: HydratedGameState; pack: Pack; isHost: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const cq = state.currentQuestion;
  const q = cq ? pack.categories[cq.catIdx].questions[cq.valIdx] : null;
  const audioState = cq?.audioState;

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !q?.audio) return;
    if (!audioState) { a.pause(); a.currentTime = 0; return; }
    const targetPos = audioState.playing && audioState.startedAt
      ? audioState.positionSec + (Date.now() - audioState.startedAt) / 1000
      : audioState.positionSec;
    if (Math.abs(a.currentTime - targetPos) > 0.5) a.currentTime = targetPos;
    if (audioState.playing) a.play().catch(() => {});
    else a.pause();
  }, [audioState?.playing, audioState?.startedAt, audioState?.positionSec, q?.audio]);

  if (!cq || !q) return null;

  const sock = () => getSocket(isHost ? "host" : "spectator");

  const playAudio = () => {
    const pos = audioRef.current?.currentTime ?? 0;
    sock().emit("host:audio-play", { positionSec: pos });
  };
  const pauseAudio = () => {
    const pos = audioRef.current?.currentTime ?? 0;
    sock().emit("host:audio-pause", { positionSec: pos });
  };

  const lastAttempt = cq.attempts[cq.attempts.length - 1];
  const spectatorBanner = lastAttempt
    ? `Команда ${state.teams.find(t => t.id === lastAttempt.teamId)?.name} ответила ${lastAttempt.result === "correct" ? "правильно!" : "неправильно!"}`
    : null;

  return (
    <main className="min-h-screen flex flex-col p-6">
      <TimerBar
        startedAt={cq.timerStartedAt}
        durationSec={state.settings.roundTimeSec}
        state={cq.timerState}
      />
      {q.image && (
        <div className="my-6 flex justify-center">
          <img
            src={q.image}
            alt=""
            className="max-h-72 object-contain rounded border-2 border-yellow-400/60 shadow-[0_0_24px_rgba(245,197,24,0.3)]"
          />
        </div>
      )}
      {q.audio && <audio ref={audioRef} src={q.audio} preload="auto" />}
      <div className="flex-1 flex items-center justify-center text-4xl text-center px-4">
        <Markdown>{q.question}</Markdown>
      </div>

      {!isHost && spectatorBanner && (
        <div className="text-center text-3xl text-yellow-400 mb-6 font-bold">{spectatorBanner}</div>
      )}

      {isHost && (
        <div className="space-y-4 mt-4">
          <div className="p-4 bg-white/5 rounded border border-yellow-400/30">
            <div className="text-sm opacity-70 mb-1 uppercase tracking-wide">Ответ (только для ведущего)</div>
            <Markdown>{q.answer}</Markdown>
          </div>

          {q.audio && (
            <div className="flex gap-2">
              <button onClick={playAudio} className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded">▶ Играть</button>
              <button onClick={pauseAudio} className="px-4 py-2 border border-white/30 rounded">⏸ Пауза</button>
            </div>
          )}

          {cq.timerState === "idle" && (
            <button
              onClick={() => sock().emit("host:start-timer")}
              className="px-6 py-3 bg-yellow-400 text-black font-bold rounded"
            >
              Старт таймера
            </button>
          )}

          <div>
            <div className="text-sm opacity-70 mb-2 uppercase tracking-wide">Команда отвечает:</div>
            <div className="flex gap-3 flex-wrap">
              {state.teams.map(t => (
                <div key={t.id} className="flex gap-1 items-center">
                  <span className="px-3 py-2 bg-white/10 rounded font-semibold">{t.name}</span>
                  <button
                    onClick={() => sock().emit("host:mark-answer", { teamId: t.id, result: "correct" })}
                    className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded font-bold"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => sock().emit("host:mark-answer", { teamId: t.id, result: "wrong" })}
                    className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded font-bold"
                  >
                    ✗
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm opacity-70">
            Попытки:{" "}
            {cq.attempts.map((a, i) => {
              const name = state.teams.find(t => t.id === a.teamId)?.name;
              return (
                <span key={i} className="mr-2">
                  {name}: {a.result === "correct" ? "✓" : "✗"}
                </span>
              );
            })}
          </div>

          <button
            onClick={() => sock().emit("host:finish-question")}
            className="px-6 py-3 bg-yellow-400 text-black font-bold rounded"
          >
            Завершить
          </button>
        </div>
      )}
    </main>
  );
}
