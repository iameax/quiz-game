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
