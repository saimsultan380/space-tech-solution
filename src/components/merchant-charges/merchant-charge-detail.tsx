"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { transitionMerchantCharge } from "@/lib/actions/merchant-charges";
import { ChargeProgress } from "@/components/sales/charge-progress";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import type { SaleChargeRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [merchantCompany, setMerchantCompany] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const run = async (next: "charging" | "approved" | "declined") => {
    setPending(true);
    setError("");
    if (next === "approved" && !merchantCompany.trim()) {
      setError("Enter the merchant name. This is the company name shown on the sale.");
      setPending(false);
      return;
    }
    try {
      await transitionMerchantCharge(request.id, next, reason, merchantCompany);
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
            {request.customer_name || "Customer"} · {request.agent_name || "Agent"}
          </p>
        </div>
        <p className="text-xl font-semibold">{formatCurrency(request.charged_amount || 0, currency)}</p>
      </div>
      <ChargeProgress
        status={request.status}
        merchantName={request.merchant_name}
        viewedAt={request.viewed_at}
        declineReason={request.decline_reason}
        remarks={request.remarks}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Charge details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="font-medium">
              {[request.charge_first_name, request.charge_last_name].filter(Boolean).join(" ") || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="font-medium">
              {request.charge_amount != null ? formatCurrency(Number(request.charge_amount), currency) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="font-medium">{request.charge_phone || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium">{request.charge_email || "—"}</p>
          </div>
        </CardContent>
      </Card>

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

      {request.status === "approved" ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          Approved{request.merchant_name ? ` by ${request.merchant_name}` : ""}.{" "}
          {request.remarks ? `Remarks: ${request.remarks}` : "The sale details were added."}
        </p>
      ) : null}
      {request.status === "declined" ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          Declined. {request.remarks || request.decline_reason || "No remarks."}
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
          <Input
            id="merchant_company_name"
            label="Merchant name"
            placeholder="Company name"
            value={merchantCompany}
            onChange={(e) => setMerchantCompany(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            This company name is the merchant name shown on the sale.
          </p>
          <Textarea
            label="Remarks"
            placeholder="Shown on Charge a Sale. Required if you decline."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void run("approved")} disabled={pending || !merchantCompany.trim()}>
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

    </div>
  );
}
