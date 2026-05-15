import type { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";
import { packs, teamStore, gameStore, hostState, timers } from "./context";
import {
  createGame,
  selectQuestion,
  startTimer,
  expireTimer,
  markAnswer,
  finishQuestion,
  audioPlay,
  audioPause,
  hydrateState,
} from "./game-engine";
import type { Settings, SoundKind, Team } from "@/lib/types";

function getPack(packId: string) {
  const p = packs.find(p => p.id === packId);
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
  const totalMs = state.settings.roundTimeSec * 1000;
  const remaining = Math.max(0, startedAt + totalMs - Date.now());
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
  socket.emit("packs", packs.map(p => ({ id: p.id, name: p.name })));
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
      "host:create-game",
      (input: { packId: string; settings: Settings; teamIds: string[] }) => {
        const pack = getPack(input.packId);
        const game = createGame({
          packId: input.packId,
          pack,
          settings: input.settings,
          teamIds: input.teamIds,
        });
        gameStore.set(game);
        broadcast(io);
      }
    );

    socket.on("host:select-question", (input: { catIdx: number; valIdx: number }) => {
      const s = gameStore.get(); if (!s) return;
      const pack = getPack(s.packId);
      const next = selectQuestion(s, input, pack);
      gameStore.set(next);
      broadcast(io);
      broadcastSound(io, "select");
    });

    socket.on("host:start-timer", () => {
      const s = gameStore.get(); if (!s) return;
      const next = startTimer(s, Date.now());
      gameStore.set(next);
      broadcast(io);
      setExpiryTimer(io);
    });

    socket.on("host:mark-answer", (input: { teamId: string; result: "correct" | "wrong" }) => {
      const s = gameStore.get(); if (!s) return;
      const next = markAnswer(s, input);
      gameStore.set(next);
      broadcast(io);
      broadcastSound(io, input.result);
    });

    socket.on("host:finish-question", () => {
      const s = gameStore.get(); if (!s) return;
      if (timers.current) { clearTimeout(timers.current); timers.current = null; }
      const next = finishQuestion(s);
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
