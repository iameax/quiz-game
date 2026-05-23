export type QuestionMedia = {
  image?: string;
  audio?: string;
};

export type Question = {
  value: number;
  question: string | string[];
  answer: string | string[];
  comment?: string;
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

export type Attempt = { teamId: string; pct: number; flat?: number };

export type AudioState = {
  playing: boolean;
  positionSec: number;
  startedAt?: number;
};

export type CurrentQuestion = {
  catIdx: number;
  valIdx: number;
  value: number;
  timerState: "idle" | "running" | "paused" | "expired";
  timerStartedAt?: number;
  timerElapsedMs: number;
  attempts: Attempt[];
  audioState?: AudioState;
  answerRevealed: boolean;
};

export type Phase = "creating" | "welcome" | "board" | "question" | "results";

export type GameState = {
  id: string;
  packId: string;
  settings: Settings;
  teamIds: string[];
  scores: Record<string, number>;
  board: Record<string, "unused" | "used">;
  currentQuestion: CurrentQuestion | null;
  phase: Phase;
  welcomeStep?: number;
};

export type HydratedGameState = Omit<GameState, "teamIds"> & {
  teams: Team[];
};

export type SoundKind = "correct" | "wrong" | "timer-end" | "select" | "intro" | "noanswer" | "applause" | "wow";
