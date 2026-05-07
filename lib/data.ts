import { getSupabaseBrowser } from "./supabaseBrowser";
import type {
  FastEntry,
  FastEntrySubject,
  WeeklyFast,
  WeeklyFastSubject,
} from "./types";

async function getUserId(): Promise<string> {
  const sb = getSupabaseBrowser();
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new Error("Non authentifié");
  return data.user.id;
}

export async function getOrCreateWeeklyFast(
  year: number,
  week: number,
  opts?: { dirigeant?: boolean; create?: boolean },
): Promise<WeeklyFast | null> {
  const sb = getSupabaseBrowser();
  const isDirigent = opts?.dirigeant ?? false;
  const shouldCreate = opts?.create ?? !isDirigent; // auto-create for team fasts, not for dirigeant
  const existing = await sb
    .from("weekly_fasts")
    .select("*")
    .eq("year", year)
    .eq("week", week)
    .eq("is_dirigeant", isDirigent)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as WeeklyFast;
  if (!shouldCreate) return null;

  // Auth users can't insert weekly_fasts (RLS) — go through API route
  const res = await fetch("/api/weekly-fast/ensure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year, week, isDirigent }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Impossible de créer la semaine");
  }
  const data = await res.json();
  return data.weeklyFast as WeeklyFast;
}

export async function getWeeklyFastSubjects(
  weeklyFastId: string,
): Promise<WeeklyFastSubject[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("weekly_fast_subjects")
    .select("*")
    .eq("weekly_fast_id", weeklyFastId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WeeklyFastSubject[];
}

export async function getTeamFastEntry(
  weeklyFastId: string,
): Promise<{ entry: FastEntry | null; subjects: FastEntrySubject[] }> {
  const sb = getSupabaseBrowser();
  const userId = await getUserId();
  const { data: entry, error } = await sb
    .from("fast_entries")
    .select("*")
    .eq("user_id", userId)
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
  weeklyFastId: string;
  globalHours: number | null;
  subjects: SubjectInput[];
}): Promise<FastEntry> {
  const sb = getSupabaseBrowser();
  const userId = await getUserId();

  let entryId: string;
  const existing = await sb
    .from("fast_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("weekly_fast_id", args.weeklyFastId)
    .eq("kind", "team")
    .maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    entryId = existing.data.id;
    const upd = await sb
      .from("fast_entries")
      .update({ global_hours: args.globalHours })
      .eq("id", entryId);
    if (upd.error) throw upd.error;
  } else {
    const ins = await sb
      .from("fast_entries")
      .insert({
        user_id: userId,
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

// Liste unifiée : tous les jeûnes (équipe + perso) de l'utilisateur
export async function listMyFasts(): Promise<
  (FastEntry & { weekLabel: string | null })[]
> {
  const sb = getSupabaseBrowser();
  const userId = await getUserId();
  const { data: entries, error } = await sb
    .from("fast_entries")
    .select("*")
    .eq("user_id", userId)
    .order("fast_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const cast = (entries ?? []) as FastEntry[];
  const wfIds = [...new Set(cast.map((e) => e.weekly_fast_id).filter(Boolean) as string[])];
  let wfMap = new Map<string, { year: number; week: number }>();
  if (wfIds.length > 0) {
    const { data: wfs } = await sb
      .from("weekly_fasts")
      .select("id, year, week")
      .in("id", wfIds);
    wfMap = new Map((wfs ?? []).map((w: { id: string; year: number; week: number }) => [w.id, { year: w.year, week: w.week }]));
  }

  return cast.map((e) => ({
    ...e,
    weekLabel: e.weekly_fast_id
      ? (() => {
          const wf = wfMap.get(e.weekly_fast_id!);
          return wf ? `Sem ${wf.week} ${wf.year}` : null;
        })()
      : null,
  }));
}

export async function getPersonalFast(
  id: string,
): Promise<{ entry: FastEntry | null; subjects: FastEntrySubject[] }> {
  const sb = getSupabaseBrowser();
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
  title: string;
  fastDate: string | null;
  fastEndDate: string | null;
  fastType: string;
  globalHours: number | null;
  subjects: SubjectInput[];
}): Promise<FastEntry> {
  const sb = getSupabaseBrowser();
  const userId = await getUserId();
  let entryId: string;

  if (args.id) {
    entryId = args.id;
    const upd = await sb
      .from("fast_entries")
      .update({
        title: args.title,
        fast_date: args.fastDate,
        fast_end_date: args.fastEndDate,
        fast_type: args.fastType,
        in_team_fast: false,
        weekly_fast_id: null,
        global_hours: args.globalHours,
      })
      .eq("id", entryId);
    if (upd.error) throw upd.error;
  } else {
    const ins = await sb
      .from("fast_entries")
      .insert({
        user_id: userId,
        kind: "personal",
        title: args.title,
        fast_date: args.fastDate,
        fast_end_date: args.fastEndDate,
        fast_type: args.fastType,
        in_team_fast: false,
        weekly_fast_id: null,
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

export async function deletePersonalFast(id: string, createdAt: string): Promise<void> {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  if (ageMs > 7 * 24 * 60 * 60 * 1000) {
    throw new Error("Suppression impossible après 7 jours.");
  }
  const sb = getSupabaseBrowser();
  const { error } = await sb.from("fast_entries").delete().eq("id", id);
  if (error) throw error;
}

export function deleteEntryAdmin(entryId: string): Promise<void> {
  return fetchAdmin<void>("deleteEntry", { entryId });
}

// ─── Admin types (data fetched via API service_role) ─────────────────────────

export type WeeklyParticipant = {
  entryId: string;
  userId: string;
  userName: string | null;
  kind: "team" | "personal";
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

export type PersonSummary = {
  userId: string;
  userName: string | null;
  phone: string | null;
  isDirigent: boolean;
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

export type WeeklyAggregate = {
  year: number;
  week: number;
  label: string;
  teamCount: number;
  personalCount: number;
  totalImportunites: number;
  totalMinutes: number;
};

async function fetchAdmin<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/admin/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function getWeeklyParticipants(weeklyFastId: string): Promise<WeeklyParticipant[]> {
  return fetchAdmin<WeeklyParticipant[]>("getWeeklyParticipants", { weeklyFastId });
}

export function getAllPersons(): Promise<PersonSummary[]> {
  return fetchAdmin<PersonSummary[]>("getAllPersons");
}

export function getPersonHistory(userId: string): Promise<PersonHistory> {
  return fetchAdmin<PersonHistory>("getPersonHistory", { userId });
}

export function getWeeklyAggregates(
  fromYear: number,
  fromWeek: number,
  toYear: number,
  toWeek: number,
): Promise<WeeklyAggregate[]> {
  return fetchAdmin<WeeklyAggregate[]>("getWeeklyAggregates", {
    fromYear,
    fromWeek,
    toYear,
    toWeek,
  });
}
