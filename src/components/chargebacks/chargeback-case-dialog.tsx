"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/loading";
import { addChargebackNote, getChargebackCaseDetails } from "@/lib/actions/chargebacks";
import { formatDate } from "@/lib/utils";

interface ChargebackCaseDialogProps {
  open: boolean;
  chargebackId: string | null;
  onClose: () => void;
}

interface ChargebackDetailsNote {
  id: string;
  content: string;
  created_at: string;
  user?: { id?: string; full_name?: string } | { id?: string; full_name?: string }[] | null;
}

interface ChargebackDetailsActivity {
  id: string;
  event_type: string;
  details: string | null;
  created_at: string;
  actor?: { id?: string; full_name?: string } | { id?: string; full_name?: string }[] | null;
}

interface ChargebackNoteRow {
  id: string;
  content: string;
  created_at: string;
  user: { id: string; full_name: string } | null;
}

interface ChargebackActivityRow {
  id: string;
  event_type: string;
  details: string | null;
  created_at: string;
  actor: { id: string; full_name: string } | null;
}

function asSingleUser(
  value: { id?: string; full_name?: string } | { id?: string; full_name?: string }[] | null | undefined,
) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ? { id: String(value[0].id || ""), full_name: String(value[0].full_name || "") } : null;
  return { id: String(value.id || ""), full_name: String(value.full_name || "") };
}

export function ChargebackCaseDialog({ open, chargebackId, onClose }: ChargebackCaseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<ChargebackNoteRow[]>([]);
  const [activity, setActivity] = useState<ChargebackActivityRow[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !chargebackId) return;
    setLoading(true);
    setError("");
    setNoteInput("");
    startTransition(async () => {
      try {
        const details = await getChargebackCaseDetails(chargebackId);
        setNotes(
          ((details.notes as unknown as ChargebackDetailsNote[]) || []).map((note: ChargebackDetailsNote) => ({
            id: note.id,
            content: note.content,
            created_at: note.created_at,
            user: asSingleUser(note.user),
          })),
        );
        setActivity(
          ((details.activity as unknown as ChargebackDetailsActivity[]) || []).map((event: ChargebackDetailsActivity) => ({
            id: event.id,
            event_type: event.event_type,
            details: event.details,
            created_at: event.created_at,
            actor: asSingleUser(event.actor),
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load case details.");
      } finally {
        setLoading(false);
      }
    });
  }, [open, chargebackId, startTransition]);

  const refreshDetails = async () => {
    if (!chargebackId) return;
    const details = await getChargebackCaseDetails(chargebackId);
    setNotes(
      ((details.notes as unknown as ChargebackDetailsNote[]) || []).map((note: ChargebackDetailsNote) => ({
        id: note.id,
        content: note.content,
        created_at: note.created_at,
        user: asSingleUser(note.user),
      })),
    );
    setActivity(
      ((details.activity as unknown as ChargebackDetailsActivity[]) || []).map((event: ChargebackDetailsActivity) => ({
        id: event.id,
        event_type: event.event_type,
        details: event.details,
        created_at: event.created_at,
        actor: asSingleUser(event.actor),
      })),
    );
  };

  const handleAddNote = async () => {
    if (!chargebackId) return;
    const text = noteInput.trim();
    if (!text) return;
    setSavingNote(true);
    setError("");
    try {
      await addChargebackNote(chargebackId, text);
      setNoteInput("");
      await refreshDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note.");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Chargeback Case Notes & Activity</DialogTitle>
        <DialogDescription>
          Keep internal communication and timeline updates in one place for this case.
        </DialogDescription>
      </DialogHeader>

      {loading || isPending ? (
        <div className="py-8 text-center">
          <Spinner />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-md border border-border p-3">
            <h3 className="text-sm font-semibold">Notes</h3>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="rounded-md border border-border p-2.5">
                    <p className="text-sm">{note.content}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {note.user?.full_name || "Unknown"} • {formatDate(note.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
            <Textarea
              id="chargeback_note_input"
              placeholder="Add note about calls, follow-ups, dispute updates..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={() => void handleAddNote()} disabled={savingNote}>
                {savingNote ? <Spinner /> : "Add Note"}
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-border p-3">
            <h3 className="text-sm font-semibold">Activity Log</h3>
            <div className="max-h-[356px] space-y-2 overflow-y-auto pr-1">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                activity.map((event) => (
                  <div key={event.id} className="rounded-md border border-border p-2.5">
                    <p className="text-sm font-medium capitalize">{event.event_type.replace(/_/g, " ")}</p>
                    <p className="text-sm text-muted-foreground">{event.details || "-"}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {event.actor?.full_name || "System"} • {formatDate(event.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
