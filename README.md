# Quiz Game

Web-based Jeopardy-style quiz. One host runs the game; spectators watch on any device on the LAN. All UI wording is in Russian.

## Stack

- Next.js 16 (App Router) + React 19, TypeScript
- Socket.IO for host ↔ spectator realtime state
- Custom Node server (`server.js`) wraps Next + Socket.IO on the same port
- Tailwind CSS v4 (+ `@tailwindcss/typography`)
- `react-markdown` + `remark-gfm` + `remark-breaks` + `rehype-sanitize` for rendering question/answer markdown
- Zod for pack validation
- Vitest for tests
- File-backed persistence via debounced JSON stores (`data/teams.json`, `data/game.json`)

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
npm test
```

- Host: `http://localhost:3000`
- Spectators: `http://<host-lan-ip>:3000/spectator`

Only one host socket allowed at a time; second host gets `"Host already connected"` and is disconnected (`src/server/socket-handlers.ts:79`).

## Project layout

```
data/
  packs/*.json        question packs (validated by Zod, see schema below)
  teams.json          persisted team library
  game.json           persisted active game (deleted on "Новая игра")
  questions.md        scratchpad of question ideas
docs/plans/           design + implementation plans
public/
  audio/              ayah recitations referenced from packs (husary_{surah}_{ayah}.mp3)
  images/             pack images referenced by `question.image`
  sounds/             correct.mp3, wrong.mp3, timer-end.mp3, select.mp3 (drop in manually)
  uploads/teams/      team logos uploaded via /api/upload-logo
src/
  app/                Next App Router (host page `/`, spectator `/spectator`, API routes)
  components/
    HostApp.tsx       routes host between phases
    SpectatorApp.tsx  routes spectator between phases + mounts SoundEffects
    Markdown.tsx      shared markdown renderer with Arabic-font handling
    TimerBar.tsx      requestAnimationFrame-driven progress bar
    SoundEffects.tsx  plays sounds on socket "sound" events (spectator only)
    views/
      CreateView.tsx    pack/teams/settings setup (host only)
      BoardView.tsx     question grid + team scores + settings menu
      QuestionView.tsx  question/answer view + host scoring controls
      ResultsView.tsx   sorted leaderboard, winner scaled up
  lib/
    types.ts          shared types (single source of truth for shapes)
    socket-client.ts  singleton socket per role
    use-socket.ts     React hook: subscribes to state/packs/teams/error
  server/
    context.ts        wires stores + pack loader
    game-engine.ts    pure state transitions (no IO)
    socket-handlers.ts wires socket events → engine → broadcast
    store.ts          generic debounced JSON store w/ atomic rename
    packs.ts          Zod schema + dir loader
server.js             Next + Socket.IO bootstrap (loads .ts via `tsx/cjs`)
```

## Phases

Game phase machine in `GameState.phase`:

```
creating  →  board  ⇄  question  →  results
```

- `creating`: no `GameState` yet. Host sees `CreateView`. Spectators see "Ожидание игры...".
- `board`: question grid. Host clicks a cell → `host:select-question`.
- `question`: shows question; host can start timer, reveal answer, score teams, finish.
- `results`: leaderboard. Auto-entered when every cell is `"used"` (`finishQuestion` in `src/server/game-engine.ts:115`), or manually via "Завершить игру".

`HostApp.tsx` and `SpectatorApp.tsx` route to the right view per phase.

## Question pack schema

Packs live in `data/packs/*.json`. Loaded on every read by `getPacks()` (no caching — edit JSON, refresh host). Validated by Zod in `src/server/packs.ts`.

```ts
type Pack = {
  id: string;
  name: string;
  categories: Category[];
};

type Category = {
  name: string;
  questions: Question[];
};

type Question = {
  value: number;                       // positive int (100/200/300/400/500 by convention)
  question: string | string[];         // string[] → joined with "\n" before markdown render
  answer:   string | string[];         // same
  comment?: string;                    // host-only note (markdown)
  image?: string;                      // /images/... served from public/
  audio?: string;                      // /audio/... served from public/
};
```

Conventions used by existing `islam*.json` packs:

- 6 categories × 5 questions per pack; values 100, 200, 300, 400, 500.
- Markdown allowed in `question`/`answer`/`comment`.
- `**bold**` → amber accent (key term).
- `*italic*` → rendered as **Arabic text** (RTL, Amiri font, 150% size, amber). Use ONLY for Arabic glyphs, not Latin italics.
- `### / ## / #` → big headings; `h4`/`h5`/`h6` repurposed as smaller emphasis (inline-block styled spans).
- `###### ...` → small attribution line with bottom border (hadith sources: "Передал ... (Бухари ...)").
- Use array form (`["line1", "line2"]`) for explicit line breaks.
- Audio paths follow `/audio/husary_{surah}_{ayah}.mp3`; download via the `download-ayah-audio` skill.
- Image paths under `/images/...`.

Drop a JSON file into `data/packs/` to add a pack — auto-listed on next socket connection (`emitPacks`).

## Rendering

`src/components/Markdown.tsx` is the shared renderer used by `QuestionView` for both question and answer text. It:

