export type UserRole = "super_admin" | "sales_agent" | "processor";

export type SaleType = "utility" | "insurance";
export type SaleSubtype = "new" | "bill" | "premium" | "cancellation";
export type SaleStatus = "pending" | "approved" | "rejected";
export type ChargebackStatus = "open" | "resolved" | "disputed";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type PaymentMethod = "card" | "bank";
export type PayslipStatus = "processed" | "paid";
export type MarketingCampaignType = "call" | "digital" | "other";
export type MarketingCampaignStatus = "active" | "paused" | "completed";
export type MarketingTransactionType = "allocation" | "deduction" | "adjustment";

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  employee_id: string;
  is_active: boolean;
  created_at: string;
  avatar_url?: string | null;
  preferred_currency?: string | null;
  allowed_modules?: string[] | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  dob: string;
  ssn_encrypted: string;
  cnic: string;
  account_no: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  sale_type: SaleType;
  subtype: SaleSubtype;
  customer_id: string;
  agent_id: string;
  processor_id: string | null;
  company_name: string;
  amount: number;
  discount: number;
  charged_amount: number;
  billed_month: string;
  next_billing_date: string;
  status: SaleStatus;
  sales_notes: string;
  processing_notes: string;
  created_at: string;
  updated_at: string;
  sale_date: string | null;
  customer_phone: string;
  customer_name: string;
  customer_email: string;
  service_address: string;
  account_holder_name: string;
  dob: string;
  ssn_encrypted: string;
  account_status: string;
  other_sale_data: string;
  policy_holder_name: string;
  vehicle_details: string;
  payment_method: string;
  merchant_name: string;
  customer?: Customer;
  agent?: AppUser;
  processor?: AppUser;
}

export interface Payment {
  id: string;
  sale_id: string;
  customer_id: string;
  method: PaymentMethod;
  amount: number;
  card_last_four: string | null;
  card_exp: string | null;
  card_cvv_encrypted: string | null;
  billing_address: string | null;
  merchant_name: string | null;
  bank_name: string | null;
  routing_number_encrypted: string | null;
  account_number_encrypted: string | null;
  account_holder_name: string | null;
  encrypted_details: string;
  created_at: string;
  sale?: Sale;
  customer?: Customer;
}

export interface Attendance {
  id: string;
  user_id: string;
  check_in: string;
  check_out: string | null;
  date: string;
  user?: AppUser;
}

export interface AttendanceSettings {
  id: number;
  shift_start_time: string;
  late_after_time: string;
  shift_end_time: string;
  checkout_latest_time: string;
  created_at: string;
  updated_at: string;
}

export interface Chargeback {
  id: string;
  sale_id: string;
  date: string;
  reason: string;
  status: ChargebackStatus;
  created_at: string;
  sale?: Sale;
}

export interface Leave {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  type: string;
  reason: string;
  status: LeaveStatus;
  approver_id: string | null;
  approver_notes: string | null;
  created_at: string;
  updated_at: string;
  user?: AppUser;
  approver?: AppUser;
}

export interface Note {
  id: string;
  sale_id: string | null;
  customer_id: string | null;
  user_id: string;
  content: string;
  is_important: boolean;
  created_at: string;
  user?: AppUser;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface Payslip {
  id: string;
  user_id: string;
  generated_by: string | null;
  period_start: string;
  period_end: string;
  pay_date: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  net_pay: number;
  currency: string;
  status: PayslipStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  employee_id_display?: string | null;
  joining_date?: string | null;
  category?: string | null;
  department?: string | null;
  job_position?: string | null;
  father_name?: string | null;
  pay_days?: number;
  cnic_no?: string | null;
  address?: string | null;
  pay_rate?: number;
  gross_pay?: number;
  monthly_revenue?: number;
  chargeback_amount?: number;
  remaining?: number;
  commission?: number;
  advance?: number;
  late_attendance?: number;
  leaves?: number;
  paid_through?: string | null;
  bank_account_no?: string | null;
  bank_branch?: string | null;
  user?: Pick<AppUser, "id" | "full_name" | "role" | "email"> | null;
  generator?: Pick<AppUser, "id" | "full_name"> | null;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  type: MarketingCampaignType;
  total_budget: number;
  start_date: string;
  end_date: string;
  assigned_to: string | null;
  status: MarketingCampaignStatus;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  assigned_user?: Pick<AppUser, "id" | "full_name" | "role" | "email"> | null;
}

export interface MarketingDailyCallLog {
  id: string;
  log_date: string;
  campaign_id: string;
  user_id: string;
  calls_made: number;
  cost_per_call: number;
  total_daily_cost: number;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  campaign?: Pick<MarketingCampaign, "id" | "name" | "type" | "status"> | null;
  user?: Pick<AppUser, "id" | "full_name" | "role" | "email"> | null;
}

export interface MarketingDailyCampaignBudget {
  id: string;
  budget_date: string;
  campaign_id: string;
  daily_budget_allocated: number;
  daily_spent_manual: number | null;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  campaign?: Pick<MarketingCampaign, "id" | "name" | "status"> | null;
}

export interface MarketingBudgetTransaction {
  id: string;
  transaction_date: string;
  type: MarketingTransactionType;
  campaign_id: string;
  amount: number;
  performed_by: string;
  note: string;
  created_at: string;
  campaign?: Pick<MarketingCampaign, "id" | "name"> | null;
  performer?: Pick<AppUser, "id" | "full_name" | "role" | "email"> | null;
}

export interface DashboardFilters {
  dateFrom: string;
  dateTo: string;
  employeeId: string;
  saleType: SaleType | "all";
}
