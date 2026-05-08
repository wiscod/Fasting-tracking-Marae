"use client";

import { useEffect, useState } from "react";
import type { Croisade, CroisadeSubject } from "@/lib/types";
import type { CroisadeStats } from "@/lib/data";
import {
  getAllCroisades,
  createCroisade,
  updateCroisade,
  closeCroisade,
  reopenCroisade,
  getCroisadeStats,
  getCroisadeSubjectsAdmin,
  saveCroisadeSubjects,
} from "@/lib/data";

type View = "list" | "create" | "edit" | "stats" | "subjects";

function fmt(iso: string) {
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

export function CroisadesView() {
  const [croisades, setCroisades] = useState<Croisade[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<Croisade | null>(null);
  const [stats, setStats] = useState<CroisadeStats | null>(null);
  const [subjects, setSubjects] = useState<CroisadeSubject[] | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await getAllCroisades();
      setCroisades(data);
    } catch (e: unknown) {
      setError(msg(e));
    }
  }

  async function handleClose(c: Croisade) {
    if (!confirm(`Fermer la croisade "${c.name}" ?`)) return;
    try {
      await closeCroisade(c.id);
      setCroisades((prev) => prev?.map((x) => x.id === c.id ? { ...x, is_active: false } : x) ?? null);
    } catch (e: unknown) { setError(msg(e)); }
  }

  async function handleReopen(c: Croisade) {
    try {
      await reopenCroisade(c.id);
      setCroisades((prev) => prev?.map((x) => x.id === c.id ? { ...x, is_active: true } : x) ?? null);
    } catch (e: unknown) { setError(msg(e)); }
  }

  async function handleStats(c: Croisade) {
    setSelected(c);
    setStats(null);
    setView("stats");
    try {
      const s = await getCroisadeStats(c.id);
      setStats(s);
    } catch (e: unknown) { setError(msg(e)); }
  }

  async function handleSubjects(c: Croisade) {
    setSelected(c);
    setSubjects(null);
    setView("subjects");
    try {
      const s = await getCroisadeSubjectsAdmin(c.id);
      setSubjects(s);
    } catch (e: unknown) { setError(msg(e)); }
  }

  if (view === "create") {
    return (
      <CroisadeForm
        onSave={async (values) => {
          const c = await createCroisade(values);
          setCroisades((prev) => [c, ...(prev ?? [])]);
          setView("list");
        }}
        onCancel={() => setView("list")}
      />
    );
  }

  if (view === "edit" && selected) {
    return (
      <CroisadeForm
        initial={selected}
        onSave={async (values) => {
          const c = await updateCroisade({ id: selected.id, ...values });
          setCroisades((prev) => prev?.map((x) => x.id === c.id ? c : x) ?? null);
          setView("list");
        }}
        onCancel={() => setView("list")}
      />
    );
  }

  if (view === "subjects" && selected) {
    return (
      <SubjectsEditorView
        croisade={selected}
        initial={subjects ?? []}
        loading={subjects === null}
        onBack={() => setView("list")}
        onSaved={(updated) => setSubjects(updated)}
      />
    );
  }

  if (view === "stats" && selected) {
    return (
      <div className="flex flex-col gap-4">
        <button type="button" onClick={() => setView("list")} className="text-sm text-slate-500 hover:text-slate-800 self-start">← Retour</button>
        <h2 className="text-base font-semibold">{selected.name}</h2>
        <p className="text-xs text-slate-500">{fmt(selected.start_date)} → {fmt(selected.end_date)}</p>
        {stats === null ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="card text-center">
              <p className="text-2xl font-bold text-brand-600">{stats.participants}</p>
              <p className="text-xs text-slate-500 mt-1">Participants</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-brand-600">{stats.totalEntries}</p>
              <p className="text-xs text-slate-500 mt-1">Entrées</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-brand-600">{stats.totalIntercessions}</p>
              <p className="text-xs text-slate-500 mt-1">Importunités</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-brand-600">{Math.round(stats.totalMinutes / 60)}</p>
              <p className="text-xs text-slate-500 mt-1">Heures de prière</p>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Croisades</h2>
        <button type="button" onClick={() => setView("create")} className="btn-primary text-sm">+ Nouvelle</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {croisades === null ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : croisades.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune croisade.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {croisades.map((c) => (
            <li key={c.id} className="card flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${c.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {c.is_active ? "Active" : "Fermée"}
                    </span>
                    {c.is_dirigeant && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Dirigeants</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  {c.description && <p className="text-xs text-slate-500">{c.description}</p>}
                  <p className="text-xs text-slate-400">{fmt(c.start_date)} → {fmt(c.end_date)}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => handleStats(c)} className="btn-secondary text-xs">Stats</button>
                <button type="button" onClick={() => handleSubjects(c)} className="btn-secondary text-xs">Sujets</button>
                <button type="button" onClick={() => { setSelected(c); setView("edit"); }} className="btn-secondary text-xs">Modifier</button>
                {c.is_active ? (
                  <button type="button" onClick={() => handleClose(c)} className="btn-secondary text-xs text-red-600">Fermer</button>
                ) : (
                  <button type="button" onClick={() => handleReopen(c)} className="btn-secondary text-xs text-green-600">Rouvrir</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CroisadeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Croisade;
  onSave: (v: { name: string; description: string | null; start_date: string; end_date: string; is_dirigeant: boolean }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [isDirigent, setIsDirigent] = useState(initial?.is_dirigeant ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return setError("Nom et dates requis.");
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        start_date: startDate,
        end_date: endDate,
        is_dirigeant: isDirigent,
      });
    } catch (e: unknown) {
      setError(msg(e));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <button type="button" onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-800 self-start">← Retour</button>
      <h2 className="text-base font-semibold">{initial ? "Modifier la croisade" : "Nouvelle croisade"}</h2>
      <div>
        <label className="label">Nom</label>
        <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="1ere croisade" required />
      </div>
      <div>
        <label className="label">Description (optionnel)</label>
        <input className="input mt-1" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enregistre tes importunités…" />
      </div>
      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Début</span>
          <input type="date" className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div className="w-px bg-slate-200" />
        <div className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fin</span>
          <input type="date" className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isDirigent} onChange={(e) => setIsDirigent(e.target.checked)} className="rounded" />
        Réservée aux dirigeants
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Enregistrement…" : initial ? "Enregistrer" : "Créer"}
      </button>
    </form>
  );
}

function SubjectsEditorView({
  croisade,
  initial,
  loading,
  onBack,
  onSaved,
}: {
  croisade: Croisade;
  initial: CroisadeSubject[];
  loading: boolean;
  onBack: () => void;
  onSaved: (updated: CroisadeSubject[]) => void;
}) {
  const [labels, setLabels] = useState<string[]>(initial.map((s) => s.label));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Sync when initial loads
  useEffect(() => {
    setLabels(initial.map((s) => s.label));
  }, [initial]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const subjects = labels
        .map((l, i) => ({ position: i + 1, label: l.trim() }))
        .filter((s) => s.label !== "");
      await saveCroisadeSubjects(croisade.id, subjects);
      const updated = subjects.map((s, i) => ({
        id: initial[i]?.id ?? "",
        croisade_id: croisade.id,
        position: s.position,
        label: s.label,
        created_at: initial[i]?.created_at ?? "",
      }));
      onSaved(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e: unknown) {
      setError(msg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800 self-start">← Retour</button>
      <div>
        <h2 className="text-base font-semibold">Sujets — {croisade.name}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{croisade.is_dirigeant ? "Dirigeants" : "Équipe"}</p>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {labels.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 text-center text-sm font-bold text-brand-600">{i + 1}</span>
              <input
                className="input flex-1 text-sm"
                value={label}
                onChange={(e) => setLabels((ls) => ls.map((l, j) => j === i ? e.target.value : l))}
                placeholder={`Sujet ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => setLabels((ls) => ls.filter((_, j) => j !== i))}
                className="text-slate-300 hover:text-red-500"
              >×</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLabels((ls) => [...ls, ""])}
            className="self-start text-sm font-medium text-brand-600 hover:text-brand-700"
          >+ Ajouter un sujet</button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="button" onClick={handleSave} disabled={saving || loading} className="btn-primary">
        {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer les sujets"}
      </button>
    </div>
  );
}

function msg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Erreur inconnue";
}
