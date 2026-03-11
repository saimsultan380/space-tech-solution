import { requireAuth } from "@/lib/auth";
import { getCustomers } from "@/lib/actions/customers";
import { SaleForm } from "@/components/sales/sale-form";

export default async function NewSalePage() {
  const user = await requireAuth();
  const customers = await getCustomers();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Sale</h1>
        <p className="text-muted-foreground">
          Fill in all details for the {user.role === "sales_agent" ? "sale" : "new sale record"}
        </p>
      </div>
      <SaleForm
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
