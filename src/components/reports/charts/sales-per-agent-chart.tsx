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
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No agent data available</p>;
  }

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
        <CartesianGrid vertical={false} stroke="#EEF2FF" strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          className="text-xs"
          tick={{ fill: "#475569", fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="left"
          allowDecimals={false}
          className="text-xs"
          tick={{ fill: "#94A3B8" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          className="text-xs"
          tick={{ fill: "#94A3B8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}%`}
        />
        <ReferenceLine
          yAxisId="left"
          y={averageSales}
          stroke="#93C5FD"
          strokeDasharray="5 5"
          ifOverflow="extendDomain"
          label={{ value: `Avg ${averageSales}`, position: "insideTopLeft", fill: "#64748B", fontSize: 11 }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "12px", color: "#64748B", paddingBottom: "12px" }}
        />
        <Tooltip
          content={<SalesPerAgentTooltip />}
          cursor={false}
        />
        <Bar
          yAxisId="left"
          dataKey="approved"
          name="Approved"
          fill="url(#approvedGradient)"
          radius={[10, 10, 6, 6]}
          maxBarSize={40}
          background={{ fill: "#EEF2FF", radius: 10 }}
        >
          <LabelList
            dataKey="approved"
            position="top"
            className="fill-blue-700"
            fontSize={11}
            fontWeight={600}
          />
        </Bar>
        <Bar
          yAxisId="left"
          dataKey="notApproved"
          name="Not Approved"
          fill="url(#notApprovedGradient)"
          radius={[10, 10, 6, 6]}
          maxBarSize={40}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="conversion"
          name="Conversion %"
          stroke="#14B8A6"
          strokeWidth={2.5}
          dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
          activeDot={{ r: 6, strokeWidth: 2, fill: "#14B8A6" }}
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
