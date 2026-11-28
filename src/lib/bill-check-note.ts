/**
 * Utility for formatting, parsing, and validating structured bill check notes
 * for processors and sales agents.
 */

export interface StructuredBillCheck {
  isStructured: boolean;
  dueAmount: string;
  lastPayment: string;
  isReversed: boolean;
  remarks: string;
  raw: string;
}

const BANNED_GENERIC_PATTERNS = [
  /^checked\.?$/i,
  /^check\.?$/i,
  /^chk\.?$/i,
  /^paid\.?$/i,
  /^done\.?$/i,
  /^ok\.?$/i,
  /^okay\.?$/i,
  /^bill checked\.?$/i,
  /^long time from agent\.?$/i,
  /^check done\.?$/i,
  /^all checked\.?$/i,
];

/**
 * Checks whether a generic text note should be rejected because it lacks bill details.
 */
export function isGenericNoteBanned(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return true;
  return BANNED_GENERIC_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Formats structured bill check fields into a standard note string.
 */
export function formatBillCheckNote(data: {
  dueAmount: string | number;
  lastPayment: string;
  isReversed: boolean;
  remarks?: string;
}): string {
  const due = typeof data.dueAmount === "number" ? `$${data.dueAmount.toFixed(2)}` : data.dueAmount.trim();
  const last = data.lastPayment.trim();
  const rev = data.isReversed ? "YES" : "NO";
  const rem = data.remarks?.trim();

  let formatted = `[BILL CHECK] Due: ${due} | Last Payment: ${last} | Reversed: ${rev}`;
  if (rem) {
    formatted += ` | Remarks: ${rem}`;
  }
  return formatted;
}

/**
 * Parses a note string to detect if it's a structured bill check.
 */
export function parseBillCheckNote(content: string): StructuredBillCheck {
  const trimmed = (content || "").trim();
  if (!trimmed.startsWith("[BILL CHECK]")) {
    return {
      isStructured: false,
      dueAmount: "",
      lastPayment: "",
      isReversed: false,
      remarks: trimmed,
      raw: trimmed,
    };
  }

  // Format: [BILL CHECK] Due: ... | Last Payment: ... | Reversed: YES/NO [| Remarks: ...]
  const parts = trimmed.substring("[BILL CHECK]".length).split("|").map((p) => p.trim());
  let dueAmount = "";
  let lastPayment = "";
  let isReversed = false;
  let remarks = "";

  for (const part of parts) {
    if (part.toLowerCase().startsWith("due:")) {
      dueAmount = part.substring(4).trim();
    } else if (part.toLowerCase().startsWith("last payment:")) {
      lastPayment = part.substring(13).trim();
    } else if (part.toLowerCase().startsWith("reversed:")) {
      const val = part.substring(9).trim().toUpperCase();
      isReversed = val === "YES" || val === "TRUE";
    } else if (part.toLowerCase().startsWith("remarks:")) {
      remarks = part.substring(8).trim();
    }
  }

  return {
    isStructured: true,
    dueAmount,
    lastPayment,
    isReversed,
    remarks,
    raw: trimmed,
  };
}
