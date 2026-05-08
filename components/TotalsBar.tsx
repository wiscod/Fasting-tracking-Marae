"use client";

export function TotalsBar({
  totalIntercessions,
  totalHours,
}: {
  totalIntercessions: number;
  totalHours: number;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-1">
      <span className="text-sm font-semibold">Total</span>
      <div className="text-right">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Importunités</p>
        <p className="text-lg font-bold tabular-nums text-slate-800">{totalIntercessions}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Prière</p>
        <p className="text-lg font-bold tabular-nums text-slate-800">{formatMinutes(totalHours)}</p>
      </div>
    </div>
  );
}

export function formatMinutes(m: number): string {
  if (!m) return "0min";
  if (m < 60) return `${Math.round(m)}min`;
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return min ? `${h}h${String(min).padStart(2, "0")}` : `${h}h`;
}
