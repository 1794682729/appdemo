/** Local calendar helpers using YYYY-MM-DD / YYYY-MM (no timezone shift). */

export function todayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function currentYearMonth(): string {
  return todayDate().slice(0, 7);
}

export function yearMonthFromDate(date: string): string {
  return date.slice(0, 7);
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

export function listRecentYearMonths(count: number, end = currentYearMonth()): string[] {
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    result.push(shiftYearMonth(end, -i));
  }
  return result;
}

export function formatYearMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  return `${y}年${Number(m)}月`;
}
