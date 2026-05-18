"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/loading";
import { createNote, toggleNoteImportance, deleteNote } from "@/lib/actions/notes";
import { ROLE_HINT_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import {
  MessageSquare,
  Plus,
  Star,
  StarOff,
  Trash2,
  AlertCircle,
  Filter,
} from "@/components/ui/icons";

interface Note {
  id: string;
  content: string;
  is_important: boolean;
  created_at: string;
  user: { id: string; full_name: string; role: UserRole } | null;
}

interface NotesSectionProps {
  notes: Note[];
  saleId?: string;
  customerId?: string;
}

export function NotesSection({ notes, saleId, customerId }: NotesSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showImportantOnly, setShowImportantOnly] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      await createNote({
        content,
        sale_id: saleId,
        customer_id: customerId,
        is_important: isImportant,
      });
      setContent("");
      setIsImportant(false);
      setShowForm(false);
    } catch {
      // Error handling
    }
    setLoading(false);
  };

  const handleToggleImportance = async (noteId: string, current: boolean) => {
    setTogglingId(noteId);
    try {
      await toggleNoteImportance(noteId, !current);
    } catch {
      // Error handling
    }
    setTogglingId(null);
  };

  const handleDelete = async (noteId: string) => {
    setDeletingId(noteId);
    try {
      await deleteNote(noteId);
    } catch {
      // Error handling
    }
    setDeletingId(null);
  };

  const importantCount = notes.filter((n) => n.is_important).length;
  const filteredNotes = showImportantOnly
    ? notes.filter((n) => n.is_important)
    : notes;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg whitespace-nowrap">
            <MessageSquare className="h-4 w-4" />
            Notes & History
            {notes.length > 0 && (
              <Badge variant="secondary">{notes.length}</Badge>
            )}
          </CardTitle>
          <div className="flex w-full items-center justify-start gap-2 sm:w-auto sm:justify-end">
            {importantCount > 0 && (
              <Button
                size="sm"
                variant={showImportantOnly ? "default" : "outline"}
                onClick={() => setShowImportantOnly(!showImportantOnly)}
                className="shrink-0"
              >
                <Filter className="h-3 w-3" />
                <Star className="h-3 w-3" />
                {importantCount}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="shrink-0">
              <Plus className="h-3 w-3" /> Add Note
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
            <Textarea
              placeholder="Add a note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="min-h-[80px]"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsImportant(!isImportant)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isImportant
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {isImportant ? (
                  <Star className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <StarOff className="h-3.5 w-3.5" />
                )}
                {isImportant ? "Important" : "Mark as Important"}
              </button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? <Spinner /> : "Save Note"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {filteredNotes.length === 0 && !showForm && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {showImportantOnly
              ? "No important notes."
              : "No notes yet. Add one to track history."}
          </p>
        )}

        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`rounded-xl border p-4 transition-all ${
                note.is_important
                  ? "border-amber-300 bg-amber-50/50 dark:border-amber-700/50 dark:bg-amber-950/20"
                  : "border-border/60"
              }`}
            >
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {note.user ? (
                      <>
                        {note.user.full_name?.trim() || "Unknown user"}
                        {note.user.role && ROLE_HINT_LABELS[note.user.role] ? (
                          <span className="font-medium text-muted-foreground">
                            {" "}
                            ({ROLE_HINT_LABELS[note.user.role]})
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "System"
                    )}
                  </span>
                  {note.is_important && (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <AlertCircle className="mr-1 h-3 w-3" /> Important
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground sm:ml-1">
                    {formatDateTime(note.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <button
                    onClick={() => handleToggleImportance(note.id, note.is_important)}
                    disabled={togglingId === note.id}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-amber-500"
                    title={note.is_important ? "Remove importance" : "Mark as important"}
                  >
                    {togglingId === note.id ? (
                      <Spinner />
                    ) : note.is_important ? (
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    ) : (
                      <StarOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={deletingId === note.id}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Delete note"
                  >
                    {deletingId === note.id ? (
                      <Spinner />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap text-foreground/80">
                {note.content}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
