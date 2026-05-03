"use client";

import { useEffect, useState } from "react";
import { FONT_STACK, type Tokens } from "@/lib/tokens";

export function CompactNum({
  t,
  label,
  suffix,
  value,
  onChange,
}: {
  t: Tokens;
  label: string;
  suffix?: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [str, setStr] = useState(value ? String(value) : "");
  useEffect(() => {
    setStr(value ? String(value) : "");
  }, [value]);

  return (
    <label
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 6,
        padding: "6px 10px",
        background: t.paper,
        border: `1px solid ${t.line}`,
        borderRadius: 10,
        flex: 1,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: FONT_STACK,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: t.muted,
        }}
      >
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        value={str}
        placeholder="0"
        onChange={(e) => {
          const v = e.target.value;
          setStr(v);
          const n = v === "" ? 0 : Math.max(0, parseInt(v, 10) || 0);
          onChange(n);
        }}
        style={{
          flex: 1,
          minWidth: 0,
          width: "100%",
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: FONT_STACK,
          fontSize: 18,
          fontWeight: 600,
          lineHeight: 1,
          color: t.ink,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.01em",
          textAlign: "right",
          colorScheme: t.dark ? "dark" : "light",
          MozAppearance: "textfield",
          padding: 0,
        }}
      />
      {suffix ? (
        <span
          style={{
            fontFamily: FONT_STACK,
            fontSize: 11,
            color: t.muted,
          }}
        >
          {suffix}
        </span>
      ) : null}
    </label>
  );
}
