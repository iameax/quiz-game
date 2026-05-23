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
  const cat = pack.categories[q.catIdx];
  if (!cat) throw new Error("invalid category");
  const question = cat.questions[q.valIdx];
  if (!question) throw new Error("invalid question");
  if (state.board[key] === "used") throw new Error("cell already used");
  return {
    ...state,
    phase: "question",
    currentQuestion: {
      catIdx: q.catIdx,
      valIdx: q.valIdx,
      value: question.value,
      timerState: "idle",
      timerElapsedMs: 0,
      attempts: [],
      answerRevealed: false,
    },
  };
}

export function toggleAnswer(state: GameState): GameState {
  if (!state.currentQuestion) throw new Error("no current question");
  return {
    ...state,
    currentQuestion: {
      ...state.currentQuestion,
      answerRevealed: !state.currentQuestion.answerRevealed,
    },
  };
}

export function startTimer(state: GameState, nowMs: number): GameState {
  if (!state.currentQuestion) throw new Error("no current question");
  if (state.currentQuestion.timerState !== "idle") throw new Error("timer not idle");
  return {
    ...state,
    currentQuestion: { ...state.currentQuestion, timerState: "running", timerStartedAt: nowMs, timerElapsedMs: 0 },
  };
}

export function pauseTimer(state: GameState, nowMs: number): GameState {
  if (!state.currentQuestion) throw new Error("no current question");
  if (state.currentQuestion.timerState !== "running") throw new Error("timer not running");
  const startedAt = state.currentQuestion.timerStartedAt ?? nowMs;
  const elapsed = state.currentQuestion.timerElapsedMs + (nowMs - startedAt);
  return {
    ...state,
    currentQuestion: {
      ...state.currentQuestion,
      timerState: "paused",
      timerElapsedMs: elapsed,
      timerStartedAt: undefined,
    },
  };
}

export function resumeTimer(state: GameState, nowMs: number): GameState {
  if (!state.currentQuestion) throw new Error("no current question");
  if (state.currentQuestion.timerState !== "paused") throw new Error("timer not paused");
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

export function setScore(state: GameState, teamId: string, score: number): GameState {
  if (!state.teamIds.includes(teamId)) throw new Error("unknown team");
  return {
    ...state,
    scores: { ...state.scores, [teamId]: Math.trunc(score) },
  };
}

export function markAnswer(state: GameState, a: Attempt): GameState {
  if (!state.currentQuestion) throw new Error("no current question");
  if (!state.teamIds.includes(a.teamId)) throw new Error("unknown team");
  const value = state.currentQuestion.value;
  const delta = Math.trunc((value * a.pct) / 100);
  return {
    ...state,
    scores: { ...state.scores, [a.teamId]: state.scores[a.teamId] + delta },
    currentQuestion: {
      ...state.currentQuestion,
      attempts: [...state.currentQuestion.attempts, a],
    },
  };
}

export function finishQuestion(state: GameState, pack: Pack): GameState {
  if (!state.currentQuestion) throw new Error("no current question");
  const key = `${state.currentQuestion.catIdx}_${state.currentQuestion.valIdx}`;
  const board = { ...state.board, [key]: "used" as const };
  const totalCells = pack.categories.reduce((sum, c) => sum + c.questions.length, 0);
  const usedCells = Object.values(board).filter(v => v === "used").length;
  const allUsed = usedCells >= totalCells;
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
