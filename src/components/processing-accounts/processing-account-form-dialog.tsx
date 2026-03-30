"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createProcessingAccount,
  updateProcessingAccount,
  getProcessingAccount,
} from "@/lib/actions/processing-accounts";
import { PROCESSING_ACCOUNT_STATUSES } from "@/lib/constants";
import type { ProcessingAccountStatus } from "@/lib/types";
import { Save } from "lucide-react";

interface ProcessingAccountFormDialogProps {
  open: boolean;
  onClose: () => void;
  account?: {
    id: string;
    account_holder_name: string;
    billing_address: string;
    status: ProcessingAccountStatus | null;
    notes: string | null;
  } | null;
}

const emptyForm = {
  account_holder_name: "",
  routing_number: "",
  account_number: "",
  billing_address: "",
  status: "" as ProcessingAccountStatus | "",
  notes: "",
};

export function ProcessingAccountFormDialog({
  open,
  onClose,
  account,
}: ProcessingAccountFormDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingAccount, setLoadingAccount] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (account?.id) {
      setLoadingAccount(true);
      getProcessingAccount(account.id)
        .then((full) => {
          setForm({
            account_holder_name: full.account_holder_name || "",
            routing_number: full.routing_number || "",
            account_number: full.account_number || "",
            billing_address: full.billing_address || "",
            status: full.status,
            notes: full.notes || "",
          });
        })
        .catch(() => {
          setForm({
            account_holder_name: account.account_holder_name || "",
            routing_number: "",
            account_number: "",
            billing_address: account.billing_address || "",
            status: account.status || "",
            notes: account.notes || "",
          });
        })
        .finally(() => setLoadingAccount(false));
    } else {
      setForm(emptyForm);
      setLoadingAccount(false);
    }
    setErrors({});
  }, [open, account?.id]);

  const handleClose = () => {
    onClose();
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        if (account?.id) {
          await updateProcessingAccount(account.id, {
            account_holder_name: form.account_holder_name,
            routing_number: form.routing_number,
            account_number: form.account_number,
            billing_address: form.billing_address,
            status: form.status,
            notes: form.notes || undefined,
          });
        } else {
          await createProcessingAccount({
            account_holder_name: form.account_holder_name,
            routing_number: form.routing_number,
            account_number: form.account_number,
            billing_address: form.billing_address,
            status: form.status,
            notes: form.notes || undefined,
          });
        }
        router.refresh();
        handleClose();
      } catch (error) {
        setErrors({
          submit:
            error instanceof Error ? error.message : "An error occurred",
        });
      }
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {account?.id ? "Edit Processing Account" : "Add Processing Account"}
        </DialogTitle>
        <DialogDescription>
          {account?.id
            ? "Update the processing account details below."
            : "Enter the details for the new processing account. Leave fields blank if you do not have them yet."}
        </DialogDescription>
      </DialogHeader>

      {loadingAccount ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading account…
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <Input
            id="account_holder_name"
            label="Account Holder Name"
            placeholder="Enter account holder full name"
            value={form.account_holder_name}
            onChange={(e) =>
              setForm((f) => ({ ...f, account_holder_name: e.target.value }))
            }
            error={errors.account_holder_name}
          />

          <Input
            id="routing_number"
            label="Routing Number"
            placeholder={
              account?.id
                ? "Routing number (any length)"
                : "Routing number (any length, optional)"
            }
            value={form.routing_number}
            onChange={(e) =>
              setForm((f) => ({ ...f, routing_number: e.target.value }))
            }
            error={errors.routing_number}
          />

          <Input
            id="account_number"
            label="Account Number"
            placeholder={
              account?.id
                ? "Account number"
                : "Account number (optional)"
            }
            value={form.account_number}
            onChange={(e) =>
              setForm((f) => ({ ...f, account_number: e.target.value }))
            }
            error={errors.account_number}
          />

          <Textarea
            id="billing_address"
            label="Billing Address"
            placeholder="Enter billing address if available"
            value={form.billing_address}
            onChange={(e) =>
              setForm((f) => ({ ...f, billing_address: e.target.value }))
            }
            error={errors.billing_address}
            rows={3}
          />

          <Select
            id="status"
            label="Status"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as ProcessingAccountStatus | "",
              }))
            }
            options={[{ value: "", label: "Not set" }, ...PROCESSING_ACCOUNT_STATUSES]}
            placeholder="Select status"
          />

          <Textarea
            id="notes"
            label="Notes"
            placeholder="Add any additional notes or details here..."
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
          />

          {errors.submit && (
            <p className="text-sm text-destructive">{errors.submit}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isPending ? "Saving..." : "Save Account"}
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}
