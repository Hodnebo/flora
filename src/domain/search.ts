import { NB_NAMES, NB_SEARCH } from "../catalog/nb";
import { catalogFoods } from "./foods";
import type { Food, LanguageSetting } from "./types";

export interface FoodMatch {
  food: Food;
  matchedLabel: string;
  tier: number;
}

export function normalizeQuery(value: string): string {
  const folded = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/['’]/g, "")
    .replace(/[-_/]/g, " ")
    .replace(/[^\p{L}\p{N} ]/gu, "");
  return folded.replace(/\s+/g, " ").trim();
}

export function matchFoods(
  foods: readonly Food[],
  rawQuery: string,
  limit = 12,
  language: LanguageSetting = "en",
): FoodMatch[] {
  const query = normalizeQuery(rawQuery);
  if (query.length === 0) return [];

  const matches: FoodMatch[] = [];
  for (const food of foods) {
    const match = bestMatch(food, query, language);
    if (match) matches.push(match);
  }
  matches.sort(compareMatches);
  return matches.slice(0, limit);
}

export function findFoodByExactName(
  foods: readonly Food[],
  raw: string,
  language: LanguageSetting = "en",
): Food | null {
  const query = normalizeQuery(raw);
  if (query.length === 0) return null;

  let fallback: Food | null = null;
  for (const food of foods) {
    const matched = fieldsFor(food, language).some((field) => {
      if (normalizeQuery(field.label) !== query) return false;
      return !claimedByOtherNorwegianName(field, food.id, language);
    });
    if (!matched) continue;
    if (food.source === "catalog") return food;
    if (fallback === null) fallback = food;
  }
  return fallback;
}

const norwegianDisplayOwner = new Map<string, string>();
for (const [id, name] of Object.entries(NB_NAMES)) {
  const key = normalizeQuery(name);
  if (key.length > 0) norwegianDisplayOwner.set(key, id);
}

let englishOwners: Map<string, string> | undefined;

function englishOwnerMap(): Map<string, string> {
  if (englishOwners) return englishOwners;
  const map = new Map<string, string>();
  for (const food of catalogFoods()) {
    for (const label of [food.canonicalName, ...food.aliases]) {
      const key = normalizeQuery(label);
      if (key.length > 0 && !map.has(key)) map.set(key, food.id);
    }
  }
  englishOwners = map;
  return map;
}

function fieldsFor(
  food: Food,
  language: LanguageSetting,
): Array<{ label: string; alias: boolean }> {
  const fields: Array<{ label: string; alias: boolean }> = [
    { label: food.canonicalName, alias: false },
    ...food.aliases.map((label) => ({ label, alias: true })),
  ];
  if (food.source !== "catalog") return fields;

  const seen = new Set(fields.map((field) => normalizeQuery(field.label)));
  const owners = englishOwnerMap();
  const nbName = NB_NAMES[food.id];
  const extras = NB_SEARCH[food.id] ?? [];
  const additions: Array<{ label: string; primary: boolean }> = [];
  if (nbName) additions.push({ label: nbName, primary: language === "nb" });
  if (language === "nb") {
    for (const label of extras) additions.push({ label, primary: false });
  }

  for (const addition of additions) {
    const key = normalizeQuery(addition.label);
    if (key.length === 0 || seen.has(key)) continue;
    const owner = owners.get(key);
    const collides = owner !== undefined && owner !== food.id;
    if (collides && !(language === "nb" && addition.primary)) continue;
    seen.add(key);
    fields.push({ label: addition.label, alias: !addition.primary });
  }
  return fields;
}

function claimedByOtherNorwegianName(
  field: { label: string; alias: boolean },
  foodId: string,
  language: LanguageSetting,
): boolean {
  if (language !== "nb" || !field.alias) return false;
  const owner = norwegianDisplayOwner.get(normalizeQuery(field.label));
  return owner !== undefined && owner !== foodId;
}

function bestMatch(food: Food, query: string, language: LanguageSetting): FoodMatch | null {
  let bestTier = Number.POSITIVE_INFINITY;
  let matchedLabel: string | null = null;
  for (const field of fieldsFor(food, language)) {
    if (claimedByOtherNorwegianName(field, food.id, language)) continue;
    const tier = tierFor(field.label, query, field.alias);
    if (tier === null || tier >= bestTier) continue;
    bestTier = tier;
    matchedLabel = field.label;
  }
  if (matchedLabel === null) return null;
  return { food, matchedLabel, tier: bestTier };
}

function tierFor(label: string, query: string, alias: boolean): number | null {
  const field = normalizeQuery(label);
  if (field.length === 0) return null;
  const offset = alias ? 1 : 0;
  if (field === query) return offset;
  if (field.startsWith(query)) return 2 + offset;
  if (field.includes(query)) return 4 + offset;
  if (field.length >= 3 && query.startsWith(field)) return 6 + offset;
  return null;
}

function compareMatches(a: FoodMatch, b: FoodMatch): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  const sourceDelta = sourceRank(a.food.source) - sourceRank(b.food.source);
  if (sourceDelta !== 0) return sourceDelta;
  const lengthDelta = a.food.canonicalName.length - b.food.canonicalName.length;
  if (lengthDelta !== 0) return lengthDelta;
  if (a.food.id < b.food.id) return -1;
  if (a.food.id > b.food.id) return 1;
  return 0;
}

function sourceRank(source: Food["source"]): number {
  return source === "catalog" ? 0 : 1;
}
