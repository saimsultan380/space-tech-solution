import { getCustomers } from "@/lib/actions/customers";
import { requireAuth } from "@/lib/auth";
import { CustomersClient } from "@/components/customers/customers-client";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const user = await requireAuth();
  const page = Number(searchParams.page) || 1;
  const search = searchParams.q || "";

  const customersResponse = await getCustomers({
    page,
    pageSize: 10,
    search,
  });

  return <CustomersClient customersResponse={customersResponse} userRole={user.role} />;
}
