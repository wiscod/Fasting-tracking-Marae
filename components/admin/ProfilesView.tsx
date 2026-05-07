"use client";

import { useEffect, useState } from "react";
import {
  getAllPersons,
  getPersonHistory,
  type PersonSummary,
  type PersonHistory,
} from "@/lib/data";
import { LineChart, ChartCard } from "./MiniChart";
import { formatMinutes } from "@/components/TotalsBar";

export function ProfilesView() {
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    getAllPersons().then(setPersons).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-sm text-slate-500">Chargement…</p>;

  if (selected) {
    return (
      <PersonProfileView
        deviceId={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (persons.length === 0) {
    return <p className="text-center text-sm text-slate-500">Aucun participant trouvé.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-500">{persons.length} personne{persons.length > 1 ? "s" : ""} · triées par importunités</p>
      {persons.map((p, i) => (
        <button
          key={p.userId}
          type="button"
          onClick={() => setSelected(p.userId)}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-left hover:border-brand-400 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-bold tabular-nums text-brand-600">#{i + 1}</span>
                <span className="text-base font-semibold text-slate-800">
                  {p.userName?.trim() || <span className="italic text-slate-500">Anonyme</span>}
                </span>
                {p.isDirigent && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    Dirigeant
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {p.totalTeamFasts > 0 && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                    {p.totalTeamFasts} équipe
                  </span>
                )}
                {p.totalPersonalFasts > 0 && (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                    {p.totalPersonalFasts} perso
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Importunités</p>
              <p className="text-lg font-bold tabular-nums text-slate-800">{p.totalImportunites}</p>
              <p className="text-[10px] text-slate-500">{formatMinutes(p.totalMinutes)} de prière</p>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            {p.lastSeen ? `Dernière activité : ${formatRelative(p.lastSeen)}` : "Aucune activité"}
          </p>
        </button>
      ))}
    </div>
  );
}

function PersonProfileView({
  deviceId,
  onBack,
}: {
  deviceId: string;
  onBack: () => void;
}) {
  const [history, setHistory] = useState<PersonHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [isDirigent, setIsDirigent] = useState(false);

  useEffect(() => {
    getPersonHistory(deviceId).then((h) => {
      setHistory(h);
      setIsDirigent(h.person.isDirigent);
    }).finally(() => setLoading(false));
  }, [deviceId]);

  async function toggleDirigent() {
    if (!history) return;
    const next = !isDirigent;
    setRoleLoading(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: history.person.userId, isDirigent: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Erreur");
      }
      setIsDirigent(next);
    } catch (e) {
      console.error(e);
    } finally {
      setRoleLoading(false);
    }
  }

  if (loading) return <p className="text-center text-sm text-slate-500">Chargement…</p>;
  if (!history) return <p className="text-center text-sm text-red-500">Erreur de chargement.</p>;

  const { person, entries, personalSubjects } = history;

  // Build chart data from entries (chronological, last 12)
  const chronoEntries = [...entries].reverse().slice(-12);
  const impChartData = chronoEntries.map((e, i) => ({
    label: e.weekLabel ? e.weekLabel.replace(" (", "\n(") : formatDateShort(e.fastDate ?? e.updatedAt),
    value: e.totalIntercessions,
  }));
  const minChartData = chronoEntries.map((e) => ({
    label: e.weekLabel ? e.weekLabel.replace(" (", "\n(") : formatDateShort(e.fastDate ?? e.updatedAt),
    value: e.totalMinutes,
  }));

  const teamEntries = entries.filter((e) => e.kind === "team");
  const personalEntries = entries.filter((e) => e.kind === "personal");

  return (
    <div className="flex flex-col gap-4">
      {/* Back button */}
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Tous les profils
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              {person.userName?.trim() || <span className="italic text-slate-400">Anonyme</span>}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Dernière activité : {formatRelative(person.lastSeen)}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleDirigent}
            disabled={roleLoading}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              isDirigent
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {roleLoading ? "…" : isDirigent ? "★ Dirigeant" : "☆ Dirigeant"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {person.totalTeamFasts > 0 && (
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {person.totalTeamFasts} jeûne{person.totalTeamFasts > 1 ? "s" : ""} d'équipe
            </span>
          )}
          {person.totalPersonalFasts > 0 && (
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
              {person.totalPersonalFasts} jeûne{person.totalPersonalFasts > 1 ? "s" : ""} perso
            </span>
          )}
        </div>
      </div>


      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <Kpi label="Jeûnes" value={String(person.totalFasts)} />
        <Kpi label="Importunités" value={String(person.totalImportunites)} />
        <Kpi label="Prière" value={formatMinutes(person.totalMinutes)} />
      </div>

      {/* Charts */}
      {impChartData.length > 1 && (
        <ChartCard title="Importunités par jeûne">
          <LineChart data={impChartData} height={120} series1Label="Importunités" />
        </ChartCard>
      )}
      {minChartData.length > 1 && (
        <ChartCard title="Minutes de prière par jeûne">
          <LineChart data={minChartData} height={120} series1Label="Minutes" yUnit="min" />
        </ChartCard>
      )}

      {/* Personal subjects */}
      {personalSubjects.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Sujets personnels de prière
          </h3>
          <ul className="flex flex-col gap-1">
            {personalSubjects.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Team fasts history */}
      {teamEntries.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Jeûnes d'équipe ({teamEntries.length})</h3>
          {teamEntries.map((e) => (
            <EntryCard key={e.entryId} entry={e} />
          ))}
        </section>
      )}

      {/* Personal fasts history */}
      {personalEntries.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Jeûnes personnels ({personalEntries.length})</h3>
          {personalEntries.map((e) => (
            <EntryCard key={e.entryId} entry={e} />
          ))}
        </section>
      )}
    </div>
  );
}

type EntryLike = {
  entryId: string;
  kind: string;
  fastDate: string | null;
  updatedAt: string;
  weekLabel: string | null;
  totalIntercessions: number;
  totalMinutes: number;
  bySubject: { weekly_fast_subject_id: string | null; custom_label: string | null; intercessions: number; minutes: number }[];
};

function EntryCard({ entry: e }: { entry: EntryLike }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">
            {e.weekLabel ?? formatDateShort(e.fastDate ?? e.updatedAt)}
          </p>
          <p className="text-[10px] text-slate-400">
            {e.kind === "team"
              ? <span className="text-brand-600 font-medium">Équipe</span>
              : <span className="text-green-600 font-medium">Perso</span>}
            {" · "}maj {formatRelative(e.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-3 text-right tabular-nums">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Imp.</p>
            <p className="text-sm font-bold text-slate-800">{e.totalIntercessions}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Prière</p>
            <p className="text-sm font-bold text-slate-800">{formatMinutes(e.totalMinutes)}</p>
          </div>
          <span className="text-slate-400 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }}>⌄</span>
        </div>
      </button>
      {open && e.bySubject.length > 0 && (
        <ul className="border-t border-slate-100 px-3 py-2 flex flex-col gap-1">
          {e.bySubject.map((s, i) => (
            <li key={i} className="flex justify-between text-xs text-slate-600">
              <span className="flex-1 pr-2 leading-snug">
                {s.custom_label ?? `Sujet ${i + 1}`}
              </span>
              <span className="shrink-0 tabular-nums text-slate-700 font-medium">
                {s.intercessions} imp. · {formatMinutes(s.minutes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-slate-800">{value}</p>
    </div>
  );
}

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "à l'instant";
    if (min < 60) return `il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `il y a ${d} j`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch { return iso; }
}

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch { return iso; }
}
