"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loading";
import { createCustomer, getCustomerSsnForEdit, updateCustomer } from "@/lib/actions/customers";
import { createNote } from "@/lib/actions/notes";
import { Pencil } from "lucide-react";

interface CustomerFormDialogProps {
  customer?: {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    dob: string;
    account_no?: string;
  };
  open?: boolean;
  onClose?: () => void;
}

export function CustomerFormDialog({
  customer,
  open: externalOpen,
  onClose: externalClose,
}: CustomerFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen ?? internalOpen;
  const close = externalClose ?? (() => setInternalOpen(false));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!customer;

  const [form, setForm] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
    address: customer?.address || "",
    dob: customer?.dob || "",
    ssn: "",
    account_no: customer?.account_no || "",
    notes: "",
  });

  useEffect(() => {
    if (!isOpen || !isEdit || !customer?.id) return;
    let cancelled = false;

    const loadSsn = async () => {
      try {
        const ssn = await getCustomerSsnForEdit(customer.id);
        if (!cancelled) {
          setForm((f) => ({ ...f, ssn }));
        }
      } catch {
        // keep form usable even if ssn fetch fails
      }
    };

    void loadSsn();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isEdit, customer?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isEdit) {
        await updateCustomer(customer.id, form);
        if (form.notes.trim()) {
          await createNote({ customer_id: customer.id, content: form.notes.trim() });
        }
      } else {
        const newCustomerId = await createCustomer(form);
        if (form.notes.trim()) {
          await createNote({ customer_id: newCustomerId, content: form.notes.trim() });
        }
      }
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
    setLoading(false);
  };

  if (!isOpen && customer) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setInternalOpen(true)}>
        <Pencil className="h-3 w-3" />
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onClose={close}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Call Log Response" : "New Call Log Response"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4" noValidate>
        <Input
          id="name"
          label="Full Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            id="phone"
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="dob"
            label="Date of Birth"
            type="date"
            value={form.dob}
            onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
          />
          <Input
            id="ssn"
            label="SSN"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="XXX-XX-XXXX"
            value={form.ssn}
            onChange={(e) => setForm((f) => ({ ...f, ssn: e.target.value }))}
          />
        </div>
        <Input
          id="address"
          label="Address"
          placeholder="Enter address"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
        />
        <Input
          id="account_no"
          label="Account Number"
          placeholder="Account / Policy No."
          value={form.account_no}
          onChange={(e) => setForm((f) => ({ ...f, account_no: e.target.value }))}
        />
        <Textarea
          id="notes"
          label="Notes / Comments"
          placeholder="Write lead notes or response details..."
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner /> : isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
