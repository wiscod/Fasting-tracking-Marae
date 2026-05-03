"use client";

import { useEffect, useMemo, useState } from "react";
import { CompactNum } from "./CompactNum";
import { Stat } from "./Stat";
import { SubjectCard } from "./SubjectCard";
import { WeekSwitcher, type Wk } from "./WeekSwitcher";
import {
  getEntrySubjects,
  getOrCreateEntry,
  getOrCreateWeeklyFast,
  getWeeklyFastSubjects,
  updateUserName,
  upsertSubjectValue,
} from "@/lib/data";
import { getDeviceId, getStoredName, setStoredName } from "@/lib/deviceId";
import { fmtMin, prevWeek } from "@/lib/format";
import { FONT_STACK, type Tokens } from "@/lib/tokens";
import type { FastEntry, FastEntrySubject, WeeklyFastSubject } from "@/lib/types";
import { getIsoWeek } from "@/lib/week";

type Status = "loading" | "ready" | "saving" | "error";

export function HomeScreen({ t }: { t: Tokens }) {
  const cur: Wk = useMemo(() => getIsoWeek(), []);
  const prev: Wk = useMemo(() => prevWeek(cur.year, cur.week), [cur]);

  const [wk, setWk] = useState<Wk>(cur);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<WeeklyFastSubject[]>([]);
  const [entry, setEntry] = useState<FastEntry | null>(null);
  const [values, setValues] = useState<Record<string, FastEntrySubject>>({});
  const [name, setName] = useState("");

  useEffect(() => {
    setName(getStoredName());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      setError(null);
      try {
        const wf = await getOrCreateWeeklyFast(wk.year, wk.week);
        const subs = await getWeeklyFastSubjects(wf.id);
        const deviceId = getDeviceId();
        const storedName = getStoredName().trim() || null;
        const ent = await getOrCreateEntry(deviceId, wf.id, storedName);
        const entSubs = await getEntrySubjects(ent.id);
        if (cancelled) return;
        setSubjects(subs);
        setEntry(ent);
        const map: Record<string, FastEntrySubject> = {};
        for (const s of entSubs) map[s.weekly_fast_subject_id] = s;
        setValues(map);
        setStatus("ready");
      } catch (e: unknown) {
        if (cancelled) return;
        setError(messageOf(e));
        setStatus("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [wk.year, wk.week]);

  const totalImp = subjects.reduce(
    (s, x) => s + (values[x.id]?.intercessions ?? 0),
    0,
  );
  const totalMin = subjects.reduce(
    (s, x) => s + (values[x.id]?.prayer_minutes ?? 0),
    0,
  );

  async function onSubjectChange(
    subjectId: string,
    field: "intercessions" | "prayer_minutes",
    value: number,
  ) {
    if (!entry) return;
    setValues((vs) => ({
      ...vs,
      [subjectId]: {
        ...(vs[subjectId] ?? {
          id: "tmp",
          fast_entry_id: entry.id,
          weekly_fast_subject_id: subjectId,
          intercessions: 0,
          prayer_minutes: 0,
        }),
        [field]: value,
      },
    }));
    try {
      setStatus("saving");
      await upsertSubjectValue(entry.id, subjectId, field, value);
      setStatus("ready");
    } catch (e: unknown) {
      setError(messageOf(e));
      setStatus("error");
    }
  }

  async function onNameBlur() {
    const trimmed = name.trim();
    setStoredName(trimmed);
    if (entry) {
      try {
        await updateUserName(entry.id, trimmed || null);
      } catch {
        // ignore
      }
    }
  }

  return (
    <div style={{ padding: "4px 22px 24px" }}>
      <div
        style={{
          padding: "10px 0 6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 14,
        }}
      >
        <div>
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
            Enregistrer
          </div>
          <div
            style={{
              fontFamily: FONT_STACK,
              fontSize: 32,
              fontWeight: 800,
              lineHeight: 1,
              color: t.ink,
              letterSpacing: "-0.03em",
              marginTop: 2,
              whiteSpace: "nowrap",
            }}
          >
            Cette <span style={{ color: t.accent }}>semaine.</span>
          </div>
        </div>
      </div>

      <WeekSwitcher t={t} wk={wk} cur={cur} prev={prev} onChange={setWk} />

      <div
        style={{
          marginTop: 10,
          padding: "12px 0",
          borderTop: `1px solid ${t.line}`,
          borderBottom: `1px solid ${t.line}`,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
        }}
      >
        <Stat t={t} k="Importunités" v={totalImp} />
        <Stat t={t} k="Prière" v={fmtMin(totalMin)} bordered />
      </div>

      {status === "loading" ? (
        <p style={{ marginTop: 16, color: t.muted, fontSize: 13 }}>
          Chargement…
        </p>
      ) : subjects.length === 0 ? (
        <p style={{ marginTop: 16, color: t.muted, fontSize: 13 }}>
          Pas encore de sujets pour cette semaine. L&apos;admin doit en ajouter
          dans Supabase.
        </p>
      ) : (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {subjects.map((s) => (
            <SubjectCard
              key={s.id}
              t={t}
              subject={s}
              intercessions={values[s.id]?.intercessions ?? 0}
              prayerMinutes={values[s.id]?.prayer_minutes ?? 0}
              onChange={(field, v) => onSubjectChange(s.id, field, v)}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <CompactNumName t={t} value={name} onChange={setName} onBlur={onNameBlur} />
      </div>

      <div
        style={{
          marginTop: 14,
          textAlign: "center",
          fontFamily: FONT_STACK,
          fontSize: 13,
          color: t.muted,
        }}
      >
        {status === "saving"
          ? "Enregistrement…"
          : status === "error"
            ? error || "Erreur d'enregistrement"
            : "Sauvegardé automatiquement."}
      </div>
    </div>
  );
}

function CompactNumName({
  t,
  value,
  onChange,
  onBlur,
}: {
  t: Tokens;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        padding: "8px 12px",
        background: t.surface,
        border: `1px solid ${t.line}`,
        borderRadius: 12,
      }}
    >
      <span
        style={{
          fontFamily: FONT_STACK,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: t.muted,
        }}
      >
        Toi
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Ton prénom"
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: FONT_STACK,
          fontSize: 14,
          fontWeight: 500,
          color: t.ink,
          padding: 0,
        }}
      />
    </label>
  );
}

function messageOf(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Erreur inconnue";
}
