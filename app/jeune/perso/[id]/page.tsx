import { Header } from "@/components/Header";
import { PersonalEditor } from "../editor";
import { getSupabaseServer } from "@/lib/supabaseServer";

export default async function EditPersonalFastPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = getSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  let isDirigent = false;
  if (auth.user) {
    const { data: p } = await sb.from("profiles").select("is_dirigeant").eq("id", auth.user.id).maybeSingle();
    isDirigent = p?.is_dirigeant ?? false;
  }
  return (
    <>
      <Header title="Jeûne personnel" back={{ href: "/jeune/perso", label: "Retour" }} />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <PersonalEditor mode="edit" entryId={id} isDirigent={isDirigent} />
      </main>
    </>
  );
}
