"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { transitionMerchantCharge } from "@/lib/actions/merchant-charges";
import { CHARGE_REQUEST_STATUSES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import type { SaleChargeRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/loading";

export function MerchantChargeDetail({
  request,
  card,
  canCharge,
}: {
  request: SaleChargeRequest;
  card: {
    cardNumber: string;
    cardCvv: string;
    cardExp: string;
    billingAddress: string;
    cardLastFour: string;
  };
  canCharge: boolean;
}) {
  const router = useRouter();
  const { currency } = useCurrency();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const statusLabel =
    CHARGE_REQUEST_STATUSES.find((item) => item.value === request.status)?.label || request.status;

  const run = async (next: "charging" | "approved" | "declined") => {
    setPending(true);
    setError("");
    try {
      await transitionMerchantCharge(request.id, next, reason);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this request");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/dashboard/merchant-charges" className="text-sm text-primary hover:underline">
        Back to charges
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{request.company_name || "Card charge"}</h1>
          <p className="text-sm text-muted-foreground">
            {request.customer_name || "Customer"} · {request.agent_name || "Agent"} · {statusLabel}
          </p>
        </div>
        <p className="text-xl font-semibold">{formatCurrency(request.charged_amount || 0, currency)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Card to charge</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Card number</p>
            <p className="font-medium">{card.cardNumber || (card.cardLastFour ? `•••• ${card.cardLastFour}` : "—")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expiry</p>
            <p className="font-medium">{card.cardExp || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CVV</p>
            <p className="font-medium">{card.cardCvv || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Billing address</p>
            <p className="font-medium">{card.billingAddress || "—"}</p>
          </div>
        </CardContent>
      </Card>

      {request.decline_reason ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Declined: {request.decline_reason}
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {canCharge && (request.status === "pending" || request.status === "viewed") ? (
        <Button type="button" onClick={() => void run("charging")} disabled={pending}>
          {pending ? <Spinner /> : "Start charge"}
        </Button>
      ) : null}

      {canCharge && request.status === "charging" ? (
        <div className="space-y-3">
          <Textarea
            label="Decline reason"
            placeholder="Required only if the charge fails"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void run("approved")} disabled={pending}>
              {pending ? <Spinner /> : "Mark approved"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void run("declined")}
              disabled={pending || !reason.trim()}
            >
              Decline
            </Button>
          </div>
        </div>
      ) : null}

      {request.status === "approved" ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">This charge is approved. It cannot be charged again.</p>
      ) : null}
    </div>
  );
}
