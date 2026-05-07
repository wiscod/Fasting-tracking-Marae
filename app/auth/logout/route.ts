import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  const sb = getSupabaseServer();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/auth/login", new URL(request.url).origin), { status: 303 });
}
