import { requireRole } from "@/lib/auth";
import { CallLogClient } from "@/components/call-log/call-log-client";

export default async function CallLogPage() {
  const user = await requireRole(["super_admin", "sales_agent"]);
  return <CallLogClient userRole={user.role} userId={user.id} />;
}
