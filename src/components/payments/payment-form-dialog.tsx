"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loading";
import { createPayment } from "@/lib/actions/payments";
import { PAYMENT_METHODS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

interface PaymentFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PaymentFormDialog({ open, onClose }: PaymentFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sales, setSales] = useState<Array<{ id: string; company_name: string; customer_id: string; charged_amount: number }>>([]);

  const [form, setForm] = useState({
    sale_id: "",
    method: "card",
    amount: "",
    card_number: "",
    bank_name: "",
    bank_account: "",
  });

  useEffect(() => {
    const fetchSales = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("sales")
        .select("id, company_name, customer_id, charged_amount")
        .eq("status", "approved");
      setSales(data || []);
    };
    if (open) fetchSales();
  }, [open]);

  const selectedSale = sales.find((s) => s.id === form.sale_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createPayment({
        sale_id: form.sale_id,
        customer_id: selectedSale?.customer_id || "",
        method: form.method,
        amount: Number(form.amount),
        card_number: form.method === "card" ? form.card_number : undefined,
        bank_name: form.method === "bank" ? form.bank_name : undefined,
        bank_account: form.method === "bank" ? form.bank_account : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Record Payment</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <Select
          id="sale_id"
          label="Sale"
          options={sales.map((s) => ({
            value: s.id,
            label: `${s.company_name} - $${s.charged_amount}`,
          }))}
          placeholder="Select a sale"
          value={form.sale_id}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              sale_id: e.target.value,
              amount: String(sales.find((s) => s.id === e.target.value)?.charged_amount || ""),
            }))
          }
          required
        />

        <Select
          id="method"
          label="Payment Method"
          options={PAYMENT_METHODS}
          value={form.method}
          onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
          required
        />

        <Input
          id="amount"
          label="Amount ($)"
          type="number"
          step="0.01"
          min="0"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          required
        />

        {form.method === "card" && (
          <Input
            id="card_number"
            label="Card Number"
            type="password"
            placeholder="XXXX XXXX XXXX XXXX"
            value={form.card_number}
            onChange={(e) => setForm((f) => ({ ...f, card_number: e.target.value }))}
            required
          />
        )}

        {form.method === "bank" && (
          <>
            <Input
              id="bank_name"
              label="Bank Name"
              value={form.bank_name}
              onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
              required
            />
            <Input
              id="bank_account"
              label="Account Number"
              type="password"
              value={form.bank_account}
              onChange={(e) => setForm((f) => ({ ...f, bank_account: e.target.value }))}
              required
            />
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner /> : "Record Payment"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
