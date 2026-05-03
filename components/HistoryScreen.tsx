"use client";

import { useEffect, useState } from "react";
import { listMyEntries } from "@/lib/data";
import { getDeviceId } from "@/lib/deviceId";
import { fmtMin } from "@/lib/format";
import { FONT_STACK, type Tokens } from "@/lib/tokens";
import type { FastEntry, FastEntrySubject, WeeklyFast } from "@/lib/types";

type Row = {
  entry: FastEntry;
  weeklyFast: WeeklyFast;
  subjects: FastEntrySubject[];
};

export function HistoryScreen({ t }: { t: Tokens }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await listMyEntries(getDeviceId());
        if (cancelled) return;
        setRows(data);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(messageOf(e));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: "8px 24px 28px" }}>
      <div style={{ padding: "16px 0 8px" }}>
        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: t.muted,
          }}
        >
          Historique
        </div>
        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 48,
            fontWeight: 800,
            lineHeight: 1,
            color: t.ink,
            letterSpacing: "-0.035em",
            marginTop: 6,
          }}
        >
          {rows?.length ?? 0}
          <span style={{ color: t.accent }}>
            {" "}
            semaine{(rows?.length ?? 0) > 1 ? "s" : ""}.
          </span>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            border: `1px solid oklch(0.65 0.18 25)`,
            borderRadius: 12,
            color: "oklch(0.55 0.18 25)",
            fontFamily: FONT_STACK,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : rows === null ? (
        <p style={{ color: t.muted, fontSize: 13 }}>Chargement…</p>
      ) : rows.length === 0 ? (
        <div
          style={{
            marginTop: 24,
            padding: "32px 0",
            textAlign: "center",
            border: `1px dashed ${t.line}`,
            borderRadius: 14,
            fontFamily: FONT_STACK,
            fontSize: 16,
            color: t.muted,
          }}
        >
          Rien à afficher pour l&apos;instant.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          {rows.map((r) => (
            <WeekRow key={r.entry.id} row={r} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function WeekRow({ row, t }: { row: Row; t: Tokens }) {
  const totalImp = row.subjects.reduce((s, x) => s + (x.intercessions || 0), 0);
  const totalMin = row.subjects.reduce(
    (s, x) => s + (x.prayer_minutes || 0),
    0,
  );

  const subs = [...row.subjects].sort((a, b) =>
    a.weekly_fast_subject_id.localeCompare(b.weekly_fast_subject_id),
  );

  return (
    <div style={{ padding: "16px 0", borderTop: `1px solid ${t.line}` }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "baseline",
        }}
      >
        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 22,
            fontWeight: 700,
            color: t.ink,
            letterSpacing: "-0.025em",
          }}
        >
          Sem{" "}
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {row.weeklyFast.week}
          </span>
          <span
            style={{
              fontFamily: FONT_STACK,
              fontSize: 11,
              color: t.muted,
              marginLeft: 8,
              letterSpacing: "0.06em",
            }}
          >
            {row.weeklyFast.year}
          </span>
        </div>
        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 11,
            color: t.muted,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {totalImp} imp · {fmtMin(totalMin)}
        </div>
      </div>

      {subs.length > 0 ? (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
          }}
        >
          {subs.map((d, i) => (
            <div
              key={d.id}
              style={{
                padding: "10px 12px",
                background: t.surface,
                border: `1px solid ${t.line}`,
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_STACK,
                  fontSize: 15,
                  fontWeight: 700,
                  color: t.accent,
                  lineHeight: 1,
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: FONT_STACK,
                  fontSize: 12,
                  color: t.ink,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {d.intercessions} imp
              </div>
              <div
                style={{
                  fontFamily: FONT_STACK,
                  fontSize: 12,
                  color: t.muted,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtMin(d.prayer_minutes)}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function messageOf(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Erreur inconnue";
}
