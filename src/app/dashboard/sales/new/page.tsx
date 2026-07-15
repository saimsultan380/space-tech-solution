import { requireRole } from "@/lib/auth";
import { SaleForm } from "@/components/sales/sale-form";

export default async function NewSalePage() {
  const user = await requireRole(["super_admin", "sales_agent", "processor"]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Sale</h1>
        <p className="text-muted-foreground">
          Fill in all details for the {user.role === "sales_agent" ? "sale" : "new sale record"}
        </p>
      </div>
      <SaleForm userRole={user.role} />
    </div>
  );
}
