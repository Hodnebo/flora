import type { Category } from "./category";
import { catalogFoods, foodMap } from "./foods";
import { isWeekKey } from "./isoWeek";
import { findFoodByExactName } from "./search";
import { err, ok, type Food, type PersistedState, type Result, type ThemeSetting } from "./types";

const MAX_NAME_LENGTH = 80;

export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function logFood(
  state: PersistedState,
  foodId: string,
  weekKey: string,
  now: Date = new Date(),
  entryId: string = crypto.randomUUID(),
): Result<PersistedState> {
  if (!isWeekKey(weekKey)) return err<PersistedState>("invalid-week");
  if (!foodMap(state.customFoods).has(foodId)) return err<PersistedState>("unknown-food");
  const duplicate = state.entries.some(
    (entry) => entry.weekKey === weekKey && entry.foodId === foodId,
  );
  if (duplicate) return err<PersistedState>("duplicate-food");
  return ok({
    ...state,
    entries: [...state.entries, { id: entryId, foodId, weekKey, loggedAt: now.toISOString() }],
  });
}

export function removeEntry(state: PersistedState, entryId: string): Result<PersistedState> {
  if (!state.entries.some((entry) => entry.id === entryId))
    return err<PersistedState>("unknown-entry");
  return ok({
    ...state,
    entries: state.entries.filter((entry) => entry.id !== entryId),
  });
}

export function replaceEntryFood(
  state: PersistedState,
  entryId: string,
  foodId: string,
): Result<PersistedState> {
  const entry = state.entries.find((candidate) => candidate.id === entryId);
  if (!entry) return err<PersistedState>("unknown-entry");
  if (!foodMap(state.customFoods).has(foodId)) return err<PersistedState>("unknown-food");
  if (entry.foodId === foodId) return ok(state);
  const duplicate = state.entries.some(
    (candidate) =>
      candidate.id !== entryId &&
      candidate.weekKey === entry.weekKey &&
      candidate.foodId === foodId,
  );
  if (duplicate) return err<PersistedState>("duplicate-food");
  return ok({
    ...state,
    entries: state.entries.map((candidate) =>
      candidate.id === entryId ? { ...candidate, foodId } : candidate,
    ),
  });
}

function customFood(
  state: PersistedState,
  rawName: string,
  category: Category,
  foodId?: string,
): Result<Food> {
  const canonicalName = cleanName(rawName);
  if (canonicalName.length === 0 || canonicalName.length > MAX_NAME_LENGTH) {
    return err<Food>("empty-name");
  }
  const known = [...foodMap(state.customFoods).values()];
  if (findFoodByExactName(known, canonicalName)) return err<Food>("food-exists");
  return ok({
    id: foodId ?? `custom:${crypto.randomUUID()}`,
    canonicalName,
    category,
    aliases: [],
    source: "custom",
  });
}

function withCustomFood(state: PersistedState, food: Food): PersistedState {
  return { ...state, customFoods: [...state.customFoods, food] };
}

export function logCustomFood(
  state: PersistedState,
  rawName: string,
  category: Category,
  weekKey: string,
  now: Date = new Date(),
  ids?: { foodId?: string; entryId?: string },
): Result<PersistedState> {
  const created = customFood(state, rawName, category, ids?.foodId);
  if (!created.ok) return created;
  return logFood(
    withCustomFood(state, created.value),
    created.value.id,
    weekKey,
    now,
    ids?.entryId ?? crypto.randomUUID(),
  );
}

export function replaceEntryWithCustomFood(
  state: PersistedState,
  entryId: string,
  rawName: string,
  category: Category,
  foodId?: string,
): Result<PersistedState> {
  const created = customFood(state, rawName, category, foodId);
  if (!created.ok) return created;
  return replaceEntryFood(withCustomFood(state, created.value), entryId, created.value.id);
}

export function updateCustomFood(
  state: PersistedState,
  foodId: string,
  patch: { name?: string; category?: Category },
): Result<PersistedState> {
  const index = state.customFoods.findIndex((food) => food.id === foodId);
  const current = index >= 0 ? state.customFoods[index] : undefined;
  if (!current) return err<PersistedState>("not-custom");

  let canonicalName = current.canonicalName;
  if (patch.name !== undefined) {
    const cleaned = cleanName(patch.name);
    if (cleaned.length === 0 || cleaned.length > MAX_NAME_LENGTH) {
      return err<PersistedState>("empty-name");
    }
    if (findFoodByExactName(otherFoods(state, index), cleaned)) {
      return err<PersistedState>("food-exists");
    }
    canonicalName = cleaned;
  }

  const updated: Food = {
    ...current,
    canonicalName,
    category: patch.category ?? current.category,
  };
  return ok({
    ...state,
    customFoods: state.customFoods.map((food, foodIndex) => (foodIndex === index ? updated : food)),
  });
}

export function setTheme(state: PersistedState, theme: ThemeSetting): PersistedState {
  return {
    ...state,
    settings: { ...state.settings, theme },
  };
}

function otherFoods(state: PersistedState, index: number): Food[] {
  const current = state.customFoods[index];
  const foods = catalogFoods().filter((food) => food.id !== current?.id);
  for (let i = 0; i < state.customFoods.length; i += 1) {
    if (i === index) continue;
    const food = state.customFoods[i];
    if (food) foods.push(food);
  }
  return foods;
}
