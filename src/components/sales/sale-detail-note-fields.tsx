"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createNote, updateNote, deleteNote } from "@/lib/actions/notes";
import { Check, CreditCard, FileText, Loader2, Plus, Pencil, X, Trash2 } from "lucide-react";
import type { Note } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

interface SaleDetailNoteFieldsProps {
  saleId: string;
  notes: Note[];
}

function NoteItem({ note, onUpdate, onDelete }: { note: Note, onUpdate: (id: string, content: string) => Promise<void>, onDelete: (id: string) => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [pending, setPending] = useState(false);

  const handleUpdate = async () => {
    if (!content.trim() || content === note.content) {
      setIsEditing(false);
      return;
    }
    setPending(true);
    try {
      await onUpdate(note.id, content);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    }
    setPending(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    setPending(true);
    try {
      await onDelete(note.id);
    } catch (e) {
      console.error(e);
    }
    setPending(false);
  };

  return (
    <div className="group relative rounded-lg border border-border/50 bg-muted/10 p-3 transition-colors hover:bg-muted/20">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground/80">
          {note.user?.full_name || "System"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {formatDateTime(note.created_at)}
          </span>
          {!isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="text-muted-foreground hover:text-primary"
                title="Edit note"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={handleDelete}
                className="text-muted-foreground hover:text-destructive"
                title="Delete note"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[60px] text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdate} disabled={pending}>
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Update"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {note.content}
        </p>
      )}
    </div>
  );
}

function MultiNoteCard({
  title,
  icon,
  notes,
  saleId,
  type,
  placeholder,
}: {
  title: string;
  icon?: ReactNode;
  notes: Note[];
  saleId: string;
  type: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const handleAdd = () => {
    if (!content.trim()) return;
    setError("");
    startTransition(async () => {
      try {
        await createNote({
          content: content.trim(),
          sale_id: saleId,
          type,
        });
        setContent("");
        setIsAdding(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add note");
      }
    });
  };

  const handleUpdateNote = async (id: string, newContent: string) => {
    try {
      await updateNote(id, newContent);
      router.refresh();
    } catch (e) {
      throw e;
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNote(id);
      router.refresh();
    } catch (e) {
      throw e;
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          <span>{title}</span>
        </CardTitle>
        <Button
          type="button"
          size="sm"
          variant={isAdding ? "ghost" : "outline"}
          className="h-8 px-3 gap-1.5"
          onClick={() => setIsAdding(!isAdding)}
          disabled={pending}
        >
          {isAdding ? (
            <>
              <X className="h-3.5 w-3.5" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Add Note
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {isAdding && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              className="min-h-[100px] resize-y border-border/80 text-sm shadow-none focus-visible:ring-1"
              autoFocus
              disabled={pending}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsAdding(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAdd}
                disabled={pending || !content.trim()}
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save Note"
                )}
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {notes.length === 0 && !isAdding ? (
            <p className="text-sm text-muted-foreground italic py-4">No notes recorded yet.</p>
          ) : (
            notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteNote}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );  
}

export function SaleDetailNoteFields({
  saleId,
  notes,
}: SaleDetailNoteFieldsProps) {
  const otherNotes = notes.filter((n) => n.type === "other");
  const salesNotes = notes.filter((n) => n.type === "sales");
  const processingNotes = notes.filter((n) => n.type === "processing");

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MultiNoteCard
        title="Other Sale Data"
        icon={<FileText className="h-4 w-4 text-orange-500" />}
        notes={otherNotes}
        saleId={saleId}
        type="other"
        placeholder="Any additional information regarding this sale…"
      />
      <MultiNoteCard
        title="Sales Notes"
        icon={<CreditCard className="h-4 w-4 text-blue-500" />}
        notes={salesNotes}
        saleId={saleId}
        type="sales"
        placeholder="Notes for the team…"
      />
      <MultiNoteCard
        title="Processing Notes"
        icon={<Pencil className="h-4 w-4 text-violet-500" />}
        notes={processingNotes}
        saleId={saleId}
        type="processing"
        placeholder="Processing notes…"
      />
    </div>
  );
}
