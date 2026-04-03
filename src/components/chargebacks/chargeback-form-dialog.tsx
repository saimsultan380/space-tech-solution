"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loading";
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
  const [assignableUsers, setAssignableUsers] = useState<Array<{ id: string; full_name: string; role: string }>>([]);

  const [form, setForm] = useState({
    sale_id: "",
    assigned_to: "",
    date: new Date().toISOString().split("T")[0],
    reason: "",
  });

  useEffect(() => {
    if (!open) return;

    setError("");
    setForm({
      sale_id: "",
      assigned_to: "",
      date: new Date().toISOString().split("T")[0],
      reason: "",
    });

    const supabase = createClient();
    const load = async () => {
      const [{ data: salesData }, { data: usersData }] = await Promise.all([
        supabase
          .from("sales")
          .select("id, company_name, customer_id, customer_name")
          .neq("status", "rejected")
          .order("company_name", { ascending: true }),
        supabase
          .from("users")
          .select("id, full_name, role")
          .eq("is_active", true)
          .order("full_name", { ascending: true }),
      ]);
      setSales(salesData || []);
      setAssignableUsers(usersData || []);
    };
    void load();
  }, [open]);

  const selectedSale = useMemo(
    () => sales.find((s) => s.id === form.sale_id) ?? null,
    [sales, form.sale_id],
  );

  const customerDisplay = !selectedSale
    ? "Select a sale first"
    : selectedSale.customer_name?.trim() || selectedSale.company_name || "—";

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
          <Select
            id="sale_id"
            label="Sale"
            aria-label="Sale"
            options={sales.map((s) => ({
              value: s.id,
              label: s.customer_name ? `${s.customer_name} — ${s.company_name}` : s.company_name,
            }))}
            placeholder="Select a sale"
            value={form.sale_id}
            onChange={(e) => setForm((f) => ({ ...f, sale_id: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="chargeback_customer_display" className="text-sm font-medium text-foreground">
            Customer
          </label>
          <div
            id="chargeback_customer_display"
            className="flex min-h-12 w-full items-center rounded-md border border-input bg-muted/40 px-3.5 py-2 text-sm text-muted-foreground"
          >
            {customerDisplay}
          </div>
        </div>

        <div className="space-y-1.5">
          <Select
            id="assigned_to"
            label="Assign to"
            aria-label="Assign to"
            options={assignableUsers.map((u) => ({
              value: u.id,
              label: `${u.full_name} (${u.role.replace("_", " ")})`,
            }))}
            placeholder="Select a user"
            value={form.assigned_to}
            onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
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
