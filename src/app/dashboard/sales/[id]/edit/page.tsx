import { requireAuth } from "@/lib/auth";
import { getSale } from "@/lib/actions/sales";
import { getCustomers } from "@/lib/actions/customers";
import { SaleForm } from "@/components/sales/sale-form";

export default async function EditSalePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requireAuth();
  const [sale, customers] = await Promise.all([
    getSale(params.id),
    getCustomers(),
  ]);

  const initialValues = {
    sale_type: sale.sale_type,
    subtype: sale.subtype,
    customer_id: sale.customer_id,
    sale_date: sale.sale_date || new Date().toISOString().split("T")[0],
    customer_phone: sale.customer_phone,
    customer_name: sale.customer_name || (sale.customer as { name?: string } | null)?.name || "",
    customer_email: sale.customer_email || (sale.customer as { email?: string } | null)?.email || "",
    service_address: sale.service_address || (sale.customer as { address?: string } | null)?.address || "",
    account_holder_name: sale.account_holder_name,
    company_name: sale.company_name,
    dob: sale.dob,
    ssn: "",
    amount: String(sale.amount),
    discount: String(sale.discount),
    billed_month: sale.billed_month,
    next_billing_date: sale.next_billing_date || "",
    account_status: sale.account_status || "active",
    payment_method: sale.payment_method || "card",
    card_number: "",
    card_exp: "",
    card_cvv: "",
    card_billing_address: "",
    merchant_name: sale.merchant_name || "",
    routing_number: "",
    bank_account_number: "",
    bank_account_holder_name: "",
    bank_name: "",
    other_sale_data: sale.other_sale_data || "",
    sales_notes: sale.sales_notes || "",
    policy_holder_name: sale.policy_holder_name || "",
    vehicle_details: sale.vehicle_details || "",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Sale</h1>
        <p className="text-muted-foreground">
          Update details for this sale.
        </p>
      </div>
      <SaleForm
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        mode="edit"
        saleId={sale.id}
        initialValues={initialValues}
      />
    </div>
  );
}

