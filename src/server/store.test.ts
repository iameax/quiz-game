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
