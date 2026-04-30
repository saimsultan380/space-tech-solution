"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

// ─── Shared hook for dark mode ────────────────────────────────────────────────
export function useChartTheme() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && theme === "dark";
  return {
    isDark,
    grid: isDark ? "#1e293b" : "#f1f5f9",
    tick: isDark ? "#64748b" : "#94a3b8",
    tooltipBg: isDark ? "#0f172a" : "#ffffff",
    tooltipBorder: isDark ? "#1e293b" : "#e2e8f0",
    tooltipText: isDark ? "#f1f5f9" : "#0f172a",
    tooltipMuted: isDark ? "#64748b" : "#94a3b8",
    cursorFill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
  };
}

// ─── Shared tooltip style builder ────────────────────────────────────────────
export function tooltipStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? "#0f172a" : "#ffffff",
    border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
    borderRadius: "12px",
    boxShadow: isDark
      ? "0 20px 40px rgba(0,0,0,0.5)"
      : "0 10px 40px rgba(0,0,0,0.12)",
    padding: "10px 14px",
    color: isDark ? "#f1f5f9" : "#0f172a",
    fontSize: "12px",
    fontWeight: 500,
  };
}

// ─── Custom rich tooltip component ───────────────────────────────────────────
interface RichTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload?: Record<string, unknown> }>;
  label?: string;
  formatter?: (name: string, value: number) => string;
  labelFormatter?: (label: string) => string;
}

export function RichTooltip({ active, payload, label, formatter, labelFormatter }: RichTooltipProps) {
  const { isDark } = useChartTheme();
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-xl border px-3 py-2.5 shadow-2xl text-xs"
      style={{
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        borderColor: isDark ? "#1e293b" : "#e2e8f0",
        color: isDark ? "#f1f5f9" : "#0f172a",
        minWidth: 140,
      }}
    >
      {label && (
        <p className="mb-2 font-bold text-[11px] uppercase tracking-wider opacity-60">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="opacity-70">{entry.name}</span>
            </div>
            <span className="font-bold tabular-nums">
              {formatter ? formatter(entry.name, entry.value) : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
