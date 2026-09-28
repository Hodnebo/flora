import type { Category } from "./category";

export type FoodSource = "catalog" | "custom";

export interface Food {
  id: string;
  canonicalName: string;
  category: Category;
  aliases: readonly string[];
  source: FoodSource;
}

export interface Entry {
  id: string;
  foodId: string;
  weekKey: string;
  loggedAt: string;
}

export type ThemeSetting = "system" | "light" | "dark";

export interface Settings {
  theme: ThemeSetting;
}

export interface PersistedState {
  schemaVersion: 1;
  customFoods: Food[];
  entries: Entry[];
  settings: Settings;
}

export const SCHEMA_VERSION = 1 as const;

export type DomainError =
  | "duplicate-food"
  | "unknown-food"
  | "empty-name"
  | "food-exists"
  | "invalid-week"
  | "unknown-entry"
  | "not-custom";

export type Result<T> = { ok: true; value: T } | { ok: false; error: DomainError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T>(error: DomainError): Result<T> {
  return { ok: false, error };
}

export function emptyState(): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    customFoods: [],
    entries: [],
    settings: { theme: "system" },
  };
}
