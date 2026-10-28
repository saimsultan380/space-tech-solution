"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon } from "@/components/ui/icons";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function expandYear(raw: string): number {
  const year = Number(raw);
  if (raw.length === 4) return year;
  if (raw.length !== 2 || Number.isNaN(year)) return NaN;
  return year >= 30 ? 1900 + year : 2000 + year;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function isoToUsDate(iso: string | null | undefined): string {
  const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  return `${match[2]}/${match[3]}/${match[1]}`;
}

export function usDateToIso(raw: string): string | null {
  return interpretUsDate(raw).iso;
}

export function interpretUsDate(raw: string): { text: string; iso: string | null; complete: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) return { text: "", iso: null, complete: false };

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const iso = toIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    return iso
      ? { text: isoToUsDate(iso), iso, complete: true }
      : { text: trimmed, iso: null, complete: true };
  }

  const usMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (usMatch) {
    const iso = toIsoDate(expandYear(usMatch[3]), Number(usMatch[1]), Number(usMatch[2]));
    return iso
      ? { text: isoToUsDate(iso), iso, complete: true }
      : { text: trimmed, iso: null, complete: true };
  }

  const namedMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (namedMatch) {
    const month = MONTH_NAMES.findIndex((name) => name.toLowerCase() === namedMatch[1].toLowerCase()) + 1;
    const iso = month ? toIsoDate(Number(namedMatch[3]), month, Number(namedMatch[2])) : null;
    return iso
      ? { text: isoToUsDate(iso), iso, complete: true }
      : { text: trimmed, iso: null, complete: true };
  }

  const digits = trimmed.replace(/\D/g, "").slice(0, 8);
  let text = digits;
  if (digits.length > 4) text = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  else if (digits.length > 2) text = `${digits.slice(0, 2)}/${digits.slice(2)}`;

  if (digits.length === 8) {
    const iso = toIsoDate(Number(digits.slice(4)), Number(digits.slice(0, 2)), Number(digits.slice(2, 4)));
    return iso ? { text: isoToUsDate(iso), iso, complete: true } : { text, iso: null, complete: true };
  }

  return { text, iso: null, complete: false };
}

function isoToDate(iso: string): Date | undefined {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

interface DateFieldProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  min?: string;
  max?: string;
  fromYear?: number;
  toYear?: number;
}

export function DateField({
  id,
  label,
  value,
  onChange,
  required,
  disabled,
  className,
  min,
  max,
  fromYear = 1900,
  toYear = new Date().getFullYear() + 15,
}: DateFieldProps) {
  const [text, setText] = useState(() => isoToUsDate(value));
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const selected = isoToDate(value);
  const [view, setView] = useState<Date>(selected ?? new Date());

  useEffect(() => {
    if (!focused) setText(isoToUsDate(value));
  }, [value, focused]);

  useEffect(() => {
    if (selected) setView(selected);
  }, [value]);

  const years = useMemo(() => {
    const start = Math.min(fromYear, selected?.getFullYear() ?? fromYear, view.getFullYear());
    const end = Math.max(toYear, selected?.getFullYear() ?? toYear, view.getFullYear());
    return Array.from({ length: end - start + 1 }, (_, index) => end - index);
  }, [fromYear, toYear, selected, view]);

  const commit = (raw: string) => {
    const parsed = interpretUsDate(raw);
    if (!parsed.text) {
      setText("");
      setInvalid(false);
      onChange("");
      return;
    }
    if (!parsed.iso || (min && parsed.iso < min) || (max && parsed.iso > max)) {
      setText(parsed.text);
      setInvalid(true);
      return;
    }
    setText(parsed.text);
    setInvalid(false);
    onChange(parsed.iso);
  };

  const selectDay = (date: Date | undefined) => {
    if (!date) return;
    const iso = toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
    if (!iso || (min && iso < min) || (max && iso > max)) return;
    setText(isoToUsDate(iso));
    setInvalid(false);
    onChange(iso);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={id} className="block text-left text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="MM/DD/YYYY"
          required={required}
          disabled={disabled}
          value={text}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit(text);
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text");
            const parsed = interpretUsDate(pasted);
            if (!parsed.iso) return;
            event.preventDefault();
            commit(pasted);
          }}
          onChange={(event) => {
            const parsed = interpretUsDate(event.target.value);
            setText(parsed.text);
            setInvalid(false);
            if (parsed.iso && (!min || parsed.iso >= min) && (!max || parsed.iso <= max)) {
              onChange(parsed.iso);
            } else if (!parsed.text) {
              onChange("");
            }
          }}
          className={cn(
            "flex h-12 w-full rounded-md border border-input bg-background px-3.5 py-2 pr-11 text-base shadow-sm transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:border-input/70 disabled:bg-secondary/40 disabled:text-foreground/75 disabled:opacity-100 sm:h-11 sm:text-sm",
            invalid && "border-destructive focus:ring-destructive/20",
            className,
          )}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none"
              aria-label={label ? `Choose ${label}` : "Choose date"}
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="z-[80] w-auto p-3">
            <div className="mb-3 flex gap-2">
              <Select
                aria-label="Month"
                value={String(view.getMonth())}
                onChange={(event) => setView(new Date(view.getFullYear(), Number(event.target.value), 1))}
                options={MONTH_NAMES.map((name, index) => ({ value: String(index), label: name }))}
                className="h-9 py-1 text-sm"
                containerClassName="space-y-0"
              />
              <Select
                aria-label="Year"
                value={String(view.getFullYear())}
                onChange={(event) => setView(new Date(Number(event.target.value), view.getMonth(), 1))}
                options={years.map((year) => ({ value: String(year), label: String(year) }))}
                className="h-9 w-[104px] py-1 text-sm"
                containerClassName="space-y-0"
              />
            </div>
            <Calendar
              mode="single"
              selected={selected}
              onSelect={selectDay}
              month={view}
              onMonthChange={setView}
              className="rounded-md border p-2"
              classNames={{ month_caption: "sr-only", caption_label: "sr-only" }}
            />
          </PopoverContent>
        </Popover>
      </div>
      {invalid ? <p className="text-xs text-destructive">Use a date like MM/DD/YYYY.</p> : null}
    </div>
  );
}

