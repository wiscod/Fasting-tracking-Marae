"use client";

import { CompactNum } from "./CompactNum";
import { FONT_STACK, type Tokens } from "@/lib/tokens";
import type { WeeklyFastSubject } from "@/lib/types";

export function SubjectCard({
  t,
  subject,
  intercessions,
  prayerMinutes,
  onChange,
}: {
  t: Tokens;
  subject: WeeklyFastSubject;
  intercessions: number;
  prayerMinutes: number;
  onChange: (field: "intercessions" | "prayer_minutes", value: number) => void;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        background: t.surface,
        border: `1px solid ${t.line}`,
        borderRadius: 12,
        display: "grid",
        gridTemplateColumns: "20px 1fr",
        columnGap: 10,
        alignItems: "start",
      }}
    >
      <div
        style={{
          fontFamily: FONT_STACK,
          fontSize: 18,
          fontWeight: 700,
          lineHeight: 1.05,
          color: t.accent,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
          marginTop: 1,
        }}
      >
        {subject.position}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: t.muted,
          }}
        >
          Sujet {subject.position}
        </div>
        <div
          style={{
            marginTop: 3,
            fontFamily: FONT_STACK,
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.35,
            color: t.ink,
            letterSpacing: "-0.005em",
            textWrap: "pretty",
          }}
        >
          {subject.label}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <CompactNum
            t={t}
            label="Imp."
            value={intercessions}
            onChange={(v) => onChange("intercessions", v)}
          />
          <CompactNum
            t={t}
            label="Prière"
            suffix="min"
            value={prayerMinutes}
            onChange={(v) => onChange("prayer_minutes", v)}
          />
        </div>
      </div>
    </div>
  );
}
