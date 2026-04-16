import { requireAuth } from "@/lib/auth";

export const metadata = { title: "Team Chat — Space Tech Solution" };

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  return <div className="h-screen w-screen overflow-hidden bg-background">{children}</div>;
}
