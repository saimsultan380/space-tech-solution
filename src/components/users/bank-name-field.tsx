"use client";

import { useEffect, useMemo, useState } from "react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import { getBanks, createBank } from "@/lib/actions/banks";

interface BankNameFieldProps {
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
}

export function BankNameField({ value, onChange, disabled }: BankNameFieldProps) {
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [newBank, setNewBank] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    getBanks()
      .then((rows) => {
        if (!cancelled) setBanks(rows);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load banks.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => {
    const fromDb = banks.map((b) => ({ value: b.name, label: b.name }));
    const hasValue = value.trim() && !fromDb.some((o) => o.value === value);
    const extra = hasValue ? [{ value, label: `${value} (saved)` }] : [];
    return [
      { value: "", label: loading ? "Loading banks…" : "Select bank" },
      ...extra,
      ...fromDb,
    ];
  }, [banks, value, loading]);

  const handleAddBank = async () => {
    const trimmed = newBank.trim();
    if (!trimmed) return;
    setAdding(true);
    setAddError("");
    try {
      const row = await createBank(trimmed);
      setBanks((prev) => {
        const next = [...prev.filter((b) => b.id !== row.id), row].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        return next;
      });
      onChange(row.name);
      setNewBank("");
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Could not add bank");
    }
    setAdding(false);
  };

  return (
    <div className="space-y-3">
      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : (
        <Select
          id="bank_name"
          label="Bank"
          options={options}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
        />
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            id="new_bank_name"
            label="Add bank if missing"
            placeholder="e.g. Small local bank name"
            value={newBank}
            onChange={(e) => setNewBank(e.target.value)}
            disabled={disabled || adding}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={disabled || adding || !newBank.trim()}
          onClick={() => void handleAddBank()}
        >
          {adding ? <Spinner /> : "Add"}
        </Button>
      </div>
      {addError && <p className="text-xs text-destructive">{addError}</p>}
    </div>
  );
}
