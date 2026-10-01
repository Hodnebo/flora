import { pointsForCategory, WEEKLY_GOAL, type Category } from "../domain/category";
import { formatPoints } from "../domain/format";
import type { Entry, Food } from "../domain/types";

export { WEEKLY_GOAL };

export function localDayKey(loggedAt: string): string {
  const d = new Date(loggedAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateFromDayKey(dayKey: string): Date {
  const parts = dayKey.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  return new Date(y, m - 1, d);
}

export function weekdayIndex(dayKey: string): number {
  const day = dateFromDayKey(dayKey).getDay();
  return (day + 6) % 7;
}

export function formatDayLabel(dayKey: string, locale: string): string {
  const d = dateFromDayKey(dayKey);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function formatWeekdayShort(dayKey: string, locale: string): string {
  const d = dateFromDayKey(dayKey);
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
}

export type DayLedgerRow = {
  id: string;
  name: string;
  pointsLabel: string | null;
  category: Category | null;
};

export type DayLedgerSection = {
  dayKey: string;
  weekdayIndex: number;
  label: string;
  count: number;
  points: number;
  rows: DayLedgerRow[];
};

export function groupLedgerByDay(args: {
  entries: readonly Entry[];
  foods: ReadonlyMap<string, Food>;
  dateLocale: string;
  unknownPlantLabel: string;
  nameOf: (food: Food) => string;
}): DayLedgerSection[] {
  const { entries, foods, dateLocale, unknownPlantLabel, nameOf } = args;
  const sorted = [...entries].sort(
    (a, b) => a.loggedAt.localeCompare(b.loggedAt) || a.id.localeCompare(b.id),
  );

  const byDay = new Map<string, DayLedgerRow[]>();
  const pointsByDay = new Map<string, number>();

  for (const entry of sorted) {
    const dayKey = localDayKey(entry.loggedAt);
    const food = foods.get(entry.foodId);
    let row: DayLedgerRow;
    let pts = 0;
    if (!food) {
      row = {
        id: entry.id,
        name: unknownPlantLabel,
        pointsLabel: null,
        category: null,
      };
    } else {
      pts = pointsForCategory(food.category);
      row = {
        id: entry.id,
        name: nameOf(food),
        pointsLabel: formatPoints(pts),
        category: food.category,
      };
    }
    const rows = byDay.get(dayKey);
    if (rows) rows.push(row);
    else byDay.set(dayKey, [row]);
    pointsByDay.set(dayKey, (pointsByDay.get(dayKey) ?? 0) + pts);
  }

  const dayKeys = [...byDay.keys()].sort((a, b) => a.localeCompare(b));
  return dayKeys.map((dayKey) => {
    const rows = byDay.get(dayKey) ?? [];
    return {
      dayKey,
      weekdayIndex: weekdayIndex(dayKey),
      label: formatDayLabel(dayKey, dateLocale),
      count: rows.length,
      points: pointsByDay.get(dayKey) ?? 0,
      rows,
    };
  });
}

/** After 30, each new goal is this many points further, and the bar clears again. */
export const STRETCH_STEP = 10;

export function activeGoal(
  points: number,
  goal: number = WEEKLY_GOAL,
  step: number = STRETCH_STEP,
): number {
  if (points < goal) return goal;
  return goal + (Math.floor((points - goal) / step) + 1) * step;
}

export function stretchTier(
  points: number,
  goal: number = WEEKLY_GOAL,
  step: number = STRETCH_STEP,
): number {
  if (points < goal) return 0;
  return Math.floor((points - goal) / step) + 1;
}

export type ScoreBarSegment = {
  kind: "base" | "today";
  leftPercent: number;
  widthPercent: number;
};

export type ScoreBarLayout = {
  stretch: boolean;
  scaleMax: number;
  ticks: readonly number[];
  segments: ScoreBarSegment[];
  todayCount: number | null;
  totalPoints: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function layoutScoreBar(
  sections: readonly Pick<DayLedgerSection, "dayKey" | "count" | "points">[],
  todayKey: string | null,
  goal: number = WEEKLY_GOAL,
): ScoreBarLayout {
  const ordered = [...sections].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
  let totalPoints = 0;
  let pointsBeforeToday = 0;
  let todayPoints = 0;
  let todayCount = 0;
  let passedToday = false;
  for (const section of ordered) {
    totalPoints += section.points;
    if (todayKey !== null && section.dayKey === todayKey) {
      todayPoints = section.points;
      todayCount = section.count;
      passedToday = true;
      continue;
    }
    if (!passedToday) pointsBeforeToday += section.points;
  }

  const stretch = totalPoints >= goal;
  const windowEnd = activeGoal(totalPoints, goal);
  const windowStart = stretch ? windowEnd - STRETCH_STEP : 0;
  const span = windowEnd - windowStart;
  const filledEnd = Math.min(Math.max(totalPoints, windowStart), windowEnd);
  const toPercent = (point: number) => round2(((point - windowStart) / span) * 100);

  const clip = (
    start: number,
    end: number,
  ): { leftPercent: number; widthPercent: number } | null => {
    const a = Math.max(start, windowStart);
    const b = Math.min(end, filledEnd);
    if (b <= a) return null;
    const leftPercent = toPercent(a);
    const widthPercent = round2(toPercent(b) - leftPercent);
    if (widthPercent <= 0) return null;
    return { leftPercent, widthPercent };
  };

  const before = clip(0, pointsBeforeToday);
  const today = clip(pointsBeforeToday, pointsBeforeToday + todayPoints);
  const after = clip(pointsBeforeToday + todayPoints, totalPoints);
  const segments: ScoreBarSegment[] = [];
  if (before) segments.push({ kind: "base", ...before });
  if (today) segments.push({ kind: "today", ...today });
  if (after) segments.push({ kind: "base", ...after });

  return {
    stretch,
    scaleMax: windowEnd,
    ticks: stretch ? [] : [toPercent(10), toPercent(20)],
    segments,
    todayCount: today && todayCount > 0 ? todayCount : null,
    totalPoints,
  };
}
