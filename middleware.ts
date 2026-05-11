import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function buildCspHeader(nonce: string): string {
  const isProd = process.env.NODE_ENV === "production";
  // In dev, keep unsafe-eval for Next.js HMR. In prod, use strict nonce + strict-dynamic.
  const scriptSrc = isProd
    ? `'nonce-${nonce}' 'strict-dynamic'`
    : `'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline'`;
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co"} wss://*.supabase.co https://accounts.google.com`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
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
    enc.encode("admin-session-token"),
  );
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  const csp = buildCspHeader(nonce);
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Forward nonce to the app so layouts can use it on <Script nonce={nonce}>
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

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
    return applySecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
  }

  // ── User auth gate (Supabase session) for / and /jeune/* ──
  const isProtected =
    pathname === "/" ||
    pathname.startsWith("/jeune");
  if (!isProtected) {
    return applySecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
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

  return applySecurityHeaders(response, nonce);
}

export const config = {
  matcher: [
    // Apply to all routes except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
