"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/** Match server list page size (10): hide footer until enough rows to paginate. */
export const PAGINATION_SHOW_MIN_TOTAL_ITEMS = 10;

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showInfo?: boolean;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showInfo = true,
  totalItems,
  pageSize = 10,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);

  if (totalItems !== undefined) {
    if (totalItems === 0) return null;
    if (totalItems < PAGINATION_SHOW_MIN_TOTAL_ITEMS) return null;
  } else if (safeTotalPages <= 1) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems ?? 0);
  const navDisabled = safeTotalPages <= 1;

  return (
    <div className={cn("flex flex-col gap-3 border-t border-border px-2 py-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      {showInfo && totalItems !== undefined && (
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{startItem}</span> to{" "}
          <span className="font-medium text-foreground">{endItem}</span> of{" "}
          <span className="font-medium text-foreground">{totalItems}</span> results
        </div>
      )}
      <div className={cn("flex items-center space-x-2", showInfo && totalItems !== undefined && "sm:ml-auto")}>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={() => onPageChange(1)}
          disabled={navDisabled || currentPage <= 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={navDisabled || currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex min-w-[7rem] items-center justify-center text-sm font-medium px-2">
          Page {currentPage} of {safeTotalPages}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={navDisabled || currentPage >= safeTotalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={navDisabled || currentPage >= safeTotalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
