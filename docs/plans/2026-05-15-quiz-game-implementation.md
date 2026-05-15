# Quiz Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a real-time, web-based Jeopardy-style quiz client where one host runs the game and many spectators view live on separate devices.

**Architecture:** Next.js (App Router) + custom Node server hosting Socket.IO on the same port. Pure-function game engine + JSON-file persistence. Full-state broadcast on every mutation. All UI text in Russian.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Socket.IO, Tailwind CSS + `@tailwindcss/typography`, react-markdown + remark-gfm + rehype-sanitize, zod, Vitest, formidable (logo upload).

**Source design:** `docs/plans/2026-05-15-quiz-game-design.md`

---

## Conventions for every task

- **TDD:** for pure-logic modules (engine, store, packs), always write the failing test first, then minimal implementation.
- **UI tasks:** REQUIRED SUB-SKILL — invoke `frontend-design` skill before writing any component in Phases 7–8 (Tasks 20–28). The component code shown in this plan is a functional baseline; treat it as a contract for behavior, props, and state hookup, not as the final visual design. The skill drives the styling, layout, typography, and aesthetic. Goal: distinctive, production-grade Jeopardy-style stage UI, not generic Tailwind blocks.
- **Commit after each task** with a Conventional Commits message (`feat:`, `test:`, `chore:`, `refactor:`, `fix:`).
- **Russian copy** in user-facing strings only. Code, identifiers, log messages stay English.
- **No `Co-Authored-By` line** in commits.
- **Bash:** use relative paths or `git -C .` — never absolute paths in compound commands.
- **Imports:** absolute imports via `@/` alias (configured in `tsconfig.json`).

## UI design direction (drives `frontend-design` skill)

- **Mood:** game-show stage. Dark, saturated blues (`#0a1a3a` and deeper). Strong yellow/gold accents (`#f5c518`). High contrast. Big readable type from across a room.
- **Typography:** display serif or condensed sans for category headers and values (TV quiz feel); clean sans for body/markdown.
- **Board:** cells should feel like illuminated panels — slight inner bevel/glow, generous padding, large value digits.
- **Question view:** stage-sized question text; image framed with subtle gold border; audio control as a single bold play/pause pill.
- **Team strip:** card-style with circular logo, name, large animated score.
- **Results:** podium feel; winner card scaled and surrounded by gold glow.
- **Motion:** subtle. Cell reveal, score tick, audio button pulse. No gratuitous animation.
- **Accessibility:** maintain 4.5:1 contrast on text. Buttons large enough for touch on spectator phones.

---

## Phase 1: Project scaffolding

### Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `next-env.d.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `postcss.config.js`, `tailwind.config.ts`, `src/app/globals.css`

**Step 1: Initialize package.json**

Run:
```bash
npm init -y
```

**Step 2: Install runtime deps**

Run:
```bash
npm install next@latest react@latest react-dom@latest socket.io socket.io-client zod react-markdown remark-gfm rehype-sanitize formidable
```

**Step 3: Install dev deps**

Run:
```bash
npm install -D typescript @types/react @types/react-dom @types/node @types/formidable vitest @vitest/ui tailwindcss @tailwindcss/typography postcss autoprefixer
```

**Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 5: Write `next.config.js`**

```js
/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
};
```

**Step 6: Write `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
```

**Step 7: Write `postcss.config.js`**

