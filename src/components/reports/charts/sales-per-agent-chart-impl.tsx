"use client";

import {
  ComposedChart,
  Bar,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useChartTheme, RichTooltip } from "./chart-tooltip";

interface SalesPerAgentChartProps {
  data: Array<{ name: string; total: number; approved: number; revenue: number }>;
}

export function SalesPerAgentChart({ data }: SalesPerAgentChartProps) {
  const { isDark, grid, tick, cursorFill } = useChartTheme();

  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center">
        <p className="text-sm text-muted-foreground">No agent data available</p>
      </div>
    );
  }

  const chartData = data
    .map((d) => {
      const total = Number(d.total ?? 0);
      const approved = Number(d.approved ?? 0);
      const notApproved = Math.max(0, total - approved);
      const conversion = total > 0 ? Math.round((approved / total) * 100) : 0;
      return { name: d.name, total, approved, notApproved, revenue: Number(d.revenue ?? 0), conversion };
    })
    .sort((a, b) => b.total - a.total);

  const averageSales = Math.round(
    chartData.reduce((s, r) => s + r.total, 0) / Math.max(chartData.length, 1)
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 24, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="agentApproved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.85} />
          </linearGradient>
          <linearGradient id="agentRejected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isDark ? "#475569" : "#cbd5e1"} stopOpacity={0.9} />
            <stop offset="100%" stopColor={isDark ? "#334155" : "#e2e8f0"} stopOpacity={0.9} />
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
          yAxisId="left"
          allowDecimals={false}
          tick={{ fill: tick, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          tick={{ fill: tick, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
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
          content={
            <RichTooltip
              formatter={(name, value) =>
                name === "Conversion %" ? `${value}%` : value.toLocaleString()
              }
            />
          }
        />

        <Bar yAxisId="left" dataKey="approved" name="Recorded" fill="url(#agentApproved)" radius={[5, 5, 0, 0]} barSize={28} isAnimationActive animationDuration={900} animationEasing="ease-out" />
        <Bar yAxisId="left" dataKey="notApproved" name="Rejected" fill="url(#agentRejected)" radius={[5, 5, 0, 0]} barSize={28} isAnimationActive animationDuration={900} animationEasing="ease-out" />

        <Line
          yAxisId="right"
          type="monotone"
          dataKey="conversion"
          name="Conversion %"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ fill: "#10b981", strokeWidth: 2, r: 4, stroke: isDark ? "#0f172a" : "#fff" }}
          activeDot={{ r: 6, strokeWidth: 0 }}
          isAnimationActive
          animationDuration={1200}
        />

        <ReferenceLine
          yAxisId="left"
          y={averageSales}
          stroke={isDark ? "#475569" : "#94a3b8"}
          strokeDasharray="5 5"
          strokeWidth={1.5}
          label={{ value: `Avg ${averageSales}`, position: "right", fill: isDark ? "#64748b" : "#94a3b8", fontSize: 10, fontWeight: 600 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
