"use client";

import { useMemo, useState } from "react";
import type { WeeklyParticipant } from "@/lib/data";
import type { WeeklyFastSubject } from "@/lib/types";

export function WeeklyStats({
  participants,
  subjects,
}: {
  participants: WeeklyParticipant[];
  subjects: WeeklyFastSubject[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const stats = useMemo(() => {
    const team = participants.filter((p) => p.kind === "team");
    const personal = participants.filter((p) => p.kind === "personal");
    const totalIntercessions = participants.reduce(
      (acc, p) => acc + p.totalIntercessions,
      0,
    );
    const totalMinutes = participants.reduce(
      (acc, p) => acc + p.totalMinutes,
      0,
    );
    const named = new Set(
      participants.filter((p) => p.userName?.trim()).map((p) => p.deviceId),
    );
    return {
      teamCount: team.length,
      personalCount: personal.length,
      participantsCount: participants.length,
      uniqueNamed: named.size,
      totalIntercessions,
      totalMinutes,
    };
  }, [participants]);

  const perSubject = useMemo(() => {
    return subjects.map((s) => {
      let intercessions = 0;
      let minutes = 0;
      const contributors: { name: string; intercessions: number; minutes: number }[] = [];
      for (const p of participants) {
        const row = p.bySubject.find((b) => b.weekly_fast_subject_id === s.id);
        if (!row) continue;
        intercessions += row.intercessions;
        minutes += row.minutes;
        if (row.intercessions > 0 || row.minutes > 0) {
          contributors.push({
            name: p.userName?.trim() || "Anonyme",
            intercessions: row.intercessions,
            minutes: row.minutes,
          });
        }
      }
      contributors.sort(
        (a, b) =>
          b.intercessions + b.minutes / 30 - (a.intercessions + a.minutes / 30),
      );
      return { subject: s, intercessions, minutes, contributors };
    });
  }, [participants, subjects]);

  const sorted = useMemo(
    () =>
      [...participants].sort(
        (a, b) =>
          b.totalIntercessions + b.totalMinutes / 30 -
          (a.totalIntercessions + a.totalMinutes / 30),
      ),
    [participants],
  );

  if (participants.length === 0) {
    return (
      <div className="card text-sm text-slate-600">
        <p className="font-medium text-slate-700">Aucune participation pour le moment.</p>
        <p className="mt-1 text-slate-500">
          Les stats s'afficheront ici dès que des jeûneurs auront enregistré leur semaine.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <Kpi label="Participants" value={String(stats.participantsCount)} hint={`${stats.uniqueNamed} nommé·es`} />
        <Kpi label="Intercessions" value={String(stats.totalIntercessions)} />
        <Kpi label="Prière" value={formatMinutes(stats.totalMinutes)} hint="cumul équipe" />
      </div>

      {/* Per-subject breakdown */}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-slate-700">Par sujet</h3>
        {perSubject.map(({ subject, intercessions, minutes, contributors }) => (
          <div
            key={subject.id}
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="min-w-[1.5rem] text-2xl font-bold leading-none text-brand-600 tabular-nums">
                {subject.position}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug text-slate-800">
                  {subject.label}
                </p>
                <p className="mt-1 text-xs text-slate-500 tabular-nums">
                  <b className="text-slate-700">{intercessions}</b> intercessions ·{" "}
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

      {/* Participants list */}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          Participants ({sorted.length})
        </h3>
        <div className="flex flex-col gap-2">
          {sorted.map((p) => {
            const isOpen = expanded === p.entryId;
            return (
              <div
                key={p.entryId}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : p.entryId)}
                  className="flex w-full items-center justify-between gap-3 p-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {p.userName?.trim() || (
                        <span className="italic text-slate-500">Anonyme</span>
                      )}
                      {p.kind === "personal" && (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          perso
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      maj {formatRelative(p.updatedAt)}
                      {p.fastDate ? ` · ${formatDate(p.fastDate)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right tabular-nums">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">
                        Inter.
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {p.totalIntercessions}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">
                        Prière
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {formatMinutes(p.totalMinutes)}
                      </p>
                    </div>
                    <span
                      className="text-slate-400 transition-transform"
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      ⌄
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-3 py-2">
                    {p.bySubject.length === 0 ? (
                      <p className="py-1 text-xs text-slate-500">Aucun détail par sujet.</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {p.bySubject.map((s, i) => {
                          const subj = subjects.find(
                            (x) => x.id === s.weekly_fast_subject_id,
                          );
                          const label =
                            subj?.label ?? s.custom_label ?? `Sujet ${i + 1}`;
                          return (
                            <li
                              key={i}
                              className="flex items-start justify-between gap-2 text-xs"
                            >
                              <span className="flex-1 truncate text-slate-600">
                                {label}
                              </span>
                              <span className="shrink-0 tabular-nums text-slate-700">
                                {s.intercessions} · {formatMinutes(s.minutes)}
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
          })}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-800 tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function formatMinutes(m: number): string {
  if (!m) return "0min";
  if (m < 60) return `${Math.round(m)}min`;
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return min ? `${h}h${String(min).padStart(2, "0")}` : `${h}h`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "à l'instant";
    if (min < 60) return `il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h} h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `il y a ${days} j`;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}
