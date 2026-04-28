"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MarketingTransactionType, MarketingEntryCampaign } from "@/lib/types";

interface CampaignInput {
  name: string;
  type: "call" | "digital" | "other";
  total_budget: number;
  start_date: string;
  end_date: string;
  assigned_to?: string | null;
  status?: "active" | "paused" | "completed";
  notes?: string;
}

interface DailyCallLogInput {
  log_date: string;
  campaign_id: string;
  user_id: string;
  calls_made: number;
  cost_per_call: number;
  notes?: string;
}

interface DailyCampaignBudgetInput {
  budget_date: string;
  campaign_id: string;
  daily_budget_allocated: number;
  daily_spent_manual?: number | null;
  notes?: string;
}

interface TransactionInput {
  transaction_date: string;
  campaign_id: string;
  type: MarketingTransactionType;
  amount: number;
  note?: string;
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getMonthRange(month: string) {
  const safeMonth = /^\d{4}-\d{2}$/.test(month) ? month : getCurrentMonth();
  const [year, monthNumber] = safeMonth.split("-").map(Number);
  const from = new Date(Date.UTC(year, (monthNumber || 1) - 1, 1));
  const to = new Date(Date.UTC(year, monthNumber || 1, 0));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function revalidateMarketingBudgetPaths() {
  revalidatePath("/dashboard/marketing-budget");
}

export async function getMarketingUsers() {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, role, email")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getMarketingCampaigns() {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  const { data: campaigns, error } = await supabase
    .from("marketing_campaigns")
    .select("*, assigned_user:users!marketing_campaigns_assigned_to_fkey(id, full_name, role, email)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const { data: callLogs, error: callLogsError } = await supabase
    .from("marketing_daily_call_logs")
    .select("campaign_id, log_date, total_daily_cost");
  if (callLogsError) throw new Error(callLogsError.message);

  const { data: dailyBudgets, error: dailyBudgetsError } = await supabase
    .from("marketing_daily_campaign_budgets")
    .select("campaign_id, budget_date, daily_spent_manual");
  if (dailyBudgetsError) throw new Error(dailyBudgetsError.message);

  const callLogMap = new Map<string, number>();
  (callLogs || []).forEach((row) => {
    const key = `${row.campaign_id}:${row.log_date}`;
    callLogMap.set(key, (callLogMap.get(key) || 0) + Number(row.total_daily_cost || 0));
  });

  const budgetOverrides = new Map<string, number>();
  (dailyBudgets || []).forEach((row) => {
    if (row.daily_spent_manual === null || row.daily_spent_manual === undefined) return;
    const key = `${row.campaign_id}:${row.budget_date}`;
    budgetOverrides.set(key, Number(row.daily_spent_manual || 0));
  });

  const campaignSpent = new Map<string, number>();
  callLogMap.forEach((value, key) => {
    const [campaignId] = key.split(":");
    campaignSpent.set(campaignId, (campaignSpent.get(campaignId) || 0) + value);
  });

  budgetOverrides.forEach((manualValue, key) => {
    const [campaignId] = key.split(":");
    const autoValue = callLogMap.get(key) || 0;
    campaignSpent.set(campaignId, (campaignSpent.get(campaignId) || 0) - autoValue + manualValue);
  });

  return (campaigns || []).map((campaign) => {
    const amountSpent = Number(campaignSpent.get(campaign.id) || 0);
    const remaining = Number(campaign.total_budget || 0) - amountSpent;
    const overBudget = remaining < 0;
    return {
      ...campaign,
      amount_spent: amountSpent,
      remaining_budget: remaining,
      computed_status: overBudget ? "over_budget" : campaign.status,
    };
  });
}

export async function getMarketingOverview(month?: string) {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();
  const selectedMonth = month || getCurrentMonth();
  const range = getMonthRange(selectedMonth);

  const campaigns = await getMarketingCampaigns();
  const totalBudgetAllocated = campaigns.reduce((sum, campaign) => sum + Number(campaign.total_budget || 0), 0);
  const totalSpent = campaigns.reduce((sum, campaign) => sum + Number(campaign.amount_spent || 0), 0);
  const remainingBudget = totalBudgetAllocated - totalSpent;
  const utilizationPercent =
    totalBudgetAllocated > 0 ? Math.min(100, Math.max(0, (totalSpent / totalBudgetAllocated) * 100)) : 0;
  const activeCampaigns = campaigns.filter((item) => item.status === "active").length;

  const { data: callLogs, error: callLogsError } = await supabase
    .from("marketing_daily_call_logs")
    .select("log_date, campaign_id, total_daily_cost")
    .gte("log_date", `${selectedMonth}-01`)
    .lte("log_date", `${selectedMonth}-31`);
  if (callLogsError) throw new Error(callLogsError.message);

  const { data: budgetRows, error: budgetsError } = await supabase
    .from("marketing_daily_campaign_budgets")
    .select("budget_date, campaign_id, daily_spent_manual")
    .gte("budget_date", `${selectedMonth}-01`)
    .lte("budget_date", `${selectedMonth}-31`);
  if (budgetsError) throw new Error(budgetsError.message);

  const chartMap = new Map<string, number>();
  (callLogs || []).forEach((row) => {
    chartMap.set(row.log_date, (chartMap.get(row.log_date) || 0) + Number(row.total_daily_cost || 0));
  });

  (budgetRows || []).forEach((row) => {
    if (row.daily_spent_manual === null || row.daily_spent_manual === undefined) return;
    const callLogSpentForDateCampaign = (callLogs || [])
      .filter((log) => log.log_date === row.budget_date && log.campaign_id === row.campaign_id)
      .reduce((sum, log) => sum + Number(log.total_daily_cost || 0), 0);
    chartMap.set(
      row.budget_date,
      (chartMap.get(row.budget_date) || 0) - callLogSpentForDateCampaign + Number(row.daily_spent_manual || 0)
    );
  });

  const days = [];
  const cursor = new Date(`${range.from}T00:00:00.000Z`);
  const end = new Date(`${range.to}T00:00:00.000Z`);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({
      date: key,
      spend: Number((chartMap.get(key) || 0).toFixed(2)),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    totalBudgetAllocated,
    totalSpent,
    remainingBudget,
    utilizationPercent,
    activeCampaigns,
    monthlySpendChart: days,
  };
}

export async function getMarketingDailyCallLogs(filters?: {
  startDate?: string;
  endDate?: string;
  campaignId?: string;
  userId?: string;
}) {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  let query = supabase
    .from("marketing_daily_call_logs")
    .select(
      "*, campaign:marketing_campaigns(id, name, type, status), user:users!marketing_daily_call_logs_user_id_fkey(id, full_name, role, email)"
    )
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.startDate) query = query.gte("log_date", filters.startDate);
  if (filters?.endDate) query = query.lte("log_date", filters.endDate);
  if (filters?.campaignId && filters.campaignId !== "all") query = query.eq("campaign_id", filters.campaignId);
  if (filters?.userId && filters.userId !== "all") query = query.eq("user_id", filters.userId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return data || [];
}

export async function getMarketingDailyCampaignBudgets(month?: string) {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();
  const selectedMonth = month || getCurrentMonth();

  const { data: budgets, error } = await supabase
    .from("marketing_daily_campaign_budgets")
    .select("*, campaign:marketing_campaigns(id, name, status)")
    .gte("budget_date", `${selectedMonth}-01`)
    .lte("budget_date", `${selectedMonth}-31`)
    .order("budget_date", { ascending: false });
  if (error) throw new Error(error.message);

  const { data: callLogs, error: callLogsError } = await supabase
    .from("marketing_daily_call_logs")
    .select("campaign_id, log_date, total_daily_cost")
    .gte("log_date", `${selectedMonth}-01`)
    .lte("log_date", `${selectedMonth}-31`);
  if (callLogsError) throw new Error(callLogsError.message);

  const autoSpent = new Map<string, number>();
  (callLogs || []).forEach((item) => {
    const key = `${item.campaign_id}:${item.log_date}`;
    autoSpent.set(key, (autoSpent.get(key) || 0) + Number(item.total_daily_cost || 0));
  });

  const rows = (budgets || []).map((budget) => {
    const key = `${budget.campaign_id}:${budget.budget_date}`;
    const autoValue = Number(autoSpent.get(key) || 0);
    const spent = budget.daily_spent_manual === null || budget.daily_spent_manual === undefined
      ? autoValue
      : Number(budget.daily_spent_manual || 0);
    const variance = Number(budget.daily_budget_allocated || 0) - spent;
    return {
      ...budget,
      daily_spent: spent,
      variance,
      status: variance >= 0 ? "within" : "over",
    };
  });

  return rows;
}

export async function getMarketingCampaignMonthlyTotals(month?: string) {
  await requireRole(["super_admin", "processor"]);
  const campaigns = await getMarketingCampaigns();
  const selectedMonth = month || getCurrentMonth();
  const dailyBudgets = await getMarketingDailyCampaignBudgets(selectedMonth);

  const totalsMap = new Map<string, number>();
  dailyBudgets.forEach((row) => {
    totalsMap.set(row.campaign_id, (totalsMap.get(row.campaign_id) || 0) + Number(row.daily_spent || 0));
  });

  return campaigns.map((campaign) => ({
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    total_spent: Number(totalsMap.get(campaign.id) || 0),
  }));
}

export async function getMarketingBudgetTransactions() {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("marketing_budget_transactions")
    .select(
      "*, campaign:marketing_campaigns(id, name), performer:users!marketing_budget_transactions_performed_by_fkey(id, full_name, role, email)"
    )
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createMarketingCampaign(input: CampaignInput) {
  const user = await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  if (!input.name?.trim()) throw new Error("Campaign name is required");
  if (!input.start_date || !input.end_date) throw new Error("Campaign date range is required");
  if (new Date(input.end_date) < new Date(input.start_date)) throw new Error("End date must be after start date");

  const budget = Number(input.total_budget || 0);
  if (budget < 0) throw new Error("Budget cannot be negative");

  const { data, error } = await supabase
    .from("marketing_campaigns")
    .insert({
      name: input.name.trim(),
      type: input.type,
      total_budget: budget,
      start_date: input.start_date,
      end_date: input.end_date,
      assigned_to: input.assigned_to || null,
      status: input.status || "active",
      notes: input.notes?.trim() || "",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (budget > 0) {
    await supabase.from("marketing_budget_transactions").insert({
      transaction_date: input.start_date,
      type: "allocation",
      campaign_id: data.id,
      amount: budget,
      performed_by: user.id,
      note: "Initial campaign allocation",
    });
  }

  revalidateMarketingBudgetPaths();
  return data;
}

export async function updateMarketingCampaign(id: string, input: CampaignInput) {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  if (!id) throw new Error("Campaign id is required");
  if (!input.name?.trim()) throw new Error("Campaign name is required");
  if (!input.start_date || !input.end_date) throw new Error("Campaign date range is required");
  if (new Date(input.end_date) < new Date(input.start_date)) throw new Error("End date must be after start date");

  const budget = Number(input.total_budget || 0);
  if (budget < 0) throw new Error("Budget cannot be negative");

  const { error } = await supabase
    .from("marketing_campaigns")
    .update({
      name: input.name.trim(),
      type: input.type,
      total_budget: budget,
      start_date: input.start_date,
      end_date: input.end_date,
      assigned_to: input.assigned_to || null,
      status: input.status || "active",
      notes: input.notes?.trim() || "",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateMarketingBudgetPaths();
}

export async function deleteMarketingCampaign(id: string) {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  if (!id) throw new Error("Campaign id is required");
  const { error } = await supabase.from("marketing_campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateMarketingBudgetPaths();
}

export async function createMarketingDailyCallLog(input: DailyCallLogInput) {
  const user = await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  if (!input.log_date || !input.campaign_id || !input.user_id) {
    throw new Error("Date, campaign, and agent are required");
  }
  if (Number(input.calls_made || 0) < 0 || Number(input.cost_per_call || 0) < 0) {
    throw new Error("Calls made and cost per call cannot be negative");
  }

  const { error } = await supabase.from("marketing_daily_call_logs").insert({
    log_date: input.log_date,
    campaign_id: input.campaign_id,
    user_id: input.user_id,
    calls_made: Number(input.calls_made || 0),
    cost_per_call: Number(input.cost_per_call || 0),
    notes: input.notes?.trim() || "",
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  const { data: createdLog } = await supabase
    .from("marketing_daily_call_logs")
    .select("total_daily_cost")
    .eq("campaign_id", input.campaign_id)
    .eq("user_id", input.user_id)
    .eq("log_date", input.log_date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("marketing_budget_transactions").insert({
    transaction_date: input.log_date,
    type: "deduction",
    campaign_id: input.campaign_id,
    amount: Number(createdLog?.total_daily_cost || 0),
    performed_by: user.id,
    note: "Daily call log cost",
  });

  revalidateMarketingBudgetPaths();
}

export async function upsertMarketingDailyCampaignBudget(input: DailyCampaignBudgetInput) {
  const user = await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  if (!input.budget_date || !input.campaign_id) throw new Error("Date and campaign are required");
  if (Number(input.daily_budget_allocated || 0) < 0) throw new Error("Daily budget cannot be negative");
  if ((input.daily_spent_manual ?? 0) < 0) throw new Error("Daily spent cannot be negative");

  const { error } = await supabase.from("marketing_daily_campaign_budgets").upsert(
    {
      budget_date: input.budget_date,
      campaign_id: input.campaign_id,
      daily_budget_allocated: Number(input.daily_budget_allocated || 0),
      daily_spent_manual:
        input.daily_spent_manual === null || input.daily_spent_manual === undefined
          ? null
          : Number(input.daily_spent_manual),
      notes: input.notes?.trim() || "",
      created_by: user.id,
    },
    { onConflict: "budget_date,campaign_id" }
  );
  if (error) throw new Error(error.message);
  revalidateMarketingBudgetPaths();
}

export async function recordMarketingBudgetTransaction(input: TransactionInput) {
  const user = await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  if (!input.campaign_id || !input.type || !input.transaction_date) {
    throw new Error("Campaign, date, and transaction type are required");
  }
  if (Number(input.amount) === 0) throw new Error("Transaction amount cannot be zero");

  const { data: campaign, error: campaignError } = await supabase
    .from("marketing_campaigns")
    .select("id, total_budget")
    .eq("id", input.campaign_id)
    .single();
  if (campaignError || !campaign) throw new Error(campaignError?.message || "Campaign not found");

  const amount = Number(input.amount);
  let budgetDelta = amount;
  if (input.type === "deduction") budgetDelta = -Math.abs(amount);
  if (input.type === "allocation") budgetDelta = Math.abs(amount);
  if (input.type === "adjustment") budgetDelta = amount;

  const nextBudget = Number(campaign.total_budget || 0) + budgetDelta;
  if (nextBudget < 0) throw new Error("Campaign budget cannot become negative");

  const { error: updateError } = await supabase
    .from("marketing_campaigns")
    .update({ total_budget: nextBudget })
    .eq("id", input.campaign_id);
  if (updateError) throw new Error(updateError.message);

  const { error } = await supabase.from("marketing_budget_transactions").insert({
    transaction_date: input.transaction_date,
    type: input.type,
    campaign_id: input.campaign_id,
    amount,
    performed_by: user.id,
    note: input.note?.trim() || "",
  });
  if (error) throw new Error(error.message);

  revalidateMarketingBudgetPaths();
}

// ============================================
// Marketing Entries (New simplified system)
// ============================================

interface MarketingEntryInput {
  entry_date: string;
  campaign: MarketingEntryCampaign;
  budget_assigned: number;
  calls_landed: number;
  dropped_calls: number;
  sales_acquired: number;
}

export interface MarketingEntryStats {
  totalBudget: number;
  totalLeads: number;
  totalSales: number;
  totalDropped: number;
  avgConversionRate: number;
  avgDropRate: number;
  avgCostPerLead: number;
  avgCostPerSale: number;
}

export interface MarketingEntryWithCalculations {
  id: string;
  entry_date: string;
  campaign: MarketingEntryCampaign;
  budget_assigned: number;
  calls_landed: number;
  dropped_calls: number;
  sales_acquired: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  conversion_rate: number;
  drop_rate: number;
  cost_per_lead: number;
  cost_per_sale: number;
}

function mapMarketingEntryRow(entry: Record<string, unknown>): MarketingEntryWithCalculations {
  const callsLanded = Number(entry.calls_landed || 0);
  const droppedCalls = Number(entry.dropped_calls || 0);
  const salesAcquired = Number(entry.sales_acquired || 0);
  const budgetAssigned = Number(entry.budget_assigned || 0);

  const conversionRate = callsLanded > 0 ? (salesAcquired / callsLanded) * 100 : 0;
  const dropRate = callsLanded > 0 ? (droppedCalls / callsLanded) * 100 : 0;
  const costPerLead = callsLanded > 0 ? budgetAssigned / callsLanded : 0;
  const costPerSale = salesAcquired > 0 ? budgetAssigned / salesAcquired : 0;

  const base = entry as unknown as MarketingEntryWithCalculations;
  return {
    ...base,
    conversion_rate: Number(conversionRate.toFixed(2)),
    drop_rate: Number(dropRate.toFixed(2)),
    cost_per_lead: Number(costPerLead.toFixed(2)),
    cost_per_sale: Number(costPerSale.toFixed(2)),
  };
}

function applyMarketingEntryFilters<
  T extends { gte: (c: string, v: string) => T; lte: (c: string, v: string) => T; eq: (c: string, v: string) => T; ilike: (c: string, v: string) => T },
>(query: T, filters?: { startDate?: string; endDate?: string; campaign?: MarketingEntryCampaign | "all"; search?: string }) {
  let q = query;
  if (filters?.startDate) {
    q = q.gte("entry_date", filters.startDate) as T;
  }
  if (filters?.endDate) {
    q = q.lte("entry_date", filters.endDate) as T;
  }
  if (filters?.campaign && filters.campaign !== "all") {
    q = q.eq("campaign", filters.campaign) as T;
  }
  const rawSearch = filters?.search?.trim();
  if (rawSearch) {
    const escaped = rawSearch.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    q = q.ilike("campaign", `%${escaped}%`) as T;
  }
  return q;
}

export async function getMarketingEntries(filters?: {
  startDate?: string;
  endDate?: string;
  campaign?: MarketingEntryCampaign | "all";
  search?: string;
}): Promise<MarketingEntryWithCalculations[]> {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  let query = supabase.from("marketing_entries").select("id, entry_date, campaign, budget_assigned, calls_landed, dropped_calls, sales_acquired, created_by, created_at, updated_at").order("entry_date", { ascending: false }).order("created_at", { ascending: false });

  query = applyMarketingEntryFilters(query, filters);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).map((entry) => mapMarketingEntryRow(entry as Record<string, unknown>));
}

export async function getMarketingEntriesPage(filters?: {
  startDate?: string;
  endDate?: string;
  campaign?: MarketingEntryCampaign | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  data: MarketingEntryWithCalculations[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  const requestedPage = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters?.pageSize ?? 10));

  let countQuery = supabase
    .from("marketing_entries")
    .select("id", { count: "exact", head: true });

  countQuery = applyMarketingEntryFilters(countQuery, filters);

  const { count, error: countError } = await countQuery;
  if (countError) throw new Error(countError.message);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = total === 0 ? 1 : Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  let dataQuery = supabase
    .from("marketing_entries")
    .select("id, entry_date, campaign, budget_assigned, calls_landed, dropped_calls, sales_acquired, created_by, created_at, updated_at")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  dataQuery = applyMarketingEntryFilters(dataQuery, filters);

  const { data, error } = await dataQuery.range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);

  return {
    data: (data || []).map((entry) => mapMarketingEntryRow(entry as Record<string, unknown>)),
    count: total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getMarketingEntryStats(filters?: {
  startDate?: string;
  endDate?: string;
  campaign?: MarketingEntryCampaign | "all";
}): Promise<MarketingEntryStats> {
  const { stats } = await getMarketingEntryStatsAndChart(filters);
  return stats;
}

export async function getMarketingEntryChartData(filters?: {
  startDate?: string;
  endDate?: string;
  campaign?: MarketingEntryCampaign | "all";
}) {
  const { chartData } = await getMarketingEntryStatsAndChart(filters);
  return chartData;
}

export async function getMarketingEntryStatsAndChart(filters?: {
  startDate?: string;
  endDate?: string;
  campaign?: MarketingEntryCampaign | "all";
}) {
  const entries = await getMarketingEntries(filters);

  const totalBudget = entries.reduce((sum, e) => sum + Number(e.budget_assigned || 0), 0);
  const totalLeads = entries.reduce((sum, e) => sum + Number(e.calls_landed || 0), 0);
  const totalSales = entries.reduce((sum, e) => sum + Number(e.sales_acquired || 0), 0);
  const totalDropped = entries.reduce((sum, e) => sum + Number(e.dropped_calls || 0), 0);

  const avgConversionRate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;
  const avgDropRate = totalLeads > 0 ? (totalDropped / totalLeads) * 100 : 0;
  const avgCostPerLead = totalLeads > 0 ? totalBudget / totalLeads : 0;
  const avgCostPerSale = totalSales > 0 ? totalBudget / totalSales : 0;

  const stats: MarketingEntryStats = {
    totalBudget: Number(totalBudget.toFixed(2)),
    totalLeads,
    totalSales,
    totalDropped,
    avgConversionRate: Number(avgConversionRate.toFixed(2)),
    avgDropRate: Number(avgDropRate.toFixed(2)),
    avgCostPerLead: Number(avgCostPerLead.toFixed(2)),
    avgCostPerSale: Number(avgCostPerSale.toFixed(2)),
  };

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
  );

  const chartData = {
    budgetVsSales: sortedEntries.map((e) => ({
      date: e.entry_date,
      budget: Number(e.budget_assigned || 0),
      sales: Number(e.sales_acquired || 0),
    })),
    leadsVsConversions: sortedEntries.map((e) => ({
      date: e.entry_date,
      leads: Number(e.calls_landed || 0),
      conversions: Number(e.sales_acquired || 0),
    })),
    dropRatioTrend: sortedEntries.map((e) => ({
      date: e.entry_date,
      dropRate: e.drop_rate,
    })),
  };

  return { stats, chartData };
}

export async function createMarketingEntry(input: MarketingEntryInput) {
  const user = await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  if (!input.entry_date) throw new Error("Date is required");
  if (!input.campaign) throw new Error("Campaign is required");

  const { data, error } = await supabase
    .from("marketing_entries")
    .insert({
      entry_date: input.entry_date,
      campaign: input.campaign,
      budget_assigned: Number(input.budget_assigned || 0),
      calls_landed: Number(input.calls_landed || 0),
      dropped_calls: Number(input.dropped_calls || 0),
      sales_acquired: Number(input.sales_acquired || 0),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidateMarketingBudgetPaths();
  return data.id;
}

export async function updateMarketingEntry(id: string, input: MarketingEntryInput) {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  if (!id) throw new Error("Entry ID is required");
  if (!input.entry_date) throw new Error("Date is required");
  if (!input.campaign) throw new Error("Campaign is required");

  const { error } = await supabase
    .from("marketing_entries")
    .update({
      entry_date: input.entry_date,
      campaign: input.campaign,
      budget_assigned: Number(input.budget_assigned || 0),
      calls_landed: Number(input.calls_landed || 0),
      dropped_calls: Number(input.dropped_calls || 0),
      sales_acquired: Number(input.sales_acquired || 0),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateMarketingBudgetPaths();
}

export async function deleteMarketingEntry(id: string) {
  await requireRole(["super_admin", "processor"]);
  const supabase = await createClient();

  if (!id) throw new Error("Entry ID is required");

  const { error } = await supabase.from("marketing_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateMarketingBudgetPaths();
}