```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

**Step 8: Write `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body { background: #0a1a3a; color: white; min-height: 100vh; }
```

**Step 9: Write `src/app/layout.tsx`**

```tsx
import "./globals.css";

export const metadata = { title: "Quiz Game" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
```

**Step 10: Write placeholder `src/app/page.tsx`**

```tsx
export default function HostPage() {
  return <main className="p-8">Загрузка...</main>;
}
```

**Step 11: Add scripts to `package.json`**

Replace `scripts` section with:
```json
"scripts": {
  "dev": "node server.js",
  "build": "next build",
  "start": "NODE_ENV=production node server.js",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Step 12: Verify Next compiles**

Run: `npx next build`
Expected: builds without errors (warns OK).

**Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + TypeScript"
```

---

### Task 2: Configure Vitest

**Files:**
- Create: `vitest.config.ts`, `src/test-setup.ts`

**Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test-setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

**Step 2: Write `src/test-setup.ts`**

```ts
// reserved for global test config
```

**Step 3: Write a sanity test**

Create `src/sanity.test.ts`:
```ts
import { expect, test } from "vitest";

test("sanity", () => {
  expect(1 + 1).toBe(2);
});
```

**Step 4: Run tests**

Run: `npm test`
Expected: 1 passed.

**Step 5: Remove the sanity file and commit**

```bash
rm src/sanity.test.ts
git add -A
git commit -m "chore: configure Vitest"
```

---

### Task 3: Shared types

**Files:**
- Create: `src/lib/types.ts`

**Step 1: Write the file**

```ts
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
```

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): shared domain types"
```

---

## Phase 2: Pack loader

### Task 4: Pack zod schema and loader (TDD)

**Files:**
- Create: `src/server/packs.ts`, `src/server/packs.test.ts`, `data/packs/.gitkeep`

**Step 1: Write failing tests**

Create `src/server/packs.test.ts`:
```ts
import { expect, test, describe } from "vitest";
import { validatePack, loadPacksFromDir } from "./packs";
import path from "path";
import fs from "fs";
import os from "os";

const valid = {
  id: "p1",
  name: "Pack 1",
  categories: [
    {
      name: "Cat",
      questions: [
        { value: 100, question: "Q", answer: "A" },
        { value: 200, question: "Q2", answer: "A2", image: "/x.png", audio: "/y.mp3" },
      ],
    },
  ],
};

describe("validatePack", () => {
  test("accepts valid pack", () => {
    expect(() => validatePack(valid)).not.toThrow();
  });

  test("rejects missing id", () => {
    expect(() => validatePack({ ...valid, id: undefined })).toThrow();
  });

  test("rejects non-positive value", () => {
    const bad = JSON.parse(JSON.stringify(valid));
    bad.categories[0].questions[0].value = 0;
    expect(() => validatePack(bad)).toThrow();
  });

  test("rejects empty categories", () => {
    expect(() => validatePack({ ...valid, categories: [] })).toThrow();
  });
});

describe("loadPacksFromDir", () => {
  test("loads and validates all .json files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "packs-"));
    fs.writeFileSync(path.join(dir, "a.json"), JSON.stringify(valid));
    fs.writeFileSync(path.join(dir, "b.json"), JSON.stringify({ ...valid, id: "p2", name: "Pack 2" }));
    const packs = loadPacksFromDir(dir);
    expect(packs).toHaveLength(2);
    expect(packs.map(p => p.id).sort()).toEqual(["p1", "p2"]);
  });

  test("throws on invalid pack", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "packs-"));
    fs.writeFileSync(path.join(dir, "bad.json"), JSON.stringify({ id: "x" }));
    expect(() => loadPacksFromDir(dir)).toThrow();
  });
});
```

**Step 2: Run tests to verify failure**

Run: `npm test -- packs`
Expected: FAIL — module not found.

**Step 3: Implement `src/server/packs.ts`**

```ts
import { z } from "zod";
import fs from "fs";
import path from "path";
import type { Pack } from "@/lib/types";

const QuestionSchema = z.object({
  value: z.number().int().positive(),
  question: z.string().min(1),
  answer: z.string().min(1),
  image: z.string().optional(),
  audio: z.string().optional(),
});

const CategorySchema = z.object({
  name: z.string().min(1),
  questions: z.array(QuestionSchema).min(1),
});

const PackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  categories: z.array(CategorySchema).min(1),
});

export function validatePack(input: unknown): Pack {
  return PackSchema.parse(input);
}

export function loadPacksFromDir(dir: string): Pack[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  return files.map(f => {
    const content = fs.readFileSync(path.join(dir, f), "utf8");
    return validatePack(JSON.parse(content));
  });
}
```

**Step 4: Run tests to verify pass**

Run: `npm test -- packs`
Expected: all pass.

**Step 5: Commit**

```bash
touch data/packs/.gitkeep
git add -A
git commit -m "feat(packs): zod schema and loader with tests"
```

---

## Phase 3: Store (atomic file persistence)

### Task 5: Atomic JSON store (TDD)

**Files:**
- Create: `src/server/store.ts`, `src/server/store.test.ts`

**Step 1: Write failing tests**

Create `src/server/store.test.ts`:
```ts
import { expect, test, describe, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { createStore } from "./store";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "store-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("store", () => {
  test("reads default when file missing", async () => {
    const store = createStore<{ count: number }>({
      file: path.join(dir, "x.json"),
      defaultValue: { count: 0 },
      debounceMs: 0,
    });
    expect(store.get()).toEqual({ count: 0 });
  });

  test("set + flush writes file atomically", async () => {
    const file = path.join(dir, "x.json");
    const store = createStore({ file, defaultValue: { count: 0 }, debounceMs: 0 });
    store.set({ count: 5 });
    await store.flush();
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({ count: 5 });
  });

  test("reload from disk", async () => {
    const file = path.join(dir, "x.json");
    fs.writeFileSync(file, JSON.stringify({ count: 9 }));
    const store = createStore({ file, defaultValue: { count: 0 }, debounceMs: 0 });
    expect(store.get()).toEqual({ count: 9 });
  });

  test("debounce coalesces writes", async () => {
    vi.useFakeTimers();
    const file = path.join(dir, "x.json");
    const store = createStore({ file, defaultValue: { count: 0 }, debounceMs: 200 });
    store.set({ count: 1 });
    store.set({ count: 2 });
    store.set({ count: 3 });
    expect(fs.existsSync(file)).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    vi.useRealTimers();
    await store.flush();
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({ count: 3 });
  });

  test("clear removes file", async () => {
    const file = path.join(dir, "x.json");
    const store = createStore({ file, defaultValue: { count: 0 }, debounceMs: 0 });
    store.set({ count: 1 });
    await store.flush();
    expect(fs.existsSync(file)).toBe(true);
    store.clear();
    await store.flush();
    expect(fs.existsSync(file)).toBe(false);
  });
});
```

**Step 2: Run tests**

Run: `npm test -- store`
Expected: FAIL — module not found.

**Step 3: Implement `src/server/store.ts`**

```ts
import fs from "fs";
import path from "path";

export type Store<T> = {
  get(): T;
  set(value: T): void;
  clear(): void;
  flush(): Promise<void>;
};

export function createStore<T>(opts: {
  file: string;
  defaultValue: T;
  debounceMs: number;
}): Store<T> {
  fs.mkdirSync(path.dirname(opts.file), { recursive: true });
  let value: T = fs.existsSync(opts.file)
    ? JSON.parse(fs.readFileSync(opts.file, "utf8"))
    : opts.defaultValue;
  let cleared = false;
  let timer: NodeJS.Timeout | null = null;
  let pending: Promise<void> = Promise.resolve();

  const writeNow = async () => {
    if (cleared) {
      if (fs.existsSync(opts.file)) await fs.promises.unlink(opts.file);
      cleared = false;
      return;
    }
    const tmp = opts.file + ".tmp";
    await fs.promises.writeFile(tmp, JSON.stringify(value, null, 2));
    await fs.promises.rename(tmp, opts.file);
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      pending = pending.then(writeNow);
    }, opts.debounceMs);
  };

  return {
    get: () => value,
    set: (v: T) => {
      value = v;
      cleared = false;
      if (opts.debounceMs === 0) {
        pending = pending.then(writeNow);
      } else {
        schedule();
      }
    },
    clear: () => {
      cleared = true;
      if (opts.debounceMs === 0) {
        pending = pending.then(writeNow);
      } else {
        schedule();
      }
    },
    flush: async () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        pending = pending.then(writeNow);
      }
      await pending;
    },
  };
}
```

**Step 4: Run tests**

Run: `npm test -- store`
Expected: all pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(store): atomic debounced JSON store"
```

---

## Phase 4: Game engine (pure functions)

### Task 6: Engine — game creation and initial state (TDD)

**Files:**
- Create: `src/server/game-engine.ts`, `src/server/game-engine.test.ts`

**Step 1: Write failing test**

Create `src/server/game-engine.test.ts`:
```ts
import { expect, test, describe } from "vitest";
import { createGame } from "./game-engine";
import type { Pack } from "@/lib/types";

const pack: Pack = {
  id: "p1",
  name: "P",
  categories: [
    {
      name: "C1",
      questions: [
        { value: 100, question: "q1", answer: "a1" },
        { value: 200, question: "q2", answer: "a2" },
      ],
    },
    {
      name: "C2",
      questions: [
        { value: 100, question: "q3", answer: "a3" },
        { value: 200, question: "q4", answer: "a4" },
      ],
    },
  ],
};

describe("createGame", () => {
  test("builds initial state with phase=board", () => {
    const game = createGame({
      packId: pack.id,
      pack,
      settings: { roundTimeSec: 60, penaltyPct: 50 },
      teamIds: ["t1", "t2"],
    });
    expect(game.phase).toBe("board");
    expect(game.packId).toBe("p1");
    expect(game.teamIds).toEqual(["t1", "t2"]);
    expect(game.scores).toEqual({ t1: 0, t2: 0 });
    expect(game.board).toEqual({
      "0_0": "unused", "0_1": "unused",
      "1_0": "unused", "1_1": "unused",
    });
    expect(game.currentQuestion).toBeNull();
    expect(typeof game.id).toBe("string");
    expect(game.id.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run tests**

Run: `npm test -- game-engine`
Expected: FAIL.

**Step 3: Implement minimal**

Create `src/server/game-engine.ts`:
```ts
import { randomUUID } from "crypto";
import type { GameState, Pack, Settings } from "@/lib/types";

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
```

**Step 4: Run tests**

Run: `npm test -- game-engine`
Expected: pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): createGame initial state"
```

---

### Task 7: Engine — select question (TDD)

**Step 1: Append failing tests to `game-engine.test.ts`**

```ts
import { selectQuestion } from "./game-engine";

describe("selectQuestion", () => {
  const base = createGame({
    packId: "p1",
    pack,
    settings: { roundTimeSec: 60, penaltyPct: 50 },
    teamIds: ["t1"],
  });

  test("opens question, phase=question, timer idle, no attempts", () => {
    const next = selectQuestion(base, { catIdx: 0, valIdx: 1 });
    expect(next.phase).toBe("question");
    expect(next.currentQuestion).toEqual({
      catIdx: 0,
      valIdx: 1,
      timerState: "idle",
      attempts: [],
    });
  });

  test("throws if cell already used", () => {
    const used = { ...base, board: { ...base.board, "0_0": "used" as const } };
    expect(() => selectQuestion(used, { catIdx: 0, valIdx: 0 })).toThrow();
  });

  test("throws if not on board phase", () => {
    const inQ = selectQuestion(base, { catIdx: 0, valIdx: 0 });
    expect(() => selectQuestion(inQ, { catIdx: 1, valIdx: 0 })).toThrow();
  });

  test("throws on out-of-range indices", () => {
    expect(() => selectQuestion(base, { catIdx: 5, valIdx: 0 })).toThrow();
  });
});
```

**Step 2: Run tests**

Run: `npm test -- game-engine`
Expected: FAIL.

**Step 3: Implement**

Append to `src/server/game-engine.ts`:
```ts
export function selectQuestion(
  state: GameState,
  q: { catIdx: number; valIdx: number },
  pack?: Pack
): GameState {
  if (state.phase !== "board") throw new Error("not on board phase");
  const key = `${q.catIdx}_${q.valIdx}`;
  if (!(key in state.board)) throw new Error("invalid cell");
  if (state.board[key] === "used") throw new Error("cell already used");
  return {
    ...state,
    phase: "question",
    currentQuestion: {
      catIdx: q.catIdx,
      valIdx: q.valIdx,
      timerState: "idle",
      attempts: [],
    },
  };
}
```

**Step 4: Run tests, expect pass.**

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): selectQuestion transition"
```

---

### Task 8: Engine — timer transitions (TDD)

**Step 1: Append tests**

```ts
import { startTimer, expireTimer } from "./game-engine";

describe("timer", () => {
  const base = createGame({ packId: "p1", pack, settings: { roundTimeSec: 60, penaltyPct: 50 }, teamIds: ["t1"] });
  const opened = selectQuestion(base, { catIdx: 0, valIdx: 0 });

  test("startTimer sets running with startedAt", () => {
    const next = startTimer(opened, 1000);
    expect(next.currentQuestion?.timerState).toBe("running");
    expect(next.currentQuestion?.timerStartedAt).toBe(1000);
  });

  test("startTimer throws if no current question", () => {
    expect(() => startTimer(base, 1000)).toThrow();
  });

  test("startTimer throws if already running", () => {
    const running = startTimer(opened, 1000);
    expect(() => startTimer(running, 2000)).toThrow();
  });

  test("expireTimer flips to expired", () => {
    const running = startTimer(opened, 1000);
    const next = expireTimer(running);
    expect(next.currentQuestion?.timerState).toBe("expired");
  });
});
```

**Step 2: Run, FAIL.**

**Step 3: Implement**

```ts
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
```

**Step 4: Run, pass.**

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): timer start/expire"
```

---

### Task 9: Engine — markAnswer (correct + wrong + steals) (TDD)

**Step 1: Append tests**

```ts
import { markAnswer } from "./game-engine";

describe("markAnswer", () => {
  const base = createGame({ packId: "p1", pack, settings: { roundTimeSec: 60, penaltyPct: 50 }, teamIds: ["t1", "t2"] });
  const open = selectQuestion(base, { catIdx: 0, valIdx: 1 }); // value 200

  test("correct: adds full value to team, records attempt", () => {
    const next = markAnswer(open, { teamId: "t1", result: "correct" });
    expect(next.scores.t1).toBe(200);
    expect(next.currentQuestion?.attempts).toEqual([{ teamId: "t1", result: "correct" }]);
  });

  test("wrong: subtracts penaltyPct% of value, records attempt", () => {
    const next = markAnswer(open, { teamId: "t1", result: "wrong" });
    expect(next.scores.t1).toBe(-100); // 50% of 200
    expect(next.currentQuestion?.attempts).toEqual([{ teamId: "t1", result: "wrong" }]);
  });

  test("steals: multiple wrongs then correct accumulate", () => {
    let s = markAnswer(open, { teamId: "t1", result: "wrong" });
    s = markAnswer(s, { teamId: "t2", result: "correct" });
    expect(s.scores).toEqual({ t1: -100, t2: 200 });
    expect(s.currentQuestion?.attempts.length).toBe(2);
  });

  test("throws if no current question", () => {
    expect(() => markAnswer(base, { teamId: "t1", result: "correct" })).toThrow();
  });

  test("throws if team not in game", () => {
    expect(() => markAnswer(open, { teamId: "tx", result: "correct" })).toThrow();
  });

  test("rounds penalty down on fractional %", () => {
    const open100 = selectQuestion(base, { catIdx: 0, valIdx: 0 }); // value 100
    const customPenalty = { ...open100, settings: { ...open100.settings, penaltyPct: 33 } };
    const next = markAnswer(customPenalty, { teamId: "t1", result: "wrong" });
    expect(next.scores.t1).toBe(-33);
  });
});
```

**Step 2: Run, FAIL.**

**Step 3: Implement**

Helper at top of file or before:
```ts
function questionValue(pack: Pack, catIdx: number, valIdx: number): number {
  return pack.categories[catIdx].questions[valIdx].value;
}
```

But engine receives no pack at markAnswer-time. Better: store value in `currentQuestion` at selection time. Update `selectQuestion` to accept `pack` and copy `value`. Refactor.

**Refactor `selectQuestion`:** make `pack` required, attach `value` into `currentQuestion`.

Update `CurrentQuestion` type in `src/lib/types.ts`:
```ts
export type CurrentQuestion = {
  catIdx: number;
  valIdx: number;
  value: number;
  timerState: "idle" | "running" | "expired";
  timerStartedAt?: number;
  attempts: Attempt[];
  audioState?: AudioState;
};
```

Update `selectQuestion`:
```ts
export function selectQuestion(
  state: GameState,
  q: { catIdx: number; valIdx: number },
  pack: Pack
): GameState {
  if (state.phase !== "board") throw new Error("not on board phase");
  const key = `${q.catIdx}_${q.valIdx}`;
  if (!(key in state.board)) throw new Error("invalid cell");
  if (state.board[key] === "used") throw new Error("cell already used");
  const value = pack.categories[q.catIdx].questions[q.valIdx].value;
  return {
    ...state,
    phase: "question",
    currentQuestion: { catIdx: q.catIdx, valIdx: q.valIdx, value, timerState: "idle", attempts: [] },
  };
}
```

Update Task 7 test setup accordingly — add `pack` argument. (When executing, fix old tests by passing `pack`.)

Now implement `markAnswer`:
```ts
export function markAnswer(state: GameState, a: Attempt): GameState {
  if (!state.currentQuestion) throw new Error("no current question");
  if (!state.teamIds.includes(a.teamId)) throw new Error("unknown team");
  const value = state.currentQuestion.value;
  const delta = a.result === "correct" ? value : -Math.floor((value * state.settings.penaltyPct) / 100);
  return {
    ...state,
    scores: { ...state.scores, [a.teamId]: state.scores[a.teamId] + delta },
    currentQuestion: {
      ...state.currentQuestion,
      attempts: [...state.currentQuestion.attempts, a],
    },
  };
}
```

**Step 4: Re-run all engine tests, all pass.**

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): markAnswer with penalty math and steals"
```

---

### Task 10: Engine — finishQuestion (TDD)

**Step 1: Append tests**

```ts
import { finishQuestion } from "./game-engine";

describe("finishQuestion", () => {
  test("marks cell used, returns to board if cells remain", () => {
    const base = createGame({ packId: "p1", pack, settings: { roundTimeSec: 60, penaltyPct: 50 }, teamIds: ["t1"] });
    const open = selectQuestion(base, { catIdx: 0, valIdx: 0 }, pack);
    const next = finishQuestion(open);
    expect(next.phase).toBe("board");
    expect(next.currentQuestion).toBeNull();
    expect(next.board["0_0"]).toBe("used");
  });

  test("transitions to results when board is complete", () => {
    let s = createGame({ packId: "p1", pack, settings: { roundTimeSec: 60, penaltyPct: 50 }, teamIds: ["t1"] });
    const cells: [number, number][] = [[0,0],[0,1],[1,0],[1,1]];
    for (const [c, v] of cells) {
      s = selectQuestion(s, { catIdx: c, valIdx: v }, pack);
      s = finishQuestion(s);
    }
    expect(s.phase).toBe("results");
  });

  test("throws if no current question", () => {
    const base = createGame({ packId: "p1", pack, settings: { roundTimeSec: 60, penaltyPct: 50 }, teamIds: ["t1"] });
    expect(() => finishQuestion(base)).toThrow();
  });
});
```

**Step 2: Run, FAIL.**

**Step 3: Implement**

```ts
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
```

**Step 4: Pass.**

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): finishQuestion with results transition"
```

---

### Task 11: Engine — audio play/pause (TDD)

**Step 1: Append tests**

```ts
import { audioPlay, audioPause } from "./game-engine";

describe("audio", () => {
  const base = createGame({ packId: "p1", pack, settings: { roundTimeSec: 60, penaltyPct: 50 }, teamIds: ["t1"] });
  const open = selectQuestion(base, { catIdx: 0, valIdx: 0 }, pack);

  test("audioPlay sets state.playing=true and startedAt", () => {
    const next = audioPlay(open, { positionSec: 3 }, 5000);
    expect(next.currentQuestion?.audioState).toEqual({ playing: true, positionSec: 3, startedAt: 5000 });
  });

  test("audioPause sets playing=false, retains position", () => {
    const playing = audioPlay(open, { positionSec: 0 }, 1000);
    const paused = audioPause(playing, { positionSec: 4 });
    expect(paused.currentQuestion?.audioState).toEqual({ playing: false, positionSec: 4 });
  });

  test("audio actions throw if no current question", () => {
    expect(() => audioPlay(base, { positionSec: 0 }, 1)).toThrow();
    expect(() => audioPause(base, { positionSec: 0 })).toThrow();
  });
});
```

**Step 2: Run, FAIL.**

**Step 3: Implement**

```ts
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
```

**Step 4: Pass.**

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): audio play/pause transitions"
```

---

### Task 12: Engine — hydrate state with teams

**Step 1: Append test**

```ts
import { hydrateState } from "./game-engine";

describe("hydrateState", () => {
  test("denormalizes teamIds into teams[]", () => {
    const base = createGame({ packId: "p1", pack, settings: { roundTimeSec: 60, penaltyPct: 50 }, teamIds: ["t1", "t2"] });
    const teams = [
      { id: "t1", name: "A", createdAt: "x" },
      { id: "t2", name: "B", createdAt: "y" },
      { id: "tX", name: "Z", createdAt: "z" },
    ];
    const h = hydrateState(base, teams);
    expect(h.teams.map(t => t.id)).toEqual(["t1", "t2"]);
    expect("teamIds" in h).toBe(false);
  });
});
```

**Step 2: Implement**

```ts
import type { Team, HydratedGameState } from "@/lib/types";

export function hydrateState(state: GameState, allTeams: Team[]): HydratedGameState {
  const byId = new Map(allTeams.map(t => [t.id, t]));
  const teams = state.teamIds.map(id => byId.get(id)).filter((t): t is Team => !!t);
  const { teamIds, ...rest } = state;
  return { ...rest, teams };
}
```

**Step 3: Pass. Commit.**

```bash
git add -A
git commit -m "feat(engine): hydrateState helper"
```

---

## Phase 5: Sounds + assets

### Task 13: Sound asset placeholders

**Files:**
- Create: `public/sounds/.gitkeep`, `public/sounds/README.md`

**Step 1: Write README**

```md
# Sounds

Drop the following CC0/royalty-free MP3 files here before running the app:
- `correct.mp3` — short positive chime
- `wrong.mp3` — short buzz
- `timer-end.mp3` — alarm/buzzer
- `select.mp3` — question-pick click
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: sound asset placeholders"
```

---

## Phase 6: Server bootstrap + Socket.IO

### Task 14: Custom Next server with Socket.IO skeleton

**Files:**
- Create: `server.js`

**Step 1: Write `server.js`**

```js
const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { registerSocketHandlers } = require("./dist-server/socket-handlers.cjs");
// Note: we'll run TS via tsx; for production we will compile. See Task 16.

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, { cors: { origin: "*" } });
  registerSocketHandlers(io);
  httpServer.listen(port, () => {
    console.log(`> ready on http://localhost:${port}`);
  });
});
```

We'll simplify by running with `tsx` to skip compilation. Update Task 15.

**Step 2: Replace with tsx-based version**

```js
require("tsx/cjs");
const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { registerSocketHandlers } = require("./src/server/socket-handlers.ts");

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, { cors: { origin: "*" } });
  registerSocketHandlers(io);
  httpServer.listen(port, () => {
    console.log(`> ready on http://localhost:${port}`);
  });
});
```

**Step 3: Install tsx**

Run: `npm install -D tsx`

**Step 4: Create stub `src/server/socket-handlers.ts`**

```ts
import type { Server } from "socket.io";
export function registerSocketHandlers(io: Server) {
  io.on("connection", socket => {
    console.log("connected:", socket.id);
    socket.on("disconnect", () => console.log("disconnected:", socket.id));
  });
}
```

**Step 5: Start the server**

Run: `npm run dev`
Expected: server starts on port 3000, page loads "Загрузка...".

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(server): Next + Socket.IO bootstrap via tsx"
```

