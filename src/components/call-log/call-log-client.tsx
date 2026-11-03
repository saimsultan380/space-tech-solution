"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, Spinner } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { DateField } from "@/components/ui/date-field";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownRangeDatePicker,
  toDateRangeFromFilters,
  toFilterDates,
} from "@/components/ui/dropdown-range-date-picker";
import { useDebouncedUrlSearchInput } from "@/hooks/use-debounced-url-search-input";
import { createClient } from "@/lib/supabase/client";
import { getSalesAgentOptions } from "@/lib/queries/users";
import {
  createDailyCallLog,
  deleteDailyCallLog,
  getDailyCallLogs,
  updateDailyCallLog,
  type DailyCallLogRow,
} from "@/lib/actions/daily-call-logs";
import {
  CALL_LOG_ACCEPT,
  CALL_LOG_BUCKET,
  callLogImageFile,
  weekdayFromIsoDate,
} from "@/lib/call-log";
import { parsePageSize } from "@/lib/page-size";
import type { UserRole } from "@/lib/types";
import {
  CalendarDays,
  Eye,
  MinusCircle,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Target,
  Trash2,
  Upload,
  Wallet,
} from "@/components/ui/icons";

const VIEWER_MIN_ZOOM = 1;
const VIEWER_MAX_ZOOM = 4;
const VIEWER_ZOOM_STEP = 0.25;

function formatLogDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  return `${match[2]}/${match[3]}/${match[1]}`;
}

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatRate(rate: number): string {
  if (!Number.isFinite(rate)) return "0%";
  return `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`;
}

async function uploadScreenshot(
  file: File,
  agentId: string,
  onProgress: (percent: number) => void,
): Promise<string> {
  const checked = callLogImageFile(file);
  if ("error" in checked) throw new Error(checked.error);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error("Storage is not configured.");

  const supabase = createClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new Error("Sign in again before uploading.");
  }

  const path = `${agentId}/${crypto.randomUUID()}.${checked.extension}`;
  const url = `${supabaseUrl}/storage/v1/object/${CALL_LOG_BUCKET}/${path}`;

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.setRequestHeader("authorization", `Bearer ${sessionData.session?.access_token}`);
    request.setRequestHeader("apikey", anonKey);
    request.setRequestHeader("content-type", checked.contentType);
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(new Error("The screenshot could not be uploaded."));
    };
    request.onerror = () => reject(new Error("The screenshot could not be uploaded."));
    request.send(file);
  });

  return path;
}

async function discardUpload(path: string) {
  const supabase = createClient();
  await supabase.storage.from(CALL_LOG_BUCKET).remove([path]);
}

