"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const TabsContext = createContext<{ value: string; onChange: (v: string) => void }>({
  value: "",
  onChange: () => {},
});

interface TabsProps {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [value, setValue] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ value, onChange: setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-11 w-fit items-center justify-start overflow-x-auto overflow-y-hidden rounded-md border border-border bg-muted/50 p-1 text-muted-foreground no-scrollbar sm:h-10", className)}>
      <div className="flex items-center gap-1 px-1 sm:gap-0 sm:px-0">
        {children}
      </div>
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TabsTrigger({ value, children, className, onClick }: TabsTriggerProps) {
  const ctx = useContext(TabsContext);
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        ctx.value === value && "bg-background text-foreground shadow-sm",
        className
      )}
      onClick={() => { ctx.onChange(value); onClick?.(); }}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const ctx = useContext(TabsContext);
  if (ctx.value !== value) return null;
  return <div className={cn("mt-2 ring-offset-background focus-visible:outline-none", className)}>{children}</div>;
}
