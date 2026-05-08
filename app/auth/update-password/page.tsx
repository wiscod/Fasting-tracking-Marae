"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { rewrapKey, setupKeyAfterReset } from "@/lib/crypto";

function UpdatePasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const sb = getSupabaseBrowser();

  // type=recovery → came from forgot-password email link
  const isRecovery = params.get("type") === "recovery";

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // In recovery mode, Supabase exchanges the token from the URL automatically on mount
  useEffect(() => {
    if (isRecovery) {
      sb.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          // Session is now active — user can set a new password
        }
      });
    }
  }, [isRecovery, sb]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) { setError("Le mot de passe doit comporter au moins 8 caractères."); return; }
    if (newPassword !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);

    try {
      if (isRecovery) {
        // Password reset via email — update password, generate new data key
        const { error: updErr } = await sb.auth.updateUser({ password: newPassword });
        if (updErr) throw updErr;
        await setupKeyAfterReset(newPassword);
        // Save new key to profile
        const { data: auth } = await sb.auth.getUser();
        if (auth.user) {
          const { setupNewKey } = await import("@/lib/crypto");
          const { salt, wrappedKey } = await setupNewKey(newPassword);
          await sb.from("profiles").update({ enc_salt: salt, enc_wrapped_key: wrappedKey }).eq("id", auth.user.id);
        }
      } else {
        // Normal password change — re-auth first, then re-wrap existing data key
        const { data: auth } = await sb.auth.getUser();
        if (!auth.user?.email) throw new Error("Session invalide.");
        // Verify old password
        const { error: reAuthErr } = await sb.auth.signInWithPassword({ email: auth.user.email, password: oldPassword });
        if (reAuthErr) throw new Error("Ancien mot de passe incorrect.");
        // Load existing wrapped key
        const { data: profile } = await sb.from("profiles").select("enc_salt, enc_wrapped_key").eq("id", auth.user.id).maybeSingle();
        // Update password
        const { error: updErr } = await sb.auth.updateUser({ password: newPassword });
        if (updErr) throw updErr;
        // Re-wrap data key with new password
        if (profile?.enc_salt && profile?.enc_wrapped_key) {
          const { salt, wrappedKey } = await rewrapKey(oldPassword, newPassword, profile.enc_salt, profile.enc_wrapped_key);
          await sb.from("profiles").update({ enc_salt: salt, enc_wrapped_key: wrappedKey }).eq("id", auth.user.id);
        } else {
          // No key yet — set up fresh
          const { setupNewKey } = await import("@/lib/crypto");
          const { salt, wrappedKey } = await setupNewKey(newPassword);
          await sb.from("profiles").update({ enc_salt: salt, enc_wrapped_key: wrappedKey }).eq("id", auth.user.id);
        }
        // Session data key already set by rewrapKey above
      }
      setDone(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-4 py-8">
        <p className="text-center text-lg font-semibold text-green-600">✓ Mot de passe mis à jour</p>
        <p className="text-center text-sm text-slate-500">Redirection…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{isRecovery ? "Nouveau mot de passe" : "Changer de mot de passe"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isRecovery ? "Choisis un nouveau mot de passe pour ton compte." : "Saisis ton ancien mot de passe, puis le nouveau."}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {!isRecovery && (
          <div>
            <label className="label">Ancien mot de passe</label>
            <input className="input mt-1" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
          </div>
        )}
        <div>
          <label className="label">Nouveau mot de passe</label>
          <input className="input mt-1" type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </div>
        <div>
          <label className="label">Confirmer le mot de passe</label>
          <input className="input mt-1" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Mise à jour…" : "Mettre à jour"}
        </button>
      </form>
    </main>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense>
      <UpdatePasswordForm />
    </Suspense>
  );
}
