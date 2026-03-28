"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteProcessingAccount } from "@/lib/actions/processing-accounts";
import { Trash2 } from "lucide-react";

interface DeleteProcessingAccountButtonProps {
  id: string;
  name: string;
}

export function DeleteProcessingAccountButton({
  id,
  name,
}: DeleteProcessingAccountButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteProcessingAccount(id);
        router.refresh();
        setOpen(false);
      } catch (error) {
        console.error("Failed to delete processing account:", error);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
        title="Delete account"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogHeader>
          <DialogTitle>Delete Processing Account</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the processing account for{" "}
            <strong>{name}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete Account"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
