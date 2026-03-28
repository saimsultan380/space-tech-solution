"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { notifyAdminAboutAccount } from "@/lib/actions/processing-accounts";
import { Bell } from "lucide-react";

interface NotifyAdminDialogProps {
  open: boolean;
  accountId: string;
  onClose: () => void;
}

export function NotifyAdminDialog({
  open,
  accountId,
  onClose,
}: NotifyAdminDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError("Please enter a message for the admin");
      return;
    }

    startTransition(async () => {
      try {
        await notifyAdminAboutAccount(accountId, message);
        setSuccess(true);
        setTimeout(() => {
          router.refresh();
          handleClose();
        }, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send notification");
      }
    });
  };

  const handleClose = () => {
    setMessage("");
    setError("");
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notify Admin
        </DialogTitle>
        <DialogDescription>
          Send a notification to all administrators about this processing account.
        </DialogDescription>
      </DialogHeader>

      {success ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <Bell className="h-6 w-6 text-success" />
          </div>
          <p className="text-sm font-medium text-success">
            Notification sent successfully!
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <Textarea
            id="notification_message"
            label="Message *"
            placeholder="Describe the issue or concern about this account..."
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setError("");
            }}
            error={error}
            rows={4}
          />

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
              {isPending ? "Sending..." : "Send Notification"}
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}
