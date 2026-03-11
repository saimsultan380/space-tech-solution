"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from "recharts";

interface AttendancePerformanceChartProps {
  data: Array<{ name: string; attendance_days: number; approved_sales: number }>;
}

export function AttendancePerformanceChart({ data }: AttendancePerformanceChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data available</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          type="number"
          dataKey="attendance_days"
          name="Attendance Days"
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          label={{ value: "Attendance Days", position: "insideBottom", offset: -5 }}
        />
        <YAxis
          type="number"
          dataKey="approved_sales"
          name="Approved Sales"
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          label={{ value: "Approved Sales", angle: -90, position: "insideLeft" }}
        />
        <ZAxis type="category" dataKey="name" name="Employee" />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Scatter data={data} fill="hsl(280, 68%, 60%)" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
