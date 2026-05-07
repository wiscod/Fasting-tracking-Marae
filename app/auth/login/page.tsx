"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

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
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
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
