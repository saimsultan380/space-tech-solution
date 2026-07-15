import type { ProcessingAccountImportPayload, ProcessingAccountStatus, ProcessingAccountType } from "@/lib/types";
import { PROCESSING_ACCOUNT_STATUSES } from "@/lib/constants";
import Papa from "papaparse";

export type { ProcessingAccountImportPayload };

export type ImportSkippedRow = { line: number; reason: string };

/** How to assign account_type for an uploaded file. */
export type ProcessingAccountsImportMode = "auto" | "checkin" | "card";

function slugifyHeader(key: string): string {
  return key
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[#.'"]/g, "")
    .replace(/[^\w\s]/g, " ")
    .trim()
    .replace(/\s+/g, "_");
}

function buildNormalizedRecord(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = slugifyHeader(k);
    if (!key) continue;
    if (v == null || v === "") {
      out[key] = "";
      continue;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      // Preserve full digit strings for long card numbers Excel may store as numbers
      out[key] = Number.isInteger(v) ? String(Math.trunc(v)) : String(v);
      continue;
    }
    out[key] = String(v).trim();
  }
  return out;
}

function pickField(norm: Record<string, string>, slugs: string[]): string {
  for (const slug of slugs) {
    const v = norm[slug];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Typical PAN length after stripping spaces/dashes. */
function looksLikeCardNumber(value: string): boolean {
  const d = digitsOnly(value);
  return d.length >= 13 && d.length <= 19;
}

function parseStatus(raw: string): ProcessingAccountStatus | "" {
  const t = raw.trim();
  if (!t) return "";
  const n = t.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  const valid: ProcessingAccountStatus[] = [
    "active",
    "not_working",
    "closed",
    "reversal_issue",
    "under_review",
  ];
  if (valid.includes(n as ProcessingAccountStatus)) {
    return n as ProcessingAccountStatus;
  }
  for (const { value, label } of PROCESSING_ACCOUNT_STATUSES) {
    if (label.toLowerCase() === t.toLowerCase()) {
      return value as ProcessingAccountStatus;
    }
  }
  return "";
}

function rowIsEmpty(norm: Record<string, string>): boolean {
  return Object.values(norm).every((v) => !v || !String(v).trim());
}

function parseAccountTypeLabel(rawType: string): ProcessingAccountType | "" {
  if (!rawType) return "";
  const t = rawType.toLowerCase().replace(/[^a-z]/g, "");
  if (
    t === "card" ||
    t === "creditdebitcard" ||
    t === "creditcard" ||
    t === "debitcard" ||
    t === "credit" ||
    t === "debit" ||
    t === "cc" ||
    t === "visa" ||
    t === "mastercard" ||
    t === "amex"
  ) {
    return "card";
  }
  if (
    t === "checkin" ||
    t === "checking" ||
    t === "bank" ||
    t === "ach" ||
    t === "check" ||
    t === "cheque"
  ) {
    return "checkin";
  }
  return "";
}

/**
 * Resolve type from explicit column, card-like fields, or import mode.
 * Prefer card when card data is present so CheckIn defaults never wipe PANs.
 */
function resolveAccountType(opts: {
  rawType: string;
  card_number: string;
  expiration_date: string;
  cvv: string;
  routing_number: string;
  account_number: string;
  mode: ProcessingAccountsImportMode;
}): ProcessingAccountType {
  const { mode, rawType, card_number, expiration_date, cvv, routing_number, account_number } =
    opts;

  if (mode === "card") return "card";
  if (mode === "checkin") return "checkin";

  const fromLabel = parseAccountTypeLabel(rawType);
  const hasCardSignal =
    !!card_number.trim() ||
    looksLikeCardNumber(card_number) ||
    (!!expiration_date.trim() && !!cvv.trim()) ||
    (!!expiration_date.trim() && !routing_number.trim() && looksLikeCardNumber(account_number));

  // Explicit card label, or card fields with no banking fields → card
  if (fromLabel === "card" || (hasCardSignal && fromLabel !== "checkin")) {
    return "card";
  }

  // Labeled checkin but file clearly has a card number and no routing → treat as card
  if (fromLabel === "checkin" && looksLikeCardNumber(card_number) && !routing_number.trim()) {
    return "card";
  }

  if (fromLabel === "checkin") return "checkin";

  if (hasCardSignal) return "card";
  return "checkin";
}

export function recordToImportPayload(
  record: Record<string, unknown>,
  mode: ProcessingAccountsImportMode = "auto"
): ProcessingAccountImportPayload | null {
  const norm = buildNormalizedRecord(record);
  if (rowIsEmpty(norm)) return null;

  const account_holder_name = pickField(norm, [
    "account_holder_name",
    "account_holder",
    "holder_name",
    "cardholder_name",
    "card_holder_name",
    "cardholder",
    "full_name",
    "name",
  ]);

  const routing_number = pickField(norm, [
    "routing_number",
    "routing",
    "aba",
    "routing_no",
    "bank_routing",
  ]);

  let account_number = pickField(norm, [
    "account_number",
    "acct_number",
    "checking_account",
    "account_no",
    "bank_account",
    "bank_account_number",
  ]);

  let card_number = pickField(norm, [
    "card_number",
    "card_numbers", // client Excel: "Card Numbers"
    "credit_card_number",
    "debit_card_number",
    "card_no",
    "card_nos",
    "card",
    "cc",
    "cc_number",
    "cc_numbers",
    "cc_no",
    "credit_card",
    "debit_card",
    "pan",
    "cardnum",
    "card_num",
  ]);

  const expiration_date = pickField(norm, [
    "expiration_date",
    "expiry",
    "expiry_date",
    "exp_date",
    "exp",
    "card_expiry",
    "card_expiration",
    "valid_thru",
    "valid_through",
  ]);

  const cvv = pickField(norm, [
    "cvv",
    "cvc",
    "cid",
    "security_code",
    "card_cvv",
    "cvv2",
    "cvc2",
  ]);

  const billing_address = pickField(norm, [
    "billing_address",
    "address",
    "mailing_address",
    "street_address",
  ]);

  const statusRaw = pickField(norm, ["status", "account_status", "state"]);
  const phone = pickField(norm, [
    "phone",
    "phone_number",
    "mobile",
    "cell",
    "telephone",
    "contact_number",
  ]);
  let notes = pickField(norm, ["notes", "comments", "remarks", "description"]);
  // Client card files include Phone with no dedicated DB field — keep it in notes
  if (phone.trim()) {
    const phoneNote = `Phone: ${phone.trim()}`;
    notes = notes.trim() ? `${notes.trim()} | ${phoneNote}` : phoneNote;
  }

  const rawType = pickField(norm, [
    "account_type",
    "type",
    "payment_type",
    "payment_method",
    "account_kind",
  ]);

  // Card-only files often put the PAN under "Account Number"
  if (
    !card_number.trim() &&
    looksLikeCardNumber(account_number) &&
    !routing_number.trim() &&
    (mode === "card" || mode === "auto")
  ) {
    card_number = account_number;
    if (mode === "card" || !routing_number.trim()) {
      account_number = "";
    }
  }

  // Forced card mode: keep PAN even if it only appeared under account_number
  if (mode === "card" && !card_number.trim() && account_number.trim()) {
    card_number = account_number;
    account_number = "";
  }

  const account_type = resolveAccountType({
    rawType,
    card_number,
    expiration_date,
    cvv,
    routing_number,
    account_number,
    mode,
  });

  if (account_type === "card" && !card_number.trim() && looksLikeCardNumber(account_number)) {
    card_number = account_number;
    account_number = "";
  }

  const hasRecognizedData =
    !!account_holder_name.trim() ||
    !!routing_number.trim() ||
    !!account_number.trim() ||
    !!card_number.trim() ||
    !!billing_address.trim() ||
    !!notes.trim() ||
    !!statusRaw.trim() ||
    !!expiration_date.trim() ||
    !!cvv.trim();
  if (!hasRecognizedData) return null;

  return {
    account_type,
    account_holder_name: account_holder_name.trim(),
    routing_number: account_type === "card" ? "" : routing_number.trim(),
    account_number: account_type === "card" ? "" : account_number.trim(),
    card_number: account_type === "card" ? card_number.trim() : "",
    expiration_date: account_type === "card" ? expiration_date.trim() : "",
    cvv: account_type === "card" ? cvv.trim() : "",
    billing_address: billing_address.trim(),
    status: parseStatus(statusRaw),
    notes: notes.trim(),
  };
}

export function mapRecordsToImportRows(
  records: Record<string, unknown>[],
  mode: ProcessingAccountsImportMode = "auto"
): { rows: ProcessingAccountImportPayload[]; skipped: ImportSkippedRow[] } {
  const rows: ProcessingAccountImportPayload[] = [];
  const skipped: ImportSkippedRow[] = [];

  records.forEach((record, index) => {
    const line = index + 2;
    const norm = buildNormalizedRecord(record);
    if (rowIsEmpty(norm)) return;

    const payload = recordToImportPayload(record, mode);
    if (!payload) {
      skipped.push({
        line,
        reason: "No recognizable columns were found in this row.",
      });
      return;
    }
    rows.push(payload);
  });

  return { rows, skipped };
}

export function parseProcessingAccountsCsv(text: string): Record<string, unknown>[] {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) throw new Error("File is empty.");

  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().replace(/^\uFEFF/, ""),
  });

  const fatal = result.errors.find((e) => e.type === "Quotes" || e.code === "TooManyFields");
  if (fatal) {
    throw new Error(fatal.message || "Could not parse CSV.");
  }

  const data = result.data || [];
  return data.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      obj[k] = v;
    }
    return obj;
  });
}

export async function parseProcessingAccountsXlsx(
  buffer: ArrayBuffer
): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets.");
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return json;
}

export const PROCESSING_ACCOUNTS_CSV_TEMPLATE = `Account Type,Account Holder Name,Routing Number,Account Number,Card Number,Expiration Date,CVV,Billing Address,Status,Notes
checkin,John Doe,021000021,1234567890,,,,"123 Main St, City ST 12345",active,
card,Jane Smith,,,4111111111111111,2027-09,123,"456 Oak Ave, City ST 67890",active,
`;

export const PROCESSING_ACCOUNTS_CARD_CSV_TEMPLATE = `Phone,Card Numbers,Exp,CVV,Card Holder Name,Billing address
555-0100,4111111111111111,2027-09,123,Jane Smith,"456 Oak Ave, City ST 67890"
`;

export const PROCESSING_ACCOUNTS_CHECKIN_CSV_TEMPLATE = `Account Type,Account Holder Name,Routing Number,Account Number,Billing Address,Status,Notes
checkin,John Doe,021000021,1234567890,"123 Main St, City ST 12345",active,
`;
