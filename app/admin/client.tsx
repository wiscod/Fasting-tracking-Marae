"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getOrCreateWeeklyFast,
  getWeeklyFastSubjects,
  getWeeklyParticipants,
} from "@/lib/data";
import type { WeeklyParticipant } from "@/lib/data";
import type { WeeklyFast, WeeklyFastSubject } from "@/lib/types";
import { isoWeeksInYear } from "@/lib/week";
import { WeeklyStats } from "@/components/WeeklyStats";

type Status = "loading" | "ready" | "saving" | "saved" | "error";

export function AdminClient({
  initialYear,
  initialWeek,
}: {
  initialYear: number;
  initialWeek: number;
}) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [week, setWeek] = useState(initialWeek);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [wf, setWf] = useState<WeeklyFast | null>(null);
  const [labels, setLabels] = useState<string[]>(["", "", ""]);
  const [subjects, setSubjects] = useState<WeeklyFastSubject[]>([]);
  const [participants, setParticipants] = useState<WeeklyParticipant[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      setError(null);
      setStatsLoading(true);
      try {
        const weeklyFast = await getOrCreateWeeklyFast(year, week);
        const [subs, parts] = await Promise.all([
          getWeeklyFastSubjects(weeklyFast.id),
          getWeeklyParticipants(weeklyFast.id),
        ]);
        if (cancelled) return;
        setWf(weeklyFast);
        setSubjects(subs);
        setParticipants(parts);
        const initial = Array.from(
          { length: Math.max(3, subs.length) },
          (_, i) => subs[i]?.label ?? "",
        );
        setLabels(initial);
        setStatus("ready");
      } catch (e: unknown) {
        if (cancelled) return;
        setError(msgOf(e));
        setStatus("error");
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [year, week, statsRefreshKey]);

  function navigate(delta: number) {
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

  function updateLabel(i: number, value: string) {
    setLabels((prev) => prev.map((l, j) => (j === i ? value : l)));
  }

  function addSubject() {
    setLabels((prev) => [...prev, ""]);
  }

  function removeSubject(i: number) {
    setLabels((prev) => prev.filter((_, j) => j !== i));
  }

  async function handleSave() {
    if (!wf) return;
    setStatus("saving");
    setError(null);
    try {
      const subjects = labels
        .map((label, i) => ({ position: i + 1, label: label.trim() }))
        .filter((s) => s.label !== "");
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyFastId: wf.id, subjects }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur");
      }
      setStatus("saved");
      setTimeout(() => setStatus("ready"), 1500);
    } catch (e: unknown) {
      setError(msgOf(e));
      setStatus("error");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (status === "loading") {
    return <p className="text-sm text-slate-500">Chargement…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation semaine */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Semaine précédente"
          onClick={() => navigate(-1)}
          className="btn-secondary"
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Année {year}
          </p>
          <p className="text-lg font-semibold">Sem {week}</p>
          {wf?.title && (
            <p className="text-xs text-slate-500">{wf.title}</p>
          )}
        </div>
        <button
          type="button"
          aria-label="Semaine suivante"
          onClick={() => navigate(1)}
          className="btn-secondary"
        >
          →
        </button>
      </div>

      {/* Sujets de prière */}
      <div className="card flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Sujets de prière
        </h2>
        <div className="flex flex-col gap-2">
          {labels.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-sm text-slate-400">
                {i + 1}
              </span>
              <input
                className="input"
                placeholder={`Sujet ${i + 1}`}
                value={label}
                maxLength={255}
                onChange={(e) => updateLabel(i, e.target.value)}
              />
              <button
                type="button"
                aria-label="Supprimer"
                onClick={() => removeSubject(i)}
                className="shrink-0 rounded-md px-2 py-1 text-slate-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSubject}
          className="self-start text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          + Ajouter un sujet
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={status === "saving"}
        className="btn-primary"
      >
        {status === "saving"
          ? "Enregistrement…"
          : status === "saved"
            ? "✓ Enregistré"
            : "Enregistrer les sujets"}
      </button>

      {/* Dashboard stats */}
      <section className="flex flex-col gap-3 border-t border-slate-200 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Stats de la semaine
          </h2>
          <button
            type="button"
            onClick={() => setStatsRefreshKey((k) => k + 1)}
            disabled={statsLoading}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:text-slate-400"
            aria-label="Rafraîchir les stats"
          >
            {statsLoading ? "…" : "↻ Rafraîchir"}
          </button>
        </div>
        {statsLoading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : (
          <WeeklyStats participants={participants} subjects={subjects} />
        )}
      </section>

      <div className="border-t border-slate-200 pt-2">
        <button
          type="button"
          onClick={handleLogout}
          className="btn-secondary w-full text-slate-500"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

function msgOf(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Erreur inconnue";
}
