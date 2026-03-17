"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ConversionChartProps {
  approved: number;
  pending: number;
  rejected: number;
}

const COLORS = ["#16A34A", "#F59E0B", "#EF4444"];

export function ConversionChart({ approved, pending, rejected }: ConversionChartProps) {
  const data = [
    { name: "Approved", value: approved },
    { name: "Pending", value: pending },
    { name: "Rejected", value: rejected },
  ].filter((d) => d.value > 0);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No sales data available</p>;
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#111827">
            <tspan x="50%" dy="-0.3em" fontSize="30" fontWeight={700}>100%</tspan>
            <tspan x="50%" dy="1.6em" fontSize="12" fill="#9CA3AF" fontWeight={500}>Total</tspan>
          </text>
          <Tooltip
            formatter={(value) => [`${value} (${Math.round((Number(value) / Math.max(total, 1)) * 100)}%)`, "Sales"]}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {data.map((item, index) => (
          <span
            key={item.name}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-[#F8F9FB] px-2.5 py-1 text-xs font-medium text-[#374151]"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}
