"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SubjectsEditor, SubjectRow } from "@/components/SubjectsEditor";
import { TotalsBar } from "@/components/TotalsBar";
import {
  getActiveCroisade,
  getCroisadeSubjects,
  getMyCroisadeFasts,
  savePersonalFast,
  type CroisadeFastItem,
} from "@/lib/data";
import type { Croisade, CroisadeSubject } from "@/lib/types";

type Status = "loading" | "ready" | "saving" | "saved" | "error" | "no-croisade";

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function NewFastForm({
  croisade,
  croisadeSubjects,
  onSuccess,
  onCancel,
}: {
  croisade: Croisade;
  croisadeSubjects: CroisadeSubject[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const minDate = croisade.start_date;
  const maxDate = croisade.end_date ?? undefined;

  const clamp = (d: string) => {
    if (minDate && d < minDate) return minDate;
    if (maxDate && d > maxDate) return maxDate;
    return d;
  };

  const [fastDate, setFastDate] = useState(() => clamp(today));
  const [globalHours, setGlobalHours] = useState("");
  const [rows, setRows] = useState<SubjectRow[]>(() =>
    croisadeSubjects.map((cs) => ({
      weekly_fast_subject_id: null,
      croisade_subject_id: cs.id,
      custom_label: null,
      label: cs.label,
      intercessions: 0,
      hours: 0,
      editable: false,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totals = useMemo(() => {
    const intercessions = rows.reduce((a, r) => a + (r.intercessions || 0), 0);
    const perSub = rows.reduce((a, r) => a + (r.hours || 0), 0);
    const gh = Number(globalHours);
    return {
      intercessions,
      hours: globalHours.trim() !== "" && Number.isFinite(gh) ? gh : perSub,
    };
  }, [rows, globalHours]);

  function updateRow(idx: number, patch: Partial<SubjectRow>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setSaving(true);
    setErrorMsg(null);
    try {
      const gh = globalHours.trim() === "" ? null : Number(globalHours);
      await savePersonalFast({
        title: `Jeûne — ${croisade.name}`,
        fastDate,
        fastEndDate: null,
        fastType: "complet",
        globalHours: gh != null && Number.isFinite(gh) ? gh : null,
        subjects: rows.map((r, i) => ({
          weekly_fast_subject_id: null,
          croisade_subject_id: r.croisade_subject_id ?? null,
          custom_label: null,
          intercessions: r.intercessions || 0,
          hours: r.hours || 0,
          position: i,
        })),
      });
      onSuccess();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-brand-800">Nouveau jeûne</h3>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Date du jeûne</label>
        <input
          type="date"
          className="input mt-1 w-full"
          value={fastDate}
          min={minDate}
          max={maxDate}
          onChange={(e) => setFastDate(e.target.value)}
        />
        <p className="mt-0.5 text-[10px] text-slate-400">
          Période croisade : {fmt(croisade.start_date)}{croisade.end_date ? ` → ${fmt(croisade.end_date)}` : " (en cours)"}
        </p>
      </div>

      <div className="card">
        <SubjectsEditor rows={rows} onChange={updateRow} onAddCustom={() => {}} onRemoveCustom={() => {}} />
      </div>

      <div className="card flex flex-col gap-2">
        <label className="label">Minutes globales (optionnel)</label>
        <input
          className="input"
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Sinon, somme des minutes par sujet"
          value={globalHours}
          onChange={(e) => setGlobalHours(e.target.value)}
        />
      </div>

      <div className="card">
        <TotalsBar totalIntercessions={totals.intercessions} totalHours={totals.hours} />
      </div>

      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Annuler</button>
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

export function DirigentFastClient() {
  const [status, setStatus] = useState<Status>("loading");
  const [croisade, setCroisade] = useState<Croisade | null>(null);
  const [croisadeSubjects, setCroisadeSubjects] = useState<CroisadeSubject[]>([]);
  const [myFasts, setMyFasts] = useState<CroisadeFastItem[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setStatus("loading");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const activeCroisade = await getActiveCroisade(today, true);
      if (!activeCroisade) { setStatus("no-croisade"); return; }
      const [subjects, fasts] = await Promise.all([
        getCroisadeSubjects(activeCroisade.id),
        getMyCroisadeFasts(activeCroisade),
      ]);
      setCroisade(activeCroisade);
      setCroisadeSubjects(subjects);
      setMyFasts(fasts);
      setStatus("ready");
    } catch (e: unknown) {
      console.error(e);
      setStatus("error");
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "loading") return <p className="text-sm text-slate-500">Chargement…</p>;

  if (status === "no-croisade") {
    return (
      <div className="card text-sm text-slate-700">
        <p className="font-medium">Aucune croisade des dirigeants en cours.</p>
        <p className="mt-1 text-slate-500">L&apos;admin doit créer et activer une croisade dirigeants.</p>
      </div>
    );
  }

  if (status === "error" || !croisade) {
    return (
      <div className="card border-red-200 bg-red-50 text-sm text-red-800">
        Impossible de charger la croisade.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Croisade header */}
      <div className="card flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${croisade.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
            {croisade.is_active ? "Active" : "Fermée"}
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Dirigeants</span>
        </div>
        <p className="text-lg font-semibold mt-1">{croisade.name}</p>
        {croisade.description && <p className="text-sm text-slate-500">{croisade.description}</p>}
        <p className="text-xs text-slate-400 mt-0.5">
          {fmt(croisade.start_date)} → {croisade.end_date ? fmt(croisade.end_date) : "En cours"}
        </p>
      </div>

      {/* My fasts */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Mes jeûnes</h2>
            <p className="text-xs text-slate-400">{myFasts.length} enregistré{myFasts.length > 1 ? "s" : ""}</p>
          </div>
          {croisade.is_active && (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              {showForm ? "Annuler" : "+ Nouveau jeûne"}
            </button>
          )}
        </div>

        {showForm && (
          <NewFastForm
            croisade={croisade}
            croisadeSubjects={croisadeSubjects}
            onSuccess={() => {
              setShowForm(false);
              load();
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {myFasts.length === 0 && !showForm && (
          <div className="card text-sm text-slate-600">
            <p>Aucun jeûne enregistré pour cette croisade.</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Utilise &quot;+ Nouveau jeûne&quot; pour enregistrer chacun de tes jeûnes.
            </p>
          </div>
        )}

        {myFasts.length > 0 && (
          <ul className="flex flex-col gap-2">
            {myFasts.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/jeune/perso/${item.id}`}
                  className="card flex items-center justify-between gap-3 hover:border-brand-400 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {item.fast_date ? fmt(item.fast_date) : "—"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.title || croisade.name}</p>
                  </div>
                  <span className="text-slate-400 text-xs">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