- enables GFM + line breaks
- sanitizes HTML via `rehype-sanitize`
- maps `<em>` → Arabic span (RTL, Amiri font from `next/font/google` Amiri loaded in `src/app/layout.tsx`)
- maps `h4`/`h5`/`h6` to inline-block styled spans (smaller emphasis instead of true headings)

`QuestionView` toggles between question and answer markdown blocks. Host also gets a plain-text (markdown-stripped) version of the answer in the side panel via local `stripMarkdown()`.

`BoardView` renders a CSS grid: 220px category column + N value columns (N = questions in first category).

## Realtime protocol

Server broadcasts `state` (hydrated with full `Team` objects), `packs` (id+name list), `teams`, and `sound` (spectators only). All host actions are discrete events. Source: `src/server/socket-handlers.ts`.

Host → server:

| Event | Payload |
|-------|---------|
| `host:create-team` | `{ name, logoUrl? }`, ack returns `Team` |
| `host:update-team` | `{ id, name?, logoUrl? \| null }`, ack returns `Team \| null` |
| `host:delete-team` | `{ id }`, ack `{ ok, reason? }` (blocked if team is in active game) |
| `host:create-game` | `{ packId, settings, teamIds }` |
| `host:select-question` | `{ catIdx, valIdx }` |
| `host:start-timer` | — |
| `host:toggle-answer` | — |
| `host:mark-answer` | `{ teamId, pct }` (pct: 100/75/50/25/-25/-50) |
| `host:set-score` | `{ teamId, score }` (manual edit via double-click on score) |
| `host:audio-play` / `host:audio-pause` | `{ positionSec }` |
| `host:finish-question` | — (advances to board or results) |
| `host:update-settings` | `{ roundTimeSec, penaltyPct }` |
| `host:end-game` | — (jump to results) |
| `host:new-game` | — (clears `game.json`, returns to CreateView) |

Server → clients:

| Event | Payload |
|-------|---------|
| `state` | `HydratedGameState \| null` |
| `packs` | `{ id, name }[]` |
| `teams` | `Team[]` |
| `sound` | `{ kind: "correct" \| "wrong" \| "timer-end" \| "select" }` (spectators only) |
| `error` | `{ message }` |

## Scoring

`markAnswer` (`src/server/game-engine.ts:100`):

```
delta = trunc(currentQuestion.value * pct / 100)
scores[teamId] += delta
```

Pct buttons in `QuestionView`: +100, +75, +50, +25, -25, -50. `+100` also auto-reveals the answer. `settings.penaltyPct` is persisted in the settings dialog but scoring is driven by the explicit pct buttons.

Manual score edit: double-click a team's score on the board → inline number input → Enter or blur to commit (`host:set-score`).

## Host keyboard shortcuts (QuestionView)

- `Space` — start timer (only if idle)
- `→` — reveal answer
- `←` — hide answer
- `Enter` — finish question (back to board, or → results if last cell)

## Timer

`settings.roundTimeSec`. Server-authoritative: `setExpiryTimer` schedules a `setTimeout` for `(startedAt + roundTimeSec*1000) - now`, then sets `timerState: "expired"` and broadcasts a `timer-end` sound. Updating settings mid-question reschedules.

`TimerBar` animates via `requestAnimationFrame` on the client using `startedAt` + `durationSec`.

## Audio

Per-question recitation: `audio` field → `<audio>` in `QuestionView`. Host has Play/Pause; server tracks `audioState: { playing, positionSec, startedAt }`. Spectators sync via a position delta from `startedAt`. When the host's `<audio>` fires `ended`, it emits a pause at position 0.

Sound effects (`SoundEffects.tsx`, spectator-only): preloads `correct.mp3`, `wrong.mp3`, `timer-end.mp3`, `select.mp3` from `public/sounds/` and plays them on incoming `sound` events. Drop files in manually — see `public/sounds/README.md`.

## Persistence

`createStore` (`src/server/store.ts`):

- Reads file synchronously on construction (default if missing).
- Debounced writes (200 ms in `context.ts`). Atomic via `write tmp + rename`.
- `clear()` deletes the file.
- `flush()` drains pending writes.

`teamStore` persists across games. `gameStore` holds the single active game and is cleared on `host:new-game`.

## REST endpoints

- `GET /api/pack/[id]` — returns full pack JSON (fetched by host/spectator after a game starts).
- `POST /api/upload-logo` — multipart `file`; writes to `public/uploads/teams/<uuid>.<ext>`; returns `{ url }`.

## Tests

```bash
npm test
```

Vitest unit tests cover the pure layer:

- `game-engine.test.ts` — state transitions
- `packs.test.ts` — Zod validation
- `store.test.ts` — debounced persistence
- `socket-handlers.test.ts` — wiring

## Adding content

- **New pack** — `data/packs/<id>.json`. Use `question-maker` skill to draft from `data/questions.md`.
- **New ayah audio** — use `download-ayah-audio` skill (saves to `public/audio/husary_{surah}_{ayah}.mp3`).
- **New team logo** — uploaded through the UI; landed in `public/uploads/teams/`.
- **Sound effects** — drop CC0 MP3s into `public/sounds/`.

## Design notes

See `docs/plans/2026-05-15-quiz-game-design.md` for original spec and `design.md` for the high-level feature description.
