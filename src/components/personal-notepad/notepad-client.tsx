"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  StickyNote,
  Trash2,
  Pin,
  X,
  Loader2,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PersonalNote } from "@/lib/types";
import {
  getPersonalNotes,
  createPersonalNote,
  updatePersonalNote,
  deletePersonalNote,
  togglePinNote,
} from "@/lib/actions/personal-notes";
import { formatDistanceToNow } from "date-fns";

const COLORS = [
  { value: "gray", className: "bg-slate-400" },
  { value: "blue", className: "bg-blue-500" },
  { value: "emerald", className: "bg-emerald-500" },
  { value: "amber", className: "bg-amber-500" },
  { value: "rose", className: "bg-rose-500" },
  { value: "violet", className: "bg-violet-500" },
] as const;

function previewText(content: string) {
  const text = content.replace(/\s+/g, " ").trim();
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export function NotepadClient() {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("gray");
  const [dirty, setDirty] = useState(false);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    const data = await getPersonalNotes();
    setNotes(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      if (showPinnedOnly && !note.pinned) return false;
      if (!q) return true;
      return (
        (note.title?.toLowerCase().includes(q) ?? false) ||
        note.content.toLowerCase().includes(q)
      );
    });
  }, [notes, searchQuery, showPinnedOnly]);

  const selectedNote = selectedId
    ? notes.find((note) => note.id === selectedId) ?? null
    : null;

  const loadNoteIntoEditor = (note: PersonalNote) => {
    setIsCreating(false);
    setSelectedId(note.id);
    setTitle(note.title ?? "");
    setContent(note.content);
    setColor(note.color || "gray");
    setDirty(false);
  };

  const startNewNote = () => {
    setIsCreating(true);
    setSelectedId(null);
    setTitle("");
    setContent("");
    setColor("gray");
    setDirty(false);
  };

  const clearEditor = () => {
    setIsCreating(false);
    setSelectedId(null);
    setTitle("");
    setContent("");
    setColor("gray");
    setDirty(false);
  };

  const handleSave = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      if (isCreating) {
        const { data } = await createPersonalNote({
          title: title.trim() || undefined,
          content: content.trim(),
          color,
        });
        if (data) {
          setNotes((prev) => [data, ...prev]);
          loadNoteIntoEditor(data);
        }
        return;
      }

      if (!selectedId) return;
      const { data } = await updatePersonalNote(selectedId, {
        title: title.trim() || null,
        content: content.trim(),
        color,
      });
      if (data) {
        setNotes((prev) => prev.map((note) => (note.id === data.id ? data : note)));
        setDirty(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("Delete this note?")) return;
    const { error } = await deletePersonalNote(selectedId);
    if (!error) {
      setNotes((prev) => prev.filter((note) => note.id !== selectedId));
      clearEditor();
    }
  };

  const handleTogglePin = async (note: PersonalNote) => {
    const { data } = await togglePinNote(note.id, !note.pinned);
    if (data) {
      setNotes((prev) =>
        [...prev.map((item) => (item.id === data.id ? data : item))].sort(
          (a, b) => Number(b.pinned) - Number(a.pinned),
        ),
      );
    }
  };

  const editorOpen = isCreating || !!selectedNote;

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[520px] flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Notepad</h1>
          <p className="text-sm text-muted-foreground">Private notes for yourself only.</p>
        </div>
        <Button onClick={startNewNote} className="h-10 shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          New note
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Note list */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
          <div className="space-y-3 border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes…"
                className="h-10 pl-9"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPinnedOnly(false)}
                className={cn(
                  "h-8 rounded-md px-3 text-xs font-medium transition-colors",
                  !showPinnedOnly
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setShowPinnedOnly(true)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                  showPinnedOnly
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <Pin className="h-3 w-3" />
                Pinned
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                <StickyNote className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No notes yet</p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery || showPinnedOnly
                    ? "Nothing matches this filter."
                    : "Create a note to get started."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filteredNotes.map((note) => {
                  const active = selectedId === note.id && !isCreating;
                  return (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => loadNoteIntoEditor(note)}
                        className={cn(
                          "flex w-full flex-col gap-1 px-3 py-3 text-left transition-colors hover:bg-muted/50",
                          active && "bg-muted",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={cn(
                                "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full",
                                COLORS.find((item) => item.value === note.color)?.className ||
                                  "bg-slate-400",
                              )}
                            />
                            <span className="truncate text-sm font-medium text-foreground">
                              {note.title?.trim() || "Untitled"}
                            </span>
                          </div>
                          {note.pinned ? (
                            <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-current text-primary" />
                          ) : null}
                        </div>
                        <p className="line-clamp-2 pl-[18px] text-xs text-muted-foreground">
                          {previewText(note.content) || "Empty note"}
                        </p>
                        <p className="pl-[18px] text-[11px] text-muted-foreground/80">
                          {formatDistanceToNow(new Date(note.updated_at || note.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
          {!editorOpen ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <StickyNote className="h-10 w-10 text-muted-foreground/35" />
              <div>
                <p className="text-base font-medium text-foreground">Select a note</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Or create a new one to start writing.
                </p>
              </div>
              <Button onClick={startNewNote} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                New note
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {isCreating ? "New note" : "Edit note"}
                  </span>
                  {dirty ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  {selectedNote ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          selectedNote.pinned && "text-primary",
                        )}
                        title={selectedNote.pinned ? "Unpin" : "Pin"}
                        onClick={() => void handleTogglePin(selectedNote)}
                      >
                        <Pin className={cn("h-4 w-4", selectedNote.pinned && "fill-current")} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Delete"
                        onClick={() => void handleDelete()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Close"
                    onClick={clearEditor}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Title (optional)"
                  className="h-11 text-base font-medium"
                />
                <Textarea
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Write your note…"
                  className="min-h-0 flex-1 resize-none text-sm leading-relaxed"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Color</span>
                    <div className="flex gap-1.5">
                      {COLORS.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          title={item.value}
                          onClick={() => {
                            setColor(item.value);
                            setDirty(true);
                          }}
                          className={cn(
                            "h-5 w-5 rounded-full transition-transform",
                            item.className,
                            color === item.value
                              ? "scale-110 ring-2 ring-foreground/30 ring-offset-2 ring-offset-background"
                              : "opacity-70 hover:opacity-100",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={clearEditor}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={!content.trim() || saving || (!isCreating && !dirty)}
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isCreating ? "Save note" : "Save changes"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
