"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SubjectsEditor, SubjectRow } from "@/components/SubjectsEditor";
import { TotalsBar } from "@/components/TotalsBar";
import {
  deletePersonalFast,
  getActiveCroisade,
  getPersonalFast,
  savePersonalFast,
} from "@/lib/data";
import type { Croisade } from "@/lib/types";

type Status = "loading" | "ready" | "saving" | "saved" | "error";
type FastType = "complet" | "partiel" | "absolu";

const FAST_TYPES: { value: FastType; label: string; desc: string }[] = [
  { value: "complet", label: "Complet", desc: "Abstinence totale de nourriture" },
  { value: "partiel", label: "Partiel", desc: "Restriction de certains aliments" },
  { value: "absolu", label: "Absolu", desc: "Sans nourriture ni eau" },
];

export function PersonalEditor({
  mode,
  entryId,
  isDirigent = false,
}: {
  mode: "create" | "edit";
  entryId?: string;
  isDirigent?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(mode === "edit" ? "loading" : "ready");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [title, setTitle] = useState("");
  const [fastDate, setFastDate] = useState(today);
  const [fastEndDate, setFastEndDate] = useState("");
  const [fastType, setFastType] = useState<FastType>("complet");
  const [globalHours, setGlobalHours] = useState("");
  const [rows, setRows] = useState<SubjectRow[]>([]);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [dirigeantCroisade, setDirigeantCroisade] = useState<Croisade | null>(null);

  useEffect(() => {
    if (isDirigent) {
      getActiveCroisade(undefined, true).then(setDirigeantCroisade).catch(() => {});
    }
  }, [isDirigent]);

  useEffect(() => {
    if (mode === "create") setRows([emptyRow()]);
  }, [mode]);

  useEffect(() => {
    if (mode !== "edit" || !entryId) return;
    let cancelled = false;
    async function load() {
      try {
        const { entry, subjects } = await getPersonalFast(entryId!);
        if (cancelled) return;
        if (!entry) { setStatus("error"); setErrorMsg("Jeûne introuvable."); return; }
        setTitle(entry.title ?? "");
        setFastDate(entry.fast_date ?? today);
        setFastEndDate(entry.fast_end_date ?? "");
        setFastType((entry.fast_type as FastType) ?? "complet");
        setGlobalHours(entry.global_hours != null ? String(entry.global_hours) : "");
        setCreatedAt(entry.created_at);
        setRows(
          subjects.map((s) => ({
            weekly_fast_subject_id: s.weekly_fast_subject_id,
            croisade_subject_id: null,
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
    return () => { cancelled = true; };
  }, [mode, entryId, today]);

  const durationDays = useMemo(() => {
    if (!fastDate) return null;
    if (!fastEndDate || fastEndDate === fastDate) return 1;
    const diff = new Date(fastEndDate).getTime() - new Date(fastDate).getTime();
    const days = Math.round(diff / 86400_000);
    return days > 0 ? days + 1 : 1; // inclusive count, minimum 1
  }, [fastDate, fastEndDate]);

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
  function addCustom() { setRows((rs) => [...rs, emptyRow()]); }
  function removeCustom(idx: number) { setRows((rs) => rs.filter((_, i) => i !== idx)); }

  const minEndDate = useMemo(() => {
    if (!fastDate || !(isDirigent && dirigeantCroisade)) return fastDate;
    const d = new Date(fastDate);
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }, [fastDate, isDirigent, dirigeantCroisade]);

  function handleEndDateChange(val: string) {
    const floor = minEndDate || fastDate;
    if (val && floor && val < floor) {
      setFastEndDate(floor);
    } else {
      setFastEndDate(val);
    }
  }

  async function handleSave() {
    setStatus("saving");
    setErrorMsg(null);
    try {
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
        title: title.trim() || "Jeûne personnel",
        fastDate: fastDate || null,
        fastEndDate: fastEndDate || null,
        fastType,
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

  const canDelete = useMemo(() => {
    if (!createdAt) return false;
    return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  }, [createdAt]);

  async function handleDelete() {
    if (!entryId || !createdAt) return;
    if (!confirm("Supprimer ce jeûne ?")) return;
    try {
      await deletePersonalFast(entryId, createdAt);
      router.replace("/jeune/perso");
    } catch (e: unknown) {
      setErrorMsg(messageOf(e));
    }
  }

  if (status === "loading") return <p className="text-sm text-slate-500">Chargement…</p>;

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <label className="label">Titre</label>
        <input
          className="input mt-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Jeûne personnel pour le mois, besoins personnels, etc."
        />
      </div>

      {/* Fast type selector */}
      <div className="flex flex-col gap-2">
        <span className="label">Type de jeûne</span>
        <div className="grid grid-cols-3 gap-2">
          {FAST_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setFastType(t.value)}
              className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                fastType === t.value
                  ? "border-brand-500 bg-brand-50 ring-1 ring-brand-400"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className={`text-xs font-semibold ${fastType === t.value ? "text-brand-700" : "text-slate-700"}`}>
                {t.label}
              </span>
              <span className="mt-0.5 text-[10px] leading-tight text-slate-500">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Airbnb-style date range */}
      <div className="flex flex-col gap-1">
        <span className="label">Durée</span>
        <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-1 flex-col gap-0.5 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Début</span>
            <input
              type="date"
              className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none"
              value={fastDate}
              onChange={(e) => {
                setFastDate(e.target.value);
                if (fastEndDate && e.target.value > fastEndDate) setFastEndDate(e.target.value);
              }}
            />
          </div>
          <div className="w-px bg-slate-200" />
          <div className="flex flex-1 flex-col gap-0.5 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fin</span>
            <input
              type="date"
              className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none"
              value={fastEndDate}
              min={minEndDate || fastDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
            />
          </div>
        </div>
        {durationDays !== null ? (
          <p className="text-center text-xs font-medium text-brand-600">{durationDays} jour{durationDays > 1 ? "s" : ""}</p>
        ) : (
          <p className="text-center text-xs text-slate-400">Sélectionne une date de début</p>
        )}
      </div>

      {/* Subjects */}
      <div className="card flex flex-col gap-4">
        <SubjectsEditor
          rows={rows}
          onChange={updateRow}
          onAddCustom={addCustom}
          onRemoveCustom={removeCustom}
        />
      </div>

      {/* Prayer time */}
      <div className="card flex flex-col gap-2">
        <label className="label">Temps total de prière (optionnel)</label>
        <input
          className="input"
          type="number"
          min={0}
          step="1"
          inputMode="numeric"
          placeholder="Sinon, somme des minutes par sujet"
          value={globalHours}
          onChange={(e) => setGlobalHours(e.target.value)}
        />
      </div>

      <div className="card">
        <TotalsBar
          totalIntercessions={totals.intercessions}
          totalHours={totals.hours}
        />
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          className="btn-primary w-full"
        >
          {status === "saving" ? "Enregistrement…" : status === "saved" ? "✓ Enregistré" : "Enregistrer"}
        </button>
        {mode === "edit" && canDelete && (
          <button type="button" onClick={handleDelete} className="btn-secondary w-full text-red-600">
            Supprimer
          </button>
        )}
        {mode === "edit" && !canDelete && createdAt && (
          <p className="text-center text-xs text-slate-400">Suppression impossible après 7 jours</p>
        )}
        {errorMsg && <p className="text-center text-xs text-red-600">{errorMsg}</p>}
      </div>
    </div>
  );
}

function emptyRow(): SubjectRow {
  return { weekly_fast_subject_id: null, croisade_subject_id: null, custom_label: "", label: "", intercessions: 0, hours: 0, editable: true };
}

function messageOf(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Erreur inconnue";
}
