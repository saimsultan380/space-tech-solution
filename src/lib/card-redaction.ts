const SEPARATED_DIGITS = /(?:^|[^0-9])((?:\d[ \t-]*){12,18}\d)(?![0-9])/g;

/** Validates Luhn checksum for standard credit and debit cards. */
export function luhnVerify(digits: string): boolean {
  if (!digits || digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** Checks whether digits match standard payment card brand BINs. */
export function isPaymentCardBin(digits: string): boolean {
  if (!digits || digits.length < 13 || digits.length > 19) return false;
  // Visa: starts with 4, len 13, 16, 19
  if (/^4\d{12}(\d{3})?(\d{3})?$/.test(digits)) return true;
  // Mastercard: 51-55 or 2221-2720, len 16
  if (/^(5[1-5]\d{4}|2(22[1-9]|2[3-9]\d|[3-6]\d{2}|7[0-1]\d|720)\d{2})\d{10}$/.test(digits)) return true;
  // Amex: 34 or 37, len 15
  if (/^3[47]\d{13}$/.test(digits)) return true;
  // Discover: 6011, 622126-622925, 644-649, 65, len 16
  if (/^(6011|65\d{2}|64[4-9]\d)\d{12}$/.test(digits)) return true;
  // Diners Club: 300-305, 36, 38, len 14-16
  if (/^(30[0-5]|36\d|38\d)\d{11,13}$/.test(digits)) return true;
  // JCB: 3528-3589, len 16
  if (/^35(2[89]|[3-8]\d)\d{12}$/.test(digits)) return true;
  return false;
}

/** Last-four mask. Short, empty, and non-numeric values never throw. */
export function maskCardNumber(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length < 4) return "****";
  return `**** **** **** ${digits.slice(-4)}`;
}

/**
 * Masks 13–19 digit payment card numbers inside text.
 * Leaves client/utility/telecom account numbers, policy numbers, bank account numbers,
 * and non-card numbers unmasked.
 */
export function maskCardNumbersInText(input: string | null | undefined): string {
  if (!input) return "";

  return input.replace(SEPARATED_DIGITS, (match, group: string, offset: number) => {
    const digits = group.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return match;

    const groupOffset = match.indexOf(group);
    const groupStart = offset + groupOffset;

    // Look back up to 120 chars to check label context
    const lookbackStart = Math.max(0, groupStart - 120);
    const rawBefore = input.slice(lookbackStart, groupStart);

    // Split at line breaks or HTML block tags to isolate the preceding line/label
    const lineBefore = rawBefore.split(/[\r\n]|<\/?(?:p|div|br|tr|li)[^>]*>/i).pop() || "";
    const cleanBefore = lineBefore.replace(/<[^>]+>/g, " ").toLowerCase();

    // Check if explicitly labeled as non-card account/service/policy/bank number
    const isExplicitNonCard =
      /\b(account|acct|policy|service|routing|ssn|social|phone|mobile|cell|imei|tracking|license|dl|invoice|order)\b/i.test(
        cleanBefore,
      ) &&
      !/\b(credit\s*card|debit\s*card|card\s*number|card\s*no|card\s*#|cc\s*number|cc\s*no|cc\s*#|ccn)\b/i.test(
        cleanBefore,
      );

    // Check if explicitly labeled as credit/debit card
    const isExplicitCard =
      /\b(card|credit|debit|cc|visa|mastercard|master\s*card|amex|american\s*express|discover)\b/i.test(
        cleanBefore,
      ) && !/\b(bank|checking|savings|utility|policy)\b/i.test(cleanBefore);

    let shouldMask = false;
    if (isExplicitNonCard) {
      shouldMask = false;
    } else if (isExplicitCard) {
      shouldMask = true;
    } else {
      // Unlabeled: only mask if it matches a known card BIN and passes Luhn checksum
      shouldMask = isPaymentCardBin(digits) && luhnVerify(digits);
    }

    if (!shouldMask) return match;

    const prefix = groupOffset > 0 ? match.slice(0, groupOffset) : "";
    return `${prefix}**** **** **** ${digits.slice(-4)}`;
  });
}
