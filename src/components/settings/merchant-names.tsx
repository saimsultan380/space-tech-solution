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
  updateMerchantName,
  type MerchantName,
} from "@/lib/actions/merchant-names";

export function MerchantNamesSettings({ initial }: { initial: MerchantName[] }) {
  const [rows, setRows] = useState(initial);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const saveNew = async (event: React.FormEvent) => {
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

  const saveEdit = async (id: string) => {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const next = await updateMerchantName(id, editName);
      setRows(next);
      setEditingId(null);
      setEditName("");
      setMessage("Merchant name updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this merchant name.");
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
      if (editingId === id) {
        setEditingId(null);
        setEditName("");
      }
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

        <form onSubmit={(event) => void saveNew(event)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
            {pending && !editingId ? <Spinner /> : "Add name"}
          </Button>
        </form>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p> : null}

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            No merchant names yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Merchant name
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Actions
              </p>
            </div>
            <ul className="divide-y divide-border/50">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/20"
                >
                  {editingId === row.id ? (
                    <>
                      <Input
                        id={`edit-merchant-name-${row.id}`}
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        placeholder="Company name"
                        required
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={pending || !editName.trim()}
                          onClick={() => void saveEdit(row.id)}
                        >
                          {pending ? <Spinner /> : "Save"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => {
                            setEditingId(null);
                            setEditName("");
                            setError("");
                            setMessage("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => {
                            setEditingId(row.id);
                            setEditName(row.name);
                            setError("");
                            setMessage("");
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={pending}
                          onClick={() => void remove(row.id)}
                          aria-label={`Remove ${row.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
