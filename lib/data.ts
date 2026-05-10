import { getSupabaseBrowser } from "./supabaseBrowser";
import { getSessionDataKey, encryptLabel, decryptLabel, isEncrypted } from "./crypto";
import type {
  Croisade,
  CroisadeSubject,
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

export async function getCroisadeSubjects(
  croisadeId: string,
): Promise<CroisadeSubject[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("croisade_subjects")
    .select("*")
    .eq("croisade_id", croisadeId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CroisadeSubject[];
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
  croisade_subject_id?: string | null;
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
    .eq("user_id", userId);
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

  const withLabel = cast.map((e) => {
    const wf = e.weekly_fast_id ? wfMap.get(e.weekly_fast_id!) : undefined;
    return {
      ...e,
      weekLabel: wf ? `Sem ${wf.week} ${wf.year}` : null,
      _sortDate: e.fast_date
        ? e.fast_date
        : wf
        ? isoWeekMonday(wf.year, wf.week)
        : e.created_at.slice(0, 10),
    };
  });

  withLabel.sort((a, b) => a._sortDate.localeCompare(b._sortDate));

  return withLabel.map(({ _sortDate: _, ...rest }) => rest);
}

function isoWeekMonday(year: number, week: number): string {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dow + 1 + (week - 1) * 7);
  return monday.toISOString().slice(0, 10);
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
  const dataKey = await getSessionDataKey();
  const subjects = await Promise.all(((subs ?? []) as FastEntrySubject[]).map(async (s) => {
    if (s.custom_label && isEncrypted(s.custom_label) && dataKey) {
      return { ...s, custom_label: (await decryptLabel(s.custom_label, dataKey)) ?? "[Sujet chiffré]" };
    }
    return s;
  }));
  return { entry: entry as FastEntry, subjects };
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
    const dataKey = await getSessionDataKey();
    const rows = await Promise.all(args.subjects.map(async (s) => {
      let label = s.custom_label;
      if (label && dataKey) label = await encryptLabel(label, dataKey);
      return { ...s, custom_label: label, fast_entry_id: entryId };
    }));
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

// ─── Admin types (data fetched via API service_role) ─────────────────────────────────────────────

export type WeeklyParticipant = {
  entryId: string;
  userId: string;
  userName: string | null;
  kind: "team" | "personal";
  fastDate: string | null;
  fastEndDate: string | null;
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
  totalDays: number;
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

async function fetchAdmin<T>(action: string, body: Record<string, unknown> = {}, endpoint = "/api/admin/data"): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

function fetchAdminCroisades<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  return fetchAdmin<T>(action, body, "/api/admin/croisades");
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

// ─── Croisades ────────────────────────────────────────────────────────────────────────────────

export type CroisadeStats = {
  totalEntries: number;
  totalMinutes: number;
  totalIntercessions: number;
  participants: number;
};

export async function getActiveCroisade(
  date?: string,
  isDirigent = false,
): Promise<Croisade | null> {
  const sb = getSupabaseBrowser();
  const today = date ?? new Date().toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("croisades")
    .select("*")
    .eq("is_dirigeant", isDirigent)
    .lte("start_date", today)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .eq("is_active", true)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Croisade | null;
}

export function getAllCroisades(): Promise<Croisade[]> {
  return fetchAdminCroisades<Croisade[]>("getAllCroisades");
}

export function createCroisade(args: {
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  is_dirigeant: boolean;
}): Promise<Croisade> {
  return fetchAdminCroisades<Croisade>("createCroisade", args as unknown as Record<string, unknown>);
}

export function updateCroisade(args: {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
}): Promise<Croisade> {
  return fetchAdminCroisades<Croisade>("updateCroisade", args as unknown as Record<string, unknown>);
}

export function closeCroisade(id: string): Promise<void> {
  return fetchAdminCroisades<void>("closeCroisade", { id });
}

export function reopenCroisade(id: string): Promise<void> {
  return fetchAdminCroisades<void>("reopenCroisade", { id });
}

export function getCroisadeStats(id: string): Promise<CroisadeStats> {
  return fetchAdminCroisades<CroisadeStats>("getCroisadeStats", { id });
}

export function getCroisadeSubjectsAdmin(id: string): Promise<CroisadeSubject[]> {
  return fetchAdminCroisades<CroisadeSubject[]>("getCroisadeSubjects", { id });
}

export function saveCroisadeSubjects(
  id: string,
  subjects: { position: number; label: string }[],
): Promise<void> {
  return fetchAdminCroisades<void>("saveCroisadeSubjects", { id, subjects });
}

export type CroisadeFastItem = FastEntry & { weekLabel: string | null };

export async function getMyCroisadeFasts(croisade: Croisade): Promise<CroisadeFastItem[]> {
  const sb = getSupabaseBrowser();
  const userId = await getUserId();

  // Only show fasts that have at least one subject from this croisade
  const { data: croisadeSubs } = await sb
    .from("croisade_subjects")
    .select("id")
    .eq("croisade_id", croisade.id);
  const croisadeSubIds = (croisadeSubs ?? []).map((s: { id: string }) => s.id);
  if (croisadeSubIds.length === 0) return [];

  const { data: matchingSubs } = await sb
    .from("fast_entry_subjects")
    .select("fast_entry_id")
    .in("croisade_subject_id", croisadeSubIds);
  const entryIds = [...new Set((matchingSubs ?? []).map((s: { fast_entry_id: string }) => s.fast_entry_id))];
  if (entryIds.length === 0) return [];

  const { data: entries, error } = await sb
    .from("fast_entries")
    .select("*")
    .eq("user_id", userId)
    .in("id", entryIds)
    .order("fast_date", { ascending: true });
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

  return cast.map((e) => {
    const wf = e.weekly_fast_id ? wfMap.get(e.weekly_fast_id!) : undefined;
    return { ...e, weekLabel: wf ? `Sem ${wf.week} ${wf.year}` : null };
  });
}
