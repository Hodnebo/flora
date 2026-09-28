import { isCategory } from "../domain/category";
import { isWeekKey } from "../domain/isoWeek";
import {
  emptyState,
  SCHEMA_VERSION,
  type Entry,
  type Food,
  type PersistedState,
  type ThemeSetting,
} from "../domain/types";

const CUSTOM_ID = /^custom:[0-9a-zA-Z-]{8,}$/;

export type MigrateResult =
  { ok: true; state: PersistedState } | { ok: false; reason: "unsupported-version" | "corrupt" };

export function migrate(raw: unknown): MigrateResult {
  if (raw === null || raw === undefined) return { ok: true, state: emptyState() };
  if (typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "corrupt" };

  const record = raw as Record<string, unknown>;
  if (Object.hasOwn(record, "schemaVersion")) {
    const version = record.schemaVersion;
    if (typeof version !== "number" || !Number.isFinite(version) || version < 0) {
      return { ok: false, reason: "corrupt" };
    }
    if (version > SCHEMA_VERSION) return { ok: false, reason: "unsupported-version" };
    if (version !== 0 && version !== 1) return { ok: false, reason: "corrupt" };
  }

  return { ok: true, state: repairV1(record) };
}

function repairV1(record: Record<string, unknown>): PersistedState {
  const customFoods = readCustomFoods(record.customFoods);
  const customIds = new Set(customFoods.map((food) => food.id));
  return {
    schemaVersion: SCHEMA_VERSION,
    customFoods,
    entries: readEntries(record.entries, customIds),
    settings: { theme: readTheme(record.settings) },
  };
}

function readCustomFoods(value: unknown): Food[] {
  if (!Array.isArray(value)) return [];
  const foods: Food[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const food = parseCustomFood(item);
    if (!food || seen.has(food.id)) continue;
    seen.add(food.id);
    foods.push(food);
  }
  return foods;
}

function parseCustomFood(value: unknown): Food | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || !CUSTOM_ID.test(value.id)) return null;
  const canonicalName = readCanonicalName(value);
  if (canonicalName === null) return null;
  if (!isCategory(value.category)) return null;
  return {
    id: value.id,
    canonicalName,
    category: value.category,
    aliases: readAliases(value.aliases),
    source: "custom",
  };
}

function readCanonicalName(value: Record<string, unknown>): string | null {
  const candidates = [value.canonicalName, value.name];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

function readAliases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const aliases: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.length > 0) aliases.push(item);
  }
  return aliases;
}

interface StampedEntry extends Entry {
  index: number;
}

function readEntries(value: unknown, customIds: ReadonlySet<string>): Entry[] {
  if (!Array.isArray(value)) return [];
  const valid: StampedEntry[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const parsed = parseEntry(value[index], customIds);
    if (parsed) valid.push({ ...parsed, index });
  }

  const bySlot = new Map<string, StampedEntry>();
  for (const entry of valid) {
    const slot = `${entry.weekKey}\0${entry.foodId}`;
    const current = bySlot.get(slot);
    if (!current || isNewer(entry, current)) bySlot.set(slot, entry);
  }

  const winners = [...bySlot.values()].sort((a, b) => a.index - b.index);
  const seenIds = new Set<string>();
  const entries: Entry[] = [];
  for (const entry of winners) {
    if (seenIds.has(entry.id)) continue;
    seenIds.add(entry.id);
    entries.push({
      id: entry.id,
      foodId: entry.foodId,
      weekKey: entry.weekKey,
      loggedAt: entry.loggedAt,
    });
  }
  return entries;
}

function parseEntry(value: unknown, customIds: ReadonlySet<string>): Entry | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || value.id.length === 0) return null;
  if (typeof value.foodId !== "string" || value.foodId.length === 0) return null;
  if (typeof value.weekKey !== "string" || !isWeekKey(value.weekKey)) return null;
  if (typeof value.loggedAt !== "string" || Number.isNaN(Date.parse(value.loggedAt))) return null;
  if (value.foodId.startsWith("custom:") && !customIds.has(value.foodId)) return null;
  return {
    id: value.id,
    foodId: value.foodId,
    weekKey: value.weekKey,
    loggedAt: value.loggedAt,
  };
}

function isNewer(candidate: StampedEntry, current: StampedEntry): boolean {
  const candidateTime = Date.parse(candidate.loggedAt);
  const currentTime = Date.parse(current.loggedAt);
  if (candidateTime > currentTime) return true;
  if (candidateTime < currentTime) return false;
  return candidate.index > current.index;
}

function readTheme(settings: unknown): ThemeSetting {
  if (!isRecord(settings)) return "system";
  const theme = settings.theme;
  if (theme === "system" || theme === "light" || theme === "dark") return theme;
  return "system";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
