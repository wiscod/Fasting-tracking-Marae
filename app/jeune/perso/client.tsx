"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listMyFasts } from "@/lib/data";
import type { FastEntry } from "@/lib/types";

type Item = FastEntry & { weekLabel: string | null };

export function PersonalListClient() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyFasts()
      .then(setItems)
      .catch((e: unknown) => setError(messageOf(e)));
  }, []);

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
        <p className="text-sm text-slate-500">Aucun jeûne pour l'instant.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((it) => {
            const isTeam = it.kind === "team";
            const href = isTeam
              ? "/jeune/equipe"
              : `/jeune/perso/${it.id}`;
            return (
              <li key={it.id}>
                <Link href={href} className="card flex flex-col gap-1 hover:border-brand-500">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        isTeam ? "bg-brand-50 text-brand-700" : "bg-green-50 text-green-700"
                      }`}
                    >
                      {isTeam ? "Équipe" : "Perso"}
                    </span>
                    <span className="text-sm font-semibold">
                      {isTeam
                        ? it.weekLabel ?? "Jeûne d'équipe"
                        : it.title || "Jeûne sans titre"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {it.fast_date ?? formatDate(it.created_at)}
                    {!isTeam && it.in_team_fast ? " · dans le cadre du jeûne d'équipe" : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("fr-FR"); }
  catch { return iso; }
}

function messageOf(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Erreur inconnue";
}
