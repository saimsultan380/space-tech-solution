import { getCustomers } from "@/lib/actions/customers";
import { requireAuth } from "@/lib/auth";
import { canAccessCallLogsResponses } from "@/lib/nav-access";
import { CustomersClient } from "@/components/customers/customers-client";
import { redirect } from "next/navigation";

export default async function CustomersPage(props: {
  searchParams: Promise<{ page?: string; q?: string; date?: string }>;
}) {
  const user = await requireAuth();
  if (!canAccessCallLogsResponses(user.role, user.allowed_modules)) {
    redirect("/dashboard");
  }
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = searchParams.q || "";
  const createdDate = searchParams.date || "";

  const customersResponse = await getCustomers({
    page,
    pageSize: 10,
    search,
    createdDate: createdDate || undefined,
  });

  return <CustomersClient customersResponse={customersResponse} userRole={user.role} />;
}
