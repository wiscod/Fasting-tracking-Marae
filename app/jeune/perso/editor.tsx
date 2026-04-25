"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SubjectsEditor, SubjectRow } from "@/components/SubjectsEditor";
import { TotalsBar } from "@/components/TotalsBar";
import {
  deletePersonalFast,
  getOrCreateWeeklyFast,
  getPersonalFast,
  getWeeklyFastSubjects,
  savePersonalFast,
} from "@/lib/data";
import { getDeviceId, getStoredName, setStoredName } from "@/lib/deviceId";
import { getIsoWeek } from "@/lib/week";

type Status = "loading" | "ready" | "saving" | "saved" | "error";

export function PersonalEditor({
  mode,
  entryId,
}: {
  mode: "create" | "edit";
  entryId?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(mode === "edit" ? "loading" : "ready");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [title, setTitle] = useState("");
  const [fastDate, setFastDate] = useState(today);
  const [name, setName] = useState("");
  const [globalHours, setGlobalHours] = useState("");
  const [inTeamFast, setInTeamFast] = useState(false);
  const [weeklyFastId, setWeeklyFastId] = useState<string | null>(null);
  const [rows, setRows] = useState<SubjectRow[]>([]);

  useEffect(() => {
    setName(getStoredName());
    if (mode === "create") {
      setRows([
        emptyRow(),
      ]);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "edit" || !entryId) return;
    let cancelled = false;
    async function load() {
      try {
        const { entry, subjects } = await getPersonalFast(entryId!);
        if (cancelled) return;
        if (!entry) {
          setStatus("error");
          setErrorMsg("Jeûne introuvable.");
          return;
        }
        setTitle(entry.title ?? "");
        setFastDate(entry.fast_date ?? today);
        setGlobalHours(entry.global_hours != null ? String(entry.global_hours) : "");
        setInTeamFast(entry.in_team_fast);
        setWeeklyFastId(entry.weekly_fast_id);
        setRows(
          subjects.map((s) => ({
            weekly_fast_subject_id: s.weekly_fast_subject_id,
            custom_label: s.custom_label,
            label: s.custom_label ?? "",
            intercessions: s.intercessions,
            hours: Number(s.hours),
            editable: true,
          })),
        );
        setStatus("ready");
      } catch (e: unknown) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(messageOf(e));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [mode, entryId, today]);

  useEffect(() => {
    if (!inTeamFast) return;
    let cancelled = false;
    async function ensureWeekly() {
      try {
        const w = getIsoWeek(new Date(fastDate || today));
        const wf = await getOrCreateWeeklyFast(w.year, w.week);
        if (cancelled) return;
        if (weeklyFastId !== wf.id) {
          setWeeklyFastId(wf.id);
          const subs = await getWeeklyFastSubjects(wf.id);
          if (cancelled) return;
          setRows((current) => mergeWithPredefined(current, subs));
        }
      } catch {
        // silencieux : si l'admin n'a pas encore créé la semaine, on continue
      }
    }
    ensureWeekly();
    return () => {
      cancelled = true;
    };
  }, [inTeamFast, fastDate, today, weeklyFastId]);

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
    setRows((rs) => [...rs, emptyRow()]);
  }
  function removeCustom(idx: number) {
    setRows((rs) => rs.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setStatus("saving");
    setErrorMsg(null);
    try {
      const trimmedName = name.trim();
      if (trimmedName) setStoredName(trimmedName);
      const subjects = rows
        .filter((r) => r.label.trim() !== "" || r.weekly_fast_subject_id)
        .map((r, i) => ({
          weekly_fast_subject_id: r.weekly_fast_subject_id,
          custom_label: r.weekly_fast_subject_id ? null : r.label.trim() || null,
          intercessions: r.intercessions || 0,
          hours: r.hours || 0,
          position: i,
        }));
      const gh = globalHours.trim() === "" ? null : Number(globalHours);
      const saved = await savePersonalFast({
        id: mode === "edit" ? entryId : undefined,
        deviceId: getDeviceId(),
        userName: trimmedName || null,
        title: title.trim() || "Jeûne personnel",
        fastDate: fastDate || null,
        inTeamFast,
        weeklyFastId: inTeamFast ? weeklyFastId : null,
        globalHours: gh != null && Number.isFinite(gh) ? gh : null,
        subjects,
      });
      setStatus("saved");
      if (mode === "create") {
        router.replace(`/jeune/perso/${saved.id}`);
      } else {
        setTimeout(() => setStatus("ready"), 1200);
      }
    } catch (e: unknown) {
      setErrorMsg(messageOf(e));
      setStatus("error");
    }
  }

  async function handleDelete() {
    if (!entryId) return;
    if (!confirm("Supprimer ce jeûne ?")) return;
    try {
      await deletePersonalFast(entryId);
      router.replace("/jeune/perso");
    } catch (e: unknown) {
      setErrorMsg(messageOf(e));
    }
  }

  if (status === "loading") {
    return <p className="text-sm text-slate-500">Chargement…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div>
          <label className="label">Titre</label>
          <input
            className="input mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Jeûne du matin"
          />
        </div>
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className="input mt-1"
            value={fastDate}
            onChange={(e) => setFastDate(e.target.value)}
          />
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={inTeamFast}
            onChange={(e) => setInTeamFast(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Fait dans le cadre du jeûne d'équipe de la semaine
        </label>
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
          value={globalHours}
          onChange={(e) => setGlobalHours(e.target.value)}
        />
      </div>

      <div className="card">
        <TotalsBar
          totalIntercessions={totals.intercessions}
          totalHours={totals.hours}
          goalHours={24}
        />
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          className="btn-primary w-full"
        >
          {status === "saving"
            ? "Enregistrement…"
            : status === "saved"
              ? "✓ Enregistré"
              : "Enregistrer"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            onClick={handleDelete}
            className="btn-secondary w-full text-red-600"
          >
            Supprimer
          </button>
        ) : null}
        {errorMsg ? (
          <p className="text-center text-xs text-red-600">{errorMsg}</p>
        ) : null}
      </div>
    </div>
  );
}

function emptyRow(): SubjectRow {
  return {
    weekly_fast_subject_id: null,
    custom_label: "",
    label: "",
    intercessions: 0,
    hours: 0,
    editable: true,
  };
}

function mergeWithPredefined(
  current: SubjectRow[],
  predefined: { id: string; label: string }[],
): SubjectRow[] {
  const next: SubjectRow[] = [];
  for (const p of predefined) {
    const existing = current.find((r) => r.weekly_fast_subject_id === p.id);
    next.push(
      existing
        ? { ...existing, label: p.label, editable: false }
        : {
            weekly_fast_subject_id: p.id,
            custom_label: null,
            label: p.label,
            intercessions: 0,
            hours: 0,
            editable: false,
          },
    );
  }
  for (const r of current) {
    if (!r.weekly_fast_subject_id) next.push(r);
  }
  return next;
}

function messageOf(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Erreur inconnue";
}
