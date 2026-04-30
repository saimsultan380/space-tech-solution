"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useChartTheme } from "./chart-tooltip";

interface ConversionChartProps {
  recorded: number;
  rejected: number;
}

const SEGMENTS = [
  { key: "Recorded", color: "#10b981", glow: "#10b981" },
  { key: "Rejected", color: "#f43f5e", glow: "#f43f5e" },
];

export function ConversionChart({ recorded, rejected }: ConversionChartProps) {
  const { isDark } = useChartTheme();

  const data = [
    { name: "Recorded", value: recorded },
    { name: "Rejected", value: rejected },
  ].filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);
  const rate = total > 0 ? Math.round((recorded / total) * 100) : 0;

  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center">
        <p className="text-sm text-muted-foreground">No sales data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <defs>
            {SEGMENTS.map((s) => (
              <filter key={s.key} id={`glow-${s.key}`}>
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={72}
            outerRadius={104}
            paddingAngle={4}
            dataKey="value"
            stroke="none"
            isAnimationActive
            animationBegin={0}
            animationDuration={1000}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={SEGMENTS[index % SEGMENTS.length].color}
              />
            ))}
          </Pie>

          {/* Center label */}
          <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle">
            <tspan
              x="50%"
              dy="0"
              fontSize="32"
              fontWeight={800}
              fill={isDark ? "#f1f5f9" : "#0f172a"}
            >
              {rate}%
            </tspan>
          </text>
          <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle">
            <tspan
              x="50%"
              dy="0"
              fontSize="11"
              fontWeight={600}
              fill={isDark ? "#64748b" : "#94a3b8"}
              letterSpacing="0.08em"
            >
              CONVERSION
            </tspan>
          </text>

          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#0f172a" : "#ffffff",
              border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
              borderRadius: "12px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
              padding: "10px 14px",
              fontSize: "12px",
            }}
            formatter={(value: number | undefined) => [
              `${(value ?? 0).toLocaleString()} (${Math.round(((value ?? 0) / Math.max(total, 1)) * 100)}%)`,
              "",
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4">
        {data.map((item, index) => {
          const seg = SEGMENTS[index % SEGMENTS.length];
          const pct = Math.round((item.value / Math.max(total, 1)) * 100);
          return (
            <div key={item.name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-xs font-medium text-muted-foreground">
                {item.name}
              </span>
              <span className="text-xs font-bold tabular-nums" style={{ color: seg.color }}>
                {item.value.toLocaleString()} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
