"use client";

import { useEffect, useState } from "react";
import { formatMinutes } from "@/components/TotalsBar";

type PersonStat = {
  userId: string;
  name: string;
  isDirigent: boolean;
  totalFasts: number;
  totalImportunites: number;
  totalMinutes: number;
  totalDays: number;
};

export function StatsClient() {
  const [stats, setStats] = useState<PersonStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setError("Impossible de charger les statistiques."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-sm text-slate-500">Chargement…</p>;
  if (error) return <p className="text-center text-sm text-red-500">{error}</p>;
  if (stats.length === 0) return <p className="text-center text-sm text-slate-500">Aucune donnée.</p>;

  const withActivity = stats.filter((s) => s.totalFasts > 0);
  const withoutActivity = stats.filter((s) => s.totalFasts === 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-500">{stats.length} participant{stats.length > 1 ? "s" : ""} · classés par importunités</p>

      {withActivity.map((p, i) => (
        <div key={p.userId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-bold tabular-nums text-brand-600">#{i + 1}</span>
                <span className="text-base font-semibold text-slate-800">{p.name}</span>
                {p.isDirigent && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    Dirigeant
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="text-[10px] text-slate-500">{p.totalFasts} jeûne{p.totalFasts > 1 ? "s" : ""}</span>
                <span className="text-[10px] text-slate-400">·</span>
                <span className="text-[10px] text-slate-500">{p.totalDays} j. de jeûne</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Importunités</p>
              <p className="text-lg font-bold tabular-nums text-slate-800">{p.totalImportunites}</p>
              <p className="text-[10px] text-slate-500">{formatMinutes(p.totalMinutes)} de prière</p>
            </div>
          </div>
        </div>
      ))}

      {withoutActivity.length > 0 && (
        <div className="mt-2">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Inscrits sans activité ({withoutActivity.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {withoutActivity.map((p) => (
              <span key={p.userId} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
