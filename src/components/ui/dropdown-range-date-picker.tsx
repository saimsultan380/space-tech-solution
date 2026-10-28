"use client";

import * as React from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon } from "@/components/ui/icons";
import { interpretUsDate, isoToUsDate } from "@/components/ui/date-field";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";

interface DropdownRangeDatePickerProps {
  value?: DateRange;
  onApply: (range: DateRange | undefined) => void;
  triggerClassName?: string;
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DropdownRangeDatePicker({ value, onApply, triggerClassName }: DropdownRangeDatePickerProps) {
  const today = new Date();
  const [selected, setSelected] = React.useState<DateRange | undefined>(value);
  const [month, setMonth] = React.useState(today.getMonth());
  const [year, setYear] = React.useState(today.getFullYear());
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setSelected(value);
    if (value?.from) {
      setMonth(value.from.getMonth());
      setYear(value.from.getFullYear());
    }
  }, [value]);

  const displayMonth = new Date(year, month, 1);

  const formattedValue = selected?.from
    ? selected.to
      ? `${format(selected.from, "MM/dd/yyyy")} - ${format(selected.to, "MM/dd/yyyy")}`
      : format(selected.from, "MM/dd/yyyy")
    : "Date range";

  const years = Array.from({ length: today.getFullYear() - 1900 + 16 }, (_, i) => today.getFullYear() + 15 - i);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={triggerClassName || "h-11 w-full justify-start text-left font-normal sm:w-[260px]"}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate overflow-hidden">{formattedValue}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <UsRangeInput
              label="From"
              date={selected?.from}
              onPick={(date) => setSelected((current) => ({ from: date, to: current?.to }))}
            />
            <UsRangeInput
              label="To"
              date={selected?.to}
              onPick={(date) => setSelected((current) => ({ from: current?.from, to: date }))}
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={year.toString()}
              onChange={(e) => setYear(Number(e.target.value))}
              options={years.map((y) => ({ value: String(y), label: String(y) }))}
              className="h-9 w-[120px] py-1 text-sm"
              aria-label="Select year"
            />
            <Select
              value={month.toString()}
              onChange={(e) => setMonth(Number(e.target.value))}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: String(i),
                label: format(new Date(2000, i, 1), "MMMM"),
              }))}
              className="h-9 w-[140px] py-1 text-sm"
              aria-label="Select month"
            />
          </div>

          <Calendar
            mode="range"
            selected={selected}
            onSelect={setSelected}
            month={displayMonth}
            onMonthChange={(date) => {
              setMonth(date.getMonth());
              setYear(date.getFullYear());
            }}
            className="rounded-md border"
          />

          <div className="flex justify-between pt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelected(undefined);
                onApply(undefined);
                setOpen(false);
              }}
              disabled={!selected}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onApply(selected);
                setOpen(false);
              }}
              disabled={!selected?.from}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UsRangeInput({
  label,
  date,
  onPick,
}: {
  label: string;
  date?: Date;
  onPick: (date: Date | undefined) => void;
}) {
  const iso = date ? toInputDate(date) : "";
  const [text, setText] = React.useState(isoToUsDate(iso));

  React.useEffect(() => {
    setText(isoToUsDate(iso));
  }, [iso]);

  return (
    <label className="space-y-1 text-xs font-medium text-muted-foreground">
      {label}
      <input
        type="text"
        inputMode="numeric"
        placeholder="MM/DD/YYYY"
        value={text}
        onChange={(event) => {
          const parsed = interpretUsDate(event.target.value);
          setText(parsed.text);
          if (!parsed.text) onPick(undefined);
          else if (parsed.iso) onPick(new Date(`${parsed.iso}T00:00:00`));
        }}
        onBlur={() => setText(isoToUsDate(iso))}
        className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

export function toDateRangeFromFilters(fromDate?: string, toDate?: string): DateRange | undefined {
  if (!fromDate && !toDate) return undefined;
  const from = fromDate ? new Date(`${fromDate}T00:00:00`) : undefined;
  const to = toDate ? new Date(`${toDate}T00:00:00`) : undefined;
  return { from, to };
}

export function toFilterDates(range: DateRange | undefined): { from_date?: string; to_date?: string } {
  if (!range?.from && !range?.to) {
    return {
      from_date: undefined,
      to_date: undefined,
    };
  }
  return {
    from_date: range?.from ? toInputDate(range.from) : undefined,
    to_date: range?.to ? toInputDate(range.to) : undefined,
  };
}

