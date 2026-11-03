"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { PAGE_SIZE_OPTIONS, parsePageSize } from "@/lib/page-size";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showInfo?: boolean;
  totalItems?: number;
  pageSize?: number;
  /** Query param cleared when the page size changes. Defaults to `page`. */
  pageParam?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showInfo = true,
  totalItems,
  pageSize = DEFAULT_PAGE_SIZE,
  pageParam = "page",
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeTotalPages = Math.max(1, totalPages);
  const selectedSize = parsePageSize(pageSize);
  const navDisabled = safeTotalPages <= 1;
  const startItem = !totalItems ? 0 : (currentPage - 1) * selectedSize + 1;
  const endItem = !totalItems ? 0 : Math.min(currentPage * selectedSize, totalItems);

  function changePageSize(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === DEFAULT_PAGE_SIZE) params.delete("pageSize");
    else params.set("pageSize", String(next));
    params.delete(pageParam);
    if (pageParam !== "page") params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className={cn("flex flex-col gap-3 border-t border-border px-2 py-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      {showInfo && totalItems !== undefined && (
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{startItem}</span> to{" "}
          <span className="font-medium text-foreground">{endItem}</span> of{" "}
          <span className="font-medium text-foreground">{totalItems}</span> results
        </div>
      )}
      <div className={cn("flex flex-wrap items-center gap-2", showInfo && totalItems !== undefined && "sm:ml-auto")}>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Rows
          <select
            value={selectedSize}
            onChange={(event) => changePageSize(Number(event.target.value))}
            aria-label="Items per page"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
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

        <div className="flex min-w-[7rem] items-center justify-center px-2 text-sm font-medium">
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
