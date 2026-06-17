import { requireAuth } from "@/lib/auth";
import { getUsers } from "@/lib/actions/users";
import { getPayslips, getMyPayslips } from "@/lib/actions/payslips";
import { PayslipsAdminClient } from "@/components/payslips/payslips-admin-client";
import { PayslipsMyClient } from "@/components/payslips/payslips-my-client";
import { getCompanySettings } from "@/lib/actions/company-settings";

export default async function PayslipsPage(props: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; from_date?: string; to_date?: string }>;
}) {
  const user = await requireAuth();
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = searchParams.q || "";
  const status = searchParams.status || "all";
  const from_date = searchParams.from_date || "";
  const to_date = searchParams.to_date || "";
  const companySettings = await getCompanySettings();

  if (user.role === "super_admin") {
    const [payslipsResponse, usersResponse] = await Promise.all([
      getPayslips({ page, pageSize: 12, search, status, from_date, to_date }),
      getUsers(),
    ]);
    const employees = usersResponse.data.filter((u: { role: string }) => u.role === "sales_agent" || u.role === "processor");
    return <PayslipsAdminClient payslipsResponse={payslipsResponse} employees={employees} companySettings={companySettings} />;
  }
  const payslipsResponse = await getMyPayslips({ page, pageSize: 12, status, from_date, to_date });
  return <PayslipsMyClient payslipsResponse={payslipsResponse} companySettings={companySettings} />;
}
