import { requireAuth } from "@/lib/auth";
import { NotepadClient } from "@/components/personal-notepad/notepad-client";

export const metadata = {
  title: "Personal Notepad | CRM",
  description: "Manage your private notes securely.",
};

export default async function PersonalNotepadPage() {
  await requireAuth();

  return <NotepadClient />;
}
