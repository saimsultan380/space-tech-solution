import { Spinner } from "@/components/ui/loading";

// ✅ No client-side features - safe to be server component

interface TableLoadingOverlayProps {
  isLoading: boolean;
}

export function TableLoadingOverlay({ isLoading }: TableLoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