function ScreenshotViewer({
  url,
  alt,
  onClose,
}: {
  url: string;
  alt: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(VIEWER_MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    setZoom(VIEWER_MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    dragRef.current = null;
  }, [url]);

  const clampZoom = (value: number) =>
    Math.min(VIEWER_MAX_ZOOM, Math.max(VIEWER_MIN_ZOOM, Math.round(value * 100) / 100));

  const resetView = () => {
    setZoom(VIEWER_MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  };

  const changeZoom = (next: number) => {
    const clamped = clampZoom(next);
    setZoom(clamped);
    if (clamped <= VIEWER_MIN_ZOOM) setOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta =
        Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (delta === 0) return;

      const current = zoomRef.current;
      // Trackpads send small pixel deltas; mouse wheels send larger line/pixel jumps.
      const amount =
        event.deltaMode === 1
          ? VIEWER_ZOOM_STEP * Math.sign(-delta)
          : (-delta / 240) * VIEWER_ZOOM_STEP * 4;
      const next = clampZoom(current + amount);
      setZoom(next);
      if (next <= VIEWER_MIN_ZOOM) setOffset({ x: 0, y: 0 });
    };

    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (zoom <= VIEWER_MIN_ZOOM || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset({
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY),
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <Dialog open onClose={onClose} className="max-w-5xl border-border/60 bg-background p-0 sm:p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 pr-14">
        <p className="truncate text-sm font-medium">{alt}</p>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Zoom out"
            disabled={zoom <= VIEWER_MIN_ZOOM}
            onClick={() => changeZoom(zoom - VIEWER_ZOOM_STEP)}
          >
            <MinusCircle className="h-4 w-4" />
          </Button>
          <span className="min-w-[3.25rem] text-center text-xs tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Zoom in"
            disabled={zoom >= VIEWER_MAX_ZOOM}
            onClick={() => changeZoom(zoom + VIEWER_ZOOM_STEP)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Reset zoom"
            disabled={zoom === VIEWER_MIN_ZOOM && offset.x === 0 && offset.y === 0}
            onClick={resetView}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={stageRef}
        className={`relative flex h-[min(78vh,720px)] items-center justify-center overflow-hidden bg-muted/40 select-none ${
          zoom > VIEWER_MIN_ZOOM ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="max-h-full max-w-full rounded-md object-contain pointer-events-none"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
          draggable={false}
        />
      </div>
    </Dialog>
  );
}

function ScreenshotCell({
  row,
  busy,
  onView,
  onReplace,
  onRemove,
}: {
  row: DailyCallLogRow;
  busy: boolean;
  onView: () => void;
  onReplace: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex min-w-[240px] items-center gap-4">
      {row.screenshot_url ? (
        <button
          type="button"
          onClick={onView}
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.screenshot_url}
            alt={`Call log for ${formatLogDate(row.log_date)}`}
            className="h-10 w-16 rounded-md border border-border object-cover"
          />
        </button>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">No screenshot</span>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {row.screenshot_url && (
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
        )}
        <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-foreground">
          <Upload className="h-3.5 w-3.5" />
          {row.screenshot_url ? "Replace" : "Upload"}
          <input
            type="file"
            accept={CALL_LOG_ACCEPT}
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const nextFile = event.target.files?.[0];
              event.target.value = "";
              if (nextFile) onReplace(nextFile);
            }}
          />
        </label>
        {row.screenshot_path && (
          <button
            type="button"
            className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
            disabled={busy}
            onClick={onRemove}
          >
            Remove
          </button>
        )}
        {busy && <Spinner className="h-4 w-4" />}
      </div>
    </div>
  );
}

export function CallLogClient({ userRole, userId }: { userRole: UserRole; userId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const fromDate = searchParams.get("from_date") || "";
  const toDate = searchParams.get("to_date") || "";
  const agentFilter = searchParams.get("agent_id") || "all";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DailyCallLogRow | null>(null);
  const [logDate, setLogDate] = useState(todayIso());
  const [totalCalls, setTotalCalls] = useState("");
  const [totalSales, setTotalSales] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [rowError, setRowError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ url: string; alt: string } | null>(null);

  const updateFilters = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "all" || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    if (!updates.page) params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const { inputRef, inputValue: searchInput, onInputChange, urlValue: urlSearch } =
    useDebouncedUrlSearchInput(searchParams, updateFilters);

  const logsQuery = useQuery({
    queryKey: ["daily-call-logs", page, pageSize, fromDate, toDate, agentFilter, urlSearch],
    queryFn: () =>
      getDailyCallLogs({
        page,
        pageSize,
        from: fromDate,
        to: toDate,
        agentId: agentFilter,
        search: urlSearch,
      }),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["sales-agent-options"],
    queryFn: getSalesAgentOptions,
    enabled: userRole === "super_admin",
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const openCreate = () => {
    setEditing(null);
    setLogDate(todayIso());
    setTotalCalls("");
    setTotalSales("");
    setFile(null);
    setFormError("");
    setProgress(null);
    setDialogOpen(true);
  };

  const openEdit = (row: DailyCallLogRow) => {
    setEditing(row);
    setLogDate(row.log_date.slice(0, 10));
    setTotalCalls(String(row.total_calls));
    setTotalSales(String(row.total_sales));
    setFile(null);
    setFormError("");
    setProgress(null);
    setDialogOpen(true);
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["daily-call-logs"] });
  };

  const saveLog = async () => {
    if (totalCalls.trim() === "" || totalSales.trim() === "") {
      setFormError("Enter total calls and total sales.");
      return;
    }
    const calls = Number(totalCalls);
    const sales = Number(totalSales);
    if (!logDate) {
      setFormError("Enter a date.");
      return;
    }
    if (!Number.isInteger(calls) || calls < 0 || !Number.isInteger(sales) || sales < 0) {
      setFormError("Calls and sales must be whole numbers that are 0 or greater.");
      return;
    }
    if (sales > calls) {
      setFormError("Total sales cannot be greater than total calls.");
      return;
    }
    if (file) {
      const checked = callLogImageFile(file);
      if ("error" in checked) {
        setFormError(checked.error);
        return;
      }
    }

    setSaving(true);
    setFormError("");
    let uploadedPath: string | null = null;
    try {
      if (file) {
        setProgress(0);
        uploadedPath = await uploadScreenshot(file, editing?.agent_id || userId, setProgress);
      }
      if (editing) {
        await updateDailyCallLog(editing.id, {
          logDate,
          totalCalls: calls,
          totalSales: sales,
          screenshotPath: uploadedPath ?? undefined,
        });
      } else {
        await createDailyCallLog({
          logDate,
          totalCalls: calls,
          totalSales: sales,
          screenshotPath: uploadedPath,
        });
      }
      setDialogOpen(false);
      await refresh();
    } catch (error) {
      if (uploadedPath) await discardUpload(uploadedPath);
      setFormError(error instanceof Error ? error.message : "Could not save the log.");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  const replaceScreenshot = async (row: DailyCallLogRow, nextFile: File) => {
    const checked = callLogImageFile(nextFile);
    if ("error" in checked) {
      setRowError(checked.error);
      return;
    }
    setBusyId(row.id);
    setRowError("");
    let uploadedPath: string | null = null;
    try {
      uploadedPath = await uploadScreenshot(nextFile, row.agent_id, () => undefined);
      await updateDailyCallLog(row.id, {
        logDate: row.log_date.slice(0, 10),
        totalCalls: row.total_calls,
        totalSales: row.total_sales,
        screenshotPath: uploadedPath,
      });
      await refresh();
    } catch (error) {
      if (uploadedPath) await discardUpload(uploadedPath);
      setRowError(error instanceof Error ? error.message : "Could not replace the screenshot.");
    } finally {
      setBusyId(null);
    }
  };

  const removeScreenshot = async (row: DailyCallLogRow) => {
    setBusyId(row.id);
    setRowError("");
    try {
      await updateDailyCallLog(row.id, {
        logDate: row.log_date.slice(0, 10),
        totalCalls: row.total_calls,
        totalSales: row.total_sales,
        screenshotPath: null,
      });
      await refresh();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Could not remove the screenshot.");
    } finally {
      setBusyId(null);
    }
  };

  const removeLog = async (row: DailyCallLogRow) => {
    if (!window.confirm(`Delete the log for ${formatLogDate(row.log_date)}?`)) return;
    setBusyId(row.id);
    setRowError("");
    try {
      await deleteDailyCallLog(row.id);
      await refresh();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Could not delete the log.");
    } finally {
      setBusyId(null);
    }
  };

  const stats = logsQuery.data?.stats ?? {
    totalCalls: 0,
    totalSales: 0,
    conversionRate: 0,
    daysLogged: 0,
  };
  const rows = logsQuery.data?.data ?? [];
  const count = logsQuery.data?.count ?? 0;
  const totalPages = logsQuery.data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Call Log</h1>
          <p className="text-muted-foreground">Daily dialer calls and sales</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Daily Log
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/[0.12] to-indigo-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total Calls</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Phone className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.totalCalls}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/[0.12] to-teal-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.totalSales}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/[0.12] to-yellow-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Conversion Rate</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-warning/10 text-warning">
                <Target className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{formatRate(stats.conversionRate)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-sky-500/[0.12] to-blue-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Days Logged</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
                <CalendarDays className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.daysLogged}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>Daily Logs</CardTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
            <div className="relative sm:col-span-2 xl:col-span-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search by agent or date..."
                value={searchInput}
                onChange={(event) => onInputChange(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="min-w-0 xl:col-span-3">
              <DropdownRangeDatePicker
                value={toDateRangeFromFilters(fromDate, toDate)}
                onApply={(range) => {
                  const dates = toFilterDates(range);
                  updateFilters({ from_date: dates.from_date, to_date: dates.to_date });
                }}
              />
            </div>
            {userRole === "super_admin" && (
              <div className="min-w-0 xl:col-span-3">
                <Select
                  options={[{ value: "all", label: "All agents" }, ...agents.map((agent) => ({ value: agent.id, label: agent.full_name }))]}
                  value={agentFilter}
                  onChange={(event) => updateFilters({ agent_id: event.target.value })}
                />
              </div>
            )}
            <div className="xl:col-span-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => updateFilters({ q: "", agent_id: "all", from_date: "", to_date: "" })}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {rowError && <p className="mb-3 px-4 text-sm text-destructive sm:px-0">{rowError}</p>}
          {logsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Spinner />
              Loading call logs…
            </div>
          ) : logsQuery.isError ? (
            <EmptyState
              title="Error loading data"
              description={logsQuery.error instanceof Error ? logsQuery.error.message : "Could not load call logs."}
            />
          ) : rows.length === 0 ? (
            <EmptyState title="No daily logs" description="Add a log for a day you worked the dialer." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    {userRole === "super_admin" && <TableHead>Agent</TableHead>}
                    <TableHead>Total No. of Calls</TableHead>
                    <TableHead>Total No. of Sales</TableHead>
                    <TableHead>Upload Call Log</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">{formatLogDate(row.log_date)}</TableCell>
                      <TableCell>{weekdayFromIsoDate(row.log_date.slice(0, 10))}</TableCell>
                      {userRole === "super_admin" && <TableCell>{row.agent_name}</TableCell>}
                      <TableCell>{row.total_calls}</TableCell>
                      <TableCell>{row.total_sales}</TableCell>
                      <TableCell>
                        <ScreenshotCell
                          row={row}
                          busy={busyId === row.id}
                          onView={() => {
                            if (!row.screenshot_url) return;
                            setViewer({
                              url: row.screenshot_url,
                              alt: `Call log for ${formatLogDate(row.log_date)}`,
                            });
                          }}
                          onReplace={(nextFile) => void replaceScreenshot(row, nextFile)}
                          onRemove={() => void removeScreenshot(row)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(row)} disabled={busyId === row.id}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            aria-label="Delete log"
                            onClick={() => void removeLog(row)}
                            disabled={busyId === row.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(nextPage) => updateFilters({ page: nextPage })}
            totalItems={count}
            pageSize={pageSize}
          />
        </CardContent>
      </Card>

      {viewer && (
        <ScreenshotViewer url={viewer.url} alt={viewer.alt} onClose={() => setViewer(null)} />
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Daily Log" : "Add Daily Log"}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <DateField id="call-log-date" label="Date" value={logDate} onChange={setLogDate} required />
          <div className="space-y-1.5">
            <label htmlFor="call-log-calls" className="block text-sm font-medium">
              Total No. of Calls
            </label>
            <Input
              id="call-log-calls"
              type="number"
              min={0}
              step={1}
              value={totalCalls}
              onChange={(event) => setTotalCalls(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="call-log-sales" className="block text-sm font-medium">
              Total No. of Sales
            </label>
            <Input
              id="call-log-sales"
              type="number"
              min={0}
              step={1}
              value={totalSales}
              onChange={(event) => setTotalSales(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="call-log-file" className="block text-sm font-medium">
              Screenshot
            </label>
            <Input
              id="call-log-file"
              type="file"
              accept={CALL_LOG_ACCEPT}
              disabled={saving}
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                if (!next) {
                  setFile(null);
                  return;
                }
                const checked = callLogImageFile(next);
                if ("error" in checked) {
                  setFormError(checked.error);
                  event.target.value = "";
                  setFile(null);
                  return;
                }
                setFormError("");
                setFile(next);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {editing?.screenshot_url && !file
                ? "Current screenshot is shown below. Choose a file to replace it."
                : "PNG, JPG, or WebP. 5 MB maximum."}
            </p>
            {(previewUrl || (!file && editing?.screenshot_url)) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl || editing?.screenshot_url || ""}
                alt={file ? "New screenshot preview" : "Current screenshot"}
                className="h-28 w-full rounded-md border border-border object-contain"
              />
            )}
            {progress !== null && (
              <div className="space-y-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
              </div>
            )}
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
        </div>
        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void saveLog()} disabled={saving} className="min-w-[6.5rem]">
            {saving ? (
              <Spinner className="h-4 w-4 text-primary-foreground" />
            ) : editing ? (
              "Update"
            ) : (
              "Add log"
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
