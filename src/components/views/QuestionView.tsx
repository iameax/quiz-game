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
            className="max-h-72 object-contain rounded-lg border-2 border-amber-400/50 shadow-[0_0_28px_rgba(255,201,60,0.25)]"
          />
        </div>
      )}
      {q.audio && <audio ref={audioRef} src={q.audio} preload="auto" />}
      <div
        className="flex-1 flex items-center justify-center text-center px-8"
        style={{ textShadow: "0 2px 16px rgba(0,0,0,0.6), 0 0 40px rgba(255,201,60,0.08)" }}
      >
        <Markdown className="!text-white [&_*]:!text-white [&_p]:!text-6xl [&_p]:!font-bold [&_p]:!leading-tight [&_p]:!tracking-tight [&_strong]:!text-amber-300">{q.question}</Markdown>
      </div>

      {!isHost && spectatorBanner && (
        <div className="text-center text-3xl text-amber-300 mb-6 font-bold" style={{ textShadow: "0 2px 12px rgba(255,201,60,0.35)" }}>{spectatorBanner}</div>
      )}

      {isHost && (
        <div className="space-y-4 mt-4">
          <div className="p-4 bg-amber-400/5 rounded-lg border border-amber-400/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="text-xs text-amber-300/80 mb-1.5 uppercase tracking-[0.15em] font-medium">Ответ</div>
            <div className="text-white/95">
              <Markdown>{q.answer}</Markdown>
            </div>
          </div>

          {q.audio && (
            <div className="flex gap-2">
              <button onClick={playAudio} className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg transition">▶ Играть</button>
              <button onClick={pauseAudio} className="px-4 py-2 border border-white/20 hover:border-white/40 rounded-lg transition">⏸ Пауза</button>
            </div>
          )}

          {cq.timerState === "idle" && (
            <button
              onClick={() => sock().emit("host:start-timer")}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-lg shadow-[0_0_20px_rgba(255,201,60,0.3)] transition"
            >
              Старт таймера
            </button>
          )}

          <div>
            <div className="text-xs text-amber-300/80 mb-2 uppercase tracking-[0.15em] font-medium">Команда отвечает:</div>
            <div className="flex gap-3 flex-wrap">
              {state.teams.map(t => (
                <div key={t.id} className="flex gap-1 items-center">
                  <span className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg font-semibold">{t.name}</span>
                  <button
                    onClick={() => sock().emit("host:mark-answer", { teamId: t.id, result: "correct" })}
                    className="px-3 py-2 rounded-lg font-bold transition bg-emerald-500/10 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/70 hover:text-emerald-200"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => sock().emit("host:mark-answer", { teamId: t.id, result: "wrong" })}
                    className="px-3 py-2 rounded-lg font-bold transition bg-rose-500/10 border border-rose-400/40 text-rose-300 hover:bg-rose-500/20 hover:border-rose-400/70 hover:text-rose-200"
                  >
                    ✗
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-white/60">
            Попытки:{" "}
            {cq.attempts.map((a, i) => {
              const name = state.teams.find(t => t.id === a.teamId)?.name;
              return (
                <span key={i} className="mr-2">
                  {name}: <span className={a.result === "correct" ? "text-emerald-400" : "text-rose-400"}>{a.result === "correct" ? "✓" : "✗"}</span>
                </span>
              );
            })}
          </div>

          <button
            onClick={() => sock().emit("host:finish-question")}
            className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-lg shadow-[0_0_20px_rgba(255,201,60,0.3)] transition"
          >
            Завершить
          </button>
        </div>
      )}
    </main>
  );
}
