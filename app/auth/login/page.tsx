"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { initKeyFromLogin, generateDataKey, setSessionDataKey } from "@/lib/crypto";

export default function LoginPage() {
  const router = useRouter();
  const sb = getSupabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data: signData, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    // Load encryption key for personal prayer subjects
    if (signData.user) {
      const { data: profile } = await sb.from("profiles").select("enc_salt, enc_wrapped_key").eq("id", signData.user.id).maybeSingle();
      if (profile?.enc_salt && profile?.enc_wrapped_key) {
        try { await initKeyFromLogin(password, profile.enc_salt, profile.enc_wrapped_key); } catch { /* key init failed, subjects will show as encrypted */ }
      } else {
        // No key yet (old account) — generate session-only key
        const dk = await generateDataKey();
        await setSessionDataKey(dk);
      }
    }
    setLoading(false);
    router.push("/");
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col items-center gap-3">
        <Image src="/logo.svg" alt="Logo" width={64} height={64} priority />
        <div className="text-center">
          <h1 className="text-2xl font-bold">Connexion</h1>
          <p className="mt-1 text-sm text-slate-500">Connecte-toi pour accéder à tes jeûnes.</p>
        </div>
      </div>

      <button type="button" onClick={handleGoogle} className="btn-secondary flex items-center justify-center gap-2">
        <span>Continuer avec Google</span>
      </button>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200" /> ou <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleEmail} className="flex flex-col gap-3">
        <div>
          <label className="label">Email</label>
          <input
            className="input mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Mot de passe</label>
          <input
            className="input mt-1"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
        <Link href="/auth/forgot-password" className="text-center text-xs text-brand-600 hover:text-brand-700">
          Mot de passe oublié ?
        </Link>
      </form>

      <p className="text-center text-sm text-slate-500">
        Pas encore de compte ?{" "}
        <Link href="/auth/signup" className="font-medium text-brand-600 hover:text-brand-700">
          Crée-en un
        </Link>
      </p>
    </main>
  );
}
