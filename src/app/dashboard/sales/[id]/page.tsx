import { requireAuth } from "@/lib/auth";
import { getSale } from "@/lib/actions/sales";
import { getNotes } from "@/lib/actions/notes";
import { getPaymentsBySaleId } from "@/lib/actions/payments";
import { getDecryptedBankSecrets, getDecryptedCardSecrets } from "@/lib/payment-secrets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { NotesSection } from "@/components/shared/notes-section";
import { decrypt } from "@/lib/encryption";
import { getSaleAttachments } from "@/lib/actions/sale-attachments";
import { SaleAttachmentsSection } from "@/components/sales/sale-attachments-section";
import { SaleDetailNoteFields } from "@/components/sales/sale-detail-note-fields";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Building2,
  DollarSign,
  Shield,
  Zap,
  LayoutGrid,
  Receipt,
} from "lucide-react";

const KARACHI_TIMEZONE = "Asia/Karachi";

function formatDateKarachi(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: KARACHI_TIMEZONE,
  }).format(new Date(date));
}

function dash(v: string | null | undefined): string {
  const t = v?.trim();
  return t ? t : "—";
}

function formatBilledMonth(v: string | null | undefined): string {
  if (!v?.trim()) return "—";
  const m = v.trim().match(/^(\d{4})-(\d{2})/);
  if (!m) return v;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default async function SaleDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const user = await requireAuth();
  const currency = user.preferred_currency || "USD";
  const [sale, notes, attachments, payments] = await Promise.all([
    getSale(params.id),
    getNotes({ sale_id: params.id }),
    getSaleAttachments(params.id),
    getPaymentsBySaleId(params.id),
  ]);
  const ssnValue = sale.ssn_encrypted ? decrypt(sale.ssn_encrypted) || "N/A" : "N/A";
  const customer = sale.customer as { name?: string; email?: string; account_no?: string } | null | undefined;
  const agentName =
    sale.agent_name?.trim() ||
    (sale.agent as { full_name?: string } | null)?.full_name ||
    "N/A";

  const canEdit =
    user.role === "super_admin" ||
    (user.role === "sales_agent" && sale.agent_id === user.id);
  const isInsurance = sale.sale_type === "insurance";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/dashboard/sales">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{sale.company_name}</h1>
          </div>
          <p className="text-muted-foreground">
            {sale.sale_type} / {sale.subtype} sale
            {sale.sale_date ? ` · ${formatDateKarachi(sale.sale_date)}` : ""}
          </p>
        </div>
        {canEdit && (
          <Link href={`/dashboard/sales/${sale.id}/edit`}>
            <Button variant="outline" size="sm">
              Edit full record
            </Button>
          </Link>
        )}
      </div>

      {/* Summary — mirrors list columns + key identifiers */}
      <Card className="border-primary/20 bg-primary/[0.04]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Sale summary
          </CardTitle>
        </CardHeader>
        <CardContent className="text-left">
          <div className="max-w-2xl space-y-3">
            <SummaryRow label="Customer" value={dash(sale.customer_name || customer?.name)} />
            <SummaryRow label="Email" value={dash(sale.customer_email || customer?.email)} />
            <SummaryRow label="Company" value={dash(sale.company_name)} />
            <SummaryRow label="Type" value={`${sale.sale_type} / ${sale.subtype}`} />
            <SummaryRow label="Charged amount" value={formatCurrency(sale.charged_amount, currency)} />
            <SummaryRow label="Agent Name" value={agentName} />
            <SummaryRow label="Recorded on" value={formatDateKarachi(sale.created_at)} />
            <SummaryRow label="Sale ID" value={sale.id} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-4 w-4 text-violet-500" /> Customer Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Customer Name" value={dash(sale.customer_name || customer?.name)} />
            <InfoRow label="Phone" value={dash(sale.customer_phone)} />
            <InfoRow label="Email" value={dash(sale.customer_email || customer?.email)} />
            <InfoRow label="Service Address" value={dash(sale.service_address)} />
            <InfoRow
              label={isInsurance ? "Policy Holder" : "Account Holder"}
              value={dash(
                isInsurance ? sale.policy_holder_name : sale.account_holder_name,
              )}
            />
            <InfoRow label="Account / policy no." value={dash(customer?.account_no)} />
            <InfoRow label="Date of Birth" value={dash(sale.dob)} />
            <InfoRow label="SSN" value={ssnValue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {isInsurance ? <Shield className="h-4 w-4 text-blue-500" /> : <Zap className="h-4 w-4 text-amber-500" />}
              {isInsurance ? "Insurance Details" : "Utility Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Type" value={`${sale.sale_type} / ${sale.subtype}`} />
            <InfoRow label={isInsurance ? "Insurance Company" : "Utility Company"} value={dash(sale.company_name)} />
            {!isInsurance && (
              <InfoRow
                label="Utility company service number"
                value={dash(sale.utility_company_service_number)}
              />
            )}
            {isInsurance && (
              <InfoRow label="Vehicle Details" value={dash(sale.vehicle_details)} />
            )}
            <InfoRow label="Account Status" value={dash(sale.account_status)} />
            <InfoRow label="Created" value={formatDateKarachi(sale.created_at)} />
            <InfoRow label="Last updated" value={formatDateKarachi(sale.updated_at)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-4 w-4 text-green-500" /> Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label={isInsurance ? "Premium Amount" : "Bill Amount"}
              value={formatCurrency(sale.amount, currency)}
            />
            <InfoRow label="Discount" value={formatCurrency(sale.discount, currency)} />
            <InfoRow label="Charged Amount" value={formatCurrency(sale.charged_amount, currency)} />
            <InfoRow label="Billed Month" value={formatBilledMonth(sale.billed_month)} />
            <InfoRow
              label="Due Date"
              value={sale.next_billing_date ? formatDate(sale.next_billing_date) : "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-4 w-4 text-cyan-500" /> People & Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Agent Name" value={agentName} />
            <InfoRow
              label="Processor"
              value={dash((sale.processor as { full_name?: string } | null)?.full_name)}
            />
            <InfoRow
              label="Payment Method"
              value={sale.payment_method ? sale.payment_method.toUpperCase() : "—"}
            />
            <InfoRow label="Merchant" value={dash(sale.merchant_name)} />
          </CardContent>
        </Card>
      </div>

      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-4 w-4 text-emerald-500" /> Payment records
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payments.map((p) => {
              const cardSecrets =
                p.method === "card"
                  ? getDecryptedCardSecrets({
                      method: p.method,
                      encrypted_details: p.encrypted_details as string | null | undefined,
                      card_cvv_encrypted: p.card_cvv_encrypted as string | null | undefined,
                    })
                  : { cardNumber: "", cardCvv: "" };
              const bankSecrets =
                p.method === "bank"
                  ? getDecryptedBankSecrets({
                      method: p.method,
                      encrypted_details: p.encrypted_details as string | null | undefined,
                      routing_number_encrypted: p.routing_number_encrypted as string | null | undefined,
                      account_number_encrypted: p.account_number_encrypted as string | null | undefined,
                    })
                  : { routingNumber: "", accountNumber: "" };

              return (
                <div
                  key={p.id}
                  className="space-y-2 rounded-xl border border-border bg-muted/20 p-4 text-left text-sm"
                >
                  <div className="font-medium text-foreground">
                    <span className="capitalize">{p.method === "bank" ? "Bank / ACH" : "Card"}</span>
                  </div>
                  <div className="grid max-w-xl grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="text-foreground">{formatCurrency(Number(p.amount), currency)}</span>
                    {p.method === "card" && (
                      <>
                        <span className="text-muted-foreground">Card number</span>
                        <span className="break-all font-mono text-foreground">
                          {user.role === "super_admin" && cardSecrets.cardNumber.trim()
                            ? cardSecrets.cardNumber
                            : p.card_last_four
                              ? `****${p.card_last_four}`
                              : "—"}
                        </span>
                        <span className="text-muted-foreground">Expiry</span>
                        <span className="font-mono text-foreground">{dash(p.card_exp)}</span>
                        <span className="text-muted-foreground">CVV</span>
                        <span className="font-mono text-foreground">
                          {user.role === "super_admin" && cardSecrets.cardCvv.trim() ? cardSecrets.cardCvv : "—"}
                        </span>
                        <span className="text-muted-foreground">Billing address</span>
                        <span className="text-foreground">{dash(p.billing_address)}</span>
                      </>
                    )}
                    {p.method === "bank" && (
                      <>
                        <span className="text-muted-foreground">Bank</span>
                        <span className="text-foreground">{dash(p.bank_name)}</span>
                        <span className="text-muted-foreground">Routing number</span>
                        <span className="break-all font-mono text-foreground">{dash(bankSecrets.routingNumber)}</span>
                        <span className="text-muted-foreground">Account number</span>
                        <span className="break-all font-mono text-foreground">{dash(bankSecrets.accountNumber)}</span>
                        <span className="text-muted-foreground">Account holder</span>
                        <span className="text-foreground">{dash(p.account_holder_name)}</span>
                      </>
                    )}
                    {p.merchant_name && (
                      <>
                        <span className="text-muted-foreground">Merchant</span>
                        <span className="text-foreground">{p.merchant_name}</span>
                      </>
                    )}
                    <span className="text-muted-foreground">Recorded</span>
                    <span className="text-foreground">{formatDateKarachi(p.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <SaleDetailNoteFields
        saleId={sale.id}
        notes={notes}
      />

      <SaleAttachmentsSection
        saleId={sale.id}
        initialAttachments={attachments}
        mode="view"
        userRole={user.role}
      />

      <NotesSection notes={notes} saleId={params.id} />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 text-left sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-start sm:gap-x-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground break-all">{value}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right break-all">{value}</span>
    </div>
  );
}
