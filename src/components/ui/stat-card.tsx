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

let colorIndex = 0;

export function StatCard({ title, value, description, icon, trend, className, colorClass }: StatCardProps) {
  const color = colorClass || defaultColors[colorIndex++ % defaultColors.length];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
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
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
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

