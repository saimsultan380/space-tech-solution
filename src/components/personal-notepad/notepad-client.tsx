"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  StickyNote,
  Trash2,
  Pin,
  X,
  Clock,
  Edit3,
  Filter,
  Eye,
  Calendar,
  History,
  Clock3
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PersonalNote } from "@/lib/types";
import {
  getPersonalNotes,
  createPersonalNote,
  updatePersonalNote,
  deletePersonalNote,
  togglePinNote
} from "@/lib/actions/personal-notes";
import { formatDistanceToNow } from "date-fns";

const COLOR_MAP: Record<string, { bg: string; dot: string; side: string }> = {
  gray: {
    bg: "bg-slate-50 dark:bg-slate-900/40",
    dot: "bg-slate-400 dark:bg-slate-500",
    side: "border-l-slate-400 dark:border-l-slate-500"
  },
  blue: {
    bg: "bg-blue-50/70 dark:bg-blue-900/20",
    dot: "bg-blue-500",
    side: "border-l-blue-500"
  },
  emerald: {
    bg: "bg-emerald-50/70 dark:bg-emerald-900/20",
    dot: "bg-emerald-500",
    side: "border-l-emerald-500"
  },
  amber: {
    bg: "bg-amber-50/70 dark:bg-amber-900/20",
    dot: "bg-amber-500",
    side: "border-l-amber-500"
  },
  rose: {
    bg: "bg-rose-50/70 dark:bg-rose-900/20",
    dot: "bg-rose-500",
    side: "border-l-rose-500"
  },
  violet: {
    bg: "bg-violet-50/70 dark:bg-violet-900/20",
    dot: "bg-violet-500",
    side: "border-l-violet-500"
  },
};

