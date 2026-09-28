import type { Food } from "./types";

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

export function matchFoods(foods: readonly Food[], rawQuery: string, limit = 12): FoodMatch[] {
  const query = normalizeQuery(rawQuery);
  if (query.length === 0) return [];

  const matches: FoodMatch[] = [];
  for (const food of foods) {
    const match = bestMatch(food, query);
    if (match) matches.push(match);
  }
  matches.sort(compareMatches);
  return matches.slice(0, limit);
}

export function findFoodByExactName(foods: readonly Food[], raw: string): Food | null {
  const query = normalizeQuery(raw);
  if (query.length === 0) return null;

  let fallback: Food | null = null;
  for (const food of foods) {
    const labels = [food.canonicalName, ...food.aliases];
    const matched = labels.some((label) => normalizeQuery(label) === query);
    if (!matched) continue;
    if (food.source === "catalog") return food;
    if (fallback === null) fallback = food;
  }
  return fallback;
}

function bestMatch(food: Food, query: string): FoodMatch | null {
  const fields: Array<{ label: string; alias: boolean }> = [
    { label: food.canonicalName, alias: false },
    ...food.aliases.map((label) => ({ label, alias: true })),
  ];

  let bestTier = Number.POSITIVE_INFINITY;
  let matchedLabel: string | null = null;
  for (const field of fields) {
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
