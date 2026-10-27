"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import { SALE_TYPES } from "@/lib/constants";
import { deleteSale } from "@/lib/actions/sales";
import { createNote, deleteNote, getNotes, updateNote } from "@/lib/actions/notes";
import type { Note, UserRole, Sale } from "@/lib/types";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Database,
  Wallet,
  Target,
  Zap,
  Shield,
  User,
  Contact,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Loader2,
} from "@/components/ui/icons";
import { sanitizeRichText } from "@/lib/rich-text";
import {
  DropdownRangeDatePicker,
  toDateRangeFromFilters,
  toFilterDates,
} from "@/components/ui/dropdown-range-date-picker";
import Link from "next/link";
import { MessageButton } from "@/components/chat/message-button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useDebouncedUrlSearchInput } from "@/hooks/use-debounced-url-search-input";
import { getSales } from "@/lib/queries/sales";
import { getSalesAgentOptions } from "@/lib/queries/users";

const KARACHI_TIMEZONE = "Asia/Karachi";

function formatDateKarachi(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: KARACHI_TIMEZONE,
  }).format(new Date(date));
}

function formatNoteTime(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: KARACHI_TIMEZONE,
  }).format(new Date(date));
}

function SalesRawDataPopover({ sale }: { sale: Sale }) {
  const html = sanitizeRichText(sale.sales_raw_data);
  const hasData = Boolean(sale.sales_raw_data?.trim());
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const loadNotes = async () => {
    setLoadingNotes(true);
    setError("");
    try {
      const rows = await getNotes({ sale_id: sale.id, type: "processing" });
      setNotes(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load processing notes");
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      void loadNotes();
    } else {
      setEditingId(null);
      setDraft("");
      setError("");
    }
  };

  const stampDraft = () => {
    const stamp = `[${formatNoteTime(new Date().toISOString())}]`;
    setDraft((current) => (current.trim() ? `${current.trim()} ${stamp}` : stamp));
  };

  const handleAdd = async () => {
    const content = draft.trim();
    if (!content || saving) return;
    setSaving(true);
    setError("");
    try {
      await createNote({
        content,
        sale_id: sale.id,
        type: "processing",
      });
      setDraft("");
      await loadNotes();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the note");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (noteId: string) => {
    const content = editDraft.trim();
    if (!content || saving) return;
    setSaving(true);
    setError("");
    try {
      await updateNote(noteId, content);
      setEditingId(null);
      await loadNotes();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this processing note?")) return;
    setSaving(true);
    setError("");
    try {
      await deleteNote(noteId);
      if (editingId === noteId) setEditingId(null);
      await loadNotes();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 min-w-[80px] items-center justify-between gap-1 rounded-md border border-border px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          title="View sales raw data"
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span>Raw data</span>
          <ChevronDown className="h-3 w-3 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[26rem] p-0 shadow-2xl">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Sales raw data</p>
        </div>
        <div className="max-h-52 overflow-y-auto px-4 py-3">
          {hasData ? (
            <div
              className="space-y-2 text-sm leading-relaxed text-foreground [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No sales raw data yet.</p>
          )}
        </div>

        <div className="border-t border-border bg-muted/20 px-4 py-3">
          <p className="text-xs font-semibold text-foreground">Add processing note</p>
          <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
            {loadingNotes && notes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Loading notes…</p>
            ) : notes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No processing notes yet.</p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="rounded-md border border-border bg-background px-2.5 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {note.user?.full_name || "Staff"}
                      </span>
                      {" · "}
                      {formatNoteTime(note.created_at)}
                    </p>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-primary"
                        title="Edit note"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditDraft(note.content);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive"
                        title="Delete note"
                        disabled={saving}
                        onClick={() => void handleDelete(note.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {editingId === note.id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className="min-h-[64px] text-xs"
                        disabled={saving}
                      />
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setEditingId(null)}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => void handleUpdate(note.id)}
                          disabled={saving || !editDraft.trim()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                      {note.content}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Processing notes…"
            className="mt-2 min-h-[68px] text-xs"
            disabled={saving}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              onClick={stampDraft}
              disabled={saving}
            >
              Add timestamp
            </button>
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 px-2.5 text-xs"
              onClick={() => void handleAdd()}
              disabled={saving || !draft.trim()}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Add
            </Button>
          </div>
          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Customer Info Popover ────────────────────────────────────────────────────
function CustomerInfoPopover({ sale }: { sale: Sale }) {
  const isInsurance = sale.sale_type === "insurance";
  const name =
    sale.customer?.name || sale.customer_name || sale.account_holder_name || "—";
  const email = sale.customer?.email || sale.customer_email || null;
  const phone = sale.customer?.phone || sale.customer_phone || null;
  const address = sale.customer?.address || sale.service_address || null;
  const dob = sale.customer?.dob || sale.dob || null;
  const holder = isInsurance
    ? sale.policy_holder_name || sale.account_holder_name || null
    : sale.account_holder_name || null;
  const accountNo = (sale.customer as { account_no?: string } | undefined)?.account_no || null;
  const ssnLast4 = sale.ssn_encrypted
    ? sale.ssn_encrypted.replace(/\D/g, "").slice(-4) || "••••"
    : null;

  type InfoRowProps = { icon: React.ReactNode; label: string; value: string | null | undefined };
  const InfoRow = ({ icon, label, value }: InfoRowProps) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-2 py-1.5">
        <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-0.5">
            {label}
          </p>
          <p className="text-xs text-foreground break-words leading-snug">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 min-w-[80px] items-center justify-between gap-1 rounded-md px-2.5 text-xs font-medium transition-colors whitespace-nowrap border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40"
          title="View customer info"
        >
          <User className="h-3.5 w-3.5 shrink-0" />
          <span>Info</span>
          <ChevronDown className="h-3 w-3 shrink-0" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-3 shadow-2xl bg-popover border-border">
        {/* Header */}
        <div className="mb-1.5 flex items-center gap-2.5 border-b border-border pb-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
            {name
              .split(/\s+/)
              .filter(Boolean)
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{name}</p>
            <p className="text-[10px] text-muted-foreground">Customer Info</p>
          </div>
        </div>

        {/* Info rows — all fields matching sale detail "Customer Info" card */}
        <div className="divide-y divide-border/50">
          <InfoRow
            icon={<Mail className="h-3.5 w-3.5" />}
            label="Email"
            value={email}
          />
          <InfoRow
            icon={<Phone className="h-3.5 w-3.5" />}
            label="Phone"
            value={phone}
          />
          <InfoRow
            icon={<MapPin className="h-3.5 w-3.5" />}
            label="Service Address"
            value={address}
          />
          <InfoRow
            icon={<User className="h-3.5 w-3.5" />}
            label={isInsurance ? "Policy Holder" : "Account Holder"}
            value={holder}
          />
          <InfoRow
            icon={<Contact className="h-3.5 w-3.5" />}
            label="Account / Policy No."
            value={accountNo}
          />
          <InfoRow
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Date of Birth"
            value={dob}
          />
          <InfoRow
            icon={<Shield className="h-3.5 w-3.5" />}
            label="SSN (last 4)"
            value={ssnLast4}
          />
        </div>

        {/* Footer: two separate links — customer profile + sale detail */}
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-border pt-2.5">
          <Link
            href={`/dashboard/customers/${sale.customer_id}`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <User className="h-3 w-3" />
            Customer profile
          </Link>
          <Link
            href={`/dashboard/sales/${sale.id}`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
          >
            <Eye className="h-3 w-3" />
            Sale detail
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface SalesClientProps {
  userRole: UserRole;
  userId: string;
}

export function SalesClient({ userRole, userId }: SalesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { currency } = useCurrency();

  const [saleToDelete, setSaleToDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const page = Number(searchParams.get("page")) || 1;
  const typeFilter = searchParams.get("type") || "all";
  const agentFilterParam = searchParams.get("agent_id") || "all";
  const agentFilter = userRole === "sales_agent" ? userId : agentFilterParam;
  const fromDateFilter = searchParams.get("from_date") || "";
  const toDateFilter = searchParams.get("to_date") || "";

  const updateFilters = (
    updates: Record<string, string | number | undefined>,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "all" || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    if (!updates.page) {
      params.delete("page");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const {
    inputRef,
    inputValue: searchInput,
    onInputChange,
    urlValue: urlSearch,
  } = useDebouncedUrlSearchInput(searchParams, updateFilters);

  // React Query for fetching sales
  const {
    data: salesResponse,
    isLoading: salesLoading,
    error: salesError,
  } = useQuery({
    queryKey: [
      "sales",
      page,
      typeFilter,
      agentFilter,
      fromDateFilter,
      toDateFilter,
      urlSearch,
    ],
    queryFn: () =>
      getSales({
        agent_id: agentFilter,
        sale_type: typeFilter,
        page,
        pageSize: 20,
        from_date: fromDateFilter,
        to_date: toDateFilter,
        search: urlSearch,
      }),
    staleTime: 30000,
    placeholderData: (prev) => prev,
  });

  // Lightweight agent picker — id + name only (not full payroll user rows)
  const { data: agentOptions = [], isLoading: usersLoading } = useQuery({
    queryKey: ["sales-agent-options"],
    queryFn: getSalesAgentOptions,
    staleTime: 5 * 60 * 1000,
    enabled: userRole === "super_admin" || userRole === "processor",
  });

  const {
    data: sales = [],
    count = 0,
    totalPages = 1,
    pageSize = 20,
    stats = {
      totalRecords: 0,
      totalAmount: 0,
      grossChargedAmount: 0,
      chargebackImpactedAmount: 0,
      totalChargedAmount: 0,
      avgChargedAmount: 0,
      utilityCount: 0,
      insuranceCount: 0,
    },
  } = salesResponse || {};

  const agents = agentOptions;

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (saleId: string) => deleteSale(saleId),
    onMutate: async (saleId: string) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["sales"] });

      // Snapshot the previous data
      const previousSalesResponse = queryClient.getQueryData([
        "sales",
        page,
        typeFilter,
        agentFilter,
        fromDateFilter,
        toDateFilter,
        urlSearch,
      ]);

      // Optimistically update the cache
      queryClient.setQueryData(
        [
          "sales",
          page,
          typeFilter,
          agentFilter,
          fromDateFilter,
          toDateFilter,
          urlSearch,
        ],
        (old: typeof salesResponse) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((s) => s.id !== saleId),
            count: Math.max(0, (old.count || 0) - 1),
            totalPages: Math.max(
              1,
              Math.ceil(
                Math.max(0, (old.count || 0) - 1) / (old.pageSize || 20),
              ),
            ),
          };
        },
      );

      return { previousSalesResponse };
    },
    onError: (_err, _saleId, context) => {
      // Rollback on error
      if (context?.previousSalesResponse) {
        queryClient.setQueryData(
          [
            "sales",
            page,
            typeFilter,
            agentFilter,
            fromDateFilter,
            toDateFilter,
            urlSearch,
          ],
          context.previousSalesResponse,
        );
      }
    },
    onSuccess: () => {
      // Invalidate stats and refetch if needed
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });

  const canCreate =
    userRole === "super_admin" ||
    userRole === "sales_agent" ||
    userRole === "processor";

  const canEditSale = (sale: (typeof sales)[number]) =>
    userRole === "super_admin" ||
    (userRole === "sales_agent" && sale.agent_id === userId);

  const canDeleteSale = (sale: (typeof sales)[number]) =>
    userRole === "super_admin" ||
    (userRole === "sales_agent" && sale.agent_id === userId);

  const handleConfirmDelete = async () => {
    if (!saleToDelete) return;
    try {
      await deleteMutation.mutateAsync(saleToDelete.id);
      setSaleToDelete(null);
    } catch {
      // Error handling is done in mutation.onError, user sees rollback
    }
  };

  const isLoading = salesLoading; // Don't block on usersLoading — agents load independently in the filter
  void usersLoading; // consumed below in the dropdown placeholder

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-9 w-32 animate-pulse rounded-lg bg-muted/70" />
            <div className="h-5 w-64 animate-pulse rounded bg-muted/50" />
          </div>
          <div className="h-11 w-32 animate-pulse rounded-lg bg-muted/70" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
                  <div className="h-7 w-7 animate-pulse rounded-md bg-muted/70" />
                </div>
                <div className="h-8 w-20 animate-pulse rounded-lg bg-muted/80" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
              <div className="h-11 animate-pulse rounded-lg bg-muted/70 sm:col-span-2 xl:col-span-4" />
              <div className="h-11 animate-pulse rounded-lg bg-muted/70 xl:col-span-2" />
              <div className="h-11 animate-pulse rounded-lg bg-muted/70 xl:col-span-2" />
              <div className="h-11 animate-pulse rounded-lg bg-muted/70 sm:col-span-1 xl:col-span-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Table Header */}
                <div className="mb-3 flex items-center gap-4 border-b border-border pb-3">
                  {[
                    "Customer",
                    "Company",
                    "Type",
                    "Amount",
                    "Agent",
                    "Date",
                    "Actions",
                  ].map((header, i) => (
                    <div
                      key={i}
                      className={`h-4 animate-pulse rounded bg-muted/60 ${i === 0 ? "w-40" : i === 5 ? "w-32" : "w-24"}`}
                    />
                  ))}
                </div>

                {/* Table Rows */}
                {[...Array(10)].map((_, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="flex items-center gap-4 border-b border-border/50 py-4"
                  >
                    <div className="w-40 space-y-1">
                      <div className="h-5 w-32 animate-pulse rounded bg-muted/70" />
                      <div className="h-3 w-28 animate-pulse rounded bg-muted/50" />
                    </div>
                    <div className="h-5 w-24 animate-pulse rounded bg-muted/60" />
                    <div className="w-24 space-y-1">
                      <div className="h-5 w-20 animate-pulse rounded bg-muted/70" />
                      <div className="h-3 w-16 animate-pulse rounded bg-muted/50" />
                    </div>
                    <div className="h-5 w-24 animate-pulse rounded bg-muted/70" />
                    <div className="h-5 w-28 animate-pulse rounded bg-muted/60" />
                    <div className="w-32 space-y-1">
                      <div className="h-5 w-28 animate-pulse rounded bg-muted/60" />
                      <div className="h-5 w-28 animate-pulse rounded bg-muted/60" />
                    </div>
                    <div className="flex w-24 items-center justify-end gap-0.5">
                      <div className="h-8 w-8 animate-pulse rounded-md bg-muted/70" />
                      <div className="h-8 w-8 animate-pulse rounded-md bg-muted/70" />
                      <div className="h-8 w-8 animate-pulse rounded-md bg-muted/70" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Skeleton */}
            <div className="mt-6 flex items-center justify-between">
              <div className="h-5 w-40 animate-pulse rounded bg-muted/60" />
              <div className="flex items-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-9 w-9 animate-pulse rounded-lg bg-muted/70"
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (salesError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sales</h1>
            <p className="text-muted-foreground">
              {userRole === "processor"
                ? "View and search all sales"
                : "Track your sales pipeline"}
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <EmptyState
              title="Error loading data"
              description={
                salesError instanceof Error
                  ? salesError.message
                  : "An error occurred while loading sales"
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales</h1>
          <p className="text-muted-foreground">
            {userRole === "processor"
              ? "View and search all sales"
              : "Track your sales pipeline"}
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <Link href="/dashboard/sales/new">
              <Button>
                <Plus className="h-4 w-4" /> New Sale
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="bg-gradient-to-br from-blue-500/[0.12] to-indigo-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Filtered records</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Database className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.totalRecords}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/[0.12] to-teal-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total charged</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">
              {formatCurrency(stats.totalChargedAmount, currency)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              <span className="text-foreground">
                {formatCurrency(stats.grossChargedAmount, currency)}
              </span>{" "}
              <span className="text-muted-foreground">-</span>{" "}
              <span className="text-destructive">
                {formatCurrency(stats.chargebackImpactedAmount, currency)}
              </span>{" "}
              <span className="text-muted-foreground">=</span>{" "}
              <span className="font-medium text-primary">
                {formatCurrency(stats.totalChargedAmount, currency)}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/[0.12] to-yellow-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Avg charged</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-warning/10 text-warning">
                <Target className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">
              {formatCurrency(stats.avgChargedAmount, currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/[0.12] to-amber-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Utility sales</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                <Zap className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.utilityCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-sky-500/[0.12] to-blue-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Insurance sales</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
                <Shield className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.insuranceCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
            <div className="relative sm:col-span-2 xl:col-span-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search by name, email, phone, account, policy, or company..."
                value={searchInput}
                onChange={(e) => onInputChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="xl:col-span-2 min-w-0">
              <Select
                options={[{ value: "all", label: "All Types" }, ...SALE_TYPES]}
                value={typeFilter}
                onChange={(e) => updateFilters({ type: e.target.value })}
              />
            </div>
            {userRole !== "sales_agent" && (
              <div className="xl:col-span-2 min-w-0">
                <Select
                  options={[
                    { value: "all", label: "All Agents" },
                    ...agents.map((a) => ({ value: a.id, label: a.full_name })),
                  ]}
                  value={agentFilter}
                  onChange={(e) => updateFilters({ agent_id: e.target.value })}
                />
              </div>
            )}
            <div className="sm:col-span-1 xl:col-span-4 min-w-[220px]">
              <DropdownRangeDatePicker
                value={toDateRangeFromFilters(fromDateFilter, toDateFilter)}
                onApply={(range) =>
                  updateFilters({ ...toFilterDates(range), page: 1 })
                }
                triggerClassName="h-11 w-full justify-start text-left font-normal"
              />
            </div>
            <div className="sm:col-span-2 xl:col-span-2 min-w-0">
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  updateFilters({
                    q: "",
                    type: "all",
                    agent_id: "all",
                    from_date: "",
                    to_date: "",
                  })
                }
              >
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="overflow-x-auto">
            {sales.length === 0 ? (
              <EmptyState
                title="No sales found"
                description="Adjust your filters or create a new sale"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[180px]">Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Agent Name</TableHead>
                    <TableHead className="w-[120px]">Sales raw data</TableHead>
                    <TableHead className="w-[100px]">Customer</TableHead>
                    <TableHead className="w-[120px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex w-fit items-center rounded bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning">
                            Sale:{" "}
                            {sale.sale_date
                              ? formatDateKarachi(sale.sale_date)
                              : "N/A"}
                          </span>
                          <span className="inline-flex w-fit items-center rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-medium text-success">
                            Recorded: {formatDateKarachi(sale.created_at)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <Link
                            href={`/dashboard/sales/${sale.id}`}
                            className="text-foreground hover:underline"
                          >
                            {sale.customer?.name || sale.customer_name || "N/A"}
                          </Link>
                          <span className="text-[11px] text-muted-foreground">
                            {sale.customer?.email || sale.customer_email || ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{sale.company_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="capitalize">{sale.sale_type}</span>
                          <span className="text-[11px] text-muted-foreground uppercase">
                            {sale.subtype}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {formatCurrency(sale.charged_amount, currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {sale.agent?.full_name || "N/A"}
                          </span>
                          {sale.agent_id && sale.agent_id !== userId && (
                            <MessageButton
                              userId={sale.agent_id}
                              userName={sale.agent?.full_name || "Agent"}
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <SalesRawDataPopover sale={sale} />
                      </TableCell>
                      <TableCell>
                        <CustomerInfoPopover sale={sale} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          <Link href={`/dashboard/sales/${sale.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md text-muted-foreground hover:text-primary hover:bg-transparent"
                              aria-label="View sale"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {canEditSale(sale) && (
                            <Link href={`/dashboard/sales/${sale.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md text-muted-foreground hover:text-primary hover:bg-transparent"
                                aria-label="Edit sale"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          {canDeleteSale(sale) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-transparent"
                              aria-label="Delete sale"
                              onClick={() =>
                                setSaleToDelete({
                                  id: sale.id,
                                  label:
                                    sale.customer?.name ||
                                    sale.customer_name ||
                                    sale.company_name ||
                                    "this sale",
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => updateFilters({ page: p })}
            totalItems={count}
            pageSize={pageSize}
          />
        </CardContent>
      </Card>

      <Dialog
        open={!!saleToDelete}
        onClose={() => !deleteMutation.isPending && setSaleToDelete(null)}
      >
        <DialogHeader>
          <DialogTitle>Delete sale</DialogTitle>
        </DialogHeader>
        <DialogDescription className="mt-2 text-left">
          Are you sure you want to delete the sale for{" "}
          <strong>{saleToDelete?.label}</strong>? Related payments and
          attachments will be removed. This cannot be undone.
        </DialogDescription>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setSaleToDelete(null)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirmDelete()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Spinner /> : "Delete"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
