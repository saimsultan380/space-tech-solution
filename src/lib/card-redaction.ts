const SEPARATED_DIGITS = /(?:^|[^0-9])((?:\d[ \t-]*){12,18}\d)(?![0-9])/g;

/** Last-four mask. Short, empty, and non-numeric values never throw. */
export function maskCardNumber(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length < 4) return "****";
  return `**** **** **** ${digits.slice(-4)}`;
}

/** Masks 13–19 digit card numbers inside text. Leaves shorter numbers unchanged. */
export function maskCardNumbersInText(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(SEPARATED_DIGITS, (full, group: string) => {
    const digits = group.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return full;
    const at = full.indexOf(group);
    const prefix = at > 0 ? full.slice(0, at) : "";
    return `${prefix}**** **** **** ${digits.slice(-4)}`;
  });
}
