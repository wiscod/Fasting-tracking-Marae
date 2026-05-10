"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function ForgotPasswordPage() {
  const sb = getSupabaseBrowser();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-4 py-8">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo.svg" alt="Logo" width={64} height={64} priority />
        </div>
        <h1 className="text-2xl font-bold">Email envoyé</h1>
        <p className="text-sm text-slate-600">
          Un lien de réinitialisation a été envoyé à <b>{email}</b>. Clique dessus pour choisir un nouveau mot de passe.
        </p>
        <p className="text-xs text-slate-400">
          Note : tes sujets de prière chiffrés ne seront plus accessibles après la réinitialisation (sécurité E2E).
        </p>
        <Link href="/auth/login" className="btn-secondary text-center">Retour à la connexion</Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col items-center gap-3">
        <Image src="/logo.svg" alt="Logo" width={64} height={64} priority />
        <div className="text-center">
          <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-slate-500">Saisis ton email pour recevoir un lien de réinitialisation.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Envoi…" : "Envoyer le lien"}
        </button>
      </form>
      <Link href="/auth/login" className="text-center text-sm text-slate-500 hover:text-slate-700">
        ← Retour à la connexion
      </Link>
    </main>
  );
}