---

### Task 15: Game-context module (singleton state holder)

**Files:**
- Create: `src/server/context.ts`

**Step 1: Write file**

```ts
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
```

Patch `store.ts` to handle `null` default and `clear()`/load behavior properly — verify when the loaded JSON is `null`, `get()` returns `null`. (Existing impl supports this.)

**Step 2: Commit**

```bash
git add -A
git commit -m "feat(server): game/team/packs context module"
```

---

### Task 16: Logo upload REST endpoint

**Files:**
- Create: `src/app/api/upload-logo/route.ts`

**Step 1: Write route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "missing file" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "not an image" }, { status: 400 });
  }
  const ext = file.name.split(".").pop() || "png";
  const id = randomUUID();
  const dir = path.join(process.cwd(), "public", "uploads", "teams");
  await mkdir(dir, { recursive: true });
  const dest = path.join(dir, `${id}.${ext}`);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(dest, buf);
  return NextResponse.json({ url: `/uploads/teams/${id}.${ext}` });
}
```

**Step 2: Manual test**

Run: `npm run dev`
Use curl:
```bash
curl -F "file=@qq.png" http://localhost:3000/api/upload-logo
```
Expected: `{"url":"/uploads/teams/<uuid>.png"}`. Verify file exists.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(api): upload-logo endpoint"
```

