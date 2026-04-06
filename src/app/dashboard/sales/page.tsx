import { requireAuth } from "@/lib/auth";
import { getSales } from "@/lib/actions/sales";
import { getUsers } from "@/lib/actions/users";
import { SalesClient } from "@/components/sales/sales-client";

export default async function SalesPage(props: {
  searchParams: Promise<{
    page?: string;
    type?: string;
    agent_id?: string;
    date?: string;
    q?: string;
  }>;
}) {
  const user = await requireAuth();
  const searchParams = await props.searchParams;
  
  const page = Number(searchParams.page) || 1;
  const type = searchParams.type || "all";
  const agent_id = user.role === "sales_agent" ? user.id : searchParams.agent_id || "all";
  const date = searchParams.date || "";
  const search = searchParams.q || "";

  const salesFilters = {
    agent_id,
    sale_type: type,
    page,
    pageSize: 10,
    date,
    search,
  };

  const [salesResponse, usersResponse] = await Promise.all([getSales(salesFilters), getUsers()]);

  const agents = usersResponse.data.filter((u: any) => u.role === "sales_agent");

  return (
    <SalesClient 
      salesResponse={salesResponse} 
      agents={agents} 
      userRole={user.role} 
      userId={user.id} 
    />
  );
}
