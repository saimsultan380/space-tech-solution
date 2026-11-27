"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  getDailyProcessorNotes,
  getProcessorNoteDetail,
  type ProcessorDailyStat,
  type ProcessorNote,
} from "@/lib/queries/processor-notes";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Clock,
  User,
  Phone,
  Building,
  DollarSign,
  FileText as NoteIcon,
  ExternalLink,
  CheckCircle2,
} from "@/components/ui/icons";

interface DailyProcessorActivityProps {
  onSelectProcessor?: (processorName: string) => void;
  className?: string;
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

/* ─── Notes Detail Modal ─── */
function ProcessorNotesModal({
  processor,
  date,
  onClose,
}: {
  processor: ProcessorDailyStat;
  date: string;
  onClose: () => void;
}) {
  const { data: notes, isLoading } = useQuery<ProcessorNote[]>({
    queryKey: ["processor-note-detail", processor.id, date],
    queryFn: () => getProcessorNoteDetail(processor.id, date),
    staleTime: 30000,
  });

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5"
      onClick={handleBackdrop}
      aria-modal="true"
      role="dialog"
      aria-label={`Processing Notes by ${processor.name}`}
    >
      <div className="relative flex w-full max-w-3xl flex-col rounded-2xl border border-border bg-background shadow-2xl max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-xs">
              {processor.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                  {processor.name}
                </h2>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary capitalize">
                  {processor.role || "Processor"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Date: <strong className="text-foreground">{date}</strong></span>
                <span>&bull;</span>
                <span>{processor.count} Note{processor.count !== 1 ? "s" : ""} Updated</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm font-medium">Loading bills and notes for {date}…</span>
            </div>
          ) : !notes || notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-16 text-muted-foreground text-center">
              <NoteIcon className="h-10 w-10 opacity-30" />
              <p className="text-sm font-semibold text-foreground">No processing notes found for this date.</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                No notes were logged under this processor on {date}.
              </p>
            </div>
          ) : (
            notes.map((note, idx) => {
              const sale = note.sale;
              const hasAgentNote = Boolean(sale?.sales_notes?.trim());
              const hasProcessorNote = Boolean(note.content?.trim());

              return (
                <div
                  key={note.id}
                  className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-3.5 hover:border-primary/40 transition-colors"
                >
                  {/* Top Bar: Note sequence + Timestamp + Sale link */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        <NoteIcon className="h-3 w-3" />
                        Bill #{idx + 1}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(note.created_at)}
                      </span>
                    </div>

                    {note.sale_id && (
                      <Link
                        href={`/dashboard/sales/${note.sale_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline hover:text-primary/80"
                      >
                        <span>View Full Sale</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>

                  {/* Bill / Customer Info Strip */}
                  {sale ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 rounded-lg bg-muted/40 p-2.5 text-xs border border-border/40">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Customer
                        </span>
                        <p className="font-semibold text-foreground truncate">
                          {sale.customer_name || "—"}
                        </p>
                        {sale.customer_phone && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="h-2.5 w-2.5" />
                            {sale.customer_phone}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Company / Bill #
                        </span>
                        <p className="font-semibold text-foreground truncate flex items-center gap-1">
                          <Building className="h-3 w-3 text-muted-foreground shrink-0" />
                          {sale.company_name || "—"}
                        </p>
                        {sale.utility_company_service_number && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            Acc: {sale.utility_company_service_number}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Amount
                        </span>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          ${(sale.amount ?? 0).toFixed(2)}
                        </p>
                        {sale.charged_amount != null && sale.charged_amount !== sale.amount && (
                          <p className="text-[10px] text-muted-foreground">
                            Charged: ${sale.charged_amount.toFixed(2)}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Sales Agent
                        </span>
                        <p className="font-medium text-foreground truncate flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground shrink-0" />
                          {sale.agent_name || "—"}
                        </p>
                        {sale.sale_type && (
                          <span className="inline-block mt-0.5 rounded bg-foreground/5 px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground capitalize">
                            {sale.sale_type}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Notes Comparison (Agent vs Processor) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Agent End Note */}
                    <div className="rounded-lg border border-sky-500/20 bg-sky-500/[0.04] p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Agent Note (Sales End)
                          </span>
                        </div>
                        <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                          {hasAgentNote ? sale?.sales_notes : (
                            <span className="italic text-muted-foreground">No agent notes on this bill.</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Processor End Note */}
                    <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.05] p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Processor Note (Updated)
                          </span>
                        </div>
                        <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words leading-relaxed font-medium">
                          {hasProcessorNote ? note.content : (
                            <span className="italic text-muted-foreground">No processor note recorded.</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-border px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between gap-2 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            {notes ? `${notes.length} bill note${notes.length !== 1 ? "s" : ""} recorded on ${date}` : ""}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-4 py-2 text-xs font-semibold hover:bg-foreground/90 transition-colors shadow-xs"
          >
            <X className="h-3.5 w-3.5" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Widget ─── */
export function DailyProcessorActivity({
  onSelectProcessor,
  className,
}: DailyProcessorActivityProps) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIso());
  const [collapsed, setCollapsed] = useState(false);
  const [openProcessor, setOpenProcessor] = useState<ProcessorDailyStat | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["daily-processor-notes", selectedDate],
    queryFn: () => getDailyProcessorNotes(selectedDate),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const isToday = selectedDate === getTodayIso();
  const isYesterday = selectedDate === getYesterdayIso();

  return (
    <>
      <Card
        className={`border-border/70 bg-gradient-to-br from-card via-card to-muted/20 shadow-sm ${className || ""}`}
      >
        <CardContent className="p-3.5 sm:p-4">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Daily Processor Activity
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      `${data?.totalNotes || 0} Bills Noted`
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Click a processor to view bills checked & notes updated
                </p>
              </div>
            </div>

            {/* Date Selector & Toggle */}
            <div className="flex items-center gap-1.5">
              <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5 text-xs">
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    isToday
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setSelectedDate(getTodayIso())}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    isYesterday
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setSelectedDate(getYesterdayIso())}
                >
                  Yesterday
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(e.target.value);
                  }}
                  className="rounded bg-transparent px-1.5 py-0.5 text-xs text-foreground focus:outline-hidden"
                  title="Select custom date"
                />
              </div>

              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={collapsed ? "Expand" : "Collapse"}
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Processor Cards */}
          {!collapsed && (
            <div className="mt-3">
              {isLoading ? (
                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span>Loading daily processor activity…</span>
                </div>
              ) : !data || data.processors.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">
                  No processing notes recorded on {selectedDate}.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {data.processors.map((proc) => {
                    const hasActivity = proc.count > 0;
                    return (
                      <button
                        key={proc.id}
                        type="button"
                        disabled={!hasActivity}
                        onClick={() => {
                          if (hasActivity) setOpenProcessor(proc);
                          if (onSelectProcessor) onSelectProcessor(proc.name);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border p-2.5 text-left transition-all ${
                          hasActivity
                            ? "border-primary/25 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 hover:shadow-sm cursor-pointer"
                            : "border-border/50 bg-background/50 opacity-60 cursor-not-allowed"
                        }`}
                        title={hasActivity ? `Click to view ${proc.count} notes by ${proc.name}` : "No notes"}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                              hasActivity
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {proc.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {proc.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground capitalize">
                              {proc.role || "Processor"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                              hasActivity
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {proc.count}
                          </span>
                          <p className="text-[9px] text-muted-foreground uppercase">notes</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Detail Modal */}
      {openProcessor && (
        <ProcessorNotesModal
          processor={openProcessor}
          date={selectedDate}
          onClose={() => setOpenProcessor(null)}
        />
      )}
    </>
  );
}
