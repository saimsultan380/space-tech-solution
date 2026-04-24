import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: { value: number; positive: boolean };
  className?: string;
  colorClass?: string;
}

const defaultColors = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

const cardTintByColor: Record<string, string> = {
  "bg-blue-500": "from-blue-500/[0.14] to-indigo-500/[0.06]",
  "bg-emerald-500": "from-emerald-500/[0.14] to-teal-500/[0.06]",
  "bg-violet-500": "from-violet-500/[0.14] to-fuchsia-500/[0.06]",
  "bg-amber-500": "from-amber-500/[0.14] to-yellow-500/[0.06]",
  "bg-rose-500": "from-rose-500/[0.14] to-red-500/[0.06]",
  "bg-cyan-500": "from-cyan-500/[0.14] to-sky-500/[0.06]",
};

let colorIndex = 0;

export function StatCard({ title, value, description, icon, trend, className, colorClass }: StatCardProps) {
  const color = colorClass || defaultColors[colorIndex++ % defaultColors.length];
  const tint = cardTintByColor[color] ?? "from-primary/[0.12] to-card";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-md border border-border bg-gradient-to-br p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        tint,
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                  trend.positive
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {trend.positive ? "+" : ""}
                {trend.value}%
              </span>
            )}
            {description && <p className="text-[12px] text-muted-foreground">{description}</p>}
          </div>
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
              color
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
