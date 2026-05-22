import { requireAuth } from "@/lib/auth";
import { canAccessProcessingAccounts } from "@/lib/nav-access";
import { ProcessingAccountsClient } from "@/components/processing-accounts/processing-accounts-client";
import { redirect } from "next/navigation";

export default async function ProcessingAccountsPage() {
  const user = await requireAuth();
  if (!canAccessProcessingAccounts(user.role, user.allowed_modules)) {
    redirect("/dashboard");
  }

  return (
    <ProcessingAccountsClient
      userRole={user.role}
    />
  );
}
