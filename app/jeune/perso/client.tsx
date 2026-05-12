"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deletePersonalFast, listMyFasts } from "@/lib/data";
import type { FastEntry } from "@/lib/types";

type Item = FastEntry & { weekLabel: string | null };

const FAST_TYPE_LABELS: Record<string, string> = {
  complet: "Complet",
  partiel: "Partiel",
  absolu: "Absolu",
};

export function PersonalListClient() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyFasts()
      .then(setItems)
      .catch((e: unknown) => setError(messageOf(e)));
  }, []);

  async function handleDelete(item: Item) {
    if (!confirm("Supprimer ce jeûne ?")) return;
    try {
      await deletePersonalFast(item.id, item.created_at);
      setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
    } catch (e: unknown) {
      setError(messageOf(e));
    }
  }

  if (error) {
    return (
      <div className="card border-red-200 bg-red-50 text-sm text-red-800">
        <p className="font-medium">Erreur</p>
        <p className="mt-1 text-xs">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/jeune/perso/nouveau" className="btn-primary">
        + Nouveau jeûne personnel
      </Link>

      {items === null ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun jeûne pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((it) => {
            const isTeam = it.kind === "team";
            const href = isTeam ? "/jeune/equipe" : `/jeune/perso/${it.id}`;
            const canDelete = !isTeam &&
              Date.now() - new Date(it.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
            const dateLabel = formatDuration(it.fast_date, it.fast_end_date);
            return (
              <li key={it.id} className="relative">
                <Link href={href} className="card flex flex-col gap-1 hover:border-brand-500">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        isTeam ? "bg-brand-50 text-brand-700" : "bg-green-50 text-green-700"
                      }`}
                    >
                      {isTeam ? "Équipe" : "Perso"}
                    </span>
                    {!isTeam && it.fast_type && it.fast_type !== "complet" && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {FAST_TYPE_LABELS[it.fast_type] ?? it.fast_type}
                      </span>
                    )}
                    <span className="text-sm font-semibold">
                      {isTeam ? (it.weekLabel ?? "Jeûne d'équipe") : (it.title || "Jeûne sans titre")}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{dateLabel}</span>
                </Link>
                {canDelete && (
                  <button
                    type="button"
                    aria-label="Supprimer"
                    onClick={() => handleDelete(it)}
                    className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatDuration(startIso: string | null, endIso: string | null): string {
  if (!startIso) return "";
  const start = formatDate(startIso);
  if (!endIso || endIso === startIso) return start;
  const diffDays = Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 86400_000,
  ) + 1;
  return `${start} → ${formatDate(endIso)} · ${diffDays} jours`;
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }); }
  catch { return iso; }
}

function messageOf(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Erreur inconnue";
}
