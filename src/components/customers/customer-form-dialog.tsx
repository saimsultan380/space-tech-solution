"use client";

import { useState } from "react";
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
import {
  createCustomer,
  updateCustomer,
} from "@/lib/actions/customers";
import { createNote } from "@/lib/actions/notes";
import { Pencil } from "@/components/ui/icons";

interface CustomerFormDialogProps {
  customer?: {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    dob: string | null;
    account_no?: string;
  };
  open?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function CustomerFormDialog({
  customer,
  open: externalOpen,
  onClose: externalClose,
  onSuccess,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const phone = form.phone.trim();
      if (!phone) {
        throw new Error("Phone number is required.");
      }
      const payload = {
        ...form,
        phone,
        name: form.name.trim() || phone,
        email: form.email.trim(),
      };
      if (isEdit) {
        await updateCustomer(customer.id, payload);
        if (form.notes.trim()) {
          await createNote({
            customer_id: customer.id,
            content: form.notes.trim(),
          });
        }
      } else {
        const newCustomerId = await createCustomer(payload);
        if (form.notes.trim()) {
          await createNote({
            customer_id: newCustomerId,
            content: form.notes.trim(),
          });
        }
      }
      close();
      onSuccess?.();
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
        <DialogTitle>
          {isEdit ? "Edit Call Log Response" : "New Call Log Response"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4" noValidate>
        <Input
          id="phone"
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          required
        />
        <Textarea
          id="notes"
          label="Response"
          placeholder="Write the call response..."
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

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
