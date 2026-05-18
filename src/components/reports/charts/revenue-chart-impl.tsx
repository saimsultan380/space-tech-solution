"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import { useChartTheme, RichTooltip } from "./chart-tooltip";

interface RevenueChartProps {
  data: Array<{ date: string; revenue: number }>;
}

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

function formatDateLabel(v: string) {
  const parts = v.split("-");
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
  if (parts.length === 2) return `${parts[0]}/${parts[1]}`;
  return v;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const { currency } = useCurrency();
  const { isDark, grid, tick, cursorFill } = useChartTheme();

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-sm text-muted-foreground">No revenue data available</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={isDark ? 0.35 : 0.25} />
            <stop offset="60%" stopColor="#3b82f6" stopOpacity={isDark ? 0.08 : 0.05} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="revenueGradStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="revGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <CartesianGrid vertical={false} stroke={grid} strokeDasharray="4 4" />

        <XAxis
          dataKey="date"
          tick={{ fill: tick, fontSize: 11, fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatDateLabel}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: tick, fontSize: 11 }}
          tickFormatter={(v) => compact.format(Number(v ?? 0))}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={48}
        />

        <Tooltip
          cursor={{ stroke: isDark ? "#334155" : "#e2e8f0", strokeWidth: 1, fill: cursorFill }}
          content={
            <RichTooltip
              formatter={(_, value) => formatCurrency(value, currency || "USD")}
              labelFormatter={formatDateLabel}
            />
          }
        />

        <Area
          type="monotone"
          dataKey="revenue"
          stroke="url(#revenueGradStroke)"
          strokeWidth={2.5}
          fill="url(#revenueGradFill)"
          fillOpacity={1}
          dot={false}
          activeDot={{
            r: 5,
            fill: "#3b82f6",
            stroke: isDark ? "#0f172a" : "#fff",
            strokeWidth: 2,
            filter: "url(#revGlow)",
          }}
          isAnimationActive={true}
          animationDuration={1200}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
