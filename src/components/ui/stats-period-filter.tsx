"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/select";
import { DateField } from "@/components/ui/date-field";
import { Button } from "@/components/ui/button";
import {
  currentMonthValue,
  customRangeError,
  recentMonthOptions,
  type StatsPeriod,
} from "@/lib/stats-period";

interface StatsPeriodFilterProps {
  value: StatsPeriod;
  onChange: (next: StatsPeriod) => void;
  /** Reports stay on a month until a custom range is applied. Dashboard can show all-time. */
  allowAllTime?: boolean;
  className?: string;
}

export function StatsPeriodFilter({
  value,
  onChange,
  allowAllTime = false,
  className,
}: StatsPeriodFilterProps) {
  const months = recentMonthOptions();
  const [mode, setMode] = useState<StatsPeriod["mode"]>(value.mode);
  const [month, setMonth] = useState(
    value.mode === "month" ? value.month : currentMonthValue(),
  );
  const [draftFrom, setDraftFrom] = useState(value.mode === "custom" ? value.from : "");
  const [draftTo, setDraftTo] = useState(value.mode === "custom" ? value.to : "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(value.mode);
    if (value.mode === "month") setMonth(value.month);
    if (value.mode === "custom") {
      setDraftFrom(value.from);
      setDraftTo(value.to);
    }
  }, [value]);

  const applyCustom = () => {
    const message = customRangeError(draftFrom, draftTo);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    onChange({ mode: "custom", from: draftFrom, to: draftTo });
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-end gap-3">
        <Select
          aria-label="Stats period"
          options={[
            ...(allowAllTime ? [{ value: "all", label: "All time" }] : []),
            { value: "month", label: "By month" },
            { value: "custom", label: "Custom range" },
          ]}
          value={mode}
          onChange={(e) => {
            const next = e.target.value as StatsPeriod["mode"];
            setMode(next);
            setError(null);
            if (next === "all") onChange({ mode: "all" });
            if (next === "month") onChange({ mode: "month", month });
          }}
          className="h-10"
          containerClassName="space-y-0 w-[10.5rem]"
        />

        {mode === "month" && (
          <Select
            aria-label="Month"
            options={months}
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              onChange({ mode: "month", month: e.target.value });
            }}
            className="h-10"
            containerClassName="space-y-0 w-[9.5rem]"
          />
        )}

        {mode === "custom" && (
          <>
            <DateField
              label="From"
              value={draftFrom}
              max={draftTo || undefined}
              onChange={(value) => {
                setDraftFrom(value);
                setError(null);
              }}
              className="h-10"
            />
            <DateField
              label="To"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(value) => {
                setDraftTo(value);
                setError(null);
              }}
              className="h-10"
            />
            <Button type="button" size="sm" className="h-10" onClick={applyCustom}>
              Apply
            </Button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
