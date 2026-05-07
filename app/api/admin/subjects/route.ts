import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabaseServer";

type Payload = {
  weeklyFastId: string;
  subjects: { position: number; label: string }[];
};

function parsePayload(raw: unknown): Payload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.weeklyFastId !== "string" || obj.weeklyFastId === "") return null;
  if (!Array.isArray(obj.subjects)) return null;
  const subjects: { position: number; label: string }[] = [];
  for (const s of obj.subjects) {
    if (!s || typeof s !== "object") return null;
    const pos = (s as Record<string, unknown>).position;
    const label = (s as Record<string, unknown>).label;
    if (typeof pos !== "number" || !Number.isFinite(pos)) return null;
    if (typeof label !== "string") return null;
    subjects.push({ position: pos, label: label.slice(0, 255) });
  }
  return { weeklyFastId: obj.weeklyFastId, subjects };
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const body = parsePayload(raw);
  if (!body) {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const sb = getSupabaseService();

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
