"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyCroisadeFasts } from "@/lib/data";
import type { Croisade } from "@/lib/types";
import type { CroisadeFastItem } from "@/lib/data";

const FAST_TYPE_LABELS: Record<string, string> = {
  complet: "Complet",
  partiel: "Partiel",
  absolu: "Absolu",
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function CroisadeDetailClient({ croisade }: { croisade: Croisade }) {
  const [items, setItems] = useState<CroisadeFastItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyCroisadeFasts(croisade)
      .then(setItems)
      .catch((e: unknown) => setError(messageOf(e)));
  }, [croisade]);

  const endLabel = croisade.end_date ? fmt(croisade.end_date) : "En cours";

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${croisade.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
            {croisade.is_active ? "Active" : "Fermée"}
          </span>
          {croisade.is_dirigeant && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Dirigeants</span>
          )}
        </div>
        <p className="text-lg font-semibold mt-1">{croisade.name}</p>
        {croisade.description && <p className="text-sm text-slate-500">{croisade.description}</p>}
        <p className="text-xs text-slate-400 mt-0.5">{fmt(croisade.start_date)} → {endLabel}</p>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-800">
          <p>{error}</p>
        </div>
      )}

      {items === null && !error && (
        <p className="text-sm text-slate-500">Chargement…</p>
      )}

      {items !== null && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Mes jeûnes</h2>
            <span className="rounded-full bg-brand-100 px-3 py-0.5 text-sm font-bold text-brand-700">
              {items.length} jeûne{items.length !== 1 ? "s" : ""}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="card text-sm text-slate-600">
              <p>Aucun jeûne enregistré pour cette croisade.</p>
              <p className="mt-1 text-slate-400 text-xs">
                Les jeûnes personnels dont la date tombe dans la période de la croisade apparaîtront ici.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.kind === "personal" ? `/jeune/perso/${item.id}` : `/jeune/equipe${item.weekLabel ? `?week=${item.weekLabel.split(" ")[1]}&year=${item.weekLabel.split(" ")[2]}` : ""}`}
                    className="card flex flex-col gap-1 hover:border-brand-500 block"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${item.kind === "team" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"}`}>
                          {item.kind === "team" ? "Équipe" : "Perso"}
                        </span>
                        {item.fast_type && item.fast_type !== "complet" && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                            {FAST_TYPE_LABELS[item.fast_type] ?? item.fast_type}
                          </span>
                        )}
                      </div>
                      {item.global_hours != null && (
                        <span className="text-xs text-slate-500">{item.global_hours} min</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-800">
                      {item.title || (item.weekLabel ? `Sem ${item.weekLabel.split(" ")[1]}` : "Jeûne")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {item.fast_date ? fmt(item.fast_date) : item.weekLabel ?? "—"}
                      {item.fast_end_date && item.fast_end_date !== item.fast_date
                        ? ` → ${fmt(item.fast_end_date)}`
                        : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function messageOf(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Erreur inconnue";
}
