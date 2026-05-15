import { expect, test, describe } from "vitest";
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

describe("selectQuestion", () => {
  const base = createGame({
    packId: "p1",
    pack,
    settings: { roundTimeSec: 60, penaltyPct: 50 },
    teamIds: ["t1"],
  });

  test("opens question, phase=question, timer idle, no attempts", () => {
    const next = selectQuestion(base, { catIdx: 0, valIdx: 1 }, pack);
    expect(next.phase).toBe("question");
    expect(next.currentQuestion).toEqual({
      catIdx: 0,
      valIdx: 1,
      value: 200,
      timerState: "idle",
      attempts: [],
    });
  });

  test("throws if cell already used", () => {
    const used = { ...base, board: { ...base.board, "0_0": "used" as const } };
    expect(() => selectQuestion(used, { catIdx: 0, valIdx: 0 }, pack)).toThrow();
  });

  test("throws if not on board phase", () => {
    const inQ = selectQuestion(base, { catIdx: 0, valIdx: 0 }, pack);
    expect(() => selectQuestion(inQ, { catIdx: 1, valIdx: 0 }, pack)).toThrow();
  });

  test("throws on out-of-range indices", () => {
    expect(() => selectQuestion(base, { catIdx: 5, valIdx: 0 }, pack)).toThrow();
  });
});

describe("timer", () => {
  const base = createGame({ packId: "p1", pack, settings: { roundTimeSec: 60, penaltyPct: 50 }, teamIds: ["t1"] });
  const opened = selectQuestion(base, { catIdx: 0, valIdx: 0 }, pack);

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

describe("markAnswer", () => {
  const base = createGame({ packId: "p1", pack, settings: { roundTimeSec: 60, penaltyPct: 50 }, teamIds: ["t1", "t2"] });
  const open = selectQuestion(base, { catIdx: 0, valIdx: 1 }, pack); // value 200

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
    const open100 = selectQuestion(base, { catIdx: 0, valIdx: 0 }, pack); // value 100
    const customPenalty = { ...open100, settings: { ...open100.settings, penaltyPct: 33 } };
    const next = markAnswer(customPenalty, { teamId: "t1", result: "wrong" });
    expect(next.scores.t1).toBe(-33);
  });
});

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
