"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listPersonalFasts } from "@/lib/data";
import { getDeviceId } from "@/lib/deviceId";
import type { FastEntry } from "@/lib/types";

export function PersonalListClient() {
  const [items, setItems] = useState<FastEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const deviceId = getDeviceId();
        const data = await listPersonalFasts(deviceId);
        setItems(data);
      } catch (e: unknown) {
        setError(messageOf(e));
      }
    }
    load();
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
        <p className="text-sm text-slate-500">
          Aucun jeûne personnel pour l'instant.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/jeune/perso/${it.id}`}
                className="card flex flex-col gap-1 hover:border-brand-500"
              >
                <span className="text-sm font-semibold">
                  {it.title || "Jeûne sans titre"}
                </span>
                <span className="text-xs text-slate-500">
                  {it.fast_date ?? formatDate(it.created_at)}
                  {it.in_team_fast ? " · dans le cadre du jeûne d'équipe" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
}

function messageOf(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Erreur inconnue";
}
