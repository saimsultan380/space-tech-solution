"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useChartTheme, RichTooltip } from "./chart-tooltip";

interface ChargebacksChartProps {
  data: Array<{ name: string; count: number }>;
}

// Gradient colors cycling for each bar
const BAR_COLORS = [
  ["#f43f5e", "#e11d48"],
  ["#f97316", "#ea580c"],
  ["#eab308", "#ca8a04"],
  ["#8b5cf6", "#7c3aed"],
  ["#06b6d4", "#0891b2"],
];

export function ChargebacksChart({ data }: ChargebacksChartProps) {
  const { isDark, grid, tick, cursorFill } = useChartTheme();

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-sm text-muted-foreground">No chargeback data available</p>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, sorted.length * 48)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
        <defs>
          {BAR_COLORS.map(([from, to], i) => (
            <linearGradient key={i} id={`cbGrad${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={from} stopOpacity={0.9} />
              <stop offset="100%" stopColor={to} stopOpacity={1} />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid horizontal={false} stroke={grid} strokeDasharray="4 4" />
        <XAxis
          type="number"
          tick={{ fill: tick, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fill: tick, fontSize: 11, fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
        />

        <Tooltip
          cursor={{ fill: cursorFill }}
          content={<RichTooltip />}
        />

        <Bar dataKey="count" name="Chargebacks" radius={[0, 6, 6, 0]} barSize={22} isAnimationActive animationDuration={900} animationEasing="ease-out">
          {sorted.map((_, index) => (
            <Cell key={index} fill={`url(#cbGrad${index % BAR_COLORS.length})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
