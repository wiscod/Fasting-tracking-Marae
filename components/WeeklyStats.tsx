"use client";

import { useMemo, useState } from "react";
import type { WeeklyParticipant } from "@/lib/data";
import type { WeeklyFastSubject } from "@/lib/types";
import { formatMinutes } from "@/components/TotalsBar";

export function WeeklyStats({
  participants,
  subjects,
}: {
  participants: WeeklyParticipant[];
  subjects: WeeklyFastSubject[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const teamEntries = participants.filter((p) => p.kind === "team");
  const personalEntries = participants.filter((p) => p.kind === "personal");

  const stats = useMemo(() => {
    const totalImportunites = participants.reduce((acc, p) => acc + p.totalIntercessions, 0);
    const totalMinutes = participants.reduce((acc, p) => acc + p.totalMinutes, 0);
    return { totalImportunites, totalMinutes };
  }, [participants]);

  const perSubject = useMemo(() => {
    return subjects.map((s) => {
      let importunites = 0;
      let minutes = 0;
      const contributors: { name: string; importunites: number; minutes: number }[] = [];
      for (const p of teamEntries) {
        const row = p.bySubject.find((b) => b.weekly_fast_subject_id === s.id);
        if (!row) continue;
        importunites += row.intercessions;
        minutes += row.minutes;
        if (row.intercessions > 0 || row.minutes > 0) {
          contributors.push({ name: p.userName?.trim() || "Anonyme", importunites: row.intercessions, minutes: row.minutes });
        }
      }
      contributors.sort((a, b) => b.importunites + b.minutes / 30 - (a.importunites + a.minutes / 30));
      return { subject: s, importunites, minutes, contributors };
    });
  }, [teamEntries, subjects]);

  const sortedTeam = useMemo(
    () => [...teamEntries].sort((a, b) => b.totalIntercessions + b.totalMinutes / 30 - (a.totalIntercessions + a.totalMinutes / 30)),
    [teamEntries],
  );
  const sortedPersonal = useMemo(
    () => [...personalEntries].sort((a, b) => b.totalIntercessions + b.totalMinutes / 30 - (a.totalIntercessions + a.totalMinutes / 30)),
    [personalEntries],
  );

  if (participants.length === 0) {
    return (
      <div className="card text-sm text-slate-600">
        <p className="font-medium text-slate-700">Aucune participation pour le moment.</p>
        <p className="mt-1 text-slate-500">Les stats s'afficheront dès que des jeûneurs auront enregistré leur semaine.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Jeûnes équipe" value={String(teamEntries.length)} color="text-brand-600" />
        <Kpi label="Jeûnes perso" value={String(personalEntries.length)} color="text-green-600" />
        <Kpi label="Importunités" value={String(stats.totalImportunites)} />
        <Kpi label="Prière totale" value={formatMinutes(stats.totalMinutes)} />
      </div>

      {/* Per-subject breakdown (team entries only) */}
      {subjects.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Par sujet</h3>
          {perSubject.map(({ subject, importunites, minutes, contributors }) => (
            <div key={subject.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="min-w-[1.5rem] text-2xl font-bold leading-none text-brand-600 tabular-nums">
                  {subject.position}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug text-slate-800">{subject.label}</p>
                  <p className="mt-1 text-xs text-slate-500 tabular-nums">
                    <b className="text-slate-700">{importunites}</b> importunités ·{" "}
                    <b className="text-slate-700">{formatMinutes(minutes)}</b> de prière
                  </p>
                  {contributors.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      en tête : <span className="text-slate-700">{contributors[0].name}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Team participants */}
      {sortedTeam.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            Équipe
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">{sortedTeam.length}</span>
          </h3>
          {sortedTeam.map((p) => <ParticipantCard key={p.entryId} p={p} subjects={subjects} expanded={expanded} setExpanded={setExpanded} kindColor="brand" />)}
        </section>
      )}

      {/* Personal participants */}
      {sortedPersonal.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            Jeûnes personnels
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">{sortedPersonal.length}</span>
          </h3>
          {sortedPersonal.map((p) => <ParticipantCard key={p.entryId} p={p} subjects={subjects} expanded={expanded} setExpanded={setExpanded} kindColor="green" />)}
        </section>
      )}
    </div>
  );
}

function ParticipantCard({
  p, subjects, expanded, setExpanded, kindColor,
}: {
  p: WeeklyParticipant;
  subjects: WeeklyFastSubject[];
  expanded: string | null;
  setExpanded: (v: string | null) => void;
  kindColor: "brand" | "green";
}) {
  const isOpen = expanded === p.entryId;
  const accentBg = kindColor === "brand" ? "bg-brand-50 text-brand-600" : "bg-green-50 text-green-600";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(isOpen ? null : p.entryId)}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-800">
              {p.userName?.trim() || <span className="italic text-slate-500">Anonyme</span>}
            </p>
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${accentBg}`}>
              {p.kind === "team" ? "équipe" : "perso"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatRelative(p.updatedAt)}
            {p.fastDate ? ` · ${formatDate(p.fastDate)}` : ""}
            {" · "}<span className="font-semibold text-slate-700">{countDays(p.fastDate, p.fastEndDate)} j</span>
          </p>
        </div>
        <div className="flex items-center gap-3 text-right tabular-nums">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Imp.</p>
            <p className="text-sm font-bold text-slate-800">{p.totalIntercessions}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Prière</p>
            <p className="text-sm font-bold text-slate-800">{formatMinutes(p.totalMinutes)}</p>
          </div>
          <span className="text-slate-400 transition-transform" style={{ transform: isOpen ? "rotate(180deg)" : "none" }}>⌄</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 px-3 py-2">
          {p.bySubject.length === 0 ? (
            <p className="py-1 text-xs text-slate-500">Aucun détail par sujet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {p.bySubject.map((s, i) => {
                const subj = subjects.find((x) => x.id === s.weekly_fast_subject_id);
                const label = subj?.label ?? s.custom_label ?? `Sujet ${i + 1}`;
                return (
                  <li key={i} className="flex items-start justify-between gap-2 text-xs">
                    <span className="flex-1 leading-snug text-slate-600">{label}</span>
                    <span className="shrink-0 tabular-nums font-medium text-slate-700">
                      {s.intercessions} imp. · {formatMinutes(s.minutes)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {p.globalMinutes != null && (
            <p className="mt-2 text-[11px] italic text-slate-500">
              minutes globales : {formatMinutes(p.globalMinutes)}
            </p>
          )}
        </div>
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

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }); }
  catch { return iso; }
}

function countDays(startIso: string | null, endIso: string | null): number {
  if (!startIso) return 0;
  if (!endIso) return 1;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
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
    return d < 7 ? `il y a ${d} j` : new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch { return iso; }
}
