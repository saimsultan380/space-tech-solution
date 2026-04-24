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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="relative mb-4 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary shadow-lg" />
        <div className="absolute h-10 w-10 rounded-full border-4 border-primary/10" />
      </div>
      <p className="text-sm font-bold tracking-widest text-primary uppercase animate-pulse">Loading System</p>
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
