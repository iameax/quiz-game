"use client";
import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket-client";
import type { HydratedGameState, Pack } from "@/lib/types";
import { Markdown } from "@/components/Markdown";
import { TimerBar } from "@/components/TimerBar";

function stripMarkdown(s: string): string {
  return s
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(?<!\*)\*(?!\*)([^*\n]+?)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_(?!_)([^_\n]+?)_(?!_)/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

export function QuestionView({ state, pack, isHost }: { state: HydratedGameState; pack: Pack; isHost: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const cq = state.currentQuestion;
  const q = cq ? pack.categories[cq.catIdx].questions[cq.valIdx] : null;
  const audioState = cq?.audioState;

  useEffect(() => {
    if (!isHost || !cq) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const s = getSocket("host");
      if (e.code === "Space") {
        e.preventDefault();
        if (cq.timerState === "idle") s.emit("host:start-timer");
        else if (cq.timerState === "running") s.emit("host:pause-timer");
        else if (cq.timerState === "paused") s.emit("host:resume-timer");
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (cq.answerRevealed) s.emit("host:toggle-answer");
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        if (!cq.answerRevealed) s.emit("host:toggle-answer");
      } else if (e.code === "Enter") {
        e.preventDefault();
        s.emit("host:finish-question");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isHost, cq?.timerState, cq?.answerRevealed]);

  useEffect(() => {
    if (isHost) return;
    const a = audioRef.current;
    if (!a || !q?.audio) return;
    if (!audioState) { a.pause(); a.currentTime = 0; return; }
    const targetPos = audioState.playing && audioState.startedAt
      ? audioState.positionSec + (Date.now() - audioState.startedAt) / 1000
      : audioState.positionSec;
    if (Math.abs(a.currentTime - targetPos) > 0.5) a.currentTime = targetPos;
    if (audioState.playing) a.play().catch(() => {});
    else a.pause();
  }, [isHost, audioState?.playing, audioState?.startedAt, audioState?.positionSec, q?.audio]);

  if (!cq || !q) return null;

  const sock = () => getSocket(isHost ? "host" : "spectator");

  const currentAudioPos = () => {
    if (!audioState) return 0;
    if (audioState.playing && audioState.startedAt) {
      return audioState.positionSec + (Date.now() - audioState.startedAt) / 1000;
    }
    return audioState.positionSec;
  };
  const playAudio = () => {
    sock().emit("host:audio-play", { positionSec: currentAudioPos() });
  };
  const pauseAudio = () => {
    sock().emit("host:audio-pause", { positionSec: currentAudioPos() });
  };

  const lastAttempt = cq.attempts[cq.attempts.length - 1];
  const lastTeam = lastAttempt ? state.teams.find(t => t.id === lastAttempt.teamId) : null;

  const SCORE_BUTTONS: { pct: number; label: string; tone: "pos" | "neg" }[] = [
    { pct: 100, label: "+100%", tone: "pos" },
    { pct: 75, label: "+75%", tone: "pos" },
    { pct: 50, label: "+50%", tone: "pos" },
    { pct: 25, label: "+25%", tone: "pos" },
    { pct: -25, label: "-25%", tone: "neg" },
    { pct: -50, label: "-50%", tone: "neg" },
  ];

  return (
    <main className="min-h-screen flex flex-col p-6 [&_button]:focus:outline-none [&_button]:focus-visible:outline-none">
      <div className="flex justify-center items-baseline gap-3 mt-3">
        <div className="text-white/70 text-lg uppercase tracking-[0.2em] font-medium">
          {pack.categories[cq.catIdx].name}
        </div>
        <div className="text-white/30 text-lg">·</div>
        <div className="text-white/70 text-2xl font-bold tracking-tight">
          {cq.value}
        </div>
      </div>
      {q.image && (
        <div className="my-6 flex justify-center">
          <img
            src={q.image}
            alt=""
            className="max-h-72 object-contain rounded-lg border-2 border-amber-400/50 shadow-[0_0_28px_rgba(255,201,60,0.25)]"
          />
        </div>
      )}
      {q.audio && !isHost && (
        <audio
          ref={audioRef}
          src={q.audio}
          preload="auto"
          onEnded={() => getSocket("spectator").emit("client:audio-ended")}
        />
      )}
      <div
        className="flex-1 flex flex-col items-center justify-center text-center px-8"
        style={{ textShadow: "0 2px 16px rgba(0,0,0,0.6), 0 0 40px rgba(255,201,60,0.08)" }}
      >
        {cq.answerRevealed ? (
          <>
            <div className="text-white-90 underline underline-offset-4 uppercase tracking-[0.25em] font-semibold text-2xl mb-6">Ответ</div>
            <Markdown className="text-white [&_p]:mb-4 [&_p]:text-4xl! [&_p]:font-medium [&_p]:leading-tight! [&_p]:tracking-tight! [&_h1]:text-7xl! [&_h1]:font-semibold! [&_h1]:leading-tight! [&_h2]:!text-6xl [&_h2]:!font-semibold [&_h2]:!leading-tight [&_h3]:!text-5xl [&_h3]:!font-semibold [&_h3]:!leading-tight [&_h4]:!text-4xl [&_h4]:!font-semibold [&_strong]:!text-amber-300 [&_strong]:!font-semibold">{Array.isArray(q.answer) ? q.answer.join("\n") : q.answer}</Markdown>
          </>
        ) : (
          <Markdown className="text-white [&_p]:mb-4 [&_p]:text-4xl! [&_p]:font-medium [&_p]:leading-tight! [&_p]:tracking-tight! [&_h1]:text-7xl! [&_h1]:font-semibold! [&_h1]:leading-tight! [&_h2]:!text-6xl [&_h2]:!font-semibold [&_h2]:!leading-tight [&_h3]:!text-5xl [&_h3]:!font-semibold [&_h3]:!leading-tight [&_h4]:!text-4xl [&_h4]:!font-semibold [&_strong]:!text-amber-300 [&_strong]:!font-semibold">{Array.isArray(q.question) ? q.question.join("\n") : q.question}</Markdown>
        )}
      </div>

      {isHost && q.audio && (
        <div className="flex justify-center mt-2 mb-4">
          {audioState?.playing ? (
            <button onClick={pauseAudio} className="px-6 py-3 border border-white/20 hover:border-white/40 rounded-lg transition text-lg cursor-pointer">⏸ Пауза</button>
          ) : (
            <button onClick={playAudio} className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg transition text-lg cursor-pointer">▶ Играть</button>
          )}
        </div>
      )}

      {!isHost && lastAttempt && lastTeam && (
        <div className="flex items-center justify-center gap-4 mb-6">
          {lastTeam.logoUrl && (
            <img src={lastTeam.logoUrl} alt="" className="w-16 h-12 rounded-lg object-cover border-2 border-amber-400/50 shadow-[0_0_18px_rgba(255,201,60,0.25)]" />
          )}
          <div className="text-3xl text-amber-300 font-bold" style={{ textShadow: "0 2px 12px rgba(255,201,60,0.35)" }}>
            {lastTeam.name}: {lastAttempt.pct > 0 ? "+" : ""}{lastAttempt.pct}%
          </div>
        </div>
      )}

      {isHost && (
        <div className="space-y-4 mt-4">
          <div className={`px-2 transition-opacity ${cq.timerState === "idle" ? "opacity-0" : "opacity-100"}`}>
            <TimerBar
              startedAt={cq.timerStartedAt}
              elapsedMs={cq.timerElapsedMs}
              durationSec={state.settings.roundTimeSec}
              state={cq.timerState}
            />
          </div>
          <div className="p-4 bg-amber-400/5 rounded-lg border border-amber-400/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs text-amber-300/80 uppercase tracking-[0.15em] font-medium">Ответ</div>
              <button
                onClick={() => sock().emit("host:toggle-answer")}
                className="px-3 py-1 text-xs uppercase tracking-[0.15em] font-medium border border-amber-400/40 text-amber-300 hover:bg-amber-400/10 hover:border-amber-400/70 rounded transition cursor-pointer"
              >
                {cq.answerRevealed ? "Скрыть ответ" : "Показать ответ"}
              </button>
            </div>
            <div className="text-white/95 whitespace-pre-line">
              {stripMarkdown(Array.isArray(q.answer) ? q.answer.join("\n") : q.answer)}
            </div>
          </div>

          {q.comment && (
            <div className="p-4 bg-white/[0.03] rounded-lg border border-white/10">
              <div className="text-xs text-white/50 mb-1.5 uppercase tracking-[0.15em] font-medium">Комментарий</div>
              <div className="text-white/80 text-sm">
                <Markdown>{q.comment}</Markdown>
              </div>
            </div>
          )}

          {/* {cq.timerState === "idle" && (
            <button
              onClick={() => sock().emit("host:start-timer")}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-lg shadow-[0_0_20px_rgba(255,201,60,0.3)] transition cursor-pointer"
            >
              Старт таймера
            </button>
          )} */}

          <div>
            <div className="text-xs text-amber-300/80 mb-2 uppercase tracking-[0.15em] font-medium">Команда отвечает:</div>
            <div className="flex flex-col gap-2">
              {state.teams.map(t => (
                <div key={t.id} className="flex gap-2 items-center flex-wrap">
                  <span className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg font-semibold w-56 flex items-center gap-2">
                    {t.logoUrl && <img src={t.logoUrl} alt="" className="w-8 h-6 rounded object-cover flex-shrink-0" />}
                    {t.name}
                  </span>
                  {SCORE_BUTTONS.map(b => (
                    <button
                      key={b.pct}
                      onClick={() => {
                        sock().emit("host:mark-answer", { teamId: t.id, pct: b.pct });
                        if (b.pct === 100 && !cq.answerRevealed) sock().emit("host:toggle-answer");
                      }}
                      className={
                        b.tone === "pos"
                          ? "px-3 py-2 rounded-lg font-bold transition cursor-pointer bg-emerald-500/10 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/70 hover:text-emerald-200"
                          : "px-3 py-2 rounded-lg font-bold transition cursor-pointer bg-rose-500/10 border border-rose-400/40 text-rose-300 hover:bg-rose-500/20 hover:border-rose-400/70 hover:text-rose-200"
                      }
                    >
                      {b.label}
                    </button>
                  ))}
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
                  {name}: <span className={a.pct >= 0 ? "text-emerald-400" : "text-rose-400"}>{a.pct > 0 ? "+" : ""}{a.pct}%</span>
                </span>
              );
            })}
          </div>

          {/* <button
            onClick={() => sock().emit("host:finish-question")}
            className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-lg shadow-[0_0_20px_rgba(255,201,60,0.3)] transition"
          >
            Завершить
          </button> */}
        </div>
      )}

      {!isHost && (
        <div className={`fixed bottom-6 left-6 right-6 z-10 transition-opacity ${cq.timerState === "idle" ? "opacity-0" : "opacity-100"}`}>
          <TimerBar
            startedAt={cq.timerStartedAt}
            elapsedMs={cq.timerElapsedMs}
            durationSec={state.settings.roundTimeSec}
            state={cq.timerState}
          />
        </div>
      )}
    </main>
  );
}
