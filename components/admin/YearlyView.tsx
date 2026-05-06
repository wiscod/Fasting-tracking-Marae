"use client";

import { useEffect, useMemo, useState } from "react";
import { getWeeklyAggregates, type WeeklyAggregate } from "@/lib/data";
import { isoWeeksInYear } from "@/lib/week";
import { BarChart, ChartCard, LineChart } from "./MiniChart";
import { formatMinutes } from "@/components/TotalsBar";

const MONTHS_FR_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

type MonthlyAggregate = {
  month: number;
  label: string;
  teamCount: number;
  personalCount: number;
  totalImportunites: number;
  totalMinutes: number;
};

function isoWeekToMonth(year: number, week: number): number {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1));
  const weekStart = new Date(startOfWeek1);
  weekStart.setUTCDate(startOfWeek1.getUTCDate() + (week - 1) * 7);
  return weekStart.getUTCMonth() + 1;
}

export function YearlyView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [aggregates, setAggregates] = useState<WeeklyAggregate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const totalWeeks = isoWeeksInYear(year);
        const data = await getWeeklyAggregates(year, 1, year, totalWeeks);
        if (!cancelled) setAggregates(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [year]);

  const monthly = useMemo((): MonthlyAggregate[] => {
    const map = new Map<number, MonthlyAggregate>();
    for (let m = 1; m <= 12; m++) {
      map.set(m, { month: m, label: MONTHS_FR_SHORT[m - 1], teamCount: 0, personalCount: 0, totalImportunites: 0, totalMinutes: 0 });
    }
    for (const a of aggregates) {
      const m = isoWeekToMonth(a.year, a.week);
      const slot = map.get(m);
      if (!slot) continue;
      slot.teamCount += a.teamCount;
      slot.personalCount += a.personalCount;
      slot.totalImportunites += a.totalImportunites;
      slot.totalMinutes += a.totalMinutes;
    }
    return [...map.values()];
  }, [aggregates]);

  const totals = useMemo(() => ({
    teamCount: monthly.reduce((s, m) => s + m.teamCount, 0),
    personalCount: monthly.reduce((s, m) => s + m.personalCount, 0),
    importunites: monthly.reduce((s, m) => s + m.totalImportunites, 0),
    minutes: monthly.reduce((s, m) => s + m.totalMinutes, 0),
    activeSemaines: aggregates.filter((a) => a.teamCount + a.personalCount > 0).length,
  }), [monthly, aggregates]);

  const activeMonths = monthly.filter((m) => m.teamCount + m.personalCount > 0);
  const chartBase = activeMonths.length > 0 ? activeMonths : monthly;

  const participantsData = chartBase.map((m) => ({ label: m.label, value: m.teamCount, value2: m.personalCount }));
  const impData = chartBase.map((m) => ({ label: m.label, value: m.totalImportunites }));
  const minData = chartBase.map((m) => ({ label: m.label, value: m.totalMinutes }));

  return (
    <div className="flex flex-col gap-4">
      {/* Navigator */}
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Année précédente" onClick={() => setYear((y) => y - 1)} className="btn-secondary">←</button>
        <p className="text-xl font-bold text-slate-800">{year}</p>
        <button type="button" aria-label="Année suivante" onClick={() => setYear((y) => y + 1)} className="btn-secondary">→</button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-slate-500">Chargement…</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2">
            <Kpi label="Jeûnes équipe" value={String(totals.teamCount)} color="text-brand-600" />
            <Kpi label="Jeûnes perso" value={String(totals.personalCount)} color="text-green-600" />
            <Kpi label="Semaines actives" value={String(totals.activeSemaines)} />
            <Kpi label="Importunités" value={String(totals.importunites)} />
            <Kpi label="Prière totale" value={formatMinutes(totals.minutes)} />
            <Kpi label="Moy. / semaine" value={totals.activeSemaines ? `${(totals.importunites / totals.activeSemaines).toFixed(1)}` : "—"} hint="importunités" />
          </div>

          {/* Charts */}
          <ChartCard title="Participants par mois">
            <LineChart data={participantsData} showSeries2 height={130} series1Label="Équipe" series2Label="Perso" />
          </ChartCard>

          <ChartCard title="Importunités par mois">
            <BarChart data={impData} height={100} />
          </ChartCard>

          <ChartCard title="Minutes de prière par mois">
            <BarChart data={minData} height={100} yUnit="min" />
          </ChartCard>

          {/* Monthly table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mois</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Équipe</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Perso</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Importunités</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Prière</th>
                </tr>
              </thead>
              <tbody>
                {monthly.filter((m) => m.teamCount + m.personalCount > 0).map((m) => (
                  <tr key={m.month} className="border-b border-slate-50 last:border-0">
                    <td className="px-3 py-2 font-medium text-slate-700">{MONTHS_FR_SHORT[m.month - 1]}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{m.teamCount}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">{m.personalCount}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{m.totalImportunites}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatMinutes(m.totalMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, color = "text-slate-800", hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</p>
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}
