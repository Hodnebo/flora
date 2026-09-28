export function formatPoints(points: number): string {
  const value = Math.round(points * 4) / 4;
  if (Number.isInteger(value)) return String(value);
  const text = value.toFixed(2);
  return text.endsWith("0") ? text.slice(0, -1) : text;
}
