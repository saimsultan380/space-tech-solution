"use client";

import { useQuery } from "@tanstack/react-query";
import { getSaleChargeRequest } from "@/lib/actions/merchant-charges";
import { ChargeProgress } from "@/components/sales/charge-progress";

export function SaleChargeStatus({ saleId }: { saleId: string }) {
  const { data } = useQuery({
    queryKey: ["sale-charge", saleId],
    queryFn: () => getSaleChargeRequest(saleId),
    refetchInterval: 10000,
  });

  if (!data) return null;

  return (
    <ChargeProgress
      status={data.status}
      merchantName={data.merchant_name}
      viewedAt={data.viewed_at}
      declineReason={data.decline_reason}
      remarks={data.remarks}
    />
  );
}
