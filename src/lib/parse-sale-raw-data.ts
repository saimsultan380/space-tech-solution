import { interpretUsMonth, usDateToIso } from "@/components/ui/date-field";

export const SALE_RAW_FIELD_LABELS: Record<string, string> = {
  sale_type: "Type",
  subtype: "Subtype",
  sale_date: "Sale Date",
  account_status: "Account Status",
  customer_name: "Customer Name",
  customer_phone: "Customer Phone",
  customer_email: "Customer Email",
  service_address: "Service Address",
  account_holder_name: "Account Holder Name",
  policy_holder_name: "Policy Holder Name",
  account_no: "Account Number",
  dob: "Date of Birth",
  ssn: "SSN",
  company_name: "Company Name",
  utility_company_service_number: "Utility service number",
  utility_company_phone: "Utility Company Phone",
  vehicle_details: "Vehicle Details",
  amount: "Amount",
  discount: "Discount",
  billed_month: "Billed Month",
  next_billing_date: "Due Date",
  expected_next_bill_date: "Expected Next Bill Date",
  payment_status_after_sale: "Payment Status",
  payment_method: "Payment method",
  card_number: "Card Number",
  card_exp: "Card Expiry",
  card_cvv: "CVV",
  card_billing_address: "Billing Address",
  merchant_name: "Merchant Name",
  routing_number: "Routing Number",
  bank_account_number: "Bank Account Number",
  bank_account_holder_name: "Bank Account Holder",
  bank_name: "Bank Name",
  guest_pay_link: "Guest Pay Link",
};

const LABEL_FIELDS: Array<[string, string]> = [
  ["bank account holder name", "bank_account_holder_name"],
  ["bank account holder", "bank_account_holder_name"],
  ["bank account number", "bank_account_number"],
  ["checking account number", "bank_account_number"],
  ["checking account", "bank_account_number"],
  ["utility company service number", "utility_company_service_number"],
  ["utility service number", "utility_company_service_number"],
  ["service number", "utility_company_service_number"],
  ["utility company phone number", "utility_company_phone"],
  ["utility company phone", "utility_company_phone"],
  ["utility phone", "utility_company_phone"],
  ["company phone", "utility_company_phone"],
  ["insurance company name", "company_name"],
  ["insurance company", "company_name"],
  ["utility company name", "company_name"],
  ["utility company", "company_name"],
  ["company name", "company_name"],
  ["company", "company_name"],
  ["customer name", "customer_name"],
  ["client name", "customer_name"],
  ["full name", "customer_name"],
  ["name", "customer_name"],
  ["customer phone", "customer_phone"],
  ["phone number", "customer_phone"],
  ["phone", "customer_phone"],
  ["mobile", "customer_phone"],
  ["cell phone", "customer_phone"],
  ["cell", "customer_phone"],
  ["customer email", "customer_email"],
  ["email address", "customer_email"],
  ["email", "customer_email"],
  ["service address", "service_address"],
  ["address", "service_address"],
  ["policy holder name", "policy_holder_name"],
  ["policy holder", "policy_holder_name"],
  ["account holder name", "account_holder_name"],
  ["account holder", "account_holder_name"],
  ["policy number", "account_no"],
  ["policy no", "account_no"],
  ["account number", "account_no"],
  ["account no", "account_no"],
  ["account", "account_no"],
  ["date of birth", "dob"],
  ["birth date", "dob"],
  ["dob", "dob"],
  ["social security", "ssn"],
  ["ssn", "ssn"],
  ["vehicle details", "vehicle_details"],
  ["vehicle", "vehicle_details"],
  ["premium amount", "amount"],
  ["bill amount", "amount"],
  ["amount", "amount"],
  ["premium", "amount"],
  ["bill", "amount"],
  ["discount", "discount"],
  ["discounts", "discount"],
  ["billed month", "billed_month"],
  ["bill month", "billed_month"],
  ["expected next bill date", "expected_next_bill_date"],
  ["next bill date", "expected_next_bill_date"],
  ["due date", "next_billing_date"],
  ["next billing date", "next_billing_date"],
  ["sale date", "sale_date"],
  ["date of sale", "sale_date"],
  ["credit card number", "card_number"],
  ["debit card number", "card_number"],
  ["card number", "card_number"],
  ["credit card", "card_number"],
  ["debit card", "card_number"],
  ["cc number", "card_number"],
  ["cc no", "card_number"],
  ["ccn", "card_number"],
  ["card no", "card_number"],
  ["visa", "card_number"],
  ["mastercard", "card_number"],
  ["master card", "card_number"],
  ["amex", "card_number"],
  ["american express", "card_number"],
  ["discover", "card_number"],
  ["cc", "card_number"],
  ["card", "card_number"],
  ["expiry", "card_exp"],
  ["expiration", "card_exp"],
  ["card exp", "card_exp"],
  ["exp", "card_exp"],
  ["cvv", "card_cvv"],
  ["cvc", "card_cvv"],
  ["security code", "card_cvv"],
  ["billing address", "card_billing_address"],
  ["card billing address", "card_billing_address"],
  ["merchant name", "merchant_name"],
  ["merchant", "merchant_name"],
  ["routing number", "routing_number"],
  ["routing", "routing_number"],
  ["bank name", "bank_name"],
  ["bank", "bank_name"],
  ["guest pay link", "guest_pay_link"],
  ["guest pay", "guest_pay_link"],
  ["payment status", "payment_status_after_sale"],
  ["account status", "account_status"],
  ["sale type", "sale_type"],
  ["type", "sale_type"],
  ["subtype", "subtype"],
];
LABEL_FIELDS.sort((a, b) => b[0].length - a[0].length);

