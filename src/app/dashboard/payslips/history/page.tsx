import { requireAuth, requireRole } from "@/lib/auth";
import { getUsers } from "@/lib/actions/users";
import { getPayslips } from "@/lib/actions/payslips";
import { PayslipHistoryClient } from "@/components/payslips/payslip-history-client";

export default async function PayslipHistoryPage() {
  await requireRole(["super_admin"]);

  const [usersResponse, payslipsResponse] = await Promise.all([
    getUsers(),
    getPayslips({ pageSize: 1000 }), // Get all payslips
  ]);

  const employees = usersResponse.data.filter(
    (u: { role: string }) => u.role === "sales_agent" || u.role === "processor",
  );

  return (
    <PayslipHistoryClient
      employees={employees}
      allPayslips={payslipsResponse.data}
    />
  );
}
