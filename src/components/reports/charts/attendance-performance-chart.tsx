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
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface AttendancePerformanceChartProps {
  data: Array<{ name: string; attendance_days: number; approved_sales: number }>;
}

export function AttendancePerformanceChart({ data }: AttendancePerformanceChartProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data available</p>;
  }

  const isDark = mounted && theme === "dark";
  const tooltipBg = isDark ? "#1F2937" : "#FFFFFF";
  const tooltipBorder = isDark ? "#374151" : "#E5E7EB";
  const tooltipText = isDark ? "#F3F4F6" : "#111827";
  const tooltipMuted = isDark ? "#9CA3AF" : "#6B7280";

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
          name="Sales"
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          label={{ value: "Sales", angle: -90, position: "insideLeft" }}
        />
        <ZAxis type="category" dataKey="name" name="Employee" />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: "8px",
            color: tooltipText,
          }}
          labelStyle={{ color: tooltipMuted }}
          itemStyle={{ color: tooltipText }}
        />
        <Scatter data={data} fill="hsl(280, 68%, 60%)" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
