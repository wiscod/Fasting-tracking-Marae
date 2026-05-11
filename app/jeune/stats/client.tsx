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
  longFasts: number;
};

type SortBy = "importunites" | "minutes" | "longfasts";

export function StatsClient() {
  const [stats, setStats] = useState<PersonStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("importunites");

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

  const sorted = [...stats].sort((a, b) => {
    switch (sortBy) {
      case "minutes":
        return b.totalMinutes - a.totalMinutes;
      case "longfasts":
        return b.longFasts - a.longFasts || b.totalImportunites - a.totalImportunites;
      default:
        return b.totalImportunites - a.totalImportunites;
    }
  });

  const withActivity = sorted.filter((s) => s.totalFasts > 0);
  const withoutActivity = sorted.filter((s) => s.totalFasts === 0);

  const sortLabels: Record<SortBy, string> = {
    importunites: "importunités",
    minutes: "heures de prière",
    longfasts: "jeûnes > 3j",
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-slate-500">{stats.length} participant{stats.length > 1 ? "s" : ""} · classés par {sortLabels[sortBy]}</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSortBy("importunites")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              sortBy === "importunites"
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Importunités
          </button>
          <button
            onClick={() => setSortBy("minutes")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              sortBy === "minutes"
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Heures de prière
          </button>
          <button
            onClick={() => setSortBy("longfasts")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              sortBy === "longfasts"
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Jeûnes &gt; 3j
          </button>
        </div>
      </div>

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
                {p.longFasts > 0 && (
                  <>
                    <span className="text-[10px] text-slate-400">·</span>
                    <span className="text-[10px] text-slate-500">{p.longFasts} jeûne{p.longFasts > 1 ? "s" : ""} &gt; 3j</span>
                  </>
                )}
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