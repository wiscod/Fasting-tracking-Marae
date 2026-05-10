"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { PhoneInput } from "@/components/PhoneInput";
import { setupNewKey } from "@/lib/crypto";

export default function SignupPage() {
  const router = useRouter();
  const sb = getSupabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [discipleshipMaker, setDiscipleshipMaker] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!firstName.trim()) return setError("Le prénom est obligatoire.");
    if (!phone) return setError("Le numéro de téléphone est invalide.");

    setLoading(true);
    const { data, error: signErr } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName.trim(), last_name: lastName.trim() || null, phone },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (signErr) {
      setLoading(false);
      setError(signErr.message);
      return;
    }

    // If session is null, email confirmation required
    if (!data.session) {
      setLoading(false);
      setPendingConfirm(true);
      return;
    }

    // Otherwise, insert profile immediately
    const { salt, wrappedKey } = await setupNewKey(password);
    const { error: profErr } = await sb.from("profiles").insert({
      id: data.user!.id,
      first_name: firstName.trim(),
      last_name: lastName.trim() || null,
      phone,
      discipleship_maker: discipleshipMaker.trim(),
      enc_salt: salt,
      enc_wrapped_key: wrappedKey,
    });
    setLoading(false);
    if (profErr) {
      setError(profErr.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (pendingConfirm) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-bold">Vérifie ton email</h1>
        <p className="text-sm text-slate-600">
          Un email de confirmation a été envoyé à <b>{email}</b>. Clique sur le lien pour activer ton compte, puis reviens
          te connecter.
        </p>
        <Link href="/auth/login" className="btn-primary text-center">Aller à la connexion</Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col items-center gap-3">
        <Image src="/logo.svg" alt="Logo" width={64} height={64} priority />
        <div className="text-center">
          <h1 className="text-2xl font-bold">Créer un compte</h1>
          <p className="mt-1 text-sm text-slate-500">Inscris-toi pour suivre tes jeûnes.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="label">Prénom *</label>
          <input className="input mt-1" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Nom (optionnel)</label>
          <input className="input mt-1" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div>
          <label className="label">Téléphone *</label>
          <div className="mt-1">
            <PhoneInput value={phone} onChange={setPhone} />
          </div>
        </div>
        <div>
          <label className="label">Faiseur de disciple (optionnel)</label>
          <input
            className="input mt-1"
            placeholder="Prénom et nom"
            value={discipleshipMaker}
            onChange={(e) => setDiscipleshipMaker(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">La personne qui te suit spirituellement.</p>
        </div>
        <div>
          <label className="label">Email *</label>
          <input
            className="input mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Mot de passe *</label>
          <input
            className="input mt-1"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-slate-500">8 caractères minimum.</p>
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Création…" : "Créer mon compte"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Déjà un compte ?{" "}
        <Link href="/auth/login" className="font-medium text-brand-600 hover:text-brand-700">
          Connecte-toi
        </Link>
      </p>
    </main>
  );
}
