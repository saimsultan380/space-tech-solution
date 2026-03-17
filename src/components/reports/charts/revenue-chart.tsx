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

interface RevenueChartProps {
  data: Array<{ date: string; revenue: number }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const { currency } = useCurrency();

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No revenue data available</p>;
  }

  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B6EF8" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#3B6EF8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#F3F4F6" strokeDasharray="4 4" />
        <XAxis
          dataKey="date"
          className="text-xs"
          tick={{ fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={{ stroke: "#F3F4F6" }}
          tickFormatter={(v) => {
            const parts = v.split("-");
            return parts.length === 3 ? `${parts[1]}/${parts[2]}` : v;
          }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: "#9CA3AF" }}
          tickFormatter={(v) => compact.format(Number(v ?? 0))}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value ?? 0), currency || "USD"), "Revenue"]}
          contentStyle={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
          }}
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
