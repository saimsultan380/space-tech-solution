import { decrypt } from "@/lib/encryption";

/** Row shape from `payments` (subset). */
export type PaymentSecretRow = {
  method: string;
  encrypted_details?: string | null;
  card_cvv_encrypted?: string | null;
  card_exp?: string | null;
  billing_address?: string | null;
  routing_number_encrypted?: string | null;
  account_number_encrypted?: string | null;
};

export function getDecryptedCardSecrets(p: PaymentSecretRow): {
  cardNumber: string;
  cardCvv: string;
} {
  let cardNumber = "";
  let cardCvv = "";
  if (p.method !== "card") return { cardNumber, cardCvv };
  try {
    if (p.encrypted_details) {
      const raw = decrypt(p.encrypted_details);
      if (raw) {
        const j = JSON.parse(raw) as { card_number?: string };
        if (typeof j.card_number === "string") cardNumber = j.card_number;
      }
    }
  } catch {
    /* ignore */
  }
  try {
    if (p.card_cvv_encrypted) {
      const c = decrypt(p.card_cvv_encrypted);
      if (c) cardCvv = c;
    }
  } catch {
    /* ignore */
  }
  return { cardNumber, cardCvv };
}

export function getDecryptedBankSecrets(p: PaymentSecretRow): {
  routingNumber: string;
  accountNumber: string;
} {
  let routingNumber = "";
  let accountNumber = "";
  if (p.method !== "bank") return { routingNumber, accountNumber };
  try {
    if (p.encrypted_details) {
      const raw = decrypt(p.encrypted_details);
      if (raw) {
        const j = JSON.parse(raw) as { routing_number?: string; account_number?: string };
        if (typeof j.routing_number === "string") routingNumber = j.routing_number;
        if (typeof j.account_number === "string") accountNumber = j.account_number;
      }
    }
  } catch {
    /* ignore */
  }
  try {
    if (p.routing_number_encrypted) {
      const r = decrypt(p.routing_number_encrypted);
      if (r) routingNumber = r;
    }
  } catch {
    /* ignore */
  }
  try {
    if (p.account_number_encrypted) {
      const a = decrypt(p.account_number_encrypted);
      if (a) accountNumber = a;
    }
  } catch {
    /* ignore */
  }
  return { routingNumber, accountNumber };
}
