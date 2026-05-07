"use client";

import { isoWeeksInYear } from "@/lib/week";

export function WeekSelector({
  year,
  week,
  onWeekChange,
}: {
  year: number;
  week: number;
  onWeekChange: (w: number) => void;
}) {
  const totalWeeks = isoWeeksInYear(year);

  return (
    <select
      value={week}
      onChange={(e) => onWeekChange(Number(e.target.value))}
      className="input w-32 text-sm"
    >
      {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
        <option key={w} value={w}>
          Sem {w}
        </option>
      ))}
    </select>
  );
}
