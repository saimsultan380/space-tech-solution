export type UserRole = "super_admin" | "sales_agent" | "processor";

export type SaleType = "utility" | "insurance";
export type SaleSubtype = "new" | "bill" | "premium" | "cancellation";
export type SaleStatus = "pending" | "approved" | "rejected";
export type ChargebackStatus = "open" | "resolved" | "disputed";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type PaymentMethod = "card" | "bank";
export type PayslipStatus = "draft" | "sent";

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
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
  notes: string;
  status: PayslipStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  user?: Pick<AppUser, "id" | "full_name" | "role" | "email"> | null;
  generator?: Pick<AppUser, "id" | "full_name"> | null;
}

export interface DashboardFilters {
  dateFrom: string;
  dateTo: string;
  employeeId: string;
  saleType: SaleType | "all";
}
