"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";

type UpdateFilters = (updates: Record<string, string | number | undefined>) => void;

/**
 * Search inputs were controlled only from the URL (`useSearchParams`). Each keystroke
 * called `router.push`, but the param string updates asynchronously, so the input
 * snapped back to an old value and felt laggy. This hook keeps a local value for the
 * field and writes the URL after a short pause; it syncs from the URL when the user
 * is not typing here (back/forward, shared links).
 */
export function useDebouncedUrlSearchInput(
  searchParams: ReadonlyURLSearchParams,
  updateFilters: UpdateFilters,
  options?: { paramKey?: string; debounceMs?: number },
): {
  inputRef: RefObject<HTMLInputElement | null>;
  inputValue: string;
  onInputChange: (value: string) => void;
  urlValue: string;
} {
  const paramKey = options?.paramKey ?? "q";
  const debounceMs = options?.debounceMs ?? 300;
  const urlValue = searchParams.get(paramKey) || "";
  const [inputValue, setInputValue] = useState(urlValue);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const updateFiltersRef = useRef(updateFilters);
  updateFiltersRef.current = updateFilters;

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.activeElement === inputRef.current) return;
    setInputValue(urlValue);
  }, [urlValue]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (inputValue === urlValue) return;
      updateFiltersRef.current({ [paramKey]: inputValue || undefined });
    }, debounceMs);
    return () => window.clearTimeout(id);
  }, [debounceMs, inputValue, paramKey, urlValue]);

  const onInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  return { inputRef, inputValue, onInputChange, urlValue };
}
