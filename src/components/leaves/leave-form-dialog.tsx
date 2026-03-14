"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loading";
import { LEAVE_TYPES } from "@/lib/constants";
import { createLeave } from "@/lib/actions/leaves";

interface LeaveFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export function LeaveFormDialog({ open, onClose }: LeaveFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    type: "sick",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.end_date < form.start_date) {
      setError("End date cannot be before start date");
      setLoading(false);
      return;
    }

    try {
      await createLeave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply for leave");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Apply for Leave</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <Select
          id="type"
          label="Leave Type"
          options={LEAVE_TYPES}
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="start_date"
            label="Start Date"
            type="date"
            value={form.start_date}
            onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            required
          />
          <Input
            id="end_date"
            label="End Date"
            type="date"
            value={form.end_date}
            onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            required
          />
        </div>
        <Textarea
          id="reason"
          label="Reason"
          placeholder="Describe the reason for this leave..."
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          required
        />

        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner /> : "Submit Request"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

