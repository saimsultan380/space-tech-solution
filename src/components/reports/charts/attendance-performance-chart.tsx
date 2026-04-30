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
  ReferenceLine,
} from "recharts";
import { useChartTheme } from "./chart-tooltip";

interface AttendancePerformanceChartProps {
  data: Array<{ name: string; attendance_days: number; approved_sales: number }>;
}

interface ScatterTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { name: string; attendance_days: number; approved_sales: number } }>;
}

function ScatterTooltip({ active, payload }: ScatterTooltipProps) {
  const { isDark } = useChartTheme();
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-xl border px-3 py-2.5 shadow-2xl text-xs"
      style={{
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        borderColor: isDark ? "#1e293b" : "#e2e8f0",
        color: isDark ? "#f1f5f9" : "#0f172a",
        minWidth: 160,
      }}
    >
      <p className="mb-2 font-bold text-[11px] uppercase tracking-wider opacity-60">{d.name}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="opacity-70">Attendance</span>
          <span className="font-bold">{d.attendance_days} days</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="opacity-70">Sales</span>
          <span className="font-bold">{d.approved_sales}</span>
        </div>
      </div>
    </div>
  );
}

export function AttendancePerformanceChart({ data }: AttendancePerformanceChartProps) {
  const { isDark, grid, tick } = useChartTheme();

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const avgAttendance = Math.round(data.reduce((s, d) => s + d.attendance_days, 0) / data.length);
  const avgSales = Math.round(data.reduce((s, d) => s + d.approved_sales, 0) / data.length);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
        <defs>
          <radialGradient id="dotGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
          </radialGradient>
          <filter id="dotGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <CartesianGrid stroke={grid} strokeDasharray="4 4" />

        <XAxis
          type="number"
          dataKey="attendance_days"
          name="Attendance Days"
          tick={{ fill: tick, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          label={{ value: "Attendance Days", position: "insideBottom", offset: -12, fill: tick, fontSize: 11 }}
        />
        <YAxis
          type="number"
          dataKey="approved_sales"
          name="Sales"
          tick={{ fill: tick, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          label={{ value: "Sales", angle: -90, position: "insideLeft", fill: tick, fontSize: 11 }}
        />
        <ZAxis type="category" dataKey="name" name="Employee" range={[80, 80]} />

        {/* Average reference lines */}
        <ReferenceLine
          x={avgAttendance}
          stroke={isDark ? "#334155" : "#cbd5e1"}
          strokeDasharray="5 5"
          label={{ value: "Avg", position: "top", fill: isDark ? "#475569" : "#94a3b8", fontSize: 10 }}
        />
        <ReferenceLine
          y={avgSales}
          stroke={isDark ? "#334155" : "#cbd5e1"}
          strokeDasharray="5 5"
          label={{ value: "Avg", position: "right", fill: isDark ? "#475569" : "#94a3b8", fontSize: 10 }}
        />

        <Tooltip content={<ScatterTooltip />} />

        <Scatter
          data={data}
          fill="url(#dotGrad)"
          isAnimationActive
          animationDuration={1000}
          animationEasing="ease-out"
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
