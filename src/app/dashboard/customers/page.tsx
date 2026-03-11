import { getCustomers } from "@/lib/actions/customers";
import { requireAuth } from "@/lib/auth";
import { CustomersClient } from "@/components/customers/customers-client";

export default async function CustomersPage() {
  const user = await requireAuth();
  const customers = await getCustomers();

  return <CustomersClient customers={customers} userRole={user.role} />;
}
