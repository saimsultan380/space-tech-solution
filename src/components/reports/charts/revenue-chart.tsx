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
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface RevenueChartProps {
  data: Array<{ date: string; revenue: number }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const { currency } = useCurrency();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No revenue data available</p>;
  }

  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  });

  const isDark = mounted && theme === "dark";
  const gridStroke = isDark ? "#374151" : "#F3F4F6";
  const tickFill = isDark ? "#9CA3AF" : "#9CA3AF";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B6EF8" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#3B6EF8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 4" />
        <XAxis
          dataKey="date"
          className="text-xs"
          tick={{ fill: tickFill }}
          tickLine={false}
          axisLine={{ stroke: gridStroke }}
          tickFormatter={(v) => {
            const parts = v.split("-");
            return parts.length === 3 ? `${parts[1]}/${parts[2]}` : v;
          }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: tickFill }}
          tickFormatter={(v) => compact.format(Number(v ?? 0))}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value ?? 0), currency || "USD"), "Revenue"]}
          contentStyle={{
            backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
            border: `1px solid ${isDark ? "#374151" : "#E5E7EB"}`,
            borderRadius: "8px",
            color: isDark ? "#F3F4F6" : "#111827",
          }}
          itemStyle={{ color: isDark ? "#F3F4F6" : "#111827" }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#3B6EF8"
          fillOpacity={1}
          fill="url(#revenueGrad)"
          strokeWidth={2.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
