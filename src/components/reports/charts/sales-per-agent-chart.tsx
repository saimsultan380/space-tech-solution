"use client";

import {
  ComposedChart,
  Bar,
  LabelList,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface SalesPerAgentChartProps {
  data: Array<{ name: string; total: number; approved: number; revenue: number }>;
}

interface AgentRow {
  name: string;
  total: number;
  approved: number;
  notApproved: number;
  revenue: number;
  conversion: number;
}

interface TooltipPayloadItem {
  payload: AgentRow;
}

interface SalesPerAgentTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

export function SalesPerAgentChart({ data }: SalesPerAgentChartProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No agent data available</p>;
  }

  const isDark = mounted && theme === "dark";
  const gridStroke = isDark ? "#374151" : "#EEF2FF";
  const tickFill = isDark ? "#94A3B8" : "#475569";

  const chartData = data
    .map((d) => {
      const total = Number(d.total ?? 0);
      const approved = Number(d.approved ?? 0);
      const notApproved = Math.max(0, total - approved);
      const conversion = total > 0 ? Math.round((approved / total) * 100) : 0;
      return {
        name: d.name,
        total,
        approved,
        notApproved,
        revenue: Number(d.revenue ?? 0),
        conversion,
      };
    })
    .sort((a, b) => b.total - a.total);
  const averageSales = Math.round(
    chartData.reduce((sum, row) => sum + row.total, 0) / Math.max(chartData.length, 1)
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="approvedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0.88} />
          </linearGradient>
          <linearGradient id="notApprovedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A5B4FC" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#CBD5E1" stopOpacity={0.9} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          className="text-xs"
          tick={{ fill: tickFill, fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="left"
          allowDecimals={false}
          className="text-xs"
          tick={{ fill: isDark ? "#94A3B8" : "#94A3B8" }}
          tickLine={false}
          axisLine={false}
          label={{ 
            value: "Sales Count", 
            angle: -90, 
            position: "insideLeft", 
            style: { textAnchor: "middle", fill: isDark ? "#94A3B8" : "#94A3B8", fontSize: "11px" },
            offset: 15
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          className="text-xs"
          tick={{ fill: isDark ? "#94A3B8" : "#94A3B8" }}
          tickLine={false}
          axisLine={false}
          label={{ 
            value: "Conversion %", 
            angle: 90, 
            position: "insideRight", 
            style: { textAnchor: "middle", fill: isDark ? "#94A3B8" : "#94A3B8", fontSize: "11px" },
            offset: 15
          }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "12px", color: isDark ? "#94A3B8" : "#64748B", paddingBottom: "12px" }}
          formatter={(v) => <span style={{ color: isDark ? "#94A3B8" : "#64748B" }}>{v}</span>}
        />
        <Tooltip
          cursor={{ fill: isDark ? "#1F2937" : "#F1F5F9", opacity: 0.6 }}
          contentStyle={{
            backgroundColor: isDark ? "#111827" : "#FFFFFF",
            border: `1px solid ${isDark ? "#374151" : "#E2E8F0"}`,
            borderRadius: "10px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            padding: "10px 12px",
          }}
        />
        <Bar
          yAxisId="left"
          dataKey="approved"
          name="Approved"
          fill="url(#approvedGradient)"
          radius={[4, 4, 0, 0]}
          barSize={32}
        />
        <Bar
          yAxisId="left"
          dataKey="notApproved"
          name="Not Approved"
          fill="url(#notApprovedGradient)"
          radius={[4, 4, 0, 0]}
          barSize={32}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="conversion"
          name="Conversion %"
          stroke="#10B981"
          strokeWidth={3}
          dot={{ fill: "#10B981", strokeWidth: 2, r: 4, stroke: isDark ? "#111827" : "#fff" }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
        <ReferenceLine
          yAxisId="left"
          y={averageSales}
          stroke="#94A3B8"
          strokeDasharray="4 4"
          label={{ 
            value: "Avg Sales", 
            position: "right", 
            fill: "#94A3B8", 
            fontSize: 10,
            fontWeight: 600
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function SalesPerAgentTooltip(props: SalesPerAgentTooltipProps) {
  const { currency } = useCurrency();
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;

  return (
    <div className="min-w-[210px] rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="mb-2 text-sm font-semibold text-[#0F172A]">{label}</div>
      <div className="space-y-1 text-xs text-[#64748B]">
        <div className="flex justify-between gap-6">
          <span>Total sales</span>
          <span className="font-semibold text-[#0F172A]">{row.total}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Approved</span>
          <span className="font-semibold text-[#2563EB]">{row.approved}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Not approved</span>
          <span className="font-semibold text-[#64748B]">{row.notApproved}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Conversion</span>
          <span className="font-semibold text-[#14B8A6]">{row.conversion}%</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Revenue (approved)</span>
          <span className="font-semibold text-[#0F172A]">{formatCurrency(row.revenue, currency)}</span>
        </div>
      </div>
    </div>
  );
}
