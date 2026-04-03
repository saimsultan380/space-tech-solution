import { requireAuth } from "@/lib/auth";
import { getSalesAgentUserOptions } from "@/lib/actions/users";
import { SaleForm } from "@/components/sales/sale-form";

export default async function NewSalePage() {
  const user = await requireAuth();
  const salesAgentUsers =
    user.role === "super_admin" ? await getSalesAgentUserOptions() : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Sale</h1>
        <p className="text-muted-foreground">
          Fill in all details for the {user.role === "sales_agent" ? "sale" : "new sale record"}
        </p>
      </div>
      <SaleForm salesAgentUsers={salesAgentUsers} userRole={user.role} />
    </div>
  );
}
