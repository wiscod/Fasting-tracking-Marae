"use client";

export function TotalsBar({
  totalIntercessions,
  totalHours,
  goalHours = 24,
}: {
  totalIntercessions: number;
  totalHours: number;
  goalHours?: number;
}) {
  const pct = Math.max(0, Math.min(100, (totalHours / goalHours) * 100));
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[1fr_72px_72px] items-center gap-2 px-1">
        <span className="text-sm font-semibold">Total</span>
        <div className="rounded-md bg-slate-100 px-2 py-2 text-center text-sm font-semibold">
          {totalIntercessions}
        </div>
        <div className="rounded-md bg-slate-100 px-2 py-2 text-center text-sm font-semibold">
          {formatHours(totalHours)}
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
        Objectif {goalHours} h · {pct.toFixed(0)}%
      </p>
    </div>
  );
}

function formatHours(h: number): string {
  if (Number.isInteger(h)) return `${h}`;
  return h.toFixed(2).replace(/\.?0+$/, "");
}
