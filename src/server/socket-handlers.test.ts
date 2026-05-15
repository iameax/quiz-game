import { expect, test, describe, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { Server } from "socket.io";
import { io as Client, Socket } from "socket.io-client";
import type { AddressInfo } from "net";
import fs from "fs";
import path from "path";

let httpServer: ReturnType<typeof createServer>;
let port: number;
let hostSocket: Socket;
let spectatorSocket: Socket;
const packsDir = path.join(process.cwd(), "data", "packs");
const seededPack = path.join(packsDir, "test-pack.json");
const gameFile = path.join(process.cwd(), "data", "game.json");
const teamsFile = path.join(process.cwd(), "data", "teams.json");
let preExistingGame: Buffer | null = null;
let preExistingTeams: Buffer | null = null;

beforeAll(async () => {
  fs.mkdirSync(packsDir, { recursive: true });
  fs.writeFileSync(seededPack, JSON.stringify({
    id: "test-pack",
    name: "Test Pack",
    categories: [
      { name: "C1", questions: [{ value: 100, question: "Q", answer: "A" }, { value: 200, question: "Q2", answer: "A2" }] },
      { name: "C2", questions: [{ value: 100, question: "Q3", answer: "A3" }, { value: 200, question: "Q4", answer: "A4" }] },
    ],
  }));
  if (fs.existsSync(gameFile)) {
    preExistingGame = fs.readFileSync(gameFile);
    fs.unlinkSync(gameFile);
  }
  if (fs.existsSync(teamsFile)) {
    preExistingTeams = fs.readFileSync(teamsFile);
    fs.unlinkSync(teamsFile);
  }

  const { registerSocketHandlers } = await import("./socket-handlers");

  httpServer = createServer();
  const ioServer = new Server(httpServer);
  registerSocketHandlers(ioServer);
  await new Promise<void>(r => httpServer.listen(0, r));
  port = (httpServer.address() as AddressInfo).port;
});

afterAll(async () => {
  hostSocket?.close();
  spectatorSocket?.close();
  await new Promise<void>(r => httpServer.close(() => r()));
  const ctx = await import("./context");
  await ctx.gameStore.flush();
  await ctx.teamStore.flush();
  if (fs.existsSync(seededPack)) fs.unlinkSync(seededPack);
  if (fs.existsSync(gameFile)) fs.unlinkSync(gameFile);
  if (fs.existsSync(teamsFile)) fs.unlinkSync(teamsFile);
  if (preExistingGame) fs.writeFileSync(gameFile, preExistingGame);
  if (preExistingTeams) fs.writeFileSync(teamsFile, preExistingTeams);
});

function connect(role: "host" | "spectator"): Promise<Socket> {
  return new Promise(resolve => {
    const s = Client(`http://localhost:${port}`, { query: { role } });
    s.on("connect", () => resolve(s));
  });
}

describe("socket flow", () => {
  test("host creates game, both clients receive state", async () => {
    hostSocket = await connect("host");
    spectatorSocket = await connect("spectator");

    const teamA = await new Promise<{ id: string }>(r =>
      hostSocket.emit("host:create-team", { name: "A" }, r)
    );
    const teamB = await new Promise<{ id: string }>(r =>
      hostSocket.emit("host:create-team", { name: "B" }, r)
    );

    const spectatorState = new Promise<{ phase: string; teams: unknown[] }>(r =>
      spectatorSocket.once("state", r)
    );
    hostSocket.emit("host:create-game", {
      packId: "test-pack",
      settings: { roundTimeSec: 60, penaltyPct: 50 },
      teamIds: [teamA.id, teamB.id],
    });

    const state = await spectatorState;
    expect(state.phase).toBe("board");
    expect(state.teams).toHaveLength(2);
  });

  test("rejects second host", async () => {
    const evil: Socket = Client(`http://localhost:${port}`, { query: { role: "host" } });
    const err = await new Promise<{ message: string }>(r => evil.on("error", r));
    expect(err.message).toMatch(/Host/);
    evil.close();
  });
});
