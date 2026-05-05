import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Payload = {
  weeklyFastId: string;
  subjects: { position: number; label: string }[];
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Payload | null;
  if (!body?.weeklyFastId) {
    return NextResponse.json({ error: "weeklyFastId requis" }, { status: 400 });
  }

  const sb = getSupabase();

  const { error: delError } = await sb
    .from("weekly_fast_subjects")
    .delete()
    .eq("weekly_fast_id", body.weeklyFastId);
  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  if (body.subjects.length > 0) {
    const rows = body.subjects.map((s) => ({
      weekly_fast_id: body.weeklyFastId,
      position: s.position,
      label: s.label,
    }));
    const { error: insError } = await sb.from("weekly_fast_subjects").insert(rows);
    if (insError) {
      return NextResponse.json({ error: insError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
