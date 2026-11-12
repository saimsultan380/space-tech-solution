"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_CURRENCY } from "@/lib/constants";

type CurrencyContextValue = {
  currency: string;
  setCurrency: (currency: string) => void;
};

const STORAGE_KEY = "preferred_currency";

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
});

export function CurrencyProvider({
  currency,
  children,
}: {
  currency?: string | null;
  children: React.ReactNode;
}) {
  const [currentCurrency, setCurrentCurrency] = useState(currency || DEFAULT_CURRENCY);

  const setCurrency = useCallback((next: string) => {
    const normalized = (next || DEFAULT_CURRENCY).toUpperCase();
    setCurrentCurrency(normalized);

    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const normalized = (currency || DEFAULT_CURRENCY).toUpperCase();
    setCurrentCurrency(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // ignore
    }
  }, [currency]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      if (!e.newValue) return;
      setCurrentCurrency(e.newValue.toUpperCase());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ currency: currentCurrency || DEFAULT_CURRENCY, setCurrency }),
    [currentCurrency, setCurrency]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