---

### Task 17: Socket handlers — base events

**Files:**
- Modify: `src/server/socket-handlers.ts`

**Step 1: Replace stub with full handlers**

```ts
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
import type { GameState, SoundKind } from "@/lib/types";

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

    socket.on("host:create-team", (input: { name: string; logoUrl?: string }, cb?: (t: any) => void) => {
      const lib = teamStore.get();
      const team = { id: randomUUID(), name: input.name, logoUrl: input.logoUrl, createdAt: new Date().toISOString() };
      teamStore.set({ teams: [...lib.teams, team] });
      io.emit("teams", teamStore.get().teams);
      cb?.(team);
    });

    socket.on("host:create-game", (input: { packId: string; settings: any; teamIds: string[] }) => {
      const pack = getPack(input.packId);
      const game = createGame({ packId: input.packId, pack, settings: input.settings, teamIds: input.teamIds });
      gameStore.set(game);
      broadcast(io);
    });

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
```

**Step 2: Smoke test**

Run: `npm run dev`. Open browser DevTools → Network → WS. Connect manually via `socket.io-client` from a quick Node script, or skip until UI exists.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(server): socket handlers wiring engine + persistence"
```

---

### Task 18: Socket handlers integration test

**Files:**
- Create: `src/server/socket-handlers.test.ts`

**Step 1: Write integration test**

```ts
import { expect, test, describe, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { Server } from "socket.io";
import { io as Client, Socket } from "socket.io-client";
import { AddressInfo } from "net";
import { registerSocketHandlers } from "./socket-handlers";
import fs from "fs";
import path from "path";

let httpServer: ReturnType<typeof createServer>;
let port: number;
let hostSocket: Socket;
let spectatorSocket: Socket;

beforeAll(async () => {
  // Seed minimal pack
  const packsDir = path.join(process.cwd(), "data", "packs");
  fs.mkdirSync(packsDir, { recursive: true });
  fs.writeFileSync(path.join(packsDir, "test-pack.json"), JSON.stringify({
    id: "test-pack",
    name: "Test Pack",
    categories: [
      { name: "C1", questions: [{ value: 100, question: "Q", answer: "A" }, { value: 200, question: "Q2", answer: "A2" }] },
      { name: "C2", questions: [{ value: 100, question: "Q3", answer: "A3" }, { value: 200, question: "Q4", answer: "A4" }] },
    ],
  }));

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

    const teamA: any = await new Promise(r => hostSocket.emit("host:create-team", { name: "A" }, r));
    const teamB: any = await new Promise(r => hostSocket.emit("host:create-team", { name: "B" }, r));

    const spectatorState = new Promise(r => spectatorSocket.once("state", r));
    hostSocket.emit("host:create-game", {
      packId: "test-pack",
      settings: { roundTimeSec: 60, penaltyPct: 50 },
      teamIds: [teamA.id, teamB.id],
    });

    const state: any = await spectatorState;
    expect(state.phase).toBe("board");
    expect(state.teams).toHaveLength(2);
  });

  test("rejects second host", async () => {
    const evil: Socket = await connect("host");
    const err = await new Promise<any>(r => evil.once("error", r));
    expect(err.message).toMatch(/Host/);
    evil.close();
  });
});
```

**Step 2: Run tests**

Run: `npm test -- socket`
Expected: pass.

**Step 3: Commit**

```bash
git add -A
git commit -m "test(server): socket handlers integration"
```

---

## Phase 7: Client foundation

### Task 19: Socket client singleton + React hook

**Files:**
- Create: `src/lib/socket-client.ts`, `src/lib/use-socket.ts`

**Step 1: Write `socket-client.ts`**

```ts
"use client";
import { io, Socket } from "socket.io-client";

