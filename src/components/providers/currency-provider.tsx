"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";

type CurrencyContextValue = {
  currency: string;
  setCurrency: (currency: string) => void;
};

const STORAGE_KEY = "preferred_currency";

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "USD",
  setCurrency: () => {},
});

export function CurrencyProvider({
  currency,
  children,
}: {
  currency?: string | null;
  children: React.ReactNode;
}) {
  const [currentCurrency, setCurrentCurrency] = useState(currency || "USD");

  const setCurrency = useCallback((next: string) => {
    const normalized = (next || "USD").toUpperCase();
    setCurrentCurrency(normalized);

    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!currency) return;
    const normalized = currency.toUpperCase();
    setCurrentCurrency(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // ignore
    }
  }, [currency]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCurrentCurrency(stored.toUpperCase());
      }
    } catch {
      // ignore
    }
  }, []);

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
    () => ({ currency: currentCurrency || "USD", setCurrency }),
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

