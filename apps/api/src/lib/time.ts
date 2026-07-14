export function nowIso(): string {
  return new Date().toISOString();
}

export function daysFromNowIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
