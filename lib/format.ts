export function fmtMin(m: number | null | undefined): string {
  if (!m) return "0min";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h}h${String(mm).padStart(2, "0")}` : `${h}h`;
}

export function weekKey(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function prevWeek(year: number, week: number): { year: number; week: number } {
  if (week > 1) return { year, week: week - 1 };
  // Dec 28 is always in the last ISO week of its year
  const d = new Date(Date.UTC(year - 1, 11, 28));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: w };
}