let hostSocket: Socket | null = null;
let spectatorSocket: Socket | null = null;

export function getSocket(role: "host" | "spectator"): Socket {
  if (role === "host") {
    if (!hostSocket) hostSocket = io({ query: { role: "host" } });
    return hostSocket;
  }
  if (!spectatorSocket) spectatorSocket = io({ query: { role: "spectator" } });
  return spectatorSocket;
}
```

**Step 2: Write `use-socket.ts`**

```ts
"use client";
import { useEffect, useState } from "react";
import { getSocket } from "./socket-client";
import type { HydratedGameState, Pack, Team } from "./types";

export function useGameClient(role: "host" | "spectator") {
  const [state, setState] = useState<HydratedGameState | null>(null);
  const [packs, setPacks] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSocket(role);
    s.on("state", setState);
    s.on("packs", setPacks);
    s.on("teams", setTeams);
    s.on("error", (e: { message: string }) => setError(e.message));
    return () => {
      s.off("state", setState);
      s.off("packs", setPacks);
      s.off("teams", setTeams);
    };
  }, [role]);

  return { state, packs, teams, error, socket: getSocket(role) };
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(client): socket singleton and useGameClient hook"
```

---

### Task 20: Markdown component

**REQUIRED SUB-SKILL:** Invoke `frontend-design` skill. Provide it the UI design direction from the top of this plan. The baseline below is a starting point — let the skill drive the visual treatment of prose for the stage aesthetic.

**Files:**
- Create: `src/components/Markdown.tsx`

**Step 1: Write**

```tsx
"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`prose prose-invert max-w-none ${className ?? ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat(client): Markdown component"
```

---

### Task 21: TimerBar component

**REQUIRED SUB-SKILL:** Invoke `frontend-design` skill. Stage-style progress bar with gold fill, subtle glow, clear end-state. Baseline below sets behavior contract only.

**Files:**
- Create: `src/components/TimerBar.tsx`

**Step 1: Write**

```tsx
"use client";
import { useEffect, useState } from "react";

