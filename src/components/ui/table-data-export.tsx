"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  downloadTableCsv,
  type TableExportCell,
} from "@/lib/table-export";

export type { TableExportCell };

interface TableDataExportProps {
  filenameBase: string;
  headers: string[];
  rows: TableExportCell[][];
  disabled?: boolean;
  className?: string;
}

export function TableDataExport({
  filenameBase,
  headers,
  rows,
  disabled = false,
  className,
}: TableDataExportProps) {
  const empty = disabled || rows.length === 0;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={empty}
        onClick={() => downloadTableCsv(headers, rows, filenameBase)}
      >
        <FileDown className="h-4 w-4 shrink-0" />
        CSV
      </Button>
    </div>
  );
}

interface TableDataExportAsyncProps {
  filenameBase: string;
  disabled?: boolean;
  className?: string;
  fetchRows: () => Promise<{ headers: string[]; rows: TableExportCell[][] }>;
}

export function TableDataExportAsync({
  filenameBase,
  disabled = false,
  className,
  fetchRows,
}: TableDataExportAsyncProps) {
  const [loading, setLoading] = useState<"csv" | null>(null);

  const run = async (kind: "csv") => {
    if (disabled || loading) return;
    setLoading(kind);
    try {
      const { headers, rows } = await fetchRows();
      if (rows.length === 0) return;
      downloadTableCsv(headers, rows, filenameBase);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || loading !== null}
        onClick={() => void run("csv")}
      >
        {loading === "csv" ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4 shrink-0" />
        )}
        CSV
      </Button>
    </div>
  );
}
