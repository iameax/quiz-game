import path from "path";
import { createStore } from "./store";
import { loadPacksFromDir } from "./packs";
import type { GameState, TeamLibrary } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const packsDir = path.join(dataDir, "packs");

export const packs = loadPacksFromDir(packsDir);

export const teamStore = createStore<TeamLibrary>({
  file: path.join(dataDir, "teams.json"),
  defaultValue: { teams: [] },
  debounceMs: 200,
});

export const gameStore = createStore<GameState | null>({
  file: path.join(dataDir, "game.json"),
  defaultValue: null,
  debounceMs: 200,
});

export const hostState = {
  socketId: null as string | null,
};

export const timers = {
  current: null as NodeJS.Timeout | null,
};
