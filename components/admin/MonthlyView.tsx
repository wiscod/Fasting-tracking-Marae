"use client";

import { useEffect, useMemo, useState } from "react";
import { getWeeklyAggregates, type WeeklyAggregate } from "@/lib/data";
import { isoWeeksInYear } from "@/lib/week";
import { BarChart, ChartCard, LineChart } from "./MiniChart";
import { formatMinutes } from "@/components/TotalsBar";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function weeksInMonth(year: number, month: number): { week: number; year: number }[] {
  const result: { week: number; year: number }[] = [];
  const seen = new Set<string>();
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const w = getIsoWeekSimple(date);
    const key = `${w.year}-${w.week}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(w);
    }
  }
  return result;
}

function getIsoWeekSimple(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function MonthlyView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [aggregates, setAggregates] = useState<WeeklyAggregate[]>([]);
  const [loading, setLoading] = useState(false);

  const weeks = useMemo(() => weeksInMonth(year, month), [year, month]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (weeks.length === 0) return;
      setLoading(true);
      try {
        const first = weeks[0];
        const last = weeks[weeks.length - 1];
        const data = await getWeeklyAggregates(
          first.year, first.week, last.year, last.week,
        );
        if (!cancelled) setAggregates(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [weeks]);

  function navigate(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { y--; m = 12; }
    if (m > 12) { y++; m = 1; }
    setYear(y);
    setMonth(m);
  }

  const aggs = useMemo(() => {
    const weekSet = new Set(weeks.map((w) => `${w.year}-${w.week}`));
    return aggregates.filter((a) => weekSet.has(`${a.year}-${a.week}`));
  }, [aggregates, weeks]);

  const totals = useMemo(() => ({
    teamCount: aggs.reduce((s, a) => s + a.teamCount, 0),
    personalCount: aggs.reduce((s, a) => s + a.personalCount, 0),
    importunites: aggs.reduce((s, a) => s + a.totalImportunites, 0),
    minutes: aggs.reduce((s, a) => s + a.totalMinutes, 0),
  }), [aggs]);

  const chartData = aggs.map((a) => ({
    label: `S${a.week}`,
    value: a.teamCount,
    value2: a.personalCount,
  }));
  const impData = aggs.map((a) => ({ label: `S${a.week}`, value: a.totalImportunites }));
  const minData = aggs.map((a) => ({ label: `S${a.week}`, value: a.totalMinutes }));

  return (
    <div className="flex flex-col gap-4">
      {/* Navigator */}
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Mois précédent" onClick={() => navigate(-1)} className="btn-secondary">←</button>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-slate-500">{year}</p>
          <p className="text-lg font-bold text-slate-800">{MONTHS_FR[month - 1]}</p>
        </div>
        <button type="button" aria-label="Mois suivant" onClick={() => navigate(1)} className="btn-secondary">→</button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-slate-500">Chargement…</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2">
            <Kpi label="Jeûnes équipe" value={String(totals.teamCount)} color="text-brand-600" />
            <Kpi label="Jeûnes perso" value={String(totals.personalCount)} color="text-green-600" />
            <Kpi label="Importunités" value={String(totals.importunites)} />
            <Kpi label="Prière totale" value={formatMinutes(totals.minutes)} />
          </div>

          {/* Charts */}
          <ChartCard title="Participants par semaine">
            <LineChart data={chartData} showSeries2 height={130} series1Label="Équipe" series2Label="Perso" />
          </ChartCard>

          <ChartCard title="Importunités par semaine">
            <BarChart data={impData} height={100} />
          </ChartCard>

          <ChartCard title="Minutes de prière par semaine">
            <BarChart data={minData} height={100} yUnit="min" />
          </ChartCard>

          {/* Weekly table */}
          {aggs.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Semaine</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Équipe</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Perso</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Importunités</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Prière</th>
                  </tr>
                </thead>
                <tbody>
                  {aggs.map((a) => (
                    <tr key={`${a.year}-${a.week}`} className="border-b border-slate-50 last:border-0">
                      <td className="px-3 py-2 font-medium text-slate-700">Sem {a.week}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{a.teamCount}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">{a.personalCount}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{a.totalImportunites}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatMinutes(a.totalMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {aggs.length === 0 && (
            <p className="text-center text-sm text-slate-500">Aucune donnée pour ce mois.</p>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, color = "text-slate-800" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
