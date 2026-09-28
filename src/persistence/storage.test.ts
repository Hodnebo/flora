import { describe, expect, it } from "vitest";
import { setTheme } from "../domain/log";
import { emptyState, type PersistedState } from "../domain/types";
import { createStore, STORAGE_KEYS, type KeyValueStore } from "./storage";

function createMemory(initial: Record<string, string> = {}): KeyValueStore & {
  map: Map<string, string>;
  writes: string[];
} {
  const map = new Map(Object.entries(initial));
  const writes: string[] = [];
  return {
    map,
    writes,
    getItem(key) {
      const value = map.get(key);
      return value === undefined ? null : value;
    },
    setItem(key, value) {
      writes.push(key);
      map.set(key, value);
    },
  };
}

const saved: PersistedState = setTheme(
  {
    ...emptyState(),
    customFoods: [
      {
        id: "custom:homemade1",
        canonicalName: "Nettle",
        category: "herb",
        aliases: ["stinging nettle"],
        source: "custom",
      },
    ],
    entries: [
      {
        id: "e1",
        foodId: "custom:homemade1",
        weekKey: "2026-W10",
        loggedAt: "2026-03-02T08:00:00.000Z",
      },
    ],
  },
  "dark",
);

describe("storage", () => {
  it("uses the flora state keys", () => {
    expect(STORAGE_KEYS).toEqual({ data: "flora.state", backup: "flora.state.backup" });
  });

  it("loads a missing key as empty state and does not write", () => {
    const memory = createMemory();
    const loaded = createStore(memory).load();
    expect(loaded).toEqual({ ok: true, state: emptyState(), raw: null });
    expect(memory.writes).toEqual([]);
    expect(memory.map.size).toBe(0);
  });

  it("round-trips save and load", () => {
    const memory = createMemory();
    const store = createStore(memory);
    expect(store.save(saved)).toEqual({ ok: true });
    expect(store.load()).toEqual({ ok: true, state: saved, raw: JSON.stringify(saved) });
    expect(memory.writes).toEqual([STORAGE_KEYS.data]);
    const parsed = JSON.parse(memory.map.get(STORAGE_KEYS.data) ?? "null") as Record<
      string,
      unknown
    >;
    expect(parsed).not.toHaveProperty("goal");
  });

  it("returns corrupt JSON without replacing the data key", () => {
    const memory = createMemory({ [STORAGE_KEYS.data]: "{not json" });
    const loaded = createStore(memory).load();
    expect(loaded).toEqual({ ok: false, reason: "corrupt", raw: "{not json" });
    expect(memory.map.get(STORAGE_KEYS.data)).toBe("{not json");
    expect(memory.writes).toEqual([]);
  });

  it("writes the backup key only", () => {
    const memory = createMemory({ [STORAGE_KEYS.data]: "original" });
    createStore(memory).backup("snapshot");
    expect(memory.writes).toEqual([STORAGE_KEYS.backup]);
    expect(memory.map.get(STORAGE_KEYS.data)).toBe("original");
    expect(memory.map.get(STORAGE_KEYS.backup)).toBe("snapshot");
  });

  it("does not overwrite data when the stored version is unsupported", () => {
    const original = JSON.stringify({ schemaVersion: 2, settings: { theme: "dark" } });
    const memory = createMemory({ [STORAGE_KEYS.data]: original });
    const loaded = createStore(memory).load();
    expect(loaded).toEqual({ ok: false, reason: "unsupported-version", raw: original });
    expect(memory.map.get(STORAGE_KEYS.data)).toBe(original);
    expect(memory.writes).toEqual([]);
  });

  it("returns ok false when setItem throws", () => {
    const kv: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(createStore(kv).save(emptyState())).toEqual({ ok: false });
  });
});
