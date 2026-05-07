"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { PhoneInput } from "@/components/PhoneInput";

export default function CompleteProfilePage() {
  const router = useRouter();
  const sb = getSupabaseBrowser();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [discipleshipMaker, setDiscipleshipMaker] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/auth/login");
        return;
      }
      setUserId(data.user.id);
      const meta = data.user.user_metadata ?? {};
      setFirstName((meta.first_name || meta.given_name || meta.name?.split(" ")[0] || "") as string);
      setLastName((meta.last_name || meta.family_name || "") as string);
    });
  }, [router, sb]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!userId) return;
    if (!firstName.trim()) return setError("Le prénom est obligatoire.");
    if (!phone) return setError("Le numéro de téléphone est invalide.");
    setLoading(true);
    const { error: upErr } = await sb.from("profiles").upsert({
      id: userId,
      first_name: firstName.trim(),
      last_name: lastName.trim() || null,
      phone,
      discipleship_maker: discipleshipMaker.trim(),
    });
    setLoading(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Compléter ton profil</h1>
        <p className="mt-1 text-sm text-slate-500">Encore quelques infos pour finaliser ton inscription.</p>
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
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Enregistrement…" : "Valider"}
        </button>
      </form>
    </main>
  );
}
