import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

async function computeAdminToken(): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(process.env.ADMIN_SECRET ?? ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(process.env.ADMIN_PASSWORD ?? ""),
  );
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin gate (HMAC cookie) ──
  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin") && pathname !== "/api/admin/login";
  if (isAdminPage || isAdminApi) {
    const cookie = request.cookies.get("admin_session")?.value;
    const token = await computeAdminToken();
    if (cookie !== token) {
      if (isAdminApi) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  // ── User auth gate (Supabase session) for / and /jeune/* ──
  const isProtected =
    pathname === "/" ||
    pathname.startsWith("/jeune");
  if (!isProtected) return NextResponse.next();

  const response = NextResponse.next();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: Record<string, unknown>) => {
          response.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: Record<string, unknown>) => {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Force re-login after 3 months
  const lastSignIn = auth.user.last_sign_in_at;
  const SESSION_MAX_MS = 90 * 24 * 60 * 60 * 1000;
  if (lastSignIn && Date.now() - new Date(lastSignIn).getTime() > SESSION_MAX_MS) {
    await sb.auth.signOut();
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Profile check (skip on /auth/complete-profile to avoid loop)
  const { data: profile } = await sb.from("profiles").select("id").eq("id", auth.user.id).maybeSingle();
  if (!profile) {
    return NextResponse.redirect(new URL("/auth/complete-profile", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/api/admin/:path*",
    "/jeune/:path*",
  ],
};
