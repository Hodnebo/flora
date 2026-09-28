import { emptyState, type PersistedState } from "../domain/types";
import { migrate } from "./migrate";

export const STORAGE_KEYS = {
  data: "flora.state",
  backup: "flora.state.backup",
} as const;

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type LoadResult =
  | { ok: true; state: PersistedState; raw: string | null }
  | { ok: false; reason: "corrupt" | "unsupported-version"; raw: string | null };

export type SaveResult = { ok: true } | { ok: false };

export interface StateStore {
  load: () => LoadResult;
  save: (state: PersistedState) => SaveResult;
  backup: (raw: string) => void;
}

export function createStore(kv: KeyValueStore): StateStore {
  return {
    load() {
      const raw = kv.getItem(STORAGE_KEYS.data);
      if (raw === null || raw.trim() === "") {
        return { ok: true, state: emptyState(), raw };
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { ok: false, reason: "corrupt", raw };
      }
      const migrated = migrate(parsed);
      if (!migrated.ok) return { ok: false, reason: migrated.reason, raw };
      return { ok: true, state: migrated.state, raw };
    },
    save(state) {
      try {
        kv.setItem(STORAGE_KEYS.data, JSON.stringify(state));
        return { ok: true };
      } catch {
        return { ok: false };
      }
    },
    backup(raw) {
      kv.setItem(STORAGE_KEYS.backup, raw);
    },
  };
}