export function NotepadClient() {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "pinned" | "today" | "yesterday" | "week">("today");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<PersonalNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState("gray");

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    const data = await getPersonalNotes();
    setNotes(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async () => {
    if (!newContent.trim()) return;
    const { data } = await createPersonalNote({
      title: newTitle.trim() || undefined,
      content: newContent.trim(),
      color: newColor,
    });
    if (data) {
      setNotes([data, ...notes]);
      setNewTitle("");
      setNewContent("");
      setIsAdding(false);
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<PersonalNote>) => {
    const { data } = await updatePersonalNote(id, updates);
    if (data) {
      setNotes(notes.map(n => n.id === id ? data : n));
      setEditingId(null);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      const { error } = await deletePersonalNote(id);
      if (!error) {
        setNotes(notes.filter(n => n.id !== id));
      }
    }
  };

  const handleTogglePin = async (id: string, pinned: boolean) => {
    const { data } = await togglePinNote(id, !pinned);
    if (data) {
      fetchNotes();
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = (n.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (filterType === "pinned") return n.pinned;
    
    const noteDate = new Date(n.updated_at || n.created_at);
    const now = new Date();
    
    if (filterType === "today") {
      return noteDate.toDateString() === now.toDateString();
    }
    
    if (filterType === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return noteDate.toDateString() === yesterday.toDateString();
    }
    
    if (filterType === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return noteDate >= weekAgo;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6 border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Personal Notepad</h1>
          <p className="text-sm text-muted-foreground font-medium">Your private space for thoughts and tasks.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-border bg-background"
            />
          </div>
          <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "outline" : "default"} className="h-10 px-6 font-bold">
            {isAdding ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {isAdding ? "Close" : "New Note"}
          </Button>
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-card border border-border p-3 rounded-xl">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 w-full sm:w-auto">
          <button
            className={cn(
              "whitespace-nowrap px-4 py-2 text-[13px] font-semibold rounded-[5px] transition-all",
              filterType === "all" ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => setFilterType("all")}
          >
            All Notes ({notes.length})
          </button>
          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
          <button
            className={cn(
              "whitespace-nowrap px-4 py-2 text-[13px] font-semibold rounded-[5px] transition-all flex items-center gap-2",
              filterType === "pinned" ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => setFilterType("pinned")}
          >
            <Pin className={cn("h-3.5 w-3.5", filterType === "pinned" && "fill-current")} />
            Pinned ({notes.filter(n => n.pinned).length})
          </button>
          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
          <button
            className={cn(
              "whitespace-nowrap px-4 py-2 text-[13px] font-semibold rounded-[5px] transition-all",
              filterType === "today" ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => setFilterType("today")}
          >
            Today
          </button>
          <button
            className={cn(
              "whitespace-nowrap px-4 py-2 text-[13px] font-semibold rounded-[5px] transition-all",
              filterType === "yesterday" ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => setFilterType("yesterday")}
          >
            Yesterday
          </button>
          <button
            className={cn(
              "whitespace-nowrap px-4 py-2 text-[13px] font-semibold rounded-[5px] transition-all",
              filterType === "week" ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => setFilterType("week")}
          >
            Last 7 Days
          </button>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground mr-1" />
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
            {filteredNotes.length} Notes found
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Quick Add Section (Expandable) */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="shadow-none border-border bg-card">
                <CardHeader className="py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-foreground/80">New Note</CardTitle>
                    <button onClick={() => setIsAdding(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-3 space-y-4">
                      <Input
                        placeholder="Note Title"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="bg-muted/50 border-border placeholder:text-muted-foreground/60 h-12 text-lg font-bold"
                      />
                      <Textarea
                        placeholder="Start typing your thoughts..."
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        className="min-h-[150px] bg-muted/50 border-border placeholder:text-muted-foreground/60 focus-visible:ring-emerald-500/20 text-base"
                      />
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Select Label</p>
                        <div className="flex flex-wrap gap-3">
                          {Object.entries(COLOR_MAP).map(([name, theme]) => (
                            <button
                              key={name}
                              onClick={() => setNewColor(name)}
                              className={cn(
                                "h-8 w-8 rounded-full border-2 transition-all ring-offset-background",
                                theme.dot,
                                newColor === name ? "border-foreground ring-2 ring-emerald-500/20 scale-110 shadow-sm" : "border-transparent opacity-80 hover:opacity-100"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <Button className="w-full h-14 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 text-lg" onClick={handleAddNote} disabled={!newContent.trim()}>
                        <Plus className="mr-2 h-5 w-5" /> Save Note
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes Grid */}
        <div className="w-full">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
              <div className="rounded-full bg-card p-4 mb-4 shadow-sm border border-border">
                <StickyNote className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-bold text-foreground/80 uppercase tracking-tight">Empty Notebook</h3>
              <p className="text-sm text-muted-foreground max-w-xs mt-2 font-medium">
                {searchQuery ? "No notes matching your search." : "Capture your first private note to see it here."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 items-start">
              <AnimatePresence mode="popLayout">
                {filteredNotes.map((note) => {
                  const theme = COLOR_MAP[note.color] || COLOR_MAP.gray;
                  const isEditing = editingId === note.id;

                  return (
                    <motion.div
                      layout
                      key={note.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group"
                    >
                      <Card className={cn("border shadow-none transition-all duration-300 hover:bg-muted/10 border-border", theme.bg)}>
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-1">
                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <Input
                                defaultValue={note.title || ""}
                                onChange={(e) => note.title = e.target.value}
                                className="mb-2 h-9 font-bold bg-background border-border"
                                autoFocus
                              />
                            ) : (
                              note.title && (
                                <div className="mb-3">
                                  <CardTitle className="text-[15px] font-black leading-tight text-foreground mb-2 tracking-tight">
                                    {note.title}
                                  </CardTitle>
                                  <div className="h-px w-10 bg-emerald-500/30" />
                                </div>
                              )
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-4 shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            {!isEditing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                                onClick={() => setViewingNote(note)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn("h-8 w-8 p-0 rounded-lg transition-colors", note.pinned ? "text-emerald-600 bg-emerald-500/10" : "text-muted-foreground hover:text-foreground")}
                              onClick={() => handleTogglePin(note.id, note.pinned)}
                            >
                              <Pin className={cn("h-3.5 w-3.5", note.pinned && "fill-current")} />
                            </Button>
                            {!isEditing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                onClick={() => setEditingId(note.id)}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1 flex flex-col">
                          {isEditing ? (
                            <div className="space-y-4 flex flex-col">
                              <Textarea
                                defaultValue={note.content}
                                onChange={(e) => note.content = e.target.value}
                                className="min-h-[120px] text-sm bg-background border-border"
                              />
                              <div className="flex justify-end gap-2 pt-3 mt-4">
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="font-semibold">Cancel</Button>
                                <Button size="sm" onClick={() => handleUpdateNote(note.id, { title: note.title, content: note.content })} className="bg-emerald-600 hover:bg-emerald-700 font-bold">Save Changes</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="whitespace-pre-wrap text-sm text-foreground/80 leading-relaxed font-medium line-clamp-[8]">
                                {note.content}
                              </p>
                              <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(note.updated_at || note.created_at), { addSuffix: true })}
                                </div>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Viewing Note Modal */}
      <AnimatePresence>
        {viewingNote && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              <div className={cn("h-1.5 w-full", (COLOR_MAP[viewingNote.color] || COLOR_MAP.gray).dot)} />
              
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">
                      {viewingNote.title || "Untitled Note"}
                    </h2>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(viewingNote.created_at).toLocaleDateString()}
                      </div>
                      <div className="h-3 w-px bg-border" />
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(viewingNote.updated_at || viewingNote.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setViewingNote(null)}
                    className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-base text-foreground/90 leading-relaxed font-medium max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                    {viewingNote.content}
                  </p>
                </div>

                <div className="mt-10 pt-6 border-t border-border flex items-center justify-end">
                  <Button 
                    onClick={() => setViewingNote(null)}
                    className="bg-emerald-600 hover:bg-emerald-700 font-bold px-8"
                  >
                    Close Reader
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
