"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SubjectsEditor, SubjectRow } from "@/components/SubjectsEditor";
import { isoWeeksInYear } from "@/lib/week";
import { TotalsBar } from "@/components/TotalsBar";
import {
  getOrCreateWeeklyFast,
  getTeamFastEntry,
  getWeeklyFastSubjects,
  saveTeamFastEntry,
} from "@/lib/data";
import { getDeviceId, getStoredName, setStoredName } from "@/lib/deviceId";
import type { WeeklyFast, WeeklyFastSubject } from "@/lib/types";

type Status = "loading" | "ready" | "saving" | "saved" | "error";

export function TeamFastClient({
  initialYear,
  initialWeek,
}: {
  initialYear: number;
  initialWeek: number;
}) {
  const [year, setYear] = useState(initialYear);
  const [week, setWeek] = useState(initialWeek);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [weeklyFast, setWeeklyFast] = useState<WeeklyFast | null>(null);
  const [predefined, setPredefined] = useState<WeeklyFastSubject[]>([]);
  const [rows, setRows] = useState<SubjectRow[]>([]);
  const [globalHours, setGlobalHours] = useState<string>("");
  const [name, setName] = useState<string>("");

  useEffect(() => {
    setName(getStoredName());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      setErrorMsg(null);
      try {
        const wf = await getOrCreateWeeklyFast(year, week);
        const subs = await getWeeklyFastSubjects(wf.id);
        const deviceId = getDeviceId();
        const { entry, subjects } = await getTeamFastEntry(deviceId, wf.id);
        if (cancelled) return;

        setWeeklyFast(wf);
        setPredefined(subs);
        setGlobalHours(entry?.global_hours != null ? String(entry.global_hours) : "");

        const initialRows: SubjectRow[] = [];
        for (const s of subs) {
          const existing = subjects.find((es) => es.weekly_fast_subject_id === s.id);
          initialRows.push({
            weekly_fast_subject_id: s.id,
            custom_label: null,
            label: s.label,
            intercessions: existing?.intercessions ?? 0,
            hours: existing?.hours != null ? Number(existing.hours) : 0,
            editable: false,
          });
        }
        for (const es of subjects) {
          if (es.weekly_fast_subject_id) continue;
          initialRows.push({
            weekly_fast_subject_id: null,
            custom_label: es.custom_label ?? "",
            label: es.custom_label ?? "",
            intercessions: es.intercessions,
            hours: Number(es.hours),
            editable: true,
          });
        }
        setRows(initialRows);
        setStatus("ready");
      } catch (e: unknown) {
        if (cancelled) return;
        setErrorMsg(messageOf(e));
        setStatus("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [year, week]);

  const totals = useMemo(() => {
    const intercessions = rows.reduce((acc, r) => acc + (r.intercessions || 0), 0);
    const perSubjectHours = rows.reduce((acc, r) => acc + (r.hours || 0), 0);
    const gh = Number(globalHours);
    const hours = globalHours.trim() !== "" && Number.isFinite(gh) ? gh : perSubjectHours;
    return { intercessions, hours };
  }, [rows, globalHours]);

  function updateRow(idx: number, patch: Partial<SubjectRow>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addCustom() {
    setRows((rs) => [
      ...rs,
      {
        weekly_fast_subject_id: null,
        custom_label: "",
        label: "",
        intercessions: 0,
        hours: 0,
        editable: true,
      },
    ]);
  }
  function removeCustom(idx: number) {
    setRows((rs) => rs.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!weeklyFast) return;
    setStatus("saving");
    setErrorMsg(null);
    try {
      const deviceId = getDeviceId();
      const trimmedName = name.trim();
      if (trimmedName) setStoredName(trimmedName);

      const subjects = rows
        .filter((r) => r.editable ? (r.label.trim() !== "") : true)
        .map((r, i) => ({
          weekly_fast_subject_id: r.weekly_fast_subject_id,
          custom_label: r.editable ? r.label.trim() : null,
          intercessions: r.intercessions || 0,
          hours: r.hours || 0,
          position: i,
        }));

      const gh = globalHours.trim() === "" ? null : Number(globalHours);
      await saveTeamFastEntry({
        deviceId,
        userName: trimmedName || null,
        weeklyFastId: weeklyFast.id,
        globalHours: gh != null && Number.isFinite(gh) ? gh : null,
        subjects,
      });
      setStatus("saved");
      setTimeout(() => setStatus("ready"), 1500);
    } catch (e: unknown) {
      setErrorMsg(messageOf(e));
      setStatus("error");
    }
  }

  if (status === "loading") {
    return <p className="text-sm text-slate-500">Chargement…</p>;
  }

  if (status === "error" && !weeklyFast) {
    return (
      <div className="card border-red-200 bg-red-50 text-sm text-red-800">
        <p className="font-medium">Impossible de charger le jeûne.</p>
        <p className="mt-1 text-xs">{errorMsg}</p>
      </div>
    );
  }

  if (predefined.length === 0) {
    return (
      <div className="card text-sm text-slate-700">
        <p className="font-medium">Pas encore de sujets pour Sem {week}.</p>
        <p className="mt-1 text-slate-500">
          L'admin doit configurer les sujets de la semaine via la{" "}
          <Link href="/admin" className="text-brand-600 underline hover:text-brand-700">
            page admin
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Semaine précédente"
          onClick={() => navigateWeek(-1, year, week, setYear, setWeek)}
          className="btn-secondary"
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-slate-500">Année {year}</p>
          <p className="text-lg font-semibold">Sem {week}</p>
          {weeklyFast?.title ? (
            <p className="text-xs text-slate-500">{weeklyFast.title}</p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Semaine suivante"
          onClick={() => navigateWeek(1, year, week, setYear, setWeek)}
          className="btn-secondary"
        >
          →
        </button>
      </div>

      <div>
        <label className="label">Ton prénom (optionnel)</label>
        <input
          className="input mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Pour t'identifier dans les stats"
        />
      </div>

      <div className="card flex flex-col gap-4">
        <SubjectsEditor
          rows={rows}
          onChange={updateRow}
          onAddCustom={addCustom}
          onRemoveCustom={removeCustom}
        />
      </div>

      <div className="card flex flex-col gap-2">
        <label className="label">Heures globales (optionnel)</label>
        <input
          className="input"
          type="number"
          min={0}
          step="0.25"
          inputMode="decimal"
          placeholder="Sinon, somme des heures par sujet"
          value={globalHours}
          onChange={(e) => setGlobalHours(e.target.value)}
        />
        <p className="text-xs text-slate-500">
          Si renseigné, remplace la somme par sujet pour le total.
        </p>
      </div>

      <div className="card">
        <TotalsBar
          totalIntercessions={totals.intercessions}
          totalHours={totals.hours}
          goalHours={24}
        />
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          className="btn-primary w-full"
        >
          {status === "saving" ? "Enregistrement…" : status === "saved" ? "✓ Enregistré" : "Enregistrer"}
        </button>
        {errorMsg ? (
          <p className="mt-2 text-center text-xs text-red-600">{errorMsg}</p>
        ) : null}
      </div>
    </div>
  );
}

function navigateWeek(
  delta: number,
  year: number,
  week: number,
  setYear: (n: number) => void,
  setWeek: (n: number) => void,
) {
  let y = year;
  let w = week + delta;
  if (w < 1) {
    y -= 1;
    w = isoWeeksInYear(y);
  } else if (w > isoWeeksInYear(y)) {
    y += 1;
    w = 1;
  }
  setYear(y);
  setWeek(w);
}

function messageOf(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Erreur inconnue";
}
