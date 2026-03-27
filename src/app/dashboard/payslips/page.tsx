import { requireAuth } from "@/lib/auth";
import { getUsers } from "@/lib/actions/users";
import { getPayslips, getMyPayslips } from "@/lib/actions/payslips";
import { PayslipsAdminClient } from "@/components/payslips/payslips-admin-client";
import { PayslipsMyClient } from "@/components/payslips/payslips-my-client";
import { getCompanySettings } from "@/lib/actions/company-settings";

export default async function PayslipsPage(props: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const user = await requireAuth();
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = searchParams.q || "";
  const companySettings = await getCompanySettings();

  if (user.role === "super_admin" || user.role === "processor") {
    const [payslipsResponse, usersResponse] = await Promise.all([
      getPayslips({ page, pageSize: 10, search }),
      getUsers(),
    ]);
    const employees = usersResponse.data.filter((u: any) => u.role === "sales_agent" || u.role === "processor");
    return <PayslipsAdminClient payslipsResponse={payslipsResponse} employees={employees} companySettings={companySettings} />;
  }

  const payslipsResponse = await getMyPayslips({ page, pageSize: 10 });
  return <PayslipsMyClient payslipsResponse={payslipsResponse} companySettings={companySettings} />;
}
