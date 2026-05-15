export type QuestionMedia = {
  image?: string;
  audio?: string;
};

export type Question = {
  value: number;
  question: string;
  answer: string;
} & QuestionMedia;

export type Category = {
  name: string;
  questions: Question[];
};

export type Pack = {
  id: string;
  name: string;
  categories: Category[];
};

export type Team = {
  id: string;
  name: string;
  logoUrl?: string;
  createdAt: string;
};

export type TeamLibrary = {
  teams: Team[];
};

export type Settings = {
  roundTimeSec: number;
  penaltyPct: number;
};

export type Attempt = { teamId: string; result: "correct" | "wrong" };

export type AudioState = {
  playing: boolean;
  positionSec: number;
  startedAt?: number;
};

export type CurrentQuestion = {
  catIdx: number;
  valIdx: number;
  value: number;
  timerState: "idle" | "running" | "expired";
  timerStartedAt?: number;
  attempts: Attempt[];
  audioState?: AudioState;
};

export type Phase = "creating" | "board" | "question" | "results";

export type GameState = {
  id: string;
  packId: string;
  settings: Settings;
  teamIds: string[];
  scores: Record<string, number>;
  board: Record<string, "unused" | "used">;
  currentQuestion: CurrentQuestion | null;
  phase: Phase;
};

export type HydratedGameState = Omit<GameState, "teamIds"> & {
  teams: Team[];
};

export type SoundKind = "correct" | "wrong" | "timer-end" | "select";
