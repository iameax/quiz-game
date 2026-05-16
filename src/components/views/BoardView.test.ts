import { describe, expect, test } from "vitest";
import { stepBoardFocus } from "./BoardView";

describe("stepBoardFocus", () => {
  test("moves to the nearest tile to the right", () => {
    const board = {
      "0_2": "unused",
      "1_3": "unused",
      "4_1": "unused",
      "4_3": "unused",
    } as const;

    expect(stepBoardFocus({ catIdx: 4, valIdx: 1 }, board, 5, 4, 0, 1)).toEqual({ catIdx: 4, valIdx: 3 });
  });

  test("moves to the nearest tile downward", () => {
    const board = {
      "1_2": "unused",
      "2_4": "unused",
      "3_1": "unused",
    } as const;

    expect(stepBoardFocus({ catIdx: 1, valIdx: 2 }, board, 4, 5, 1, 0)).toEqual({ catIdx: 2, valIdx: 4 });
  });

  test("can continue moving right from an offset tile", () => {
    const board = {
      "1_2": "unused",
      "2_4": "unused",
      "4_3": "unused",
    } as const;

    expect(stepBoardFocus({ catIdx: 1, valIdx: 2 }, board, 5, 5, 0, 1)).toEqual({ catIdx: 2, valIdx: 4 });
  });

  test("stays in place when no tile exists in that direction", () => {
    const board = {
      "0_0": "unused",
      "1_0": "used",
      "0_1": "used",
    } as const;

    expect(stepBoardFocus({ catIdx: 0, valIdx: 0 }, board, 2, 2, 0, 1)).toEqual({ catIdx: 0, valIdx: 0 });
    expect(stepBoardFocus({ catIdx: 0, valIdx: 0 }, board, 2, 2, 1, 0)).toEqual({ catIdx: 0, valIdx: 0 });
  });
});