import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function Spinner({ className }: { className?: string }) {
  return (
    <div className="relative flex items-center justify-center">
      <Loader2 className={cn("h-6 w-6 animate-spin text-primary/80", className)} />
      <div className={cn("absolute h-6 w-6 rounded-full border-2 border-primary/10", className)} />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0c]/90 backdrop-blur-xl">
      {/* Decorative gradient blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-6 flex items-center justify-center">
          {/* Outer Ring */}
          <div className="absolute h-16 w-16 rounded-full border-2 border-blue-500/10" />
          {/* Inner Glow */}
          <div className="absolute h-12 w-12 rounded-full bg-blue-500/5 blur-lg animate-pulse" />
          {/* Spinner */}
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        </div>
        
        <div className="space-y-1.5 text-center">
          <p className="text-xs font-bold tracking-[0.3em] text-blue-400 uppercase">
            Loading
          </p>
          <p className="text-xl font-bold tracking-tight text-white">
            Space Tech Solution
          </p>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
