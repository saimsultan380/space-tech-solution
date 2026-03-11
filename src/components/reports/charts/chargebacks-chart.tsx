"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChargebacksChartProps {
  data: Array<{ name: string; count: number }>;
}

export function ChargebacksChart({ data }: ChargebacksChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No chargeback data available</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          cursor={false}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Bar dataKey="count" name="Chargebacks" fill="hsl(0, 84%, 60%)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
