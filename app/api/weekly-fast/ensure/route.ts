import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseService } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const sb = getSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const body = await req.json();
  const { year, week, isDirigent } = body;
  if (typeof year !== "number" || typeof week !== "number") {
    return NextResponse.json({ error: "year/week requis" }, { status: 400 });
  }
  const isDir = isDirigent === true;

  const service = getSupabaseService();
  const existing = await service
    .from("weekly_fasts")
    .select("*")
    .eq("year", year)
    .eq("week", week)
    .eq("is_dirigeant", isDir)
    .maybeSingle();
  if (existing.error) {
    return NextResponse.json({ error: existing.error.message }, { status: 500 });
  }
  if (existing.data) {
    return NextResponse.json({ weeklyFast: existing.data });
  }
  const title = isDir
    ? `Jeûne des dirigeants — Sem ${week}`
    : `Jeûne d'équipe — Sem ${week}`;
  const created = await service
    .from("weekly_fasts")
    .insert({ year, week, title, is_dirigeant: isDir })
    .select("*")
    .single();
  if (created.error) {
    return NextResponse.json({ error: created.error.message }, { status: 500 });
  }
  return NextResponse.json({ weeklyFast: created.data });
}
