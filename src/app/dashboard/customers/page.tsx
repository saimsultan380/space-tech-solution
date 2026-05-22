import { requireAuth } from "@/lib/auth";
import { canAccessCallLogsResponses } from "@/lib/nav-access";
import { CustomersClient } from "@/components/customers/customers-client";
import { redirect } from "next/navigation";

export default async function CustomersPage() {
  const user = await requireAuth();
  if (!canAccessCallLogsResponses(user.role, user.allowed_modules)) {
    redirect("/dashboard");
  }

  return <CustomersClient userRole={user.role} />;
}
