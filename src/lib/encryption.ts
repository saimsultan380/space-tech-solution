import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.ENCRYPTION_SECRET;
if (!SECRET_KEY && process.env.NODE_ENV === "production") {
  throw new Error("ENCRYPTION_SECRET must be set in production");
}
const EFFECTIVE_KEY = SECRET_KEY || "dev-only-key-NOT-FOR-PRODUCTION";

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, EFFECTIVE_KEY).toString();
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, EFFECTIVE_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function maskSSN(ssn: string): string {
  if (ssn.length < 4) return "****";
  return `***-**-${ssn.slice(-4)}`;
}
