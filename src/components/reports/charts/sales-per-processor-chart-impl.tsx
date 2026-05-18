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
import { useChartTheme, RichTooltip } from "./chart-tooltip";

interface SalesPerProcessorChartProps {
  data: Array<{ name: string; total: number; approved: number; rejected: number }>;
}

export function SalesPerProcessorChart({ data }: SalesPerProcessorChartProps) {
  const { isDark, grid, tick, cursorFill } = useChartTheme();

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-sm text-muted-foreground">No processor data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="procApproved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
          </linearGradient>
          <linearGradient id="procRejected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
            <stop offset="100%" stopColor="#e11d48" stopOpacity={0.85} />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} stroke={grid} strokeDasharray="4 4" />
        <XAxis
          dataKey="name"
          tick={{ fill: tick, fontSize: 11, fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: tick, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />

        <Legend
          verticalAlign="top"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "11px", paddingBottom: "12px" }}
        />

        <Tooltip
          cursor={{ fill: cursorFill }}
          content={<RichTooltip />}
        />

        <Bar dataKey="approved" name="Recorded" fill="url(#procApproved)" radius={[5, 5, 0, 0]} barSize={28} isAnimationActive animationDuration={900} animationEasing="ease-out" />
        <Bar dataKey="rejected" name="Rejected" fill="url(#procRejected)" radius={[5, 5, 0, 0]} barSize={28} isAnimationActive animationDuration={900} animationEasing="ease-out" />
      </BarChart>
    </ResponsiveContainer>
  );
}
