export const ROLES = {
  SUPER_ADMIN: "super_admin" as const,
  SALES_AGENT: "sales_agent" as const,
  PROCESSOR: "processor" as const,
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  sales_agent: "Sales Agent",
  processor: "Processor",
};

export const SALE_TYPES = [
  { value: "utility", label: "Utility" },
  { value: "insurance", label: "Insurance" },
];

export const SALE_SUBTYPES = [
  { value: "new", label: "New Sale" },
  { value: "bill", label: "Bill Sale" },
  { value: "premium", label: "Premium Sale" },
  { value: "cancellation", label: "Cancellation" },
];

export const UTILITY_SUBTYPES = [
  { value: "new", label: "New Sale" },
  { value: "bill", label: "Bill Sale" },
  { value: "cancellation", label: "Cancellation" },
];

export const INSURANCE_SUBTYPES = [
  { value: "new", label: "New Sale" },
  { value: "premium", label: "Premium Sale" },
  { value: "cancellation", label: "Cancellation" },
];

export const ACCOUNT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
  { value: "suspended", label: "Suspended" },
];

export const SALE_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const CHARGEBACK_STATUSES = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "disputed", label: "Disputed" },
];

export const LEAVE_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const LEAVE_TYPES = [
  { value: "sick", label: "Sick Leave" },
  { value: "casual", label: "Casual Leave" },
  { value: "annual", label: "Annual Leave" },
  { value: "other", label: "Other" },
];

export const PAYMENT_METHODS = [
  { value: "card", label: "Credit/Debit Card" },
  { value: "bank", label: "Bank Transfer" },
];

export const CURRENCIES = [
  { value: "PKR", label: "Pakistani Rupee (PKR)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "AED", label: "UAE Dirham (AED)" },
  { value: "SAR", label: "Saudi Riyal (SAR)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
];

export const NAV_ITEMS = {
  super_admin: [
    { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/dashboard/users", label: "Users", icon: "Users" },
    { href: "/dashboard/customers", label: "Customers", icon: "Contact" },
    { href: "/dashboard/sales", label: "Sales", icon: "TrendingUp" },
    { href: "/dashboard/payments", label: "Payments", icon: "CreditCard" },
    { href: "/dashboard/chargebacks", label: "Chargebacks", icon: "AlertTriangle" },
    { href: "/dashboard/attendance", label: "Attendance", icon: "Clock" },
    { href: "/dashboard/leaves", label: "Leaves", icon: "CalendarDays" },
    { href: "/dashboard/reports", label: "Reports", icon: "BarChart3" },
    { href: "/dashboard/settings", label: "Settings", icon: "Settings" },
  ],
  sales_agent: [
    { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/dashboard/customers", label: "Customers", icon: "Contact" },
    { href: "/dashboard/sales", label: "My Sales", icon: "TrendingUp" },
    { href: "/dashboard/attendance", label: "Attendance", icon: "Clock" },
    { href: "/dashboard/leaves", label: "My Leaves", icon: "CalendarDays" },
    { href: "/dashboard/settings", label: "Settings", icon: "Settings" },
  ],
  processor: [
    { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/dashboard/sales", label: "Sales Queue", icon: "TrendingUp" },
    { href: "/dashboard/chargebacks", label: "Chargebacks", icon: "AlertTriangle" },
    { href: "/dashboard/attendance", label: "Attendance", icon: "Clock" },
    { href: "/dashboard/leaves", label: "Leaves", icon: "CalendarDays" },
    { href: "/dashboard/settings", label: "Settings", icon: "Settings" },
  ],
};
