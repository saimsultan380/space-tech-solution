"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loading";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import { Pencil } from "lucide-react";

interface CustomerFormDialogProps {
  customer?: {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    dob: string;
    cnic?: string;
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
    cnic: customer?.cnic || "",
    account_no: customer?.account_no || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isEdit) {
        await updateCustomer(customer.id, form);
      } else {
        await createCustomer(form);
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
        <DialogTitle>{isEdit ? "Edit Customer" : "New Customer"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <Input
          id="name"
          label="Full Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <Input
            id="phone"
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            required
          />
        </div>
        <Input
          id="address"
          label="Address"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
        />
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
            label={isEdit ? "SSN (leave blank to keep)" : "SSN"}
            type="password"
            placeholder="XXX-XX-XXXX"
            value={form.ssn}
            onChange={(e) => setForm((f) => ({ ...f, ssn: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="cnic"
            label="CNIC / National ID"
            placeholder="XXXXX-XXXXXXX-X"
            value={form.cnic}
            onChange={(e) => setForm((f) => ({ ...f, cnic: e.target.value }))}
          />
          <Input
            id="account_no"
            label="Account Number"
            placeholder="Account / Policy No."
            value={form.account_no}
            onChange={(e) => setForm((f) => ({ ...f, account_no: e.target.value }))}
          />
        </div>

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
