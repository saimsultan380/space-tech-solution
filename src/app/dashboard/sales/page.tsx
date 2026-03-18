import { requireAuth } from "@/lib/auth";
import { getSales } from "@/lib/actions/sales";
import { getUsers } from "@/lib/actions/users";
import { SalesClient } from "@/components/sales/sales-client";

export default async function SalesPage() {
  const user = await requireAuth();
  
  const salesFilters = user.role === "sales_agent" ? { agent_id: user.id } : {};
  const [sales, users] = await Promise.all([getSales(salesFilters), getUsers()]);

  const agents = users.filter((u) => u.role === "sales_agent");

  return <SalesClient sales={sales} agents={agents} userRole={user.role} userId={user.id} />;
}
