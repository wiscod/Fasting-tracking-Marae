import { getSupabase } from "./supabase";
import type {
  FastEntry,
  FastEntrySubject,
  FastKind,
  WeeklyFast,
  WeeklyFastSubject,
} from "./types";

export async function getOrCreateWeeklyFast(
  year: number,
  week: number,
): Promise<WeeklyFast> {
  const sb = getSupabase();
  const existing = await sb
    .from("weekly_fasts")
    .select("*")
    .eq("year", year)
    .eq("week", week)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as WeeklyFast;

  const created = await sb
    .from("weekly_fasts")
    .insert({ year, week, title: `Jeûne d'équipe — Sem ${week}` })
    .select("*")
    .single();
  if (created.error) throw created.error;
  return created.data as WeeklyFast;
}

export async function getWeeklyFastSubjects(
  weeklyFastId: string,
): Promise<WeeklyFastSubject[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("weekly_fast_subjects")
    .select("*")
    .eq("weekly_fast_id", weeklyFastId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WeeklyFastSubject[];
}

export async function getTeamFastEntry(
  deviceId: string,
  weeklyFastId: string,
): Promise<{ entry: FastEntry | null; subjects: FastEntrySubject[] }> {
  const sb = getSupabase();
  const { data: entry, error } = await sb
    .from("fast_entries")
    .select("*")
    .eq("device_id", deviceId)
    .eq("weekly_fast_id", weeklyFastId)
    .eq("kind", "team")
    .maybeSingle();
  if (error) throw error;
  if (!entry) return { entry: null, subjects: [] };

  const { data: subs, error: subErr } = await sb
    .from("fast_entry_subjects")
    .select("*")
    .eq("fast_entry_id", entry.id)
    .order("position", { ascending: true });
  if (subErr) throw subErr;
  return {
    entry: entry as FastEntry,
    subjects: (subs ?? []) as FastEntrySubject[],
  };
}

export type SubjectInput = {
  weekly_fast_subject_id: string | null;
  custom_label: string | null;
  intercessions: number;
  hours: number;
  position: number;
};

export async function saveTeamFastEntry(args: {
  deviceId: string;
  userName: string | null;
  weeklyFastId: string;
  globalHours: number | null;
  subjects: SubjectInput[];
}): Promise<FastEntry> {
  const sb = getSupabase();

  let entryId: string;
  const existing = await sb
    .from("fast_entries")
    .select("id")
    .eq("device_id", args.deviceId)
    .eq("weekly_fast_id", args.weeklyFastId)
    .eq("kind", "team")
    .maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    entryId = existing.data.id;
    const upd = await sb
      .from("fast_entries")
      .update({
        user_name: args.userName,
        global_hours: args.globalHours,
      })
      .eq("id", entryId);
    if (upd.error) throw upd.error;
  } else {
    const ins = await sb
      .from("fast_entries")
      .insert({
        device_id: args.deviceId,
        user_name: args.userName,
        kind: "team",
        weekly_fast_id: args.weeklyFastId,
        in_team_fast: true,
        global_hours: args.globalHours,
      })
      .select("id")
      .single();
    if (ins.error) throw ins.error;
    entryId = ins.data.id;
  }

  const del = await sb
    .from("fast_entry_subjects")
    .delete()
    .eq("fast_entry_id", entryId);
  if (del.error) throw del.error;

  if (args.subjects.length > 0) {
    const rows = args.subjects.map((s) => ({ ...s, fast_entry_id: entryId }));
    const insSubs = await sb.from("fast_entry_subjects").insert(rows);
    if (insSubs.error) throw insSubs.error;
  }

  const finalEntry = await sb
    .from("fast_entries")
    .select("*")
    .eq("id", entryId)
    .single();
  if (finalEntry.error) throw finalEntry.error;
  return finalEntry.data as FastEntry;
}

