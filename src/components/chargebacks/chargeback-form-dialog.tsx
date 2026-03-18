"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loading";
import Link from "next/link";
import { createChargeback } from "@/lib/actions/chargebacks";
import { createClient } from "@/lib/supabase/client";

interface ChargebackFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ChargebackFormDialog({ open, onClose }: ChargebackFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sales, setSales] = useState<
    Array<{ id: string; company_name: string; customer_id: string | null; customer_name: string | null }>
  >([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");

  const [form, setForm] = useState({
    sale_id: "",
    date: new Date().toISOString().split("T")[0],
    reason: "",
  });

  useEffect(() => {
    const fetchSales = async () => {
      const supabase = createClient();
      const { data: salesData } = await supabase
        .from("sales")
        .select("id, company_name, customer_id, customer_name")
        .eq("status", "approved");
      setSales(salesData || []);

      const { data: customersData } = await supabase
        .from("customers")
        .select("id, name")
        .order("name", { ascending: true });
      setCustomers(customersData || []);
    };
    if (open) fetchSales();
  }, [open]);

  const filteredSales =
    selectedCustomerId === "all"
      ? sales
      : sales.filter((s) => s.customer_id === selectedCustomerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createChargeback(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create chargeback");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>New Chargeback</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Customer</label>
          <Select
            id="customer_id"
            aria-label="Customer"
            options={[
              { value: "all", label: "All customers" },
              ...customers.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={selectedCustomerId}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedCustomerId(value);
              setForm((f) => ({ ...f, sale_id: "" }));
            }}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Sale</label>
            <Link
              href="/dashboard/call-logs-responses"
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80"
            >
              Customer List/Database
            </Link>
          </div>
          <Select
            id="sale_id"
            aria-label="Sale"
            options={filteredSales.map((s) => ({
              value: s.id,
              label: s.customer_name ? `${s.customer_name} - ${s.company_name}` : s.company_name,
            }))}
            placeholder="Select a sale"
            value={form.sale_id}
            onChange={(e) => setForm((f) => ({ ...f, sale_id: e.target.value }))}
            required
          />
        </div>
        <Input
          id="date"
          label="Chargeback Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          required
        />
        <Textarea
          id="reason"
          label="Reason"
          placeholder="Describe the reason for this chargeback..."
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          required
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner /> : "Create Chargeback"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
