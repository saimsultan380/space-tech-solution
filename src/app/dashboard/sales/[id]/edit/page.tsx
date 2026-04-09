import { requireRole } from "@/lib/auth";
import { getSale } from "@/lib/actions/sales";
import { getSalesAgentUserOptions } from "@/lib/actions/users";
import { SaleForm } from "@/components/sales/sale-form";
import { getSaleAttachments } from "@/lib/actions/sale-attachments";
import { getLatestPaymentRowForSale } from "@/lib/actions/payments";
import { decrypt } from "@/lib/encryption";
import {
  getDecryptedBankSecrets,
  getDecryptedCardSecrets,
} from "@/lib/payment-secrets";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function toDateInputValue(v: string | null | undefined): string {
  if (!v) return "";
  const s = String(v).trim();
  if (s.length >= 10 && s.includes("-")) return s.slice(0, 10);
  return s;
}

function toMonthInputValue(v: string | null | undefined): string {
  if (!v) return "";
  const s = String(v).trim();
  if (s.length >= 7 && s[4] === "-") return s.slice(0, 7);
  return s;
}

export default async function EditSalePage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const user = await requireRole(["super_admin", "sales_agent"]);
  const [sale, attachments, salesAgentUsers, latestPayment] = await Promise.all(
    [
      getSale(params.id),
      getSaleAttachments(params.id),
      user.role === "super_admin"
        ? getSalesAgentUserOptions()
        : Promise.resolve([] as Array<{ id: string; full_name: string }>),
      getLatestPaymentRowForSale(params.id),
    ],
  );

  let payment_method = sale.payment_method || "card";
  let card_number = "";
  let card_exp = "";
  let card_cvv = "";
  let card_billing_address = "";
  let merchant_name = sale.merchant_name || "";
  let routing_number = "";
  let bank_account_number = "";
  let bank_account_holder_name = "";
  let bank_name = "";

  if (latestPayment) {
    merchant_name = (latestPayment.merchant_name as string) || merchant_name;
    if (latestPayment.method === "card") {
      payment_method = "card";
      const { cardNumber, cardCvv } = getDecryptedCardSecrets({
        method: "card",
        encrypted_details: latestPayment.encrypted_details as string | null,
        card_cvv_encrypted: latestPayment.card_cvv_encrypted as string | null,
      });
      card_number = cardNumber;
      card_cvv = cardCvv;
      card_exp = (latestPayment.card_exp as string) || "";
      card_billing_address = (latestPayment.billing_address as string) || "";
    } else if (latestPayment.method === "bank") {
      payment_method = "checking";
      const { routingNumber, accountNumber } = getDecryptedBankSecrets({
        method: "bank",
        encrypted_details: latestPayment.encrypted_details as string | null,
        routing_number_encrypted: latestPayment.routing_number_encrypted as
          | string
          | null,
        account_number_encrypted: latestPayment.account_number_encrypted as
          | string
          | null,
      });
      routing_number = routingNumber;
      bank_account_number = accountNumber;
      bank_account_holder_name =
        (latestPayment.account_holder_name as string) || "";
      bank_name = (latestPayment.bank_name as string) || "";
    }
  }

  const initialValues = {
    sale_type: sale.sale_type,
    subtype: sale.subtype,
    customer_id: sale.customer_id,
    agent_id: sale.agent_id,
    agent_name:
      sale.agent_name ||
      (sale.agent as { full_name?: string } | null)?.full_name ||
      "",
    sale_date:
      toDateInputValue(sale.sale_date || undefined) ||
      new Date().toISOString().split("T")[0],
    customer_phone: sale.customer_phone,
    customer_name:
      sale.customer_name ||
      (sale.customer as { name?: string } | null)?.name ||
      "",
    customer_email:
      sale.customer_email ||
      (sale.customer as { email?: string } | null)?.email ||
      "",
    service_address:
      sale.service_address ||
      (sale.customer as { address?: string } | null)?.address ||
      "",
    account_holder_name: sale.account_holder_name || "",
    account_no:
      (sale.customer as { account_no?: string } | null)?.account_no || "",
    company_name: sale.company_name,
    utility_company_service_number:
      sale.utility_company_service_number?.trim() || "",
    dob: toDateInputValue(sale.dob || undefined),
    ssn: sale.ssn_encrypted ? decrypt(sale.ssn_encrypted) || "" : "",
    amount: String(sale.amount),
    discount: String(sale.discount),
    billed_month: toMonthInputValue(sale.billed_month),
    next_billing_date: toDateInputValue(sale.next_billing_date || undefined),
    account_status: sale.account_status || "active",
    payment_method,
    card_number,
    card_exp,
    card_cvv,
    card_billing_address,
    merchant_name,
    routing_number,
    bank_account_number,
    bank_account_holder_name,
    bank_name,
    other_sale_data: sale.other_sale_data || "",
    sales_notes: sale.sales_notes || "",
    policy_holder_name: sale.policy_holder_name || "",
    vehicle_details: sale.vehicle_details || "",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start gap-4">
        <Link href={`/dashboard/sales/${params.id}`} className="shrink-0 pt-1">
          <Button variant="ghost" size="icon" aria-label="Back to sale details">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold">Edit Sale</h1>
        </div>
      </div>
      <SaleForm
        salesAgentUsers={salesAgentUsers}
        userRole={user.role}
        mode="edit"
        saleId={sale.id}
        initialValues={initialValues}
        initialAttachments={attachments}
      />
    </div>
  );
}
