"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { parsePageSize } from "@/lib/page-size";
import { CALL_LOG_BUCKET, isCallLogScreenshotPath, isIsoDate } from "@/lib/call-log";
import type { UserRole } from "@/lib/types";

export interface DailyCallLogRow {
  id: string;
  agent_id: string;
  agent_name: string;
  log_date: string;
  total_calls: number;
  total_sales: number;
  screenshot_path: string | null;
  screenshot_url: string | null;
}

export interface DailyCallLogStats {
  totalCalls: number;
  totalSales: number;
  conversionRate: number;
  daysLogged: number;
}

export interface DailyCallLogPage {
  data: DailyCallLogRow[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: DailyCallLogStats;
}

export interface DailyCallLogFilters {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  agentId?: string;
  search?: string;
}

interface CallLogWrite {
  logDate: string;
  totalCalls: number;
  totalSales: number;
  screenshotPath?: string | null;
}

function revalidateCallLog() {
  revalidatePath("/dashboard/call-log");
}

function assertCounts(totalCalls: number, totalSales: number) {
  if (!Number.isInteger(totalCalls) || totalCalls < 0) {
    throw new Error("Total calls must be a whole number that is 0 or greater.");
  }
  if (!Number.isInteger(totalSales) || totalSales < 0) {
    throw new Error("Total sales must be a whole number that is 0 or greater.");
  }
  if (totalSales > totalCalls) {
    throw new Error("Total sales cannot be greater than total calls.");
  }
}

function assertDate(value: string) {
  if (!isIsoDate(value)) throw new Error("Enter a valid date.");
}

function cleanSearch(value: string | undefined): string | null {
  const cleaned = (value ?? "").replace(/[%_\\]/g, "").trim().slice(0, 80);
  return cleaned || null;
}

function cleanDate(value: string | undefined): string | null {
  if (!value || !isIsoDate(value)) return null;
  return value;
}

function dbMessage(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "A log already exists for this date.";
  if (error.code === "23514") return "Total sales cannot be greater than total calls.";
  return error.message || "Could not save the call log.";
}

async function signedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(CALL_LOG_BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function removeStoredFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null,
) {
  if (!path) return;
  await supabase.storage.from(CALL_LOG_BUCKET).remove([path]);
}

export async function getDailyCallLogs(filters?: DailyCallLogFilters): Promise<DailyCallLogPage> {
  const user = await requireRole(["super_admin", "sales_agent"]);
  const supabase = await createClient();
  const page = Math.max(1, filters?.page || 1);
  const pageSize = parsePageSize(filters?.pageSize);
  const from = cleanDate(filters?.from);
  const to = cleanDate(filters?.to);
  const search = cleanSearch(filters?.search);
  const requestedAgent = filters?.agentId && filters.agentId !== "all" ? filters.agentId : null;
  const agentId = user.role === "sales_agent" ? user.id : requestedAgent;

  const args = {
    p_from: from,
    p_to: to,
    p_agent: agentId,
    p_search: search,
  };

  const [pageResult, statsResult] = await Promise.all([
    supabase.rpc("daily_call_logs_page", {
      ...args,
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
    }),
    supabase.rpc("daily_call_log_stats", args),
  ]);

  if (pageResult.error) throw new Error(pageResult.error.message);
  if (statsResult.error) throw new Error(statsResult.error.message);

  const statsRow = statsResult.data?.[0];
  const totalCalls = Number(statsRow?.total_calls ?? 0);
  const totalSales = Number(statsRow?.total_sales ?? 0);
  const daysLogged = Number(statsRow?.days_logged ?? 0);
  const rows = await Promise.all(
    (pageResult.data ?? []).map(async (row) => ({
      id: row.id,
      agent_id: row.agent_id,
      agent_name: row.agent_name?.trim() || "Unknown agent",
      log_date: row.log_date,
      total_calls: row.total_calls,
      total_sales: row.total_sales,
      screenshot_path: row.screenshot_path,
      screenshot_url: await signedUrl(supabase, row.screenshot_path),
    })),
  );

  return {
    data: rows,
    count: daysLogged,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(daysLogged / pageSize)),
    stats: {
      totalCalls,
      totalSales,
      conversionRate: totalCalls > 0 ? (totalSales / totalCalls) * 100 : 0,
      daysLogged,
    },
  };
}

export async function createDailyCallLog(input: CallLogWrite) {
  const user = await requireRole(["super_admin", "sales_agent"]);
  assertDate(input.logDate);
  assertCounts(input.totalCalls, input.totalSales);
  if (input.screenshotPath && !isCallLogScreenshotPath(input.screenshotPath, user.id)) {
    throw new Error("The screenshot could not be saved.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("daily_call_logs").insert({
    agent_id: user.id,
    log_date: input.logDate,
    total_calls: input.totalCalls,
    total_sales: input.totalSales,
    screenshot_path: input.screenshotPath ?? null,
  });
  if (error) throw new Error(dbMessage(error));
  revalidateCallLog();
}

export async function updateDailyCallLog(id: string, input: CallLogWrite) {
  const user = await requireRole(["super_admin", "sales_agent"]);
  assertDate(input.logDate);
  assertCounts(input.totalCalls, input.totalSales);
  const supabase = await createClient();
  const existing = await readOwnedLog(supabase, id, user.role, user.id);
  if (input.screenshotPath && !isCallLogScreenshotPath(input.screenshotPath, existing.agent_id)) {
    throw new Error("The screenshot could not be saved.");
  }

  const { error } = await supabase
    .from("daily_call_logs")
    .update({
      log_date: input.logDate,
      total_calls: input.totalCalls,
      total_sales: input.totalSales,
      screenshot_path: input.screenshotPath === undefined ? existing.screenshot_path : input.screenshotPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(dbMessage(error));

  if (input.screenshotPath !== undefined && existing.screenshot_path && existing.screenshot_path !== input.screenshotPath) {
    await removeStoredFile(supabase, existing.screenshot_path);
  }
  revalidateCallLog();
}

export async function deleteDailyCallLog(id: string) {
  const user = await requireRole(["super_admin", "sales_agent"]);
  const supabase = await createClient();
  const existing = await readOwnedLog(supabase, id, user.role, user.id);
  const { error } = await supabase.from("daily_call_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await removeStoredFile(supabase, existing.screenshot_path);
  revalidateCallLog();
}

async function readOwnedLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  role: UserRole,
  userId: string,
): Promise<{ agent_id: string; screenshot_path: string | null }> {
  const { data, error } = await supabase
    .from("daily_call_logs")
    .select("agent_id, screenshot_path")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Log not found.");
  if (role === "sales_agent" && data.agent_id !== userId) {
    throw new Error("You can only manage your own logs.");
  }
  return data;
}
