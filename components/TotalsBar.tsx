"use client";

export function TotalsBar({
  totalIntercessions,
  totalHours,
  goalHours = 1440,
}: {
  totalIntercessions: number;
  totalHours: number;
  goalHours?: number;
}) {
  const pct = Math.max(0, Math.min(100, (totalHours / goalHours) * 100));
  return (
    <div className="flex flex-col gap-2">
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
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all"
          style={{ width: `${pct}%` }}
          aria-label={`${pct.toFixed(0)}%`}
        />
      </div>
      <p className="text-right text-xs text-slate-500">
        Objectif 24 h · {pct.toFixed(0)}%
      </p>
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
