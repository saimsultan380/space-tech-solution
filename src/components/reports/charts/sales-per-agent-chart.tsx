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
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";

interface SalesPerAgentChartProps {
  data: Array<{ name: string; total: number; approved: number; revenue: number }>;
}

export function SalesPerAgentChart({ data }: SalesPerAgentChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No agent data available</p>;
  }

  const chartData = data.map((d) => {
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
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} barCategoryGap={18}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="name"
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          interval={0}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          allowDecimals={false}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <Tooltip
          content={<SalesPerAgentTooltip />}
          cursor={false}
        />
        <Legend />
        <Bar
          dataKey="approved"
          name="Approved"
          stackId="a"
          fill="hsl(221, 83%, 53%)"
          radius={[10, 10, 0, 0]}
        />
        <Bar
          dataKey="notApproved"
          name="Not approved (Pending/Rejected)"
          stackId="a"
          fill="hsl(221, 12%, 82%)"
          radius={[10, 10, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SalesPerAgentTooltip(props: any) {
  const { currency } = useCurrency();
  const { active, payload, label } = props as {
    active?: boolean;
    payload?: Array<{ payload?: any }>;
    label?: string;
  };
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as {
    total: number;
    approved: number;
    notApproved: number;
    revenue: number;
    conversion: number;
  };

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
      <div className="mb-1 text-sm font-semibold">{label}</div>
      <div className="space-y-0.5 text-xs text-muted-foreground">
        <div className="flex justify-between gap-6">
          <span>Total sales</span>
          <span className="font-medium text-foreground">{row.total}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Approved</span>
          <span className="font-medium text-foreground">{row.approved}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Not approved</span>
          <span className="font-medium text-foreground">{row.notApproved}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Conversion</span>
          <span className="font-medium text-foreground">{row.conversion}%</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Revenue (approved)</span>
          <span className="font-medium text-foreground">{formatCurrency(row.revenue, currency)}</span>
        </div>
      </div>
    </div>
  );
}
