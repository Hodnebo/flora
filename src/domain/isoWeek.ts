const WEEK_KEY = /^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$/;

export function isoWeekKey(date: Date): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const isoYear = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((utc.getTime() - yearStart.getTime()) / 86400000 / 7 + 1 / 7);
  return formatWeekKey(isoYear, week);
}

export function formatWeekKey(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function isWeekKey(value: string): boolean {
  return WEEK_KEY.test(value);
}

export function parseWeekKey(weekKey: string): { year: number; week: number } {
  const match = WEEK_KEY.exec(weekKey);
  const year = match?.[1];
  const week = match?.[2];
  if (year === undefined || week === undefined) {
    throw new Error(`Invalid week key: ${weekKey}`);
  }
  return { year: Number(year), week: Number(week) };
}

export function weekNumber(weekKey: string): number {
  return parseWeekKey(weekKey).week;
}

/** Monday 00:00:00.000 through Sunday 23:59:59.999 in the local timezone. */
export function weekRange(weekKey: string): { start: Date; end: Date } {
  const { year, week } = parseWeekKey(weekKey);
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const start = new Date(year, 0, 4 - (jan4Day - 1) + (week - 1) * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  return { start, end };
}

export function shiftWeek(weekKey: string, delta: number): string {
  const { start } = weekRange(weekKey);
  const shifted = new Date(start.getFullYear(), start.getMonth(), start.getDate() + delta * 7);
  return isoWeekKey(shifted);
}

export function compareWeekKeys(a: string, b: string): number {
  return a.localeCompare(b);
}
