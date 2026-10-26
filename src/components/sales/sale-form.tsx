"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Spinner } from "@/components/ui/loading";
import { createSale, updateSaleDetails, type CreateSaleInput, type UpdateSaleInput } from "@/lib/actions/sales";
import { SaleAttachmentsSection } from "@/components/sales/sale-attachments-section";
import { createClient } from "@/lib/supabase/client";
import { createSaleAttachment } from "@/lib/actions/sale-attachments";
import { getSalesAgentOptions } from "@/lib/queries/users";
import {
  SALE_TYPES,
  UTILITY_SUBTYPES,
  INSURANCE_SUBTYPES,
  ACCOUNT_STATUSES,
} from "@/lib/constants";
import {
  CreditCard,
  Building2,
  User,
  FileText,
  DollarSign,
  Shield,
  Zap,
  Users,
  Upload,
  X,
  Link as LinkIcon,
} from "@/components/ui/icons";
import type { UserRole } from "@/lib/types";

interface SaleFormProps {
  /** Optional preloaded list; otherwise fetched client-side for super_admin. */
  salesAgentUsers?: Array<{ id: string; full_name: string }>;
  userRole: UserRole;
  mode?: "create" | "edit";
  saleId?: string;
  initialValues?: Partial<typeof emptyForm>;
  initialAttachments?: Array<any>;
}

const emptyForm = {
  sale_type: "utility",
  subtype: "new",
  customer_id: "",
  agent_id: "",
  agent_name: "",
  sale_date: new Date().toISOString().split("T")[0],
  customer_phone: "",
  customer_name: "",
  customer_email: "",
  service_address: "",
  account_holder_name: "",
  account_no: "",
  company_name: "",
  utility_company_service_number: "",
  utility_company_phone: "",
  guest_pay_enabled: false,
  guest_pay_link: "",
  dob: "",
  ssn: "",
  amount: "",
  discount: "0",
  billed_month: "",
  next_billing_date: "",
  expected_next_bill_date: "",
  payment_status_after_sale: "pending",
  account_status: "active",
  payment_method: "card",
  card_number: "",
  card_exp: "",
  card_cvv: "",
  card_billing_address: "",
  merchant_name: "",
  routing_number: "",
  bank_account_number: "",
  bank_account_holder_name: "",
  bank_name: "",
  other_sale_data: "",
  sales_notes: "",
  policy_holder_name: "",
  vehicle_details: "",
};

