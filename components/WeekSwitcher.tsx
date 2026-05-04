"use client";

import { FONT_STACK, type Tokens } from "@/lib/tokens";

export type Wk = { year: number; week: number };

export function WeekSwitcher({
  t,
  wk,
  cur,
  prev,
  onChange,
}: {
  t: Tokens;
  wk: Wk;
  cur: Wk;
  prev: Wk;
  onChange: (w: Wk) => void;
}) {
  const isCur = wk.year === cur.year && wk.week === cur.week;
  const isPrev = wk.year === prev.year && wk.week === prev.week;

  return (
    <div
      style={{
        marginTop: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 10px",
        background: t.surface,
        border: `1px solid ${t.line}`,
        borderRadius: 12,
      }}
    >
      <button
        type="button"
        onClick={() => isCur && onChange(prev)}
        disabled={!isCur}
        style={arrowBtn(t, isCur)}
        aria-label="Semaine précédente"
      >
        ←
      </button>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: t.muted,
          }}
        >
          {isCur ? "Semaine courante" : "Semaine précédente"}
        </div>
        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.05,
            color: t.ink,
            letterSpacing: "-0.02em",
            marginTop: 1,
          }}
        >
          Sem{" "}
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{wk.week}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => isPrev && onChange(cur)}
        disabled={!isPrev}
        style={arrowBtn(t, isPrev)}
        aria-label="Semaine suivante"
      >
        →
      </button>
    </div>
  );
}

function arrowBtn(t: Tokens, enabled: boolean): React.CSSProperties {
  return {
    all: "unset",
    cursor: enabled ? "pointer" : "not-allowed",
    width: 30,
    height: 30,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT_STACK,
    fontSize: 16,
    fontWeight: 600,
    color: enabled ? t.ink : t.line,
    background: enabled
      ? `color-mix(in oklch, ${t.ink} 5%, transparent)`
      : "transparent",
  };
}
