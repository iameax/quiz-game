# Quiz Game — Design

Date: 2026-05-15
Source: `design.md`, `qq.png`, `questions.md`

Web-based Jeopardy-style quiz client. One host runs the game; spectators view in real time on separate devices. All UI text Russian.

## 1. Architecture

**Stack:** Next.js (App Router) + Socket.IO. Custom `server.js` wraps Next and attaches Socket.IO so HTTP and WebSocket share one port.

**Persistence:** flat JSON files on disk.
- `data/game.json` — active game (one only; overwritten on new game)
- `data/teams.json` — team library (persists across games)
- `data/packs/*.json` — read-only question packs
- `public/uploads/teams/<teamId>.<ext>` — team logos
- `public/packs-assets/<packId>/` — question images and audio referenced by packs

In-memory state is source of truth. Mutations write to disk via debounced (200ms) atomic write (temp file + rename). Single Node process — no locking beyond debounce.

**Rooms / roles:** single Socket.IO room `"game"`. Host role limited to one socket; second host attempt receives `error`. Spectators unlimited. No auth (trusted LAN).

## 2. Data model

### Question pack (`data/packs/<id>.json`)
```json
{
  "id": "islam-basics",
  "name": "Основы ислама",
  "categories": [
    {
      "name": "Коран",
      "questions": [
        {
          "value": 100,
          "question": "Markdown text",
          "answer": "Markdown text",
          "image": "/packs-assets/islam-basics/q1.jpg",
          "audio": "/packs-assets/islam-basics/q1.mp3"
        }
      ]
    }
  ]
}
```
`image` and `audio` optional. Markdown in `question` and `answer`. Loaded at server start and validated with zod.

### Team library (`data/teams.json`)
```json
{
  "teams": [
    { "id": "uuid", "name": "Команда А", "logoUrl": "/uploads/teams/uuid.png", "createdAt": "..." }
  ]
}
```
Teams independent of games. Reusable. MVP: create + select only (no edit/delete).

### Game state (`data/game.json`)
```ts
{
  id: string,
  packId: string,
  settings: { roundTimeSec: number, penaltyPct: number },
  teamIds: string[],
  scores: { [teamId]: number },
  board: { [`${catIdx}_${valIdx}`]: "unused" | "used" },
  currentQuestion: null | {
    catIdx: number,
    valIdx: number,
    timerState: "idle" | "running" | "expired",
    timerStartedAt?: number,
    attempts: { teamId: string, result: "correct" | "wrong" }[],
    audioState?: { playing: boolean, positionSec: number, startedAt?: number }
  },
  phase: "creating" | "board" | "question" | "results"
}
```
Server hydrates `teams` from library when emitting state, so clients receive denormalized payload.

## 3. Game flow & WebSocket protocol

### Client → Server
- `host:create-game` `{ packId, settings, teamIds }`
- `host:create-team` `{ name, logoUrl? }` → returns team, added to library
- `host:select-question` `{ catIdx, valIdx }`
- `host:start-timer`
- `host:mark-answer` `{ teamId, result: "correct" | "wrong" }`
- `host:finish-question` → mark cell used; if all cells used → results, else → board
- `host:audio-play` `{ positionSec }`
- `host:audio-pause` `{ positionSec }`
- `host:end-game` → force results
- `host:new-game` → delete game.json, return to create

### Server → Client
- `state` — full game state with hydrated teams; broadcast on every mutation
- `sound` `{ kind: "correct" | "wrong" | "timer-end" | "select" }` — spectators only
- `error` `{ message }` — to originating socket

**Why full state, not deltas:** game state small (<5KB), eliminates desync, reconnect-safe.

### Timer
Server stores `timerStartedAt` + `settings.roundTimeSec`. Clients compute remaining from `Date.now() - timerStartedAt`. Server `setTimeout` for expiry flips `timerState` → `"expired"` and emits `sound: timer-end` to spectators. Host still controls awarding points after expiry.

### Audio sync
Host clicks play/pause. Server records `audioState`. All clients (host + spectators) mount `<audio>` and on `audioState` change set `currentTime = positionSec + (playing ? (Date.now() - startedAt)/1000 : 0)` then play/pause. ~200–500ms drift accepted.

### Steals
After wrong answer, question stays open. Host can pick another team. Continues until correct answer or host clicks finish. Each wrong attempt applies penalty.

### Penalty math
`delta = -roundDown(value * penaltyPct / 100)`. Subtracted from team score. Scores may go negative.

### Reconnect
New socket joins → server emits `state` immediately. Host identity by `role` query param + `hostSocketId` lock in memory. Old host socket disconnect releases lock.

## 4. File layout

