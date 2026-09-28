import { pointsForCategory } from "./category";
import { foodMap } from "./foods";
import type { Entry, PersistedState } from "./types";

export function entriesForWeek(state: PersistedState, weekKey: string): Entry[] {
  return state.entries
    .filter((entry) => entry.weekKey === weekKey)
    .sort((a, b) => {
      const byTime = a.loggedAt.localeCompare(b.loggedAt);
      if (byTime !== 0) return byTime;
      return a.id.localeCompare(b.id);
    });
}

export function scoreWeek(state: PersistedState, weekKey: string): number {
  const foods = foodMap(state.customFoods);
  const seen = new Set<string>();
  let score = 0;
  for (const entry of state.entries) {
    if (entry.weekKey !== weekKey) continue;
    if (seen.has(entry.foodId)) continue;
    seen.add(entry.foodId);
    const food = foods.get(entry.foodId);
    if (!food) continue;
    score += pointsForCategory(food.category);
  }
  return score;
}
