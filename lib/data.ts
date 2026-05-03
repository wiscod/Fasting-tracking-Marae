import { getSupabase } from "./supabase";
import type {
  FastEntry,
  FastEntrySubject,
  SubjectValues,
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
    .insert({ year, week, title: `Sem ${week}` })
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

export async function getOrCreateEntry(
  deviceId: string,
  weeklyFastId: string,
  userName: string | null,
): Promise<FastEntry> {
  const sb = getSupabase();
  const existing = await sb
    .from("fast_entries")
    .select("*")
    .eq("device_id", deviceId)
    .eq("weekly_fast_id", weeklyFastId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as FastEntry;

  const created = await sb
    .from("fast_entries")
    .insert({
      device_id: deviceId,
      user_name: userName,
      weekly_fast_id: weeklyFastId,
    })
    .select("*")
    .single();
  if (created.error) throw created.error;
  return created.data as FastEntry;
}

export async function getEntrySubjects(
  fastEntryId: string,
): Promise<FastEntrySubject[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("fast_entry_subjects")
    .select("*")
    .eq("fast_entry_id", fastEntryId);
  if (error) throw error;
  return (data ?? []) as FastEntrySubject[];
}

export async function upsertSubjectValue(
  fastEntryId: string,
  weeklyFastSubjectId: string,
  field: "intercessions" | "prayer_minutes",
  value: number,
): Promise<void> {
  const sb = getSupabase();
  const existing = await sb
    .from("fast_entry_subjects")
    .select("id, intercessions, prayer_minutes")
    .eq("fast_entry_id", fastEntryId)
    .eq("weekly_fast_subject_id", weeklyFastSubjectId)
    .maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    const upd = await sb
      .from("fast_entry_subjects")
      .update({ [field]: value })
      .eq("id", existing.data.id);
    if (upd.error) throw upd.error;
    return;
  }

  const ins = await sb.from("fast_entry_subjects").insert({
    fast_entry_id: fastEntryId,
    weekly_fast_subject_id: weeklyFastSubjectId,
    intercessions: field === "intercessions" ? value : 0,
    prayer_minutes: field === "prayer_minutes" ? value : 0,
  });
  if (ins.error) throw ins.error;
}

export async function updateUserName(
  fastEntryId: string,
  userName: string | null,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("fast_entries")
    .update({ user_name: userName })
    .eq("id", fastEntryId);
  if (error) throw error;
}

export async function listMyEntries(
  deviceId: string,
): Promise<{ entry: FastEntry; weeklyFast: WeeklyFast; subjects: FastEntrySubject[] }[]> {
  const sb = getSupabase();
  const { data: entries, error } = await sb
    .from("fast_entries")
    .select("*, weekly_fast:weekly_fasts(*)")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!entries || entries.length === 0) return [];

  const ids = entries.map((e: { id: string }) => e.id);
  const { data: subs, error: subErr } = await sb
    .from("fast_entry_subjects")
    .select("*")
    .in("fast_entry_id", ids);
  if (subErr) throw subErr;

  const byEntry = new Map<string, FastEntrySubject[]>();
  for (const s of (subs ?? []) as FastEntrySubject[]) {
    const arr = byEntry.get(s.fast_entry_id) ?? [];
    arr.push(s);
    byEntry.set(s.fast_entry_id, arr);
  }

  return entries.map((e) => {
    const { weekly_fast, ...entry } = e as FastEntry & {
      weekly_fast: WeeklyFast;
    };
    return {
      entry: entry as FastEntry,
      weeklyFast: weekly_fast,
      subjects: byEntry.get(entry.id) ?? [],
    };
  });
}

export type TeamMember = {
  device_id: string;
  user_name: string | null;
  values: Record<string, SubjectValues>;
};

export async function getTeamForWeek(
  weeklyFastId: string,
): Promise<TeamMember[]> {
  const sb = getSupabase();
  const { data: entries, error } = await sb
    .from("fast_entries")
    .select("id, device_id, user_name")
    .eq("weekly_fast_id", weeklyFastId);
  if (error) throw error;
  if (!entries || entries.length === 0) return [];

  const ids = entries.map((e) => e.id);
  const { data: subs, error: subErr } = await sb
    .from("fast_entry_subjects")
    .select("fast_entry_id, weekly_fast_subject_id, intercessions, prayer_minutes")
    .in("fast_entry_id", ids);
  if (subErr) throw subErr;

  const byEntry = new Map<string, Record<string, SubjectValues>>();
  for (const s of (subs ?? []) as FastEntrySubject[]) {
    const map = byEntry.get(s.fast_entry_id) ?? {};
    map[s.weekly_fast_subject_id] = {
      intercessions: s.intercessions,
      prayerMinutes: s.prayer_minutes,
    };
    byEntry.set(s.fast_entry_id, map);
  }

  return entries.map((e) => ({
    device_id: e.device_id as string,
    user_name: (e.user_name as string | null) ?? null,
    values: byEntry.get(e.id as string) ?? {},
  }));
}
