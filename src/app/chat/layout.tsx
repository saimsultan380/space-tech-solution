import { requireAuth } from "@/lib/auth";
import { getCompanySettings } from "@/lib/actions/company-settings";
import { ThemeColorsProvider } from "@/components/providers/theme-colors-provider";

export const metadata = { title: "Team Chat — Space Tech Solution" };

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  // We bypass company settings ThemeColorsProvider for chat 
  // to enforce the strict light-blue #2563EB flat palette redesign.

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F0F7FF] font-[family-name:var(--font-dm-sans)]">
      {children}
    </div>
  );
}
