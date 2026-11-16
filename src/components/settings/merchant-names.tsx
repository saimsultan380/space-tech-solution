"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/loading";
import { Building2, Trash2 } from "@/components/ui/icons";
import {
  createMerchantName,
  deleteMerchantName,
  type MerchantName,
} from "@/lib/actions/merchant-names";

export function MerchantNamesSettings({ initial }: { initial: MerchantName[] }) {
  const [rows, setRows] = useState(initial);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    try {
      const next = await createMerchantName(name);
      setRows(next);
      setName("");
      setMessage("Merchant name saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this merchant name.");
    } finally {
      setPending(false);
    }
  };

  const remove = async (id: string) => {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const next = await deleteMerchantName(id);
      setRows(next);
      setMessage("Merchant name removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this merchant name.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Merchant Names
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add the company names a merchant can choose. The same list is shown in Charge a Sale and on the charge request.
        </p>
        <form onSubmit={(event) => void save(event)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              id="merchant-name"
              label="Merchant name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Company name"
              required
            />
          </div>
          <Button type="submit" disabled={pending || !name.trim()}>
            {pending ? <Spinner /> : "Add name"}
          </Button>
        </form>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No merchant names yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm font-medium text-foreground">{row.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${row.name}`}
                  disabled={pending}
                  onClick={() => void remove(row.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
