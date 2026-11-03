import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

export const PAGE_SIZE_OPTIONS = [24, 48, 96] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export function parsePageSize(value: string | number | null | undefined): PageSizeOption {
  const parsed = typeof value === "number" ? value : Number(value);
  if (parsed === 24 || parsed === 48 || parsed === 96) return parsed;
  return DEFAULT_PAGE_SIZE;
}
