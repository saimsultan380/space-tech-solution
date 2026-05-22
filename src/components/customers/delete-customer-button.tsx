"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loading";
import { deleteCustomer } from "@/lib/actions/customers";
import { Trash2 } from "@/components/ui/icons";

export function DeleteCustomerButton({
  id,
  name,
  onDeleted,
}: {
  id: string;
  name: string;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteCustomer(id);
      setOpen(false);
      onDeleted?.();
    } catch {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
      <Dialog open={open} onClose={() => !loading && setOpen(false)}>
        <DialogHeader>
          <DialogTitle>Delete Call Log Response</DialogTitle>
        </DialogHeader>
        <DialogDescription className="mt-2 text-left">
          Are you sure you want to delete <strong>{name}</strong>? This will
          also delete all related sales and records. This action cannot be
          undone.
        </DialogDescription>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? <Spinner /> : "Delete"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
