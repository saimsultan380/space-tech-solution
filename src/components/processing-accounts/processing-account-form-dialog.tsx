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
import type {
  UserRole,
  ProcessingAccountStatus,
  ProcessingAccountType,
} from "@/lib/types";
import { Save, Building2, CreditCard } from "@/components/ui/icons";

interface ProcessingAccountFormDialogProps {
  open: boolean;
  onClose: () => void;
  userRole: UserRole;
  account?: {
    id: string;
    account_holder_name: string | null;
    billing_address: string | null;
    status: ProcessingAccountStatus | null;
    notes: string | null;
  } | null;
  onSuccess?: () => void;
}

const emptyForm = {
  account_type: "checkin" as ProcessingAccountType,
  account_holder_name: "",
  routing_number: "",
  account_number: "",
  card_number: "",
  expiration_date: "",
  cvv: "",
  billing_address: "",
  status: "" as ProcessingAccountStatus | "",
  notes: "",
};

export function ProcessingAccountFormDialog({
  open,
  onClose,
  userRole,
  account,
  onSuccess,
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
          const accountType =
            (full.account_type as ProcessingAccountType) || "checkin";
          const isAdmin = userRole === "super_admin";
          setForm({
            account_type: accountType,
            account_holder_name: full.account_holder_name || "",
            routing_number: full.routing_number || "",
            account_number: full.account_number || "",
            card_number: isAdmin
              ? full.card_number || ""
              : full.card_number
                ? `****${full.card_number.slice(-4)}`
                : "",
            expiration_date: full.expiration_date || "",
            cvv: isAdmin ? full.cvv || "" : full.cvv ? "***" : "",
            billing_address: full.billing_address || "",
            status: (full.status || "") as ProcessingAccountStatus | "",
            notes: full.notes || "",
          });
        })
        .catch(() => {
          setForm({
            ...emptyForm,
            account_holder_name: account.account_holder_name || "",
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
  }, [
    open,
    account?.id,
    account?.account_holder_name,
    account?.billing_address,
    account?.notes,
    account?.status,
  ]);

  const handleClose = () => {
    onClose();
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const payload = {
          account_type: form.account_type,
          account_holder_name: form.account_holder_name,
          billing_address: form.billing_address,
          status: form.status,
          notes: form.notes || undefined,
          ...(form.account_type === "checkin"
            ? {
                routing_number: form.routing_number,
                account_number: form.account_number,
              }
            : {
                card_number: form.card_number,
                expiration_date: form.expiration_date,
                cvv: form.cvv,
              }),
        };

        if (account?.id) {
          await updateProcessingAccount(account.id, payload);
        } else {
          await createProcessingAccount(payload);
        }
        router.refresh();
        handleClose();
        onSuccess?.();
      } catch (error) {
        setErrors({
          submit: error instanceof Error ? error.message : "An error occurred",
        });
      }
    });
  };

  const isCard = form.account_type === "card";

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
          {/* ── Account Type Tabs ── */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, account_type: "checkin" }))
              }
              className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                !isCard
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Building2 className="h-4 w-4" />
              CheckIn Account
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, account_type: "card" }))}
              className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isCard
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Credit/Debit Card
            </button>
          </div>

          {/* ── Common: Account Holder Name ── */}
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

          {/* ── CheckIn Account Fields ── */}
          {!isCard && (
            <>
              <Input
                id="routing_number"
                label="Routing Number"
                placeholder="Routing number (any length, optional)"
                value={form.routing_number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, routing_number: e.target.value }))
                }
                error={errors.routing_number}
              />

              <Input
                id="account_number"
                label="Account Number"
                placeholder="Account number (optional)"
                value={form.account_number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, account_number: e.target.value }))
                }
                error={errors.account_number}
              />
            </>
          )}

          {/* ── Credit/Debit Card Fields ── */}
          {isCard && (
            <>
              <Input
                id="card_number"
                label="Credit/Debit Card Number"
                placeholder="Card number (optional)"
                value={form.card_number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, card_number: e.target.value }))
                }
                error={errors.card_number}
              />

              <div>
                <label
                  htmlFor="expiration_date"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Expiration Date
                </label>
                <input
                  id="expiration_date"
                  type="month"
                  value={form.expiration_date}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      expiration_date: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="MM/YYYY"
                />
                {errors.expiration_date && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.expiration_date}
                  </p>
                )}
              </div>

              <Input
                id="cvv"
                label="CVV"
                placeholder="CVV (optional)"
                value={form.cvv}
                maxLength={4}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cvv: e.target.value }))
                }
                error={errors.cvv}
              />
            </>
          )}

          {/* ── Common: Billing Address, Status, Notes ── */}
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
            options={[
              { value: "", label: "Not set" },
              ...PROCESSING_ACCOUNT_STATUSES,
            ]}
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