```
quiz-game/
  server.js
  next.config.js
  package.json
  tsconfig.json
  tailwind.config.ts
  data/
    game.json                 # gitignored
    teams.json                # gitignored
    packs/
      islam-basics.json
  public/
    uploads/teams/            # gitignored
    packs-assets/
      islam-basics/
    sounds/
      correct.mp3
      wrong.mp3
      timer-end.mp3
      select.mp3
  src/
    app/
      layout.tsx
      page.tsx                # host root (/)
      spectator/page.tsx      # spectator root
      api/upload-logo/route.ts
    components/
      views/
        CreateView.tsx
        BoardView.tsx
        QuestionView.tsx
        ResultsView.tsx
      TeamCard.tsx
      TimerBar.tsx
      Markdown.tsx
    lib/
      socket-client.ts
      types.ts
    server/
      store.ts
      game-engine.ts
      socket-handlers.ts
      packs.ts
  docs/plans/
    2026-05-15-quiz-game-design.md
```

## 5. Views

Routing: `/` host, `/spectator` spectator. Both subscribe to `state` and switch view by `phase` field. No client routing transitions.

### CreateView (host)
- Pack dropdown (Russian names)
- Round time input (sec, default 60)
- Penalty % input (0–100, default 50)
- Team picker grid with checkboxes; "+ Новая команда" opens inline form (name + optional logo upload via REST endpoint, then `host:create-team`)
- "Начать игру" button — disabled until pack + ≥2 teams selected

### BoardView
- Grid: categories as rows, values as columns (matches `qq.png`). Used cells dimmed.
- Bottom strip: team cards (logo, name, score)
- Host: cells clickable → `host:select-question`. Spectator: read-only.
- Style: dark blue background, white/yellow text.

### QuestionView
- Image (if present) above question, height-capped
- Question rendered as markdown, large
- Audio: host sees play/pause button; all clients mount `<audio>` synced via `audioState`
- Timer bar across top, animates client-side from `timerStartedAt`
- Host extras: answer markdown (hidden from spectators), team cards as clickable buttons (host clicks team → then Correct/Wrong), attempts log, "Старт таймера", "Завершить"
- Spectator: when host picks team to answer, show "Команда X отвечает..."; on mark, show "Команда X ответила правильно/неправильно!" and play sound

### ResultsView
- Teams sorted by score desc
- Winner card scaled ~1.3×, gold accent
- Host: "Новая игра" → CreateView

**Styling:** Tailwind, `@tailwindcss/typography` for markdown prose (`prose prose-invert`). Dark theme. All copy Russian.

## 6. Markdown rendering

`react-markdown` + `remark-gfm` + `rehype-sanitize`. Applied to question and answer fields. Images and links allowed.

## 7. Media upload

Logo upload: `POST /api/upload-logo` multipart → saves to `public/uploads/teams/<uuid>.<ext>` → returns `{ url }`. Mime validated (image/*). No size cap. Random filename. Host then includes `logoUrl` in `host:create-team` event.

Pack media (images, audio): authored offline. Drop files into `public/packs-assets/<packId>/` and reference relative paths in pack JSON. No upload UI.

## 8. Spectator autoplay gate

Browser autoplay blocks `<audio>` without user gesture. Spectator first load shows "Нажмите чтобы присоединиться" splash. Click unlocks audio context for sound effects and question audio.

## 9. Testing

### Unit (Vitest)
- `game-engine.ts` pure transitions: select question, start timer, mark answer (correct + wrong), steals (multiple wrongs then correct), finish question, board complete → results, audio play/pause, penalty math (including negative scores)
- `packs.ts` zod validation rejects malformed packs
- `store.ts` atomic write, debounce coalesces, reload restores state

### Integration
Spin up server, two `socket.io-client` instances (host + spectator), scripted game, assert state events consistent across both.

### Manual
1. Create seed pack `data/packs/islam-basics.json` from `questions.md` (fill placeholder answers as needed)
2. Create game with 3 teams, 2 with logos
3. Play full board with mix of correct/wrong/steal
4. Verify spectator on second device sees board, "отвечает...", result messages, sound effects
5. Refresh host mid-question → reconnects, state intact
6. Refresh spectator mid-question → reconnects, state intact
7. Timer expires → spectator hears timer-end, host can still mark
8. Question with image + audio: host plays audio, all clients hear within ~500ms; pause stops everywhere
9. Results view shows winner scaled
10. Restart server mid-game → state restored from disk

## 10. Success criteria

- All 4 views render with host + spectator parity per `design.md`
- Russian copy throughout
- Markdown rendered in questions and answers
- Spectator-only sound effects
- File persistence survives server restart mid-game
- Steals: unlimited wrong attempts allowed until correct or host finishes
- One host enforced
- Image and audio sync across all clients within ~500ms drift

## 11. Out of scope (YAGNI)

Auth, multi-game concurrency, team edit/delete, in-app pack editor, game history, mobile-optimized host UI, internationalization beyond Russian, dark/light toggle, upload size limits, fancy audio sync (NTP-style clock alignment).