export function interpretUsMonth(raw: string): { text: string; value: string | null; complete: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) return { text: "", value: null, complete: false };

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMatch) {
    const month = Number(isoMatch[2]);
    const year = Number(isoMatch[1]);
    if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      const value = `${year}-${pad(month)}`;
      return { text: `${pad(month)}/${year}`, value, complete: true };
    }
    return { text: trimmed, value: null, complete: true };
  }

  const usMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{2,4})$/);
  if (usMatch) {
    const month = Number(usMatch[1]);
    const year = expandYear(usMatch[2]);
    if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      const value = `${year}-${pad(month)}`;
      return { text: `${pad(month)}/${year}`, value, complete: true };
    }
    return { text: trimmed, value: null, complete: true };
  }

  const namedMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (namedMatch) {
    const month = MONTH_NAMES.findIndex((name) => name.toLowerCase() === namedMatch[1].toLowerCase()) + 1;
    const year = Number(namedMatch[2]);
    if (month && year >= 1900 && year <= 2100) {
      return { text: `${pad(month)}/${year}`, value: `${year}-${pad(month)}`, complete: true };
    }
    return { text: trimmed, value: null, complete: true };
  }

  const digits = trimmed.replace(/\D/g, "").slice(0, 6);
  let text = digits;
  if (digits.length > 2) text = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length === 6) {
    const month = Number(digits.slice(0, 2));
    const year = Number(digits.slice(2));
    if (month >= 1 && month <= 12) {
      return { text: `${pad(month)}/${year}`, value: `${year}-${pad(month)}`, complete: true };
    }
    return { text, value: null, complete: true };
  }
  return { text, value: null, complete: false };
}

function isoMonthToUs(value: string | null | undefined): string {
  const match = value?.match(/^(\d{4})-(\d{2})/);
  if (!match) return "";
  return `${match[2]}/${match[1]}`;
}

export function MonthField({
  id,
  label,
  value,
  onChange,
  required,
  disabled,
  className,
  fromYear = 2000,
  toYear = new Date().getFullYear() + 15,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  fromYear?: number;
  toYear?: number;
}) {
  const [text, setText] = useState(() => isoMonthToUs(value));
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const selectedYear = Number(value.slice(0, 4)) || new Date().getFullYear();
  const selectedMonth = Number(value.slice(5, 7)) || new Date().getMonth() + 1;

  useEffect(() => {
    if (!focused) setText(isoMonthToUs(value));
  }, [value, focused]);

  const years = useMemo(() => {
    const start = Math.min(fromYear, selectedYear);
    const end = Math.max(toYear, selectedYear);
    return Array.from({ length: end - start + 1 }, (_, index) => end - index);
  }, [fromYear, toYear, selectedYear]);

  const commit = (raw: string) => {
    const parsed = interpretUsMonth(raw);
    if (!parsed.text) {
      setText("");
      setInvalid(false);
      onChange("");
      return;
    }
    if (!parsed.value) {
      setText(parsed.text);
      setInvalid(true);
      return;
    }
    setText(parsed.text);
    setInvalid(false);
    onChange(parsed.value);
  };

  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={id} className="block text-left text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="MM/YYYY"
            required={required}
            disabled={disabled}
            value={text}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              commit(text);
            }}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData("text");
              if (!interpretUsMonth(pasted).value) return;
              event.preventDefault();
              commit(pasted);
            }}
            onChange={(event) => {
              const parsed = interpretUsMonth(event.target.value);
              setText(parsed.text);
              setInvalid(false);
              if (parsed.value) onChange(parsed.value);
              else if (!parsed.text) onChange("");
            }}
            className={cn(
              "flex h-12 w-full rounded-md border border-input bg-background px-3.5 py-2 pr-11 text-base shadow-sm transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:border-input/70 disabled:bg-secondary/40 disabled:text-foreground/75 disabled:opacity-100 sm:h-11 sm:text-sm",
              invalid && "border-destructive focus:ring-destructive/20",
              className,
            )}
          />
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none"
              aria-label={label ? `Choose ${label}` : "Choose month"}
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </div>
        <PopoverContent align="end" className="z-[80] w-72 p-3">
          <Select
            aria-label="Year"
            value={String(selectedYear)}
            onChange={(event) => {
              const year = Number(event.target.value);
              const month = value ? selectedMonth : new Date().getMonth() + 1;
              onChange(`${year}-${pad(month)}`);
              setText(`${pad(month)}/${year}`);
              setInvalid(false);
            }}
            options={years.map((year) => ({ value: String(year), label: String(year) }))}
            className="h-9 py-1 text-sm"
            containerClassName="space-y-0"
          />
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((name, index) => {
              const month = index + 1;
              const active = Boolean(value) && month === selectedMonth;
              return (
                <button
                  key={name}
                  type="button"
                  className={cn(
                    "rounded-md px-2 py-1.5 text-xs font-medium hover:bg-muted",
                    active && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                  onClick={() => {
                    const year = value ? selectedYear : new Date().getFullYear();
                    onChange(`${year}-${pad(month)}`);
                    setText(`${pad(month)}/${year}`);
                    setInvalid(false);
                    setOpen(false);
                  }}
                >
                  {name.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      {invalid ? <p className="text-xs text-destructive">Use a month like MM/YYYY.</p> : null}
    </div>
  );
}
