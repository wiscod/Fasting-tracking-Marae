"use client";

import { useMemo, useState } from "react";
import type { WeeklyParticipant } from "@/lib/data";
import type { WeeklyFastSubject } from "@/lib/types";
import { formatMinutes } from "@/components/TotalsBar";
import { Users, User, Flame, Clock, ChevronDown } from "lucide-react";

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
      <div className="card text-sm text-slate-600 animate-fade-in">
        <p className="font-semibold text-slate-800">Aucune participation pour le moment.</p>
        <p className="mt-1 text-slate-500 leading-relaxed">Les stats s&apos;afficheront dès que des jeûneurs auront enregistré leur semaine.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Kpi icon={<Users size={16} />} label="Équipe" value={String(teamEntries.length)} color="text-brand-600" />
        <Kpi icon={<User size={16} />} label="Perso" value={String(personalEntries.length)} color="text-green-600" />
        <Kpi icon={<Flame size={16} />} label="Importunités" value={String(stats.totalImportunites)} color="text-orange-600" />
        <Kpi icon={<Clock size={16} />} label="Temps prière" value={formatMinutes(stats.totalMinutes)} color="text-blue-600" />
      </div>

      {/* Per-subject breakdown (team entries only) */}
      {subjects.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Répartition par sujet</h3>
          <div className="flex flex-col gap-2">
            {perSubject.map(({ subject, importunites, minutes, contributors }) => (
              <div key={subject.id} className="rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-md transition-all hover:shadow-md">
                <div className="flex items-start gap-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 shrink-0 shadow-sm border border-brand-100">
                    {subject.position}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold leading-snug text-slate-800">{subject.label}</p>
                    <div className="mt-2 flex gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Flame size={12} className="text-orange-500"/> <b className="text-slate-700">{importunites}</b></span>
                      <span className="flex items-center gap-1"><Clock size={12} className="text-blue-500"/> <b className="text-slate-700">{formatMinutes(minutes)}</b></span>
                    </div>
                    {contributors.length > 0 && (
                      <p className="mt-2 text-[11px] font-medium text-slate-500 bg-slate-50 inline-block px-2 py-0.5 rounded-md border border-slate-100">
                        Top : <span className="text-slate-700">{contributors[0].name}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Team participants */}
      {sortedTeam.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 tracking-tight">
            Classement équipe
            <span className="flex h-5 items-center rounded-full bg-brand-100 px-2 text-[10px] font-bold text-brand-700">{sortedTeam.length}</span>
          </h3>
          <div className="flex flex-col gap-2">
            {sortedTeam.map((p, idx) => <ParticipantCard key={p.entryId} p={p} subjects={subjects} expanded={expanded} setExpanded={setExpanded} kindColor="brand" rank={idx + 1} />)}
          </div>
        </section>
      )}

      {/* Personal participants */}
      {sortedPersonal.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 tracking-tight">
            Jeûnes personnels
            <span className="flex h-5 items-center rounded-full bg-green-100 px-2 text-[10px] font-bold text-green-700">{sortedPersonal.length}</span>
          </h3>
          <div className="flex flex-col gap-2">
            {sortedPersonal.map((p, idx) => <ParticipantCard key={p.entryId} p={p} subjects={subjects} expanded={expanded} setExpanded={setExpanded} kindColor="green" rank={idx + 1} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function ParticipantCard({
  p, subjects, expanded, setExpanded, kindColor, rank
}: {
  p: WeeklyParticipant;
  subjects: WeeklyFastSubject[];
  expanded: string | null;
  setExpanded: (v: string | null) => void;
  kindColor: "brand" | "green";
  rank: number;
}) {
  const isOpen = expanded === p.entryId;
  const accentBg = kindColor === "brand" ? "bg-brand-50 text-brand-600 border-brand-100" : "bg-green-50 text-green-600 border-green-100";

  return (
    <div className={`rounded-2xl border bg-white/80 backdrop-blur-md shadow-sm transition-all overflow-hidden ${isOpen ? 'border-brand-300 ring-1 ring-brand-300/50' : 'border-slate-200/60 hover:border-slate-300'}`}>
      <button
        type="button"
        onClick={() => setExpanded(isOpen ? null : p.entryId)}
        className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-slate-50/50"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-bold text-slate-800 truncate">
                {p.userName?.trim() || <span className="italic text-slate-400">Anonyme</span>}
              </p>
              <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${accentBg}`}>
                {p.kind === "team" ? "équipe" : "perso"}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              {formatRelative(p.updatedAt)}
              {p.fastDate ? ` · ${formatDate(p.fastDate)}` : ""}
              {" · "}<span className="text-slate-700">{countDays(p.fastDate, p.fastEndDate)} j</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-right tabular-nums shrink-0">
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><Flame size={10}/> Imp.</span>
            <p className="text-sm font-bold text-slate-800">{p.totalIntercessions}</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><Clock size={10}/> Prière</span>
            <p className="text-sm font-bold text-slate-800">{formatMinutes(p.totalMinutes)}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-brand-500" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 animate-fade-in">
          {p.bySubject.length === 0 ? (
            <p className="py-2 text-xs font-medium text-slate-500 text-center bg-white rounded-lg border border-slate-100">Aucun détail par sujet renseigné.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {p.bySubject.map((s, i) => {
                const subj = subjects.find((x) => x.id === s.weekly_fast_subject_id);
                const label = subj?.label ?? s.custom_label ?? `Sujet ${i + 1}`;
                return (
                  <li key={i} className="flex items-start justify-between gap-3 text-xs bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                    <span className="flex-1 font-medium leading-snug text-slate-700">{label}</span>
                    <span className="shrink-0 flex items-center gap-2 tabular-nums font-bold text-slate-800">
                      <span className="flex items-center gap-0.5 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md"><Flame size={10}/> {s.intercessions}</span>
                      <span className="flex items-center gap-0.5 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md"><Clock size={10}/> {formatMinutes(s.minutes)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {p.globalMinutes != null && (
            <p className="mt-3 text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1 bg-white py-1.5 rounded-lg border border-slate-100">
              <Clock size={12} /> Minutes globales : <b className="text-slate-700">{formatMinutes(p.globalMinutes)}</b>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon, color = "text-slate-800" }: { label: string; value: string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center text-center py-4">
      <div className={`mb-2 rounded-full bg-slate-100 p-2 shadow-sm ${color}`}>
        {icon}
      </div>
      <p className={`text-2xl font-black tracking-tight tabular-nums ${color}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
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