export async function listPersonalFasts(
  deviceId: string,
): Promise<FastEntry[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("fast_entries")
    .select("*")
    .eq("device_id", deviceId)
    .eq("kind", "personal")
    .order("fast_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FastEntry[];
}

export async function getPersonalFast(
  id: string,
): Promise<{ entry: FastEntry | null; subjects: FastEntrySubject[] }> {
  const sb = getSupabase();
  const { data: entry, error } = await sb
    .from("fast_entries")
    .select("*")
    .eq("id", id)
    .eq("kind", "personal")
    .maybeSingle();
  if (error) throw error;
  if (!entry) return { entry: null, subjects: [] };
  const { data: subs, error: subErr } = await sb
    .from("fast_entry_subjects")
    .select("*")
    .eq("fast_entry_id", entry.id)
    .order("position", { ascending: true });
  if (subErr) throw subErr;
  return {
    entry: entry as FastEntry,
    subjects: (subs ?? []) as FastEntrySubject[],
  };
}

export async function savePersonalFast(args: {
  id?: string;
  deviceId: string;
  userName: string | null;
  title: string;
  fastDate: string | null;
  inTeamFast: boolean;
  weeklyFastId: string | null;
  globalHours: number | null;
  subjects: SubjectInput[];
}): Promise<FastEntry> {
  const sb = getSupabase();
  let entryId: string;

  if (args.id) {
    entryId = args.id;
    const upd = await sb
      .from("fast_entries")
      .update({
        user_name: args.userName,
        title: args.title,
        fast_date: args.fastDate,
        in_team_fast: args.inTeamFast,
        weekly_fast_id: args.inTeamFast ? args.weeklyFastId : null,
        global_hours: args.globalHours,
      })
      .eq("id", entryId);
    if (upd.error) throw upd.error;
  } else {
    const ins = await sb
      .from("fast_entries")
      .insert({
        device_id: args.deviceId,
        user_name: args.userName,
        kind: "personal",
        title: args.title,
        fast_date: args.fastDate,
        in_team_fast: args.inTeamFast,
        weekly_fast_id: args.inTeamFast ? args.weeklyFastId : null,
        global_hours: args.globalHours,
      })
      .select("id")
      .single();
    if (ins.error) throw ins.error;
    entryId = ins.data.id;
  }

  const del = await sb
    .from("fast_entry_subjects")
    .delete()
    .eq("fast_entry_id", entryId);
  if (del.error) throw del.error;

  if (args.subjects.length > 0) {
    const rows = args.subjects.map((s) => ({ ...s, fast_entry_id: entryId }));
    const insSubs = await sb.from("fast_entry_subjects").insert(rows);
    if (insSubs.error) throw insSubs.error;
  }

  const finalEntry = await sb
    .from("fast_entries")
    .select("*")
    .eq("id", entryId)
    .single();
  if (finalEntry.error) throw finalEntry.error;
  return finalEntry.data as FastEntry;
}

export async function deletePersonalFast(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("fast_entries").delete().eq("id", id);
  if (error) throw error;
}

export type WeeklyParticipant = {
  entryId: string;
  deviceId: string;
  userName: string | null;
  kind: FastKind;
  fastDate: string | null;
  globalMinutes: number | null;
  updatedAt: string;
  totalIntercessions: number;
  totalMinutes: number;
  bySubject: {
    weekly_fast_subject_id: string | null;
    custom_label: string | null;
    intercessions: number;
    minutes: number;
  }[];
};

export async function getWeeklyParticipants(
  weeklyFastId: string,
): Promise<WeeklyParticipant[]> {
  const sb = getSupabase();
  const { data: entries, error } = await sb
    .from("fast_entries")
    .select("*")
    .eq("weekly_fast_id", weeklyFastId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  if (!entries || entries.length === 0) return [];

  const ids = (entries as FastEntry[]).map((e) => e.id);
  const { data: subs, error: subErr } = await sb
    .from("fast_entry_subjects")
    .select("*")
    .in("fast_entry_id", ids);
  if (subErr) throw subErr;

  const subsByEntry = new Map<string, FastEntrySubject[]>();
  for (const s of (subs ?? []) as FastEntrySubject[]) {
    const list = subsByEntry.get(s.fast_entry_id) ?? [];
    list.push(s);
    subsByEntry.set(s.fast_entry_id, list);
  }

  return (entries as FastEntry[]).map((e) => {
    const entrySubs = subsByEntry.get(e.id) ?? [];
    const totalIntercessions = entrySubs.reduce(
      (acc, s) => acc + (s.intercessions || 0),
      0,
    );
    const perSubjectMinutes = entrySubs.reduce(
      (acc, s) => acc + Number(s.hours || 0),
      0,
    );
    const globalMinutes = e.global_hours != null ? Number(e.global_hours) : null;
    const totalMinutes =
      globalMinutes != null && Number.isFinite(globalMinutes)
        ? globalMinutes
        : perSubjectMinutes;
    return {
      entryId: e.id,
      deviceId: e.device_id,
      userName: e.user_name,
      kind: e.kind,
      fastDate: e.fast_date,
      globalMinutes,
      updatedAt: e.updated_at,
      totalIntercessions,
      totalMinutes,
      bySubject: entrySubs.map((s) => ({
        weekly_fast_subject_id: s.weekly_fast_subject_id,
        custom_label: s.custom_label,
        intercessions: s.intercessions || 0,
        minutes: Number(s.hours || 0),
      })),
    };
  });
}

// ─── Person summary ──────────────────────────────────────────────────────────

export type PersonSummary = {
  deviceId: string;
  userName: string | null;
  totalFasts: number;
  totalTeamFasts: number;
  totalPersonalFasts: number;
  totalImportunites: number;
  totalMinutes: number;
  lastSeen: string;
};

export type PersonHistory = {
  person: PersonSummary;
  entries: (WeeklyParticipant & { weekLabel: string | null; weeklyFastId: string | null })[];
  personalSubjects: string[];
};

export async function getAllPersons(): Promise<PersonSummary[]> {
  const sb = getSupabase();
  const { data: entries, error } = await sb
    .from("fast_entries")
    .select("id, device_id, user_name, kind, global_hours, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  if (!entries || entries.length === 0) return [];

  const ids = (entries as FastEntry[]).map((e) => e.id);
  const { data: subs } = await sb
    .from("fast_entry_subjects")
    .select("fast_entry_id, intercessions, hours")
    .in("fast_entry_id", ids);

  const subsByEntry = new Map<string, { intercessions: number; hours: number }[]>();
  for (const s of (subs ?? []) as FastEntrySubject[]) {
    const list = subsByEntry.get(s.fast_entry_id) ?? [];
    list.push(s);
    subsByEntry.set(s.fast_entry_id, list);
  }

  const byDevice = new Map<string, PersonSummary>();
  for (const e of entries as FastEntry[]) {
    const entrySubs = subsByEntry.get(e.id) ?? [];
    const imp = entrySubs.reduce((a, s) => a + (s.intercessions || 0), 0);
    const perSub = entrySubs.reduce((a, s) => a + Number(s.hours || 0), 0);
    const gm = e.global_hours != null ? Number(e.global_hours) : null;
    const min = gm != null && Number.isFinite(gm) ? gm : perSub;

    const existing = byDevice.get(e.device_id);
    if (existing) {
      existing.totalFasts += 1;
      existing.totalTeamFasts += e.kind === "team" ? 1 : 0;
      existing.totalPersonalFasts += e.kind === "personal" ? 1 : 0;
      existing.totalImportunites += imp;
      existing.totalMinutes += min;
      if (e.updated_at > existing.lastSeen) {
        existing.lastSeen = e.updated_at;
        if (e.user_name) existing.userName = e.user_name;
      }
    } else {
      byDevice.set(e.device_id, {
        deviceId: e.device_id,
        userName: e.user_name,
        totalFasts: 1,
        totalTeamFasts: e.kind === "team" ? 1 : 0,
        totalPersonalFasts: e.kind === "personal" ? 1 : 0,
        totalImportunites: imp,
        totalMinutes: min,
        lastSeen: e.updated_at,
      });
    }
  }

  return [...byDevice.values()].sort(
    (a, b) => b.totalImportunites - a.totalImportunites,
  );
}

export async function getPersonHistory(deviceId: string): Promise<PersonHistory> {
  const sb = getSupabase();
  const { data: entries, error } = await sb
    .from("fast_entries")
    .select("*")
    .eq("device_id", deviceId)
    .order("fast_date", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const castEntries = (entries ?? []) as FastEntry[];
  const ids = castEntries.map((e) => e.id);

  const [subsRes, wfRes] = await Promise.all([
    ids.length
      ? sb.from("fast_entry_subjects").select("*").in("fast_entry_id", ids)
      : { data: [], error: null },
    sb.from("weekly_fasts").select("id, year, week"),
  ]);
  if (subsRes.error) throw subsRes.error;

  const wfMap = new Map<string, { year: number; week: number }>();
  for (const wf of (wfRes.data ?? []) as WeeklyFast[]) {
    wfMap.set(wf.id, { year: wf.year, week: wf.week });
  }

  const subsByEntry = new Map<string, FastEntrySubject[]>();
  for (const s of (subsRes.data ?? []) as FastEntrySubject[]) {
    const list = subsByEntry.get(s.fast_entry_id) ?? [];
    list.push(s);
    subsByEntry.set(s.fast_entry_id, list);
  }

  let totalImportunites = 0;
  let totalMinutes = 0;
  let totalTeamFasts = 0;
  let totalPersonalFasts = 0;
  const personalSubjectsSet = new Set<string>();

  const mappedEntries = castEntries.map((e) => {
    const entrySubs = subsByEntry.get(e.id) ?? [];
    const imp = entrySubs.reduce((a, s) => a + (s.intercessions || 0), 0);
    const perSub = entrySubs.reduce((a, s) => a + Number(s.hours || 0), 0);
    const gm = e.global_hours != null ? Number(e.global_hours) : null;
    const min = gm != null && Number.isFinite(gm) ? gm : perSub;

    totalImportunites += imp;
    totalMinutes += min;
    if (e.kind === "team") totalTeamFasts++;
    else {
      totalPersonalFasts++;
      for (const s of entrySubs) {
        if (s.custom_label?.trim()) personalSubjectsSet.add(s.custom_label.trim());
      }
    }

    const wf = e.weekly_fast_id ? wfMap.get(e.weekly_fast_id) : null;
    const weekLabel = wf ? `Sem ${wf.week} (${wf.year})` : null;

    return {
      entryId: e.id,
      deviceId: e.device_id,
      userName: e.user_name,
      kind: e.kind,
      fastDate: e.fast_date,
      globalMinutes: gm,
      updatedAt: e.updated_at,
      totalIntercessions: imp,
      totalMinutes: min,
      weekLabel,
      weeklyFastId: e.weekly_fast_id,
      bySubject: entrySubs.map((s) => ({
        weekly_fast_subject_id: s.weekly_fast_subject_id,
        custom_label: s.custom_label,
        intercessions: s.intercessions || 0,
        minutes: Number(s.hours || 0),
      })),
    };
  });

  const lastEntry = castEntries[0];
  const person: PersonSummary = {
    deviceId,
    userName: castEntries.find((e) => e.user_name)?.user_name ?? null,
    totalFasts: castEntries.length,
    totalTeamFasts,
    totalPersonalFasts,
    totalImportunites,
    totalMinutes,
    lastSeen: lastEntry?.updated_at ?? "",
  };

  return {
    person,
    entries: mappedEntries,
    personalSubjects: [...personalSubjectsSet],
  };
}

// ─── Weekly aggregates for charts ────────────────────────────────────────────

export type WeeklyAggregate = {
  year: number;
  week: number;
  label: string;
  teamCount: number;
  personalCount: number;
  totalImportunites: number;
  totalMinutes: number;
};

export async function getWeeklyAggregates(
  fromYear: number,
  fromWeek: number,
  toYear: number,
  toWeek: number,
): Promise<WeeklyAggregate[]> {
  const sb = getSupabase();

  // Fetch all weekly_fasts in range
  const { data: wfs, error: wfErr } = await sb
    .from("weekly_fasts")
    .select("id, year, week");
  if (wfErr) throw wfErr;

  const inRange = (y: number, w: number) => {
    const from = fromYear * 100 + fromWeek;
    const to = toYear * 100 + toWeek;
    const cur = y * 100 + w;
    return cur >= from && cur <= to;
  };

  const wfsInRange = ((wfs ?? []) as WeeklyFast[]).filter((wf) =>
    inRange(wf.year, wf.week),
  );
  const wfIds = wfsInRange.map((wf) => wf.id);
  const wfById = new Map(wfsInRange.map((wf) => [wf.id, wf]));

  // Fetch all entries linked to these weekly_fasts
  const { data: entries, error: eErr } = await sb
    .from("fast_entries")
    .select("id, device_id, kind, global_hours, weekly_fast_id, fast_date")
    .in("weekly_fast_id", wfIds.length ? wfIds : ["none"]);
  if (eErr) throw eErr;

  const castEntries = (entries ?? []) as FastEntry[];
  const ids = castEntries.map((e) => e.id);
  const { data: subs } = ids.length
    ? await sb
        .from("fast_entry_subjects")
        .select("fast_entry_id, intercessions, hours")
        .in("fast_entry_id", ids)
    : { data: [] };

  const subsByEntry = new Map<string, { intercessions: number; hours: number }[]>();
  for (const s of (subs ?? []) as FastEntrySubject[]) {
    const list = subsByEntry.get(s.fast_entry_id) ?? [];
    list.push(s);
    subsByEntry.set(s.fast_entry_id, list);
  }

  // Build aggregates keyed by "year-week"
  const aggMap = new Map<string, WeeklyAggregate>();

  // Init slots for all weeks in range
  for (const wf of wfsInRange) {
    const key = `${wf.year}-${wf.week}`;
    if (!aggMap.has(key)) {
      aggMap.set(key, {
        year: wf.year,
        week: wf.week,
        label: `S${wf.week}`,
        teamCount: 0,
        personalCount: 0,
        totalImportunites: 0,
        totalMinutes: 0,
      });
    }
  }

  for (const e of castEntries) {
    const wf = e.weekly_fast_id ? wfById.get(e.weekly_fast_id) : null;
    if (!wf) continue;
    const key = `${wf.year}-${wf.week}`;
    const agg = aggMap.get(key);
    if (!agg) continue;

    const entrySubs = subsByEntry.get(e.id) ?? [];
    const imp = entrySubs.reduce((a, s) => a + (s.intercessions || 0), 0);
    const perSub = entrySubs.reduce((a, s) => a + Number(s.hours || 0), 0);
    const gm = e.global_hours != null ? Number(e.global_hours) : null;
    const min = gm != null && Number.isFinite(gm) ? gm : perSub;

    if (e.kind === "team") agg.teamCount++;
    else agg.personalCount++;
    agg.totalImportunites += imp;
    agg.totalMinutes += min;
  }

  return [...aggMap.values()].sort((a, b) => {
    const ak = a.year * 100 + a.week;
    const bk = b.year * 100 + b.week;
    return ak - bk;
  });
}
