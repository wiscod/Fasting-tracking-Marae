"use client";

import { FONT_STACK, type Tokens } from "@/lib/tokens";

export function Stat({
  t,
  k,
  v,
  bordered,
}: {
  t: Tokens;
  k: string;
  v: string | number;
  bordered?: boolean;
}) {
  return (
    <div
      style={{
        paddingLeft: bordered ? 14 : 0,
        borderLeft: bordered ? `1px solid ${t.line}` : "none",
        display: "flex",
        alignItems: "baseline",
        gap: 8,
      }}
    >
      <div
        style={{
          fontFamily: FONT_STACK,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: t.muted,
        }}
      >
        {k}
      </div>
      <div
        style={{
          fontFamily: FONT_STACK,
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1,
          color: t.ink,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {v}
      </div>
    </div>
  );
}
