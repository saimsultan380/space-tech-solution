"use client";

import { useState, useEffect } from "react";
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
  const [sales, setSales] = useState<Array<{ id: string; company_name: string }>>([]);

  const [form, setForm] = useState({
    sale_id: "",
    date: new Date().toISOString().split("T")[0],
    reason: "",
  });

  useEffect(() => {
    const fetchSales = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("sales")
        .select("id, company_name")
        .eq("status", "approved");
      setSales(data || []);
    };
    if (open) fetchSales();
  }, [open]);

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
        <Select
          id="sale_id"
          label="Sale"
          options={sales.map((s) => ({ value: s.id, label: s.company_name }))}
          placeholder="Select a sale"
          value={form.sale_id}
          onChange={(e) => setForm((f) => ({ ...f, sale_id: e.target.value }))}
          required
        />
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
