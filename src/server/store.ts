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
