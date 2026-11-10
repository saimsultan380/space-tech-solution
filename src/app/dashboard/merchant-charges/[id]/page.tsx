import { requireRole } from "@/lib/auth";
import { openMerchantChargeRequest } from "@/lib/actions/merchant-charges";
import { MerchantChargeDetail } from "@/components/merchant-charges/merchant-charge-detail";

export default async function MerchantChargeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["merchant", "super_admin"]);
  const { id } = await params;
  const { request, card } = await openMerchantChargeRequest(id);

  return (
    <MerchantChargeDetail
      request={request}
      card={card}
      canCharge={user.role === "merchant" && request.merchant_user_id === user.id}
    />
  );
}
