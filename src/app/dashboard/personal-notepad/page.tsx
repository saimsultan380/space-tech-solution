import { requireAuth } from "@/lib/auth";
import { NotepadClient } from "@/components/personal-notepad/notepad-client";

export const metadata = {
  title: "Notepad | CRM",
  description: "Private notes for yourself.",
};

export default async function PersonalNotepadPage() {
  await requireAuth();

  return <NotepadClient />;
}
