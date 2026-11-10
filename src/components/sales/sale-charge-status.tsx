"use client";

import { useQuery } from "@tanstack/react-query";
import { CHARGE_REQUEST_STATUSES } from "@/lib/constants";
import { getSaleChargeRequest } from "@/lib/actions/merchant-charges";

function label(status: string) {
  return CHARGE_REQUEST_STATUSES.find((item) => item.value === status)?.label || status;
}

export function SaleChargeStatus({ saleId }: { saleId: string }) {
  const { data } = useQuery({
    queryKey: ["sale-charge", saleId],
    queryFn: () => getSaleChargeRequest(saleId),
    refetchInterval: 10000,
  });

  if (!data) return null;

  const viewed = data.viewed_at
    ? new Date(data.viewed_at).toLocaleString()
    : null;

  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Merchant charge</p>
        <span className="text-sm font-semibold text-primary">{label(data.status)}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {data.merchant_name ? `Merchant: ${data.merchant_name}. ` : ""}
        {data.status === "pending"
          ? "Waiting for the merchant to open this request."
          : viewed
            ? `Viewed ${viewed}.`
            : "The merchant has this request."}
        {data.status === "charging" ? " The card is being charged." : ""}
        {data.status === "approved" ? " Charge approved. You can keep adding sales." : ""}
        {data.status === "declined" && data.decline_reason ? ` Reason: ${data.decline_reason}` : ""}
      </p>
    </div>
  );
}
