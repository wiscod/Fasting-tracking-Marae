import { getSupabaseServer } from "@/lib/supabaseServer";
import { Header } from "@/components/Header";
import { CroisadeDetailClient } from "./client";
import type { Croisade } from "@/lib/types";

export default async function CroisadeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = getSupabaseServer();
  const { data } = await sb.from("croisades").select("*").eq("id", id).maybeSingle();
  const croisade = data as Croisade | null;

  return (
    <>
      <Header back={{ href: "/" }} title={croisade?.name ?? "Croisade"} />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        {croisade ? (
          <CroisadeDetailClient croisade={croisade} />
        ) : (
          <div className="card text-sm text-slate-700">
            <p className="font-medium">Croisade introuvable.</p>
          </div>
        )}
      </main>
    </>
  );
}
