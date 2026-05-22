import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.ENCRYPTION_SECRET;
const IS_SERVER = typeof window === "undefined";
// Only enforce the presence of the secret on the server in production.
// Throwing on the client causes a client-side exception that breaks the app
// if the module is imported into client bundles. Server hosts (Vercel, etc.)
// should set `ENCRYPTION_SECRET` in their environment variables.
if (!SECRET_KEY && process.env.NODE_ENV === "production" && IS_SERVER) {
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
