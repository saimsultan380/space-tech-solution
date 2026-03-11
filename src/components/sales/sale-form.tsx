"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/loading";
import { createSale, updateSaleDetails } from "@/lib/actions/sales";
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
} from "lucide-react";

interface SaleFormProps {
  customers: Array<{ id: string; name: string }>;
  mode?: "create" | "edit";
  saleId?: string;
  initialValues?: Partial<typeof emptyForm>;
}

const emptyForm = {
  sale_type: "utility",
  subtype: "new",
  customer_id: "",
  sale_date: new Date().toISOString().split("T")[0],
  customer_phone: "",
  customer_name: "",
  customer_email: "",
  service_address: "",
  account_holder_name: "",
  company_name: "",
  dob: "",
  ssn: "",
  amount: "",
  discount: "0",
  billed_month: "",
  next_billing_date: "",
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

export function SaleForm({ customers, mode = "create", saleId, initialValues }: SaleFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ ...emptyForm, ...initialValues });

  const isUtility = form.sale_type === "utility";
  const isInsurance = form.sale_type === "insurance";
  const subtypeOptions = isUtility ? UTILITY_SUBTYPES : INSURANCE_SUBTYPES;
  const chargedAmount = Number(form.amount || 0) - Number(form.discount || 0);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleCustomerSelect = (customerId: string) => {
    set("customer_id", customerId);
    const c = customers.find((x) => x.id === customerId);
    if (c) set("customer_name", c.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "edit" && saleId) {
        await updateSaleDetails({
          ...form,
          id: saleId,
          amount: Number(form.amount),
          discount: Number(form.discount),
        } as any);
      } else {
        await createSale({
          ...form,
          amount: Number(form.amount),
          discount: Number(form.discount),
        } as any);
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

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-violet-500" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            id="customer_id"
            label="Customer"
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select a customer"
            value={form.customer_id}
            onChange={(e) => handleCustomerSelect(e.target.value)}
            required
          />
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
          <div className="grid gap-4 sm:grid-cols-3">
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
              id="dob"
              label="Date of Birth"
              type="date"
              value={form.dob}
              onChange={(e) => set("dob", e.target.value)}
            />
            <Input
              id="ssn"
              label="SSN"
              type="password"
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
            {isInsurance && (
              <Input
                id="policy_holder_name"
                label="Policy Holder Name"
                value={form.policy_holder_name}
                onChange={(e) => set("policy_holder_name", e.target.value)}
              />
            )}
          </div>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="billed_month"
              label="Billed Month"
              type="month"
              value={form.billed_month}
              onChange={(e) => set("billed_month", e.target.value)}
              required
            />
            <Input
              id="next_billing_date"
              label={isInsurance ? "Next Premium Generated" : "Next Bill Generated"}
              type="date"
              value={form.next_billing_date}
              onChange={(e) => set("next_billing_date", e.target.value)}
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
              Existing payment method is stored securely, so card and bank numbers are not shown. Enter new
              details here only if you need to change the payment.
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
                  type="password"
                  placeholder="XXX"
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
                  type="password"
                  value={form.routing_number}
                  onChange={(e) => set("routing_number", e.target.value)}
                />
                <Input
                  id="bank_account_number"
                  label="Account Number"
                  type="password"
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
          <Textarea
            id="other_sale_data"
            label="Other Sale Data"
            placeholder="Any additional information regarding this sale..."
            value={form.other_sale_data}
            onChange={(e) => set("other_sale_data", e.target.value)}
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
