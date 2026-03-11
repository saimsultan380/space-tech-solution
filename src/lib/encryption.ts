import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.ENCRYPTION_SECRET || "default-dev-key-change-in-production";

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function maskSSN(ssn: string): string {
  if (ssn.length < 4) return "****";
  return `***-**-${ssn.slice(-4)}`;
}
