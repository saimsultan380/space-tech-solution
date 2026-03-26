import { requireAuth } from "@/lib/auth";
import { getSale } from "@/lib/actions/sales";
import { getNotes } from "@/lib/actions/notes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { NotesSection } from "@/components/shared/notes-section";
import { ProcessSaleForm } from "@/components/sales/process-sale-form";
import { decrypt } from "@/lib/encryption";
import { getSaleAttachments } from "@/lib/actions/sale-attachments";
import { SaleAttachmentsSection } from "@/components/sales/sale-attachments-section";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Building2,
  DollarSign,
  CreditCard,
  FileText,
  Shield,
  Zap,
} from "lucide-react";

const statusVariant: Record<string, "default" | "success" | "destructive" | "warning"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

export default async function SaleDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const user = await requireAuth();
  const currency = user.preferred_currency || "USD";
  const [sale, notes, attachments] = await Promise.all([
    getSale(params.id),
    getNotes({ sale_id: params.id }),
    getSaleAttachments(params.id),
  ]);
  const ssnValue = sale.ssn_encrypted ? decrypt(sale.ssn_encrypted) || "N/A" : "N/A";

  const canProcess = user.role === "processor" || user.role === "super_admin";
  const canEdit =
    user.role === "super_admin" ||
    (user.role === "sales_agent" && sale.agent_id === user.id);
  const isInsurance = sale.sale_type === "insurance";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/sales">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{sale.company_name}</h1>
            <Badge variant={statusVariant[sale.status] || "default"} className="capitalize">
              {sale.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {sale.sale_type} / {sale.subtype} sale
            {sale.sale_date ? ` · ${formatDate(sale.sale_date)}` : ""}
          </p>
        </div>
        {canEdit && (
          <Link href={`/dashboard/sales/${sale.id}/edit`}>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-4 w-4 text-violet-500" /> Customer Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Customer Name" value={sale.customer_name || (sale.customer as { name: string } | null)?.name || "N/A"} />
            <InfoRow label="Phone" value={sale.customer_phone || "N/A"} />
            <InfoRow label="Email" value={sale.customer_email || "N/A"} />
            <InfoRow label="Service Address" value={sale.service_address || "N/A"} />
            <InfoRow
              label={isInsurance ? "Policy Holder" : "Account Holder"}
              value={isInsurance ? (sale.policy_holder_name || "N/A") : (sale.account_holder_name || "N/A")}
            />
            <InfoRow label="Date of Birth" value={sale.dob || "N/A"} />
            <InfoRow label="SSN" value={ssnValue} />
          </CardContent>
        </Card>

        {/* Company / Sale Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {isInsurance ? <Shield className="h-4 w-4 text-blue-500" /> : <Zap className="h-4 w-4 text-amber-500" />}
              {isInsurance ? "Insurance Details" : "Utility Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Type" value={`${sale.sale_type} / ${sale.subtype}`} />
            <InfoRow label={isInsurance ? "Insurance Company" : "Utility Company"} value={sale.company_name} />
            {isInsurance && sale.vehicle_details && (
              <InfoRow label="Vehicle Details" value={sale.vehicle_details} />
            )}
            <InfoRow label="Account Status" value={sale.account_status || "N/A"} />
            <InfoRow label="Created" value={formatDate(sale.created_at)} />
          </CardContent>
        </Card>

        {/* Billing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-4 w-4 text-green-500" /> Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label={isInsurance ? "Premium Amount" : "Bill Amount"} value={formatCurrency(sale.amount, currency)} />
            <InfoRow label="Discount" value={formatCurrency(sale.discount, currency)} />
            <InfoRow label="Charged Amount" value={formatCurrency(sale.charged_amount, currency)} />
            <InfoRow label="Billed Month" value={sale.billed_month || "N/A"} />
            <InfoRow
              label={isInsurance ? "Next Premium" : "Next Bill"}
              value={sale.next_billing_date ? formatDate(sale.next_billing_date) : "N/A"}
            />
          </CardContent>
        </Card>

        {/* People */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-4 w-4 text-cyan-500" /> People & Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="Agent"
              value={(sale.agent as { full_name: string } | null)?.full_name || "N/A"}
            />
            <InfoRow
              label="Processor"
              value={(sale.processor as { full_name: string } | null)?.full_name || "Not assigned"}
            />
            <InfoRow label="Payment Method" value={sale.payment_method ? sale.payment_method.toUpperCase() : "N/A"} />
            {sale.merchant_name && <InfoRow label="Merchant" value={sale.merchant_name} />}
          </CardContent>
        </Card>
      </div>

      {/* Other sale data */}
      {sale.other_sale_data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-4 w-4 text-orange-500" /> Other Sale Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{sale.other_sale_data}</p>
          </CardContent>
        </Card>
      )}

      {/* Sales Notes */}
      {sale.sales_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-4 w-4" /> Sales Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{sale.sales_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Processing Notes */}
      {sale.processing_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Processing Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{sale.processing_notes}</p>
          </CardContent>
        </Card>
      )}

      {canProcess && sale.status === "pending" && (
        <ProcessSaleForm saleId={sale.id} />
      )}

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}
