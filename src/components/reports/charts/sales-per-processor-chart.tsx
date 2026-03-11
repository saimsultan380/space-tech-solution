"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SalesPerProcessorChartProps {
  data: Array<{ name: string; total: number; approved: number; rejected: number }>;
}

export function SalesPerProcessorChart({ data }: SalesPerProcessorChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No processor data available</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="name"
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip
          cursor={false}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Bar dataKey="approved" name="Approved" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="rejected" name="Rejected" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
