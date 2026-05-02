import { Header } from "@/components/Header";
import { PersonalEditor } from "../editor";

export default function EditPersonalFastPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <>
      <Header title="Jeûne personnel" back={{ href: "/jeune/perso", label: "Retour" }} />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <PersonalEditor mode="edit" entryId={params.id} />
      </main>
    </>
  );
}