export function TimerBar({
  startedAt, durationSec, state,
}: { startedAt?: number; durationSec: number; state: "idle" | "running" | "expired" }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (state !== "running") return;
    let raf = 0;
    const tick = () => { setNow(Date.now()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  let pct = 0;
  if (state === "idle") pct = 0;
  else if (state === "expired") pct = 100;
  else if (startedAt) {
    pct = Math.min(100, ((now - startedAt) / (durationSec * 1000)) * 100);
  }

  return (
    <div className="w-full h-2 bg-white/10 overflow-hidden rounded">
      <div className="h-full bg-yellow-400 transition-none" style={{ width: `${pct}%` }} />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat(client): TimerBar component"
```

---

### Task 22: Sound effects player (spectator)

**Files:**
- Create: `src/components/SoundEffects.tsx`

**Step 1: Write**

```tsx
"use client";
import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket-client";

const map: Record<string, string> = {
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  "timer-end": "/sounds/timer-end.mp3",
  select: "/sounds/select.mp3",
};

export function SoundEffects() {
  const audios = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    Object.entries(map).forEach(([k, src]) => {
      const a = new Audio(src);
      a.preload = "auto";
      audios.current[k] = a;
    });
    const s = getSocket("spectator");
    const handler = ({ kind }: { kind: string }) => {
      const a = audios.current[kind];
      if (!a) return;
      a.currentTime = 0;
      a.play().catch(() => {/* autoplay blocked; gate handles unlock */});
    };
    s.on("sound", handler);
    return () => { s.off("sound", handler); };
  }, []);

  return null;
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat(client): spectator sound effects"
```

---

## Phase 8: Views

### Task 23: CreateView

**REQUIRED SUB-SKILL:** Invoke `frontend-design` skill first. Goal: pre-show host setup screen — pack picker, settings, team-roster builder. Baseline component below is the behavior contract (state, socket events, form fields). The skill drives layout, hierarchy, team-card visuals, modal styling, file-upload affordance.

**Files:**
- Create: `src/components/views/CreateView.tsx`

**Step 1: Write**

```tsx
"use client";
import { useState } from "react";
import { getSocket } from "@/lib/socket-client";
import type { Team } from "@/lib/types";

export function CreateView({ packs, teams }: {
  packs: { id: string; name: string }[];
  teams: Team[];
}) {
  const [packId, setPackId] = useState<string>("");
  const [roundTimeSec, setRoundTimeSec] = useState(60);
  const [penaltyPct, setPenaltyPct] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const submit = () => {
    if (!packId || selected.size < 2) return;
    getSocket("host").emit("host:create-game", {
      packId,
      settings: { roundTimeSec, penaltyPct },
      teamIds: Array.from(selected),
    });
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    let logoUrl: string | undefined;
    const fileInput = document.getElementById("logo-input") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (file) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-logo", { method: "POST", body: fd });
      const data = await res.json();
      logoUrl = data.url;
    }
    const team: Team = await new Promise(r =>
      getSocket("host").emit("host:create-team", { name: newTeamName.trim(), logoUrl }, r)
    );
    setSelected(new Set([...selected, team.id]));
    setNewTeamName("");
    if (fileInput) fileInput.value = "";
    setCreatingTeam(false);
  };

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Создание игры</h1>

      <section className="space-y-2">
        <label className="block">
          Пакет вопросов:
          <select className="ml-2 text-black p-1" value={packId} onChange={e => setPackId(e.target.value)}>
            <option value="">— выберите —</option>
            {packs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </section>

      <section className="flex gap-6">
        <label>
          Время раунда (сек):
          <input type="number" className="ml-2 text-black p-1 w-20" value={roundTimeSec} onChange={e => setRoundTimeSec(+e.target.value)} />
        </label>
        <label>
          Штраф (%):
          <input type="number" className="ml-2 text-black p-1 w-20" value={penaltyPct} onChange={e => setPenaltyPct(+e.target.value)} />
        </label>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Команды</h2>
        <div className="grid grid-cols-3 gap-3">
          {teams.map(t => (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className={`p-3 rounded border-2 flex items-center gap-2 ${selected.has(t.id) ? "border-yellow-400 bg-yellow-400/10" : "border-white/20"}`}
            >
              {t.logoUrl && <img src={t.logoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />}
              <span>{t.name}</span>
            </button>
          ))}
          {!creatingTeam && (
            <button onClick={() => setCreatingTeam(true)} className="p-3 rounded border-2 border-dashed border-white/30">+ Новая команда</button>
          )}
        </div>
        {creatingTeam && (
          <div className="mt-3 p-4 rounded bg-white/5 space-y-2">
            <input className="text-black p-1 w-full" placeholder="Название команды" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
            <input id="logo-input" type="file" accept="image/*" />
            <div className="flex gap-2">
              <button onClick={createTeam} className="px-3 py-1 bg-yellow-400 text-black rounded">Создать</button>
              <button onClick={() => setCreatingTeam(false)} className="px-3 py-1 border rounded">Отмена</button>
            </div>
          </div>
        )}
      </section>

      <button
        onClick={submit}
        disabled={!packId || selected.size < 2}
        className="px-6 py-3 bg-yellow-400 text-black rounded disabled:opacity-30"
      >
        Начать игру
      </button>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat(views): CreateView"
```

---

### Task 24: BoardView

**REQUIRED SUB-SKILL:** Invoke `frontend-design` skill first. Reference `qq.png` for layout — categories as left column, value cells in a grid, illuminated panels on dark blue. Baseline below is the data hookup contract. Skill drives cell visual treatment (bevel/glow/hover), category header style, used-cell empty state, team strip layout, score typography.

**Files:**
- Create: `src/components/views/BoardView.tsx`

**Step 1: Write**

```tsx
"use client";
import { getSocket } from "@/lib/socket-client";
import type { HydratedGameState, Pack } from "@/lib/types";

export function BoardView({ state, pack, isHost }: { state: HydratedGameState; pack: Pack; isHost: boolean }) {
  const onClick = (catIdx: number, valIdx: number) => {
    if (!isHost) return;
    if (state.board[`${catIdx}_${valIdx}`] === "used") return;
    getSocket("host").emit("host:select-question", { catIdx, valIdx });
  };

  const numCols = pack.categories[0].questions.length;

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 p-6">
        <div className="grid gap-2" style={{ gridTemplateColumns: `200px repeat(${numCols}, 1fr)` }}>
          {pack.categories.map((cat, catIdx) => (
            <>
              <div key={`cat-${catIdx}`} className="flex items-center justify-center font-bold p-3 bg-blue-900 rounded">
                {cat.name}
              </div>
              {cat.questions.map((q, valIdx) => {
                const used = state.board[`${catIdx}_${valIdx}`] === "used";
                return (
                  <button
                    key={`cell-${catIdx}-${valIdx}`}
                    onClick={() => onClick(catIdx, valIdx)}
                    disabled={used || !isHost}
                    className={`p-3 rounded text-3xl font-bold ${used ? "bg-blue-900/30 text-transparent" : "bg-blue-700 text-yellow-300 hover:bg-blue-600"} ${isHost ? "cursor-pointer" : "cursor-default"}`}
                  >
                    {q.value}
                  </button>
                );
              })}
            </>
          ))}
        </div>
      </div>
      <div className="p-4 border-t border-white/10 flex gap-4 justify-around">
        {state.teams.map(t => (
          <div key={t.id} className="flex items-center gap-2">
            {t.logoUrl && <img src={t.logoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />}
            <div>
              <div className="font-semibold">{t.name}</div>
              <div className="text-yellow-400 text-2xl">{state.scores[t.id]}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat(views): BoardView"
```

---

### Task 25: QuestionView with audio sync

**REQUIRED SUB-SKILL:** Invoke `frontend-design` skill first. Two visual modes share one component: spectator-facing (question text huge, image framed, status banner) and host control panel (answer card, timer button, team grid with ✓/✗, attempts log, finish). Audio sync logic is fixed in the baseline; visual treatment of all controls is the skill's job. Make team-pick buttons obvious and easy to mis-press-resistant under stage pressure.

**Files:**
- Create: `src/components/views/QuestionView.tsx`

**Step 1: Write**

```tsx
"use client";
import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket-client";
import type { HydratedGameState, Pack } from "@/lib/types";
import { Markdown } from "@/components/Markdown";
import { TimerBar } from "@/components/TimerBar";

export function QuestionView({ state, pack, isHost }: { state: HydratedGameState; pack: Pack; isHost: boolean }) {
  if (!state.currentQuestion) return null;
  const q = pack.categories[state.currentQuestion.catIdx].questions[state.currentQuestion.valIdx];
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioState = state.currentQuestion.audioState;

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !q.audio) return;
    if (!audioState) { a.pause(); a.currentTime = 0; return; }
    const targetPos = audioState.playing && audioState.startedAt
      ? audioState.positionSec + (Date.now() - audioState.startedAt) / 1000
      : audioState.positionSec;
    if (Math.abs(a.currentTime - targetPos) > 0.5) a.currentTime = targetPos;
    if (audioState.playing) a.play().catch(() => {});
    else a.pause();
  }, [audioState?.playing, audioState?.startedAt, audioState?.positionSec, q.audio]);

  const sock = () => getSocket(isHost ? "host" : "spectator");

  const playAudio = () => {
    const pos = audioRef.current?.currentTime ?? 0;
    sock().emit("host:audio-play", { positionSec: pos });
  };
  const pauseAudio = () => {
    const pos = audioRef.current?.currentTime ?? 0;
    sock().emit("host:audio-pause", { positionSec: pos });
  };

  const lastAttempt = state.currentQuestion.attempts[state.currentQuestion.attempts.length - 1];
  const spectatorBanner =
    lastAttempt
      ? `Команда ${state.teams.find(t => t.id === lastAttempt.teamId)?.name} ответила ${lastAttempt.result === "correct" ? "правильно!" : "неправильно!"}`
      : null;

  return (
    <main className="min-h-screen flex flex-col p-6">
      <TimerBar
        startedAt={state.currentQuestion.timerStartedAt}
        durationSec={state.settings.roundTimeSec}
        state={state.currentQuestion.timerState}
      />
      {q.image && <img src={q.image} alt="" className="max-h-64 mx-auto my-4 object-contain" />}
      {q.audio && <audio ref={audioRef} src={q.audio} preload="auto" />}
      <div className="flex-1 flex items-center justify-center text-3xl">
        <Markdown>{q.question}</Markdown>
      </div>

      {!isHost && spectatorBanner && (
        <div className="text-center text-2xl text-yellow-400 mb-4">{spectatorBanner}</div>
      )}

      {isHost && (
        <div className="space-y-4 mt-4">
          <div className="p-4 bg-white/5 rounded">
            <div className="text-sm opacity-70 mb-1">Ответ (только для ведущего):</div>
            <Markdown>{q.answer}</Markdown>
          </div>

          {q.audio && (
            <div className="flex gap-2">
              <button onClick={playAudio} className="px-3 py-1 bg-yellow-400 text-black rounded">▶ Играть</button>
              <button onClick={pauseAudio} className="px-3 py-1 border rounded">⏸ Пауза</button>
            </div>
          )}

          {state.currentQuestion.timerState === "idle" && (
            <button onClick={() => sock().emit("host:start-timer")} className="px-4 py-2 bg-yellow-400 text-black rounded">
              Старт таймера
            </button>
          )}

          <div>
            <div className="text-sm opacity-70 mb-2">Выберите команду для ответа:</div>
            <div className="flex gap-3 flex-wrap">
              {state.teams.map(t => (
                <div key={t.id} className="flex gap-1">
                  <span className="px-3 py-1 bg-white/10 rounded">{t.name}</span>
                  <button onClick={() => sock().emit("host:mark-answer", { teamId: t.id, result: "correct" })} className="px-2 py-1 bg-green-600 rounded">✓</button>
                  <button onClick={() => sock().emit("host:mark-answer", { teamId: t.id, result: "wrong" })} className="px-2 py-1 bg-red-600 rounded">✗</button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm opacity-70">
            Попытки: {state.currentQuestion.attempts.map((a, i) => {
              const name = state.teams.find(t => t.id === a.teamId)?.name;
              return <span key={i} className="mr-2">{name}: {a.result === "correct" ? "✓" : "✗"}</span>;
            })}
          </div>

          <button onClick={() => sock().emit("host:finish-question")} className="px-4 py-2 bg-yellow-400 text-black rounded">
            Завершить
          </button>
        </div>
      )}
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat(views): QuestionView with audio sync and steals"
```

---

### Task 26: ResultsView

**REQUIRED SUB-SKILL:** Invoke `frontend-design` skill first. Podium feel — winner card scaled up with strong gold glow/border. Animated score reveal optional. Skill drives ranking visuals.

**Files:**
- Create: `src/components/views/ResultsView.tsx`

**Step 1: Write**

```tsx
"use client";
import { getSocket } from "@/lib/socket-client";
import type { HydratedGameState } from "@/lib/types";

export function ResultsView({ state, isHost }: { state: HydratedGameState; isHost: boolean }) {
  const sorted = [...state.teams].sort((a, b) => state.scores[b.id] - state.scores[a.id]);
  return (
    <main className="min-h-screen flex flex-col p-8">
      <h1 className="text-4xl font-bold mb-6 text-center">Результаты</h1>
      <div className="flex-1 flex flex-col items-center gap-4">
        {sorted.map((t, idx) => (
          <div
            key={t.id}
            className={`flex items-center gap-4 p-4 rounded bg-white/5 ${idx === 0 ? "scale-125 border-2 border-yellow-400" : ""}`}
          >
            {t.logoUrl && <img src={t.logoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />}
            <div className="text-2xl">{t.name}</div>
            <div className="text-yellow-400 text-3xl font-bold">{state.scores[t.id]}</div>
          </div>
        ))}
      </div>
      {isHost && (
        <button onClick={() => getSocket("host").emit("host:new-game")} className="mt-6 mx-auto px-6 py-3 bg-yellow-400 text-black rounded">
          Новая игра
        </button>
      )}
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat(views): ResultsView"
```

---

### Task 27: Host root page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/HostApp.tsx`

**Step 1: Write `HostApp.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useGameClient } from "@/lib/use-socket";
import { CreateView } from "./views/CreateView";
import { BoardView } from "./views/BoardView";
import { QuestionView } from "./views/QuestionView";
import { ResultsView } from "./views/ResultsView";
import type { Pack } from "@/lib/types";

export function HostApp() {
  const { state, packs, teams, error } = useGameClient("host");
  const [pack, setPack] = useState<Pack | null>(null);

  useEffect(() => {
    if (!state) { setPack(null); return; }
    if (pack?.id === state.packId) return;
    fetch(`/api/pack/${state.packId}`).then(r => r.json()).then(setPack);
  }, [state?.packId]);

  if (error) return <main className="p-8 text-red-400">{error}</main>;
  if (!state) return <CreateView packs={packs} teams={teams} />;
  if (!pack) return <main className="p-8">Загрузка пакета...</main>;
  if (state.phase === "board") return <BoardView state={state} pack={pack} isHost />;
  if (state.phase === "question") return <QuestionView state={state} pack={pack} isHost />;
  if (state.phase === "results") return <ResultsView state={state} isHost />;
  return null;
}
```

**Step 2: Modify `src/app/page.tsx`**

```tsx
import { HostApp } from "@/components/HostApp";
export default function Page() { return <HostApp />; }
```

**Step 3: Add pack fetch endpoint**

Create `src/app/api/pack/[id]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { packs } from "@/server/context";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const pack = packs.find(p => p.id === params.id);
  if (!pack) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(pack);
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(app): host root and pack fetch endpoint"
```

---

### Task 28: Spectator root page + autoplay gate

**REQUIRED SUB-SKILL:** Invoke `frontend-design` skill for the autoplay gate splash and the "waiting for game" state. Both are first impressions on spectator phones. Skill drives splash visuals.

**Files:**
- Create: `src/app/spectator/page.tsx`, `src/components/SpectatorApp.tsx`, `src/components/AutoplayGate.tsx`

**Step 1: Write `AutoplayGate.tsx`**

```tsx
"use client";
import { useState } from "react";

export function AutoplayGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  if (unlocked) return <>{children}</>;
  return (
    <main className="min-h-screen flex items-center justify-center">
      <button
        onClick={() => {
          new Audio().play().catch(() => {});
          setUnlocked(true);
        }}
        className="px-8 py-4 bg-yellow-400 text-black text-2xl rounded"
      >
        Нажмите чтобы присоединиться
      </button>
    </main>
  );
}
```

**Step 2: Write `SpectatorApp.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useGameClient } from "@/lib/use-socket";
import { BoardView } from "./views/BoardView";
import { QuestionView } from "./views/QuestionView";
import { ResultsView } from "./views/ResultsView";
import { SoundEffects } from "./SoundEffects";
import { AutoplayGate } from "./AutoplayGate";
import type { Pack } from "@/lib/types";

export function SpectatorApp() {
  const { state } = useGameClient("spectator");
  const [pack, setPack] = useState<Pack | null>(null);

  useEffect(() => {
    if (!state) { setPack(null); return; }
    if (pack?.id === state.packId) return;
    fetch(`/api/pack/${state.packId}`).then(r => r.json()).then(setPack);
  }, [state?.packId]);

  return (
    <AutoplayGate>
      <SoundEffects />
      {!state && <main className="min-h-screen flex items-center justify-center text-2xl">Ожидание игры...</main>}
      {state && !pack && <main className="p-8">Загрузка...</main>}
      {state && pack && state.phase === "board" && <BoardView state={state} pack={pack} isHost={false} />}
      {state && pack && state.phase === "question" && <QuestionView state={state} pack={pack} isHost={false} />}
      {state && pack && state.phase === "results" && <ResultsView state={state} isHost={false} />}
      {state && state.phase === "creating" && (
        <main className="min-h-screen flex items-center justify-center text-2xl">Игра создаётся...</main>
      )}
    </AutoplayGate>
  );
}
```

**Step 3: Write `src/app/spectator/page.tsx`**

```tsx
import { SpectatorApp } from "@/components/SpectatorApp";
export default function Page() { return <SpectatorApp />; }
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(app): spectator root with autoplay gate"
```

---

## Phase 9: Seed pack + manual playtest

### Task 29: Seed pack from questions.md

**Files:**
- Create: `data/packs/islam-basics.json`

**Step 1: Author pack**

Convert `questions.md` into JSON. Fill placeholder answers where the source is empty. Use 5 categories × 5 questions, values 100–500. Russian throughout.

Sample skeleton:
```json
{
  "id": "islam-basics",
  "name": "Основы ислама",
  "categories": [
    {
      "name": "Намаз",
      "questions": [
        { "value": 100, "question": "Сколько раз в день читаем Фатиху?", "answer": "17 раз" },
        { "value": 200, "question": "Самая короткая сура?", "answer": "Аль-Каусар" },
        { "value": 300, "question": "Самая длинная сура?", "answer": "Аль-Бакара" },
        { "value": 400, "question": "Когда нельзя читать намаз?", "answer": "На восходе, в зените, на закате" },
        { "value": 500, "question": "Сколько ракатов в фарде джума?", "answer": "2 раката" }
      ]
    },
    {
      "name": "Имена Аллаха",
      "questions": [
        { "value": 100, "question": "**Al-Ghafur** — что означает?", "answer": "Прощающий" },
        { "value": 200, "question": "**Al-Aziz** — что означает?", "answer": "Великий, Могущественный" },
        { "value": 300, "question": "**Al-Karim** — что означает?", "answer": "Щедрый" },
        { "value": 400, "question": "**Al-Ahad** — что означает?", "answer": "Единственный" },
        { "value": 500, "question": "**As-Samad** — что означает?", "answer": "Самодостаточный" }
      ]
    },
    {
      "name": "Арабский язык",
      "questions": [
        { "value": 100, "question": "Что означает `ism`?", "answer": "Имя" },
        { "value": 200, "question": "Что означает `nur`?", "answer": "Свет" },
        { "value": 300, "question": "Что означает `qul`?", "answer": "Скажи" },
        { "value": 400, "question": "Что означает `inna`?", "answer": "Воистину" },
        { "value": 500, "question": "Что означает `akbar`?", "answer": "Величайший" }
      ]
    },
    {
      "name": "Столпы ислама",
      "questions": [
        { "value": 100, "question": "Сколько столпов ислама?", "answer": "Пять" },
        { "value": 200, "question": "Первый столп?", "answer": "Шахада" },
        { "value": 300, "question": "Какой пост обязателен?", "answer": "Пост в Рамадан" },
        { "value": 400, "question": "Кому платится закят?", "answer": "Восемь категорий нуждающихся" },
        { "value": 500, "question": "Когда совершается хадж?", "answer": "Зуль-хиджа" }
      ]
    },
    {
      "name": "Сира",
      "questions": [
        { "value": 100, "question": "В каком городе родился Пророк ﷺ?", "answer": "Мекка" },
        { "value": 200, "question": "В каком году хиджра?", "answer": "622 год" },
        { "value": 300, "question": "Имя матери Пророка ﷺ?", "answer": "Амина" },
        { "value": 400, "question": "Первая жена Пророка ﷺ?", "answer": "Хадиджа" },
        { "value": 500, "question": "Сколько лет длилась миссия в Мекке?", "answer": "13 лет" }
      ]
    }
  ]
}
```

(Engineer: review pack content with subject expert before shipping.)

**Step 2: Verify server loads pack**

Run: `npm run dev`. Check log — no validation errors. Browser → CreateView → "Основы ислама" appears in dropdown.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(packs): seed islam-basics pack"
```

---

### Task 30: Full manual playtest

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Open host browser**

Navigate to `http://localhost:3000`.

**Step 3: Open spectator on second device**

From phone on same LAN: `http://<host-lan-ip>:3000/spectator`. Tap join button. Verify "Ожидание игры..." appears.

**Step 4: Create teams (host)**

- Click "+ Новая команда", name "Команда А", upload logo. Save.
- Repeat for "Команда Б", "Команда В".

**Step 5: Create game (host)**

- Pick "Основы ислама"
- Round time 60, penalty 50
- Select all 3 teams
- Click "Начать игру"

**Step 6: Verify board renders**

Both host and spectator see grid + team strip. Used cells none. Scores 0.

**Step 7: Play correct answer**

- Host clicks a 100-point cell
- Spectator hears select sound, sees question
- Host clicks "Старт таймера" → bar animates on both
- Host clicks ✓ next to "Команда А" → spectator hears correct sound, sees "Команда А ответила правильно!"
- Verify Команда А has 100
- Host clicks "Завершить" → back to board, cell dimmed

**Step 8: Play wrong → steal → correct**

- Open another cell (200 pts)
- Mark Команда А ✗ → score -100
- Mark Команда Б ✓ → score 200
- Host finishes

**Step 9: Test image + audio question**

- Add a pack question with image and audio in `data/packs/islam-basics.json`
- Restart server to reload pack
- Select that cell
- Spectator sees image
- Host clicks ▶ Играть → audio plays on both devices within ~500ms
- Pause → audio stops on both

**Step 10: Test timer expiry**

- Open question, start timer, wait 60s
- Spectator hears timer-end sound
- Host can still mark correct/incorrect

**Step 11: Test refresh resilience**

- Mid-question, refresh host browser → state restored
- Refresh spectator → state restored (autoplay gate re-shows; tap to join)

**Step 12: Test server restart resilience**

- Mid-game, kill `npm run dev` with Ctrl-C
- Restart `npm run dev`
- Both clients reconnect; state restored from `data/game.json`

**Step 13: Complete board**

- Play through remaining cells
- Last cell triggers results view
- Winner card scaled and gold-bordered

**Step 14: Reject second host**

- Open second browser to `/`
- Verify error message, socket disconnects

**Step 15: New game**

- From results, click "Новая игра"
- Returns to CreateView
- `data/game.json` removed

**Step 16: Commit playtest notes if any fixes were made**

```bash
git add -A
git commit -m "fix: address playtest findings"
```

---

## Phase 10: Documentation

### Task 31: README

**Files:**
- Create: `README.md`

**Step 1: Write**

```md
# Quiz Game

Web-based Jeopardy-style quiz client. One host runs the game; spectators join from any device on the LAN.

## Setup

\`\`\`bash
npm install
\`\`\`

Add sound assets to `public/sounds/` (see `public/sounds/README.md`).
Add question packs to `data/packs/*.json` (see `docs/plans/2026-05-15-quiz-game-design.md` for schema).

## Run

\`\`\`bash
npm run dev
\`\`\`

- Host: `http://localhost:3000`
- Spectators: `http://<host-lan-ip>:3000/spectator`

## Test

\`\`\`bash
npm test
\`\`\`

## Architecture

See `docs/plans/2026-05-15-quiz-game-design.md`.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README"
```

---

## Done

All 4 views shipping. Engine unit-tested. Server integration-tested. Manual playtest checklist run. File persistence verified.
