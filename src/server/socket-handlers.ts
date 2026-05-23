import type { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";
import { getPacks, teamStore, gameStore, hostState, timers } from "./context";
import {
  createGame,
  welcomeAdvance,
  selectQuestion,
  startTimer,
  pauseTimer,
  resumeTimer,
  expireTimer,
  markAnswer,
  setScore,
  toggleAnswer,
  finishQuestion,
  audioPlay,
  audioPause,
  hydrateState,
} from "./game-engine";
import type { Settings, SoundKind, Team } from "@/lib/types";

function getPack(packId: string) {
  const p = getPacks().find(p => p.id === packId);
  if (!p) throw new Error("pack not found");
  return p;
}

function broadcast(io: Server) {
  const state = gameStore.get();
  if (!state) {
    io.emit("state", null);
    return;
  }
  const teams = teamStore.get().teams;
  io.emit("state", hydrateState(state, teams));
}

function broadcastSound(io: Server, kind: SoundKind) {
  io.to("spectators").emit("sound", { kind });
}

function setExpiryTimer(io: Server) {
  if (timers.current) { clearTimeout(timers.current); timers.current = null; }
  const state = gameStore.get();
  if (!state?.currentQuestion) return;
  if (state.currentQuestion.timerState !== "running") return;
  const startedAt = state.currentQuestion.timerStartedAt!;
  const elapsed = state.currentQuestion.timerElapsedMs;
  const totalMs = state.settings.roundTimeSec * 1000;
  const remaining = Math.max(0, totalMs - elapsed - (Date.now() - startedAt));
  timers.current = setTimeout(() => {
    const s = gameStore.get();
    if (!s) return;
    const next = expireTimer(s);
    gameStore.set(next);
    broadcast(io);
    broadcastSound(io, "timer-end");
  }, remaining);
}

function emitState(socket: Socket) {
  const state = gameStore.get();
  if (!state) {
    socket.emit("state", null);
    return;
  }
  const teams = teamStore.get().teams;
  socket.emit("state", hydrateState(state, teams));
}

function emitPacks(socket: Socket) {
  socket.emit("packs", getPacks().map(p => ({ id: p.id, name: p.name })));
}

function emitTeams(socket: Socket) {
  socket.emit("teams", teamStore.get().teams);
}

export function registerSocketHandlers(io: Server) {
  io.on("connection", socket => {
    const role = (socket.handshake.query.role as string) || "spectator";
    if (role === "host") {
      if (hostState.socketId && hostState.socketId !== socket.id) {
        socket.emit("error", { message: "Host already connected" });
        socket.disconnect();
        return;
      }
      hostState.socketId = socket.id;
      socket.join("host");
    } else {
      socket.join("spectators");
    }
    emitState(socket);
    emitPacks(socket);
    emitTeams(socket);

    socket.on("disconnect", () => {
      if (hostState.socketId === socket.id) hostState.socketId = null;
    });

    socket.on(
      "host:create-team",
      (input: { name: string; logoUrl?: string }, cb?: (t: Team) => void) => {
        const lib = teamStore.get();
        const team: Team = {
          id: randomUUID(),
          name: input.name,
          logoUrl: input.logoUrl,
          createdAt: new Date().toISOString(),
        };
        teamStore.set({ teams: [...lib.teams, team] });
        io.emit("teams", teamStore.get().teams);
        cb?.(team);
      }
    );

    socket.on(
      "host:update-team",
      (
        input: { id: string; name?: string; logoUrl?: string | null },
        cb?: (t: Team | null) => void
      ) => {
        const lib = teamStore.get();
        const idx = lib.teams.findIndex(t => t.id === input.id);
        if (idx < 0) { cb?.(null); return; }
        const prev = lib.teams[idx];
        const next: Team = {
          ...prev,
          name: input.name !== undefined ? input.name : prev.name,
          logoUrl:
            input.logoUrl === null
              ? undefined
              : input.logoUrl !== undefined
                ? input.logoUrl
                : prev.logoUrl,
        };
        const teams = [...lib.teams];
        teams[idx] = next;
        teamStore.set({ teams });
        io.emit("teams", teamStore.get().teams);
        cb?.(next);
      }
    );

    socket.on(
      "host:delete-team",
      (input: { id: string }, cb?: (r: { ok: boolean; reason?: string }) => void) => {
        const game = gameStore.get();
        if (game && game.teamIds.includes(input.id)) {
          cb?.({ ok: false, reason: "team is in active game" });
          return;
        }
        const lib = teamStore.get();
        teamStore.set({ teams: lib.teams.filter(t => t.id !== input.id) });
        io.emit("teams", teamStore.get().teams);
        cb?.({ ok: true });
      }
    );

    socket.on(
      "host:create-game",
      (input: { packId: string; settings: Settings; teamIds: string[]; skipWelcome?: boolean }) => {
        const pack = getPack(input.packId);
        const game = createGame({
          packId: input.packId,
          pack,
          settings: input.settings,
          teamIds: input.teamIds,
        });
        if (input.skipWelcome) {
          const { welcomeStep: _w, ...rest } = game;
          gameStore.set({ ...rest, phase: "board" });
          broadcast(io);
          broadcastSound(io, "intro");
        } else {
          gameStore.set(game);
          broadcast(io);
        }
      }
    );

    socket.on("host:welcome-advance", () => {
      const s = gameStore.get(); if (!s) return;
      if (s.phase !== "welcome") return;
      const pack = getPack(s.packId);
      const next = welcomeAdvance(s, pack);
      gameStore.set(next);
      broadcast(io);
      if (s.phase === "welcome" && next.phase === "board") broadcastSound(io, "intro");
    });

    socket.on("host:select-question", (input: { catIdx: number; valIdx: number }) => {
      const s = gameStore.get(); if (!s) return;
      const pack = getPack(s.packId);
      const next = selectQuestion(s, input, pack);
      gameStore.set(next);
      broadcast(io);
      broadcastSound(io, "select");
    });

    socket.on("host:play-sound", (input: { kind: SoundKind }) => {
      const ALLOWED: SoundKind[] = ["applause", "wow"];
      if (!ALLOWED.includes(input.kind)) return;
      broadcastSound(io, input.kind);
    });

    socket.on("host:start-timer", () => {
      const s = gameStore.get(); if (!s) return;
      const next = startTimer(s, Date.now());
      gameStore.set(next);
      broadcast(io);
      setExpiryTimer(io);
    });

    socket.on("host:pause-timer", () => {
      const s = gameStore.get(); if (!s) return;
      if (s.currentQuestion?.timerState !== "running") return;
      const next = pauseTimer(s, Date.now());
      gameStore.set(next);
      if (timers.current) { clearTimeout(timers.current); timers.current = null; }
      broadcast(io);
    });

    socket.on("host:resume-timer", () => {
      const s = gameStore.get(); if (!s) return;
      if (s.currentQuestion?.timerState !== "paused") return;
      const next = resumeTimer(s, Date.now());
      gameStore.set(next);
      broadcast(io);
      setExpiryTimer(io);
    });

    socket.on("host:mark-answer", (input: { teamId: string; pct: number; flat?: number }) => {
      const s = gameStore.get(); if (!s) return;
      const next = markAnswer(s, input);
      gameStore.set(next);
      broadcast(io);
      const negative = input.flat !== undefined ? input.flat < 0 : input.pct < 0;
      broadcastSound(io, negative ? "wrong" : "correct");
    });

    socket.on("host:toggle-answer", () => {
      const s = gameStore.get(); if (!s) return;
      const wasRevealed = s.currentQuestion?.answerRevealed ?? false;
      const hasCorrect = (s.currentQuestion?.attempts ?? []).some(a => a.pct > 0);
      let next = toggleAnswer(s);
      if (!wasRevealed && next.currentQuestion?.timerState === "running") {
        next = pauseTimer(next, Date.now());
        if (timers.current) { clearTimeout(timers.current); timers.current = null; }
      }
      gameStore.set(next);
      broadcast(io);
      if (!wasRevealed && !hasCorrect) broadcastSound(io, "noanswer");
    });

    socket.on("host:finish-question", () => {
      const s = gameStore.get(); if (!s) return;
      if (timers.current) { clearTimeout(timers.current); timers.current = null; }
      const next = finishQuestion(s, getPack(s.packId));
      gameStore.set(next);
      broadcast(io);
    });

    socket.on("host:audio-play", (input: { positionSec: number }) => {
      const s = gameStore.get(); if (!s) return;
      const next = audioPlay(s, input, Date.now());
      gameStore.set(next);
      broadcast(io);
    });

    socket.on("host:audio-pause", (input: { positionSec: number }) => {
      const s = gameStore.get(); if (!s) return;
      const next = audioPause(s, input);
      gameStore.set(next);
      broadcast(io);
    });

    socket.on("client:audio-ended", () => {
      const s = gameStore.get(); if (!s) return;
      if (!s.currentQuestion?.audioState?.playing) return;
      const next = audioPause(s, { positionSec: 0 });
      gameStore.set(next);
      broadcast(io);
    });

    socket.on("host:set-score", (input: { teamId: string; score: number }) => {
      const s = gameStore.get(); if (!s) return;
      const next = setScore(s, input.teamId, input.score);
      gameStore.set(next);
      broadcast(io);
    });

    socket.on("host:update-settings", (input: Settings) => {
      const s = gameStore.get(); if (!s) return;
      const next = { ...s, settings: { ...s.settings, ...input } };
      gameStore.set(next);
      broadcast(io);
      setExpiryTimer(io);
    });

    socket.on("host:end-game", () => {
      const s = gameStore.get(); if (!s) return;
      gameStore.set({ ...s, phase: "results", currentQuestion: null });
      broadcast(io);
    });

    socket.on("host:new-game", () => {
      gameStore.clear();
      if (timers.current) { clearTimeout(timers.current); timers.current = null; }
      io.emit("state", null);
    });
  });
}
