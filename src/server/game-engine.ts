import { randomUUID } from "crypto";
import type {
  Attempt,
  GameState,
  HydratedGameState,
  Pack,
  Settings,
  Team,
} from "@/lib/types";

export function createGame(input: {
  packId: string;
  pack: Pack;
  settings: Settings;
  teamIds: string[];
}): GameState {
  const board: GameState["board"] = {};
  input.pack.categories.forEach((cat, catIdx) => {
    cat.questions.forEach((_, valIdx) => {
      board[`${catIdx}_${valIdx}`] = "unused";
    });
  });
  const scores: Record<string, number> = {};
  input.teamIds.forEach(id => { scores[id] = 0; });
  return {
    id: randomUUID(),
    packId: input.packId,
    settings: input.settings,
    teamIds: input.teamIds,
    scores,
    board,
    currentQuestion: null,
    phase: "board",
  };
}

export function selectQuestion(
  state: GameState,
  q: { catIdx: number; valIdx: number },
  pack: Pack
): GameState {
  if (state.phase !== "board") throw new Error("not on board phase");
  const key = `${q.catIdx}_${q.valIdx}`;
  if (!(key in state.board)) throw new Error("invalid cell");
  if (state.board[key] === "used") throw new Error("cell already used");
  const cat = pack.categories[q.catIdx];
  if (!cat) throw new Error("invalid category");
  const question = cat.questions[q.valIdx];
  if (!question) throw new Error("invalid question");
  return {
    ...state,
    phase: "question",
    currentQuestion: {
      catIdx: q.catIdx,
      valIdx: q.valIdx,
      value: question.value,
      timerState: "idle",
      attempts: [],
    },
  };
}

export function startTimer(state: GameState, nowMs: number): GameState {
  if (!state.currentQuestion) throw new Error("no current question");
  if (state.currentQuestion.timerState !== "idle") throw new Error("timer not idle");
  return {
    ...state,
    currentQuestion: { ...state.currentQuestion, timerState: "running", timerStartedAt: nowMs },
  };
}

export function expireTimer(state: GameState): GameState {
  if (!state.currentQuestion) throw new Error("no current question");
  if (state.currentQuestion.timerState !== "running") return state;
  return {
    ...state,
    currentQuestion: { ...state.currentQuestion, timerState: "expired" },
  };
}

export function markAnswer(state: GameState, a: Attempt): GameState {
  if (!state.currentQuestion) throw new Error("no current question");
  if (!state.teamIds.includes(a.teamId)) throw new Error("unknown team");
  const value = state.currentQuestion.value;
  const delta = a.result === "correct"
    ? value
    : -Math.floor((value * state.settings.penaltyPct) / 100);
  return {
    ...state,
    scores: { ...state.scores, [a.teamId]: state.scores[a.teamId] + delta },
    currentQuestion: {
      ...state.currentQuestion,
      attempts: [...state.currentQuestion.attempts, a],
    },
  };
}

export function finishQuestion(state: GameState): GameState {
  if (!state.currentQuestion) throw new Error("no current question");
  const key = `${state.currentQuestion.catIdx}_${state.currentQuestion.valIdx}`;
  const board = { ...state.board, [key]: "used" as const };
  const allUsed = Object.values(board).every(v => v === "used");
  return {
    ...state,
    board,
    currentQuestion: null,
    phase: allUsed ? "results" : "board",
  };
}

export function audioPlay(state: GameState, p: { positionSec: number }, nowMs: number): GameState {
  if (!state.currentQuestion) throw new Error("no current question");
  return {
    ...state,
    currentQuestion: {
      ...state.currentQuestion,
      audioState: { playing: true, positionSec: p.positionSec, startedAt: nowMs },
    },
  };
}

export function audioPause(state: GameState, p: { positionSec: number }): GameState {
  if (!state.currentQuestion) throw new Error("no current question");
  return {
    ...state,
    currentQuestion: {
      ...state.currentQuestion,
      audioState: { playing: false, positionSec: p.positionSec },
    },
  };
}

export function hydrateState(state: GameState, allTeams: Team[]): HydratedGameState {
  const byId = new Map(allTeams.map(t => [t.id, t]));
  const teams = state.teamIds
    .map(id => byId.get(id))
    .filter((t): t is Team => !!t);
  const { teamIds: _teamIds, ...rest } = state;
  return { ...rest, teams };
}
