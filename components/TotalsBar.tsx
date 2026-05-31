"use client";

export function TotalsBar({
  totalIntercessions,
  totalHours,
}: {
  totalIntercessions: number;
  totalHours: number;
}) {
  return (
    <div className="flex flex-col gap-3 px-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Total récapitulatif</span>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-500">Importunités</p>
            <p className="text-lg font-bold tabular-nums text-slate-800">{totalIntercessions}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-500">Prière</p>
            <p className="text-lg font-bold tabular-nums text-slate-800">{formatMinutes(totalHours)}</p>
          </div>
        </div>
      </div>
      {totalHours > 0 && (
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div 
            className="h-full bg-brand-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.min((totalHours / 120) * 100, 100)}%` }}
          />
        </div>
      )}
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
