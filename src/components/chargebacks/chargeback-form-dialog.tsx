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
    Array<{
      id: string;
      company_name: string;
      customer_id: string | null;
      customer_name: string | null;
      customer_phone: string | null;
      customer_email: string | null;
      amount: number | null;
      charged_amount: number | null;
    }>
  >([]);
  const [saleSearch, setSaleSearch] = useState("");
  const [salesLoading, setSalesLoading] = useState(false);
  const [showSaleOptions, setShowSaleOptions] = useState(false);
  const [selectedSaleSnapshot, setSelectedSaleSnapshot] = useState<{
    id: string;
    company_name: string;
    customer_id: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    amount: number | null;
    charged_amount: number | null;
  } | null>(null);
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
    setSaleSearch("");
    setSales([]);
    setShowSaleOptions(false);
    setSelectedSaleSnapshot(null);

    const supabase = createClient();
    const loadUsers = async () => {
      const { data: usersData } = await supabase
        .from("users")
        .select("id, full_name, role")
        .eq("is_active", true)
        .order("full_name", { ascending: true });
      setAssignableUsers(usersData || []);
    };
    void loadUsers();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const supabase = createClient();
    const timer = setTimeout(async () => {
      setSalesLoading(true);
      const q = saleSearch.trim();
      const base = supabase
        .from("sales")
        .select("id, company_name, customer_id, customer_name, customer_phone, customer_email, amount, charged_amount")
        .neq("status", "rejected")
        .order("created_at", { ascending: false })
        .limit(100);

      const numericSearch = Number(q.replace(/,/g, ""));
      const isNumericSearch = q.length > 0 && Number.isFinite(numericSearch);
      const amountOr = isNumericSearch
        ? `,amount.eq.${numericSearch},charged_amount.eq.${numericSearch}`
        : "";
      const query =
        q.length === 0
          ? base
          : base.or(
              `customer_name.ilike.%${q}%,company_name.ilike.%${q}%,customer_phone.ilike.%${q}%,customer_email.ilike.%${q}%,account_holder_name.ilike.%${q}%${amountOr}`,
            );

      const { data: salesData } = await query;
      setSales(salesData || []);
      setSalesLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [open, saleSearch]);

  const selectedSale = useMemo(
    () => sales.find((s) => s.id === form.sale_id) ?? selectedSaleSnapshot,
    [sales, form.sale_id, selectedSaleSnapshot],
  );

  const customerDisplay = !selectedSale
    ? "Select a sale first"
    : selectedSale.customer_name?.trim() || selectedSale.company_name || "—";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!form.sale_id) {
        throw new Error("Please select a sale.");
      }
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
          <label htmlFor="sale_search" className="text-sm font-medium text-foreground">
            Sale
          </label>
          <div className="relative">
            <Input
              id="sale_search"
              aria-label="Sale"
              placeholder="Search and select a sale"
              value={saleSearch}
              onFocus={() => setShowSaleOptions(true)}
              onBlur={() => setTimeout(() => setShowSaleOptions(false), 120)}
              onChange={(e) => {
                const next = e.target.value;
                setSaleSearch(next);
                setShowSaleOptions(true);
                setSelectedSaleSnapshot(null);
                setForm((f) => ({ ...f, sale_id: "" }));
              }}
              required
            />
            {showSaleOptions && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-background shadow-lg">
                <div className="max-h-64 overflow-y-auto py-1">
                  {salesLoading ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Loading sales...</p>
                  ) : sales.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No sales found</p>
                  ) : (
                    sales.map((s) => {
                      const label = s.customer_name
                        ? `${s.customer_name} — ${s.company_name}${s.customer_phone ? ` (${s.customer_phone})` : ""}${s.charged_amount != null ? ` — $${Number(s.charged_amount).toFixed(2)}` : ""}`
                        : `${s.company_name}${s.customer_phone ? ` (${s.customer_phone})` : ""}${s.charged_amount != null ? ` — $${Number(s.charged_amount).toFixed(2)}` : ""}`;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedSaleSnapshot(s);
                            setForm((f) => ({ ...f, sale_id: s.id }));
                            setSaleSearch(label);
                            setShowSaleOptions(false);
                          }}
                        >
                          {label}
                        </button>
                      );
                    })
                  )}
                </div>
                <p className="border-t border-input px-3 py-1.5 text-xs text-muted-foreground">
                  {sales.length >= 100
                    ? "Showing first 100 results. Keep typing to narrow your search."
                    : `${sales.length} sale${sales.length === 1 ? "" : "s"} found`}
                </p>
              </div>
            )}
          </div>
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
