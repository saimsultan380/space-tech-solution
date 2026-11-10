"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateField, isoToUsDate } from "@/components/ui/date-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/loading";
import { PhoneCall, Trash2 } from "@/components/ui/icons";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatCurrency } from "@/lib/utils";
import {
  createCallSetupCharge,
  deleteCallSetupCharge,
  updateCallSetupCharge,
  type CallSetupCharge,
} from "@/lib/actions/call-setup-charges";

const emptyDraft = { starts_on: "", ends_on: "", amount: "" };

export function CallSetupChargesSettings({ initial }: { initial: CallSetupCharge[] }) {
  const { currency } = useCurrency();
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState(emptyDraft);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const saveNew = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    try {
      const next = await createCallSetupCharge({
        starts_on: draft.starts_on,
        ends_on: draft.ends_on,
        amount: Number(draft.amount),
      });
      setRows(next);
      setDraft(emptyDraft);
      setMessage("Call setup charge saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this charge.");
    } finally {
      setPending(false);
    }
  };

  const saveEdit = async (id: string) => {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const next = await updateCallSetupCharge({
        id,
        starts_on: editDraft.starts_on,
        ends_on: editDraft.ends_on,
        amount: Number(editDraft.amount),
      });
      setRows(next);
      setEditingId(null);
      setMessage("Call setup charge updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this charge.");
    } finally {
      setPending(false);
    }
  };

  const remove = async (id: string) => {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const next = await deleteCallSetupCharge(id);
      setRows(next);
      if (editingId === id) setEditingId(null);
      setMessage("Call setup charge removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this charge.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PhoneCall className="h-4 w-4" />
          Call Setup Charges
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Set a charge for a from date and a to date. Each sale in those dates picks up that charge.
          The employee report shows the total next to Total Calls. Saved sale amounts are not changed.
        </p>

        <form onSubmit={(event) => void saveNew(event)} className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <DateField
            id="call-setup-from"
            label="From"
            value={draft.starts_on}
            onChange={(value) => setDraft((current) => ({ ...current, starts_on: value }))}
            required
          />
          <DateField
            id="call-setup-to"
            label="To"
            value={draft.ends_on}
            onChange={(value) => setDraft((current) => ({ ...current, ends_on: value }))}
            required
          />
          <Input
            id="call-setup-amount"
            label="Charge"
            type="number"
            min="0.01"
            step="0.01"
            value={draft.amount}
            onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
            required
          />
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : "Add charge"}
          </Button>
        </form>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p> : null}

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No call setup charges yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">From</th>
                  <th className="py-2 pr-3 font-medium">To</th>
                  <th className="py-2 pr-3 font-medium">Charge</th>
                  <th className="py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) =>
                  editingId === row.id ? (
                    <tr key={row.id} className="border-b">
                      <td className="py-2 pr-3">
                        <DateField
                          value={editDraft.starts_on}
                          onChange={(value) => setEditDraft((current) => ({ ...current, starts_on: value }))}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <DateField
                          value={editDraft.ends_on}
                          onChange={(value) => setEditDraft((current) => ({ ...current, ends_on: value }))}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editDraft.amount}
                          onChange={(event) =>
                            setEditDraft((current) => ({ ...current, amount: event.target.value }))
                          }
                        />
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" size="sm" disabled={pending} onClick={() => void saveEdit(row.id)}>
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.id} className="border-b">
                      <td className="py-2 pr-3">{isoToUsDate(row.starts_on)}</td>
                      <td className="py-2 pr-3">{isoToUsDate(row.ends_on)}</td>
                      <td className="py-2 pr-3 font-medium">{formatCurrency(row.amount, currency)}</td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => {
                              setEditingId(row.id);
                              setEditDraft({
                                starts_on: row.starts_on,
                                ends_on: row.ends_on,
                                amount: String(row.amount),
                              });
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
                            disabled={pending}
                            onClick={() => void remove(row.id)}
                            aria-label="Remove charge"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
