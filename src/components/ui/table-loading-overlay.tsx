"use client";

import { BouncingDots } from "@/components/ui/bouncing-dots";

interface TableLoadingOverlayProps {
  isLoading: boolean;
}

export function TableLoadingOverlay({ isLoading }: TableLoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
      <BouncingDots message="Loading..." />
    </div>
  );
}