const DATE_FIELDS = new Set(["sale_date", "dob", "next_billing_date", "expected_next_bill_date"]);
const ACCOUNT_STATUSES = new Set(["active", "pending", "cancelled", "canceled", "suspended"]);
const PAYMENT_STATUSES = new Set(["pending", "completed", "failed", "refunded", "cancelled", "canceled"]);
const SUBTYPES = new Set(["new", "bill", "premium", "cancellation", "cancelation"]);

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');
}

export function saleRawPlainText(html: string): string {
  return htmlToText(html).replace(/\u00a0/g, " ");
}

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMoney(value: string): string {
  const amount = value.replace(/[$,\s]/g, "");
  return /^\d+(\.\d{1,2})?$/.test(amount) ? amount : "";
}

function cleanPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return "";
  return value.trim();
}

function cleanSsn(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 9) return "";
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function luhnValid(digits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function cardDigits(value: string): string[] {
  const found: string[] = [];
  const pattern = /(?:\d[ \t.-]?){13,19}/g;
  for (const match of value.matchAll(pattern)) {
    const digits = match[0].replace(/\D/g, "");
    if (digits.length >= 13 && digits.length <= 19 && !found.includes(digits)) found.push(digits);
  }
  return found;
}

function cleanCard(value: string): string {
  const candidates = cardDigits(value);
  return candidates.find((digits) => luhnValid(digits)) || candidates[0] || "";
}

function cleanExp(value: string): string {
  const match = value.trim().match(/^(\d{1,2})\s*[\/\-]\s*(\d{2,4})$/);
  if (!match) return "";
  const month = Number(match[1]);
  if (month < 1 || month > 12) return "";
  const year = match[2].slice(-2);
  return `${String(month).padStart(2, "0")}/${year}`;
}

function cleanCvv(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 3 || digits.length === 4 ? digits : "";
}

function normalizeField(field: string, raw: string): string {
  const value = raw.trim().replace(/\s+/g, " ");
  if (!value) return "";
  if (DATE_FIELDS.has(field)) return usDateToIso(value) || "";
  if (field === "billed_month") return interpretUsMonth(value).value || "";
  if (field === "amount" || field === "discount") return cleanMoney(value);
  if (field === "customer_phone" || field === "utility_company_phone") return cleanPhone(value);
  if (field === "ssn") return cleanSsn(value);
  if (field === "card_number") return cleanCard(value);
  if (field === "card_exp") return cleanExp(value);
  if (field === "card_cvv") return cleanCvv(value);
  if (field === "customer_email") {
    const email = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return email ? email[0] : "";
  }
  if (field === "sale_type") {
    const text = value.toLowerCase();
    if (text.includes("insurance")) return "insurance";
    if (text.includes("utility")) return "utility";
    return "";
  }
  if (field === "subtype") {
    const text = value.toLowerCase();
    if (text.includes("cancel")) return "cancellation";
    if (text.includes("premium")) return "premium";
    if (text.includes("bill")) return "bill";
    if (text.includes("new")) return "new";
    return SUBTYPES.has(text) ? text : "";
  }
  if (field === "account_status") {
    const text = value.toLowerCase().replace("canceled", "cancelled");
    return ACCOUNT_STATUSES.has(text) ? text.replace("canceled", "cancelled") : "";
  }
  if (field === "payment_status_after_sale") {
    const text = value.toLowerCase().replace("canceled", "cancelled");
    return PAYMENT_STATUSES.has(text) ? text : "";
  }
  if (field === "guest_pay_link") return /^https?:\/\//i.test(value) ? value : "";
  if (field === "routing_number") {
    const digits = value.replace(/\D/g, "");
    return digits.length === 9 ? digits : "";
  }
  return value;
}

export function parseSaleRawData(html: string): Record<string, string> {
  const text = saleRawPlainText(html);
  const found: Record<string, string> = {};

  for (const line of text.split(/\n+/)) {
    const match = line.match(/^\s*(.{2,60}?)\s*[:#\-–—]\s*(.+?)\s*$/);
    if (!match) continue;
    const label = normalizeLabel(match[1]);
    const mapped = LABEL_FIELDS.find(([alias]) => alias === label);
    if (!mapped || found[mapped[1]]) continue;
    const value = normalizeField(mapped[1], match[2]);
    if (!value) continue;
    let field = mapped[1];
    if ((label === "bank" || label === "bank account") && match[2].replace(/\D/g, "").length >= 6) {
      field = "bank_account_number";
    }
    if (found[field]) continue;
    found[field] = field === mapped[1] ? value : normalizeField(field, match[2]);
    if (field === "company_name" && label.includes("insurance") && !found.sale_type) {
      found.sale_type = "insurance";
    }
    if ((field === "vehicle_details" || field === "policy_holder_name") && !found.sale_type) {
      found.sale_type = "insurance";
    }
  }

  if (!found.customer_email) {
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (email) found.customer_email = email[0];
  }
  if (!found.ssn) {
    const ssn = text.match(/\b(\d{3})-(\d{2})-(\d{4})\b/);
    if (ssn) found.ssn = `${ssn[1]}-${ssn[2]}-${ssn[3]}`;
  }
  if (!found.customer_phone) {
    const phone = text.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]\d{4}/);
    if (phone) found.customer_phone = phone[0].trim();
  }
  if (!found.card_number) {
    const used = new Set(
      [found.customer_phone, found.utility_company_phone, found.ssn, found.routing_number, found.account_no]
        .filter(Boolean)
        .map((value) => value.replace(/\D/g, "")),
    );
    const card = cardDigits(text).find((digits) => !used.has(digits) && luhnValid(digits));
    if (card) found.card_number = card;
  }

  if (found.card_number) found.payment_method = "card";
  else if (found.routing_number || found.bank_account_number) found.payment_method = "checking";

  if (found.vehicle_details && !found.sale_type) found.sale_type = "insurance";

  return found;
}

const DEFAULT_OK: Record<string, string> = {
  discount: "0",
  payment_status_after_sale: "pending",
  account_status: "active",
  sale_type: "utility",
  subtype: "new",
  payment_method: "card",
};

export function mergeSaleRawData<T extends object>(
  current: T,
  html: string,
  options?: { saleDateDefault?: string },
): { next: T; filled: string[] } {
  const parsed = parseSaleRawData(html);
  const next = { ...current, sales_raw_data: html } as T;
  const record = next as Record<string, unknown>;
  const filled: string[] = [];

  for (const [field, value] of Object.entries(parsed)) {
    if (!(field in record)) continue;
    const existing = String(record[field] ?? "").trim();
    const isDefault =
      existing === "" ||
      existing === DEFAULT_OK[field] ||
      (field === "sale_date" && options?.saleDateDefault && existing === options.saleDateDefault);
    if (!isDefault) continue;
    if (existing === value) continue;
    record[field] = value;
    filled.push(SALE_RAW_FIELD_LABELS[field] || field);
  }

  if (parsed.card_number && !String(record.card_number || "").trim()) {
    record.card_number = parsed.card_number;
    record.payment_method = "card";
    if (!filled.includes(SALE_RAW_FIELD_LABELS.card_number)) filled.push(SALE_RAW_FIELD_LABELS.card_number);
  }

  if (parsed.guest_pay_link && "guest_pay_enabled" in record) {
    record.guest_pay_enabled = true;
  }

  if (
    record.sale_type === "insurance" &&
    !String(record.policy_holder_name || "").trim() &&
    String(record.account_holder_name || "").trim()
  ) {
    record.policy_holder_name = record.account_holder_name;
  }

  return { next, filled };
}
