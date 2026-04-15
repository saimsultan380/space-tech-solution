"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loading";
import { X } from "lucide-react";
import { createChargeback } from "@/lib/actions/chargebacks";
import { createClient } from "@/lib/supabase/client";
import { CHARGEBACK_PRIORITIES } from "@/lib/constants";
import type { ChargebackPriority } from "@/lib/types";

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
      agent_id: string | null;
      customer_id: string | null;
      customer_name: string | null;
      customer_phone: string | null;
      customer_email: string | null;
      amount: number | null;
      charged_amount: number | null;
      created_at: string;
    }>
  >([]);
  const [saleCardLastFourById, setSaleCardLastFourById] = useState<Record<string, string>>({});
  const [saleSearch, setSaleSearch] = useState("");
  const [salesLoading, setSalesLoading] = useState(false);
  const [showSaleOptions, setShowSaleOptions] = useState(false);
  const [selectedSaleSnapshot, setSelectedSaleSnapshot] = useState<{
    id: string;
    company_name: string;
    agent_id: string | null;
    customer_id: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    amount: number | null;
    charged_amount: number | null;
      created_at: string;
  } | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<Array<{ id: string; full_name: string; role: string }>>([]);

  const [form, setForm] = useState({
    sale_id: "",
    assigned_to: "",
    date: new Date().toISOString().split("T")[0],
    reason: "",
    priority: "medium" as ChargebackPriority,
  });

  useEffect(() => {
    if (!open) return;

    setError("");
    setForm({
      sale_id: "",
      assigned_to: "",
      date: new Date().toISOString().split("T")[0],
      reason: "",
      priority: "medium" as ChargebackPriority,
    });
    setSaleSearch("");
    setSales([]);
    setSaleCardLastFourById({});
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
        .select(
          "id, company_name, agent_id, customer_id, customer_name, customer_phone, customer_email, amount, charged_amount, created_at",
        )
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

      const cardDigits = q.replace(/\D/g, "");
      const shouldSearchCardLast4 = cardDigits.length >= 2;

      const [{ data: salesData }, { data: paymentMatches }] = await Promise.all([
        query,
        shouldSearchCardLast4
          ? supabase
              .from("payments")
              .select("sale_id")
              .ilike("card_last_four", `%${cardDigits}%`)
              .limit(200)
          : Promise.resolve({ data: [] as Array<{ sale_id: string }> }),
      ]);

      const initialSales = salesData || [];
      const paymentMatchedSaleIds = Array.from(
        new Set((paymentMatches || []).map((row) => row.sale_id).filter(Boolean)),
      );

      const missingSaleIds = paymentMatchedSaleIds.filter(
        (id) => !initialSales.some((sale) => sale.id === id),
      );

      let mergedSales = initialSales;
      if (missingSaleIds.length > 0) {
        const { data: additionalSales } = await supabase
          .from("sales")
          .select(
            "id, company_name, agent_id, customer_id, customer_name, customer_phone, customer_email, amount, charged_amount, created_at",
          )
          .neq("status", "rejected")
          .in("id", missingSaleIds)
          .order("created_at", { ascending: false });
        mergedSales = [...initialSales, ...(additionalSales || [])];
      }

      const dedupedSales = Array.from(new Map(mergedSales.map((sale) => [sale.id, sale])).values()).slice(0, 100);
      setSales(dedupedSales);

      if (dedupedSales.length > 0) {
        const { data: paymentRows } = await supabase
          .from("payments")
          .select("sale_id, card_last_four, created_at")
          .in(
            "sale_id",
            dedupedSales.map((sale) => sale.id),
          )
          .not("card_last_four", "is", null)
          .order("created_at", { ascending: false });

        const lastFourBySaleId: Record<string, string> = {};
        for (const row of paymentRows || []) {
          if (!row.sale_id || !row.card_last_four || lastFourBySaleId[row.sale_id]) continue;
          lastFourBySaleId[row.sale_id] = row.card_last_four;
        }
        setSaleCardLastFourById(lastFourBySaleId);
      } else {
        setSaleCardLastFourById({});
      }

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
              placeholder="Search by name, phone, amount, or card last 4"
              value={saleSearch}
              className={form.sale_id ? "pr-10" : undefined}
              onFocus={() => setShowSaleOptions(true)}
              onBlur={() => setTimeout(() => setShowSaleOptions(false), 120)}
              onChange={(e) => {
                const next = e.target.value;
                setSaleSearch(next);
                setShowSaleOptions(true);
                setSelectedSaleSnapshot(null);
                setForm((f) => ({ ...f, sale_id: "", assigned_to: "" }));
              }}
              required
            />
            {form.sale_id && (
              <button
                type="button"
                aria-label="Clear selected sale"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSaleSearch("");
                  setSelectedSaleSnapshot(null);
                  setShowSaleOptions(false);
                  setForm((f) => ({ ...f, sale_id: "", assigned_to: "" }));
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {showSaleOptions && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-background shadow-lg">
                <div className="max-h-64 overflow-y-auto py-1">
                  {salesLoading ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Loading sales...</p>
                  ) : sales.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No sales found</p>
                  ) : (
                    sales.map((s) => {
                      const cardLastFour = saleCardLastFourById[s.id];
                      const label = s.customer_name
                        ? `${s.customer_name} — ${s.company_name}${s.customer_phone ? ` (${s.customer_phone})` : ""}${s.charged_amount != null ? ` — $${Number(s.charged_amount).toFixed(2)}` : ""}${cardLastFour ? ` — Card ****${cardLastFour}` : ""}`
                        : `${s.company_name}${s.customer_phone ? ` (${s.customer_phone})` : ""}${s.charged_amount != null ? ` — $${Number(s.charged_amount).toFixed(2)}` : ""}${cardLastFour ? ` — Card ****${cardLastFour}` : ""}`;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedSaleSnapshot(s);
                            setForm((f) => ({ ...f, sale_id: s.id, assigned_to: s.agent_id ?? "" }));
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
        <div className="space-y-1.5">
          <Select
            id="priority"
            label="Priority"
            options={CHARGEBACK_PRIORITIES}
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as ChargebackPriority }))}
            required
          />
        </div>
        <Textarea
          id="reason"
          label="Reason"
          placeholder="Describe the reason for this chargeback..."
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
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