export function SaleForm({
  salesAgentUsers: salesAgentUsersProp = [],
  userRole,
  mode = "create",
  saleId,
  initialValues,
  initialAttachments = [],
}: SaleFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ ...emptyForm, ...initialValues });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const needsAgentPicker = userRole === "super_admin";
  const { data: fetchedAgents = [] } = useQuery({
    queryKey: ["sales-agent-options"],
    queryFn: getSalesAgentOptions,
    enabled: needsAgentPicker && salesAgentUsersProp.length === 0,
    staleTime: 60_000,
  });
  const salesAgentUsers =
    salesAgentUsersProp.length > 0 ? salesAgentUsersProp : fetchedAgents;

  const isUtility = form.sale_type === "utility";
  const isInsurance = form.sale_type === "insurance";
  const subtypeOptions = isUtility ? UTILITY_SUBTYPES : INSURANCE_SUBTYPES;
  const chargedAmount = Number(form.amount || 0) - Number(form.discount || 0);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === "super_admin" && mode === "create" && !form.agent_id?.trim()) {
      setError("Please select the assigned sales agent.");
      return;
    }
    setLoading(true);
    setError("");
    const payload: CreateSaleInput = {
      ...form,
      amount: Number(form.amount),
      discount: Number(form.discount),
    };
    try {
      if (mode === "edit" && saleId) {
        const editPayload: UpdateSaleInput = {
          ...payload,
          id: saleId,
        };
        await updateSaleDetails(editPayload);
      } else {
        const newSaleId = await createSale(payload);

        if (pendingFiles.length > 0) {
          const supabase = createClient();
          for (const file of pendingFiles) {
            const safeName = file.name.replace(/[^\w.\-()\s]/g, "_");
            const path = `sales/${newSaleId}/${Date.now()}-${safeName}`;
            const { error: uploadError } = await supabase.storage
              .from("avatars")
              .upload(path, file, { upsert: false, cacheControl: "3600" });
            if (uploadError) throw new Error(uploadError.message);

            const { data } = supabase.storage.from("avatars").getPublicUrl(path);
            await createSaleAttachment({
              sale_id: newSaleId,
              file_name: file.name,
              file_path: path,
              file_url: data.publicUrl,
              mime_type: file.type || "application/octet-stream",
              size_bytes: file.size || 0,
            });
          }
        }
      }
      router.push("/dashboard/sales");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sale");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sale Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {isUtility ? <Zap className="h-4 w-4 text-amber-500" /> : <Shield className="h-4 w-4 text-blue-500" />}
            Sale Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Select
              id="sale_type"
              label="Type"
              options={SALE_TYPES}
              value={form.sale_type}
              onChange={(e) => {
                set("sale_type", e.target.value);
                set("subtype", e.target.value === "utility" ? "new" : "new");
              }}
              required
            />
            <Select
              id="subtype"
              label="Subtype"
              options={subtypeOptions}
              value={form.subtype}
              onChange={(e) => set("subtype", e.target.value)}
              required
            />
            <Input
              id="sale_date"
              label="Sale Date"
              type="date"
              value={form.sale_date}
              onChange={(e) => set("sale_date", e.target.value)}
              required
            />
            <Select
              id="account_status"
              label="Account Status"
              options={ACCOUNT_STATUSES}
              value={form.account_status}
              onChange={(e) => set("account_status", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Agent assignment (super admin) */}
      {userRole === "super_admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-sky-500" />
              Assigned sales agent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              id="agent_id"
              label="Sales agent"
              options={[
                { value: "", label: mode === "edit" ? "Keep current (pick to change)" : "Select sales agent" },
                ...salesAgentUsers.map((a) => ({ value: a.id, label: a.full_name })),
              ]}
              value={form.agent_id}
              onChange={(e) => {
                const id = e.target.value;
                const u = salesAgentUsers.find((x) => x.id === id);
                setForm((f) => ({
                  ...f,
                  agent_id: id,
                  agent_name: u?.full_name || f.agent_name,
                }));
              }}
              required={mode === "create"}
            />
            {mode === "edit" && (
              <p className="text-xs text-muted-foreground">
                Choose another agent only if you need to reassign this sale. Leave unchanged to keep the current
                owner.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-violet-500" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="customer_name"
              label="Customer Name"
              value={form.customer_name}
              onChange={(e) => set("customer_name", e.target.value)}
              required
            />
            <Input
              id="customer_phone"
              label="Customer Phone"
              value={form.customer_phone}
              onChange={(e) => set("customer_phone", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="customer_email"
              label="Customer Email"
              type="email"
              value={form.customer_email}
              onChange={(e) => set("customer_email", e.target.value)}
            />
            <Input
              id="service_address"
              label="Service Address"
              value={form.service_address}
              onChange={(e) => set("service_address", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Input
              id="account_holder_name"
              label={isInsurance ? "Policy Holder Name" : "Account Holder Name"}
              value={isInsurance ? form.policy_holder_name : form.account_holder_name}
              onChange={(e) =>
                isInsurance
                  ? set("policy_holder_name", e.target.value)
                  : set("account_holder_name", e.target.value)
              }
            />
            <Input
              id="account_no"
              label="Account Number"
              placeholder="Account / Policy No."
              value={form.account_no}
              onChange={(e) => set("account_no", e.target.value)}
            />
            <Input
              id="dob"
              label="Date of Birth"
              type="date"
              value={form.dob}
              onChange={(e) => set("dob", e.target.value)}
            />
            <Input
              id="ssn"
              label="SSN"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="XXX-XX-XXXX"
              value={form.ssn}
              onChange={(e) => set("ssn", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Company / Service Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-emerald-500" />
            {isInsurance ? "Insurance Details" : "Utility Details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="company_name"
              label={isInsurance ? "Insurance Company Name" : "Utility Company Name"}
              placeholder={isInsurance ? "e.g. Allstate, GEICO" : "e.g. Duke Energy, ComEd"}
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              required
            />
            {isUtility ? (
              <Input
                id="utility_company_service_number"
                label="Utility company service number"
                placeholder="Service or account number on utility bill"
                value={form.utility_company_service_number}
                onChange={(e) => set("utility_company_service_number", e.target.value)}
              />
            ) : (
              <Input
                id="policy_holder_name"
                label="Policy Holder Name"
                value={form.policy_holder_name}
                onChange={(e) => set("policy_holder_name", e.target.value)}
              />
            )}
          </div>
          {isUtility && (
            <Input
              id="utility_company_phone"
              label="Utility Company Phone Number"
              placeholder="e.g. (555) 123-4567"
              value={form.utility_company_phone}
              onChange={(e) => set("utility_company_phone", e.target.value)}
            />
          )}
          {isInsurance && (
            <Textarea
              id="vehicle_details"
              label="Vehicle Details (Notes)"
              placeholder="Year, make, model, VIN, etc."
              value={form.vehicle_details}
              onChange={(e) => set("vehicle_details", e.target.value)}
            />
          )}
        </CardContent>
      </Card>

      {/* Guest Pay Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LinkIcon className="h-4 w-4 text-purple-500" />
            Guest Pay
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/10 p-4">
            <div className="flex-1">
              <label htmlFor="guest_pay_enabled" className="text-sm font-medium text-foreground cursor-pointer">
                Enable Guest Pay
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow customers to pay through a guest payment link
              </p>
            </div>
            <button
              type="button"
              id="guest_pay_enabled"
              role="switch"
              aria-checked={form.guest_pay_enabled}
              onClick={() => setForm((f) => ({ ...f, guest_pay_enabled: !f.guest_pay_enabled }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                form.guest_pay_enabled ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  form.guest_pay_enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {form.guest_pay_enabled && (
            <Input
              id="guest_pay_link"
              label="Guest Pay Link"
              placeholder="https://payment.example.com/guest/..."
              value={form.guest_pay_link}
              onChange={(e) => set("guest_pay_link", e.target.value)}
            />
          )}
        </CardContent>
      </Card>

      {/* Billing / Amounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-green-500" />
            Billing & Amounts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="amount"
              label={isInsurance ? "Premium Amount" : "Bill Amount"}
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              required
            />
            <Input
              id="discount"
              label="Discounts"
              type="number"
              step="0.01"
              min="0"
              value={form.discount}
              onChange={(e) => set("discount", e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground text-left block">
                Charged Amount
              </label>
              <div className="flex h-11 items-center rounded-xl border bg-muted/50 px-3.5 text-sm font-semibold text-green-600">
                ${chargedAmount.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
            <Input
              id="billed_month"
              label="Billed Month"
              type="month"
              value={form.billed_month}
              onChange={(e) => set("billed_month", e.target.value)}
              required
              className="h-11 py-0 leading-none"
            />
            <Input
              id="next_billing_date"
              label="Due Date"
              type="date"
              value={form.next_billing_date}
              onChange={(e) => set("next_billing_date", e.target.value)}
              className="h-11 py-0 leading-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
            <Select
              id="payment_status_after_sale"
              label="Payment Status After Sale"
              options={[
                { value: "pending", label: "Pending" },
                { value: "completed", label: "Completed" },
                { value: "failed", label: "Failed" },
                { value: "refunded", label: "Refunded" },
                { value: "cancelled", label: "Cancelled" },
              ]}
              value={form.payment_status_after_sale}
              onChange={(e) => set("payment_status_after_sale", e.target.value)}
            />
            <Input
              id="expected_next_bill_date"
              label="Expected Next Bill Date"
              type="date"
              value={form.expected_next_bill_date}
              onChange={(e) => set("expected_next_bill_date", e.target.value)}
              className="h-11 py-0 leading-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-blue-500" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "edit" && (
            <p className="text-xs text-muted-foreground">
              Payment fields are filled from the latest saved payment record. Update them only if you need to
              change card or bank details.
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => set("payment_method", "card")}
              className={`flex-1 rounded-xl border-2 p-4 text-center text-sm font-medium transition-all ${
                form.payment_method === "card"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <CreditCard className="mx-auto mb-1.5 h-5 w-5" />
              Card
            </button>
            <button
              type="button"
              onClick={() => set("payment_method", "checking")}
              className={`flex-1 rounded-xl border-2 p-4 text-center text-sm font-medium transition-all ${
                form.payment_method === "checking"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <Building2 className="mx-auto mb-1.5 h-5 w-5" />
              Checking
            </button>
          </div>

          {form.payment_method === "card" && (
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  id="card_number"
                  label="Card Number"
                  placeholder="XXXX XXXX XXXX XXXX"
                  value={form.card_number}
                  onChange={(e) => set("card_number", e.target.value)}
                />
                <Input
                  id="card_exp"
                  label="Expiry (MM/YY)"
                  placeholder="MM/YY"
                  value={form.card_exp}
                  onChange={(e) => set("card_exp", e.target.value)}
                />
                <Input
                  id="card_cvv"
                  label="CVV"
                  type="text"
                  placeholder="XXX"
                  autoComplete="off"
                  value={form.card_cvv}
                  onChange={(e) => set("card_cvv", e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="card_billing_address"
                  label="Billing Address"
                  value={form.card_billing_address}
                  onChange={(e) => set("card_billing_address", e.target.value)}
                />
                <Input
                  id="merchant_name"
                  label="Merchant Name"
                  value={form.merchant_name}
                  onChange={(e) => set("merchant_name", e.target.value)}
                />
              </div>
            </div>
          )}

          {form.payment_method === "checking" && (
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="routing_number"
                  label="Routing Number"
                  type={mode === "edit" ? "text" : "password"}
                  autoComplete="off"
                  value={form.routing_number}
                  onChange={(e) => set("routing_number", e.target.value)}
                />
                <Input
                  id="bank_account_number"
                  label="Account Number"
                  type={mode === "edit" ? "text" : "password"}
                  autoComplete="off"
                  value={form.bank_account_number}
                  onChange={(e) => set("bank_account_number", e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="bank_account_holder_name"
                  label="Account Holder Name"
                  value={form.bank_account_holder_name}
                  onChange={(e) => set("bank_account_holder_name", e.target.value)}
                />
                <Input
                  id="bank_name"
                  label="Bank Name"
                  value={form.bank_name}
                  onChange={(e) => set("bank_name", e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-orange-500" />
            Notes & Additional Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RichTextEditor
            id="other_sale_data"
            label="Other Sale Data"
            placeholder="Any additional information regarding this sale..."
            value={form.other_sale_data}
            onChange={(value) => set("other_sale_data", value)}
          />
          <Textarea
            id="sales_notes"
            label="Sales Notes for Processing"
            placeholder="Notes for the processing team..."
            value={form.sales_notes}
            onChange={(e) => set("sales_notes", e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Attachments */}
      {mode === "edit" && saleId ? (
        <SaleAttachmentsSection
          saleId={saleId}
          initialAttachments={initialAttachments}
          mode="edit"
          userRole={userRole}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-orange-500" />
              Attachments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              id="new-sale-attachments"
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;
                setPendingFiles((prev) => [...prev, ...files]);
                e.currentTarget.value = "";
              }}
              disabled={loading}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Add images or documents now. They’ll upload automatically after you click “Create Sale”.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("new-sale-attachments")?.click()}
                disabled={loading}
              >
                <Upload className="h-4 w-4" />
                <span className="ml-2">Add files</span>
              </Button>
            </div>

            {pendingFiles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <p className="text-sm font-medium">No attachments selected</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supported: images, PDF, Word, Excel.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingFiles.map((f, idx) => (
                  <div
                    key={`${f.name}-${f.size}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/10 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{f.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {Math.round((f.size / 1024) * 10) / 10} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                      disabled={loading}
                      title="Remove"
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="min-w-[140px]">
          {loading ? <Spinner /> : mode === "edit" ? "Update Sale" : "Create Sale"}
        </Button>
      </div>
    </form>
  );
}
