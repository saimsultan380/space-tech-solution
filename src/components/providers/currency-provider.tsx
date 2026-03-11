"use client";

import { createContext, useContext } from "react";

type CurrencyContextValue = {
  currency: string;
};

const CurrencyContext = createContext<CurrencyContextValue>({ currency: "USD" });

export function CurrencyProvider({
  currency,
  children,
}: {
  currency?: string | null;
  children: React.ReactNode;
}) {
  return (
    <CurrencyContext.Provider value={{ currency: currency || "USD" }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

