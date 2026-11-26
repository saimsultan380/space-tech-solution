"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDailyProcessorNotes, type ProcessorDailyStat } from "@/lib/queries/processor-notes";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  UserCheck,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
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

export function DailyProcessorActivity({
  onSelectProcessor,
  className,
}: DailyProcessorActivityProps) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIso());
  const [collapsed, setCollapsed] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["daily-processor-notes", selectedDate],
    queryFn: () => getDailyProcessorNotes(selectedDate),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const isToday = selectedDate === getTodayIso();
  const isYesterday = selectedDate === getYesterdayIso();

  return (
    <Card className={`border-border/70 bg-gradient-to-br from-card via-card to-muted/20 shadow-sm ${className || ""}`}>
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
                Individual processing notes updated by processors daily
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

        {/* Processors Count Badges */}
        {!collapsed ? (
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
                    <div
                      key={proc.id}
                      className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-all ${
                        hasActivity
                          ? "border-primary/25 bg-primary/5 hover:border-primary/40 hover:bg-primary/10"
                          : "border-border/50 bg-background/50 opacity-60"
                      }`}
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

                      <div className="text-right">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                            hasActivity
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {proc.count}
                        </span>
                        <p className="text-[9px] text-muted-foreground uppercase">
                          notes
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
