# Quiz Game

Web-based Jeopardy-style quiz client. One host runs the game; spectators join from any device on the LAN.

## Setup

```bash
npm install
```

Add sound assets to `public/sounds/` (see `public/sounds/README.md`).
Add question packs to `data/packs/*.json` (see `docs/plans/2026-05-15-quiz-game-design.md` for schema).

## Run

```bash
npm run dev
```

- Host: `http://localhost:3000`
- Spectators: `http://<host-lan-ip>:3000/spectator`

## Test

```bash
npm test
```

## Architecture

See `docs/plans/2026-05-15-quiz-game-design.md`.
