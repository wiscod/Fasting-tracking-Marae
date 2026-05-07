import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const sb = getSupabaseServer();

  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }
  }

  // Check profile
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/auth/login", url.origin));

  const { data: profile } = await sb.from("profiles").select("id").eq("id", auth.user.id).maybeSingle();
  if (!profile) {
    return NextResponse.redirect(new URL("/auth/complete-profile", url.origin));
  }
  return NextResponse.redirect(new URL("/", url.origin));
}
