import { requireAuth } from "@/lib/auth";
import { getUsers } from "@/lib/actions/users";
import { getPayslips, getMyPayslips } from "@/lib/actions/payslips";
import { PayslipsAdminClient } from "@/components/payslips/payslips-admin-client";
import { PayslipsMyClient } from "@/components/payslips/payslips-my-client";

export default async function PayslipsPage() {
  const user = await requireAuth();

  if (user.role === "super_admin") {
    const [payslips, users] = await Promise.all([getPayslips(), getUsers()]);
    const employees = users.filter((u) => u.role === "sales_agent" || u.role === "processor");
    return <PayslipsAdminClient payslips={payslips} employees={employees} />;
  }

  const payslips = await getMyPayslips();
  return <PayslipsMyClient payslips={payslips} />;
}
