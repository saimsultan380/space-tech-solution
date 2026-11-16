import { requireRole } from "@/lib/auth";
import { openMerchantChargeRequest } from "@/lib/actions/merchant-charges";
import { listMerchantNames } from "@/lib/actions/merchant-names";
import { MerchantChargeDetail } from "@/components/merchant-charges/merchant-charge-detail";

export default async function MerchantChargeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["merchant", "super_admin"]);
  const { id } = await params;
  const [{ request, card }, merchantNames] = await Promise.all([
    openMerchantChargeRequest(id),
    listMerchantNames().catch(() => []),
  ]);

  return (
    <MerchantChargeDetail
      request={request}
      card={card}
      merchantNames={merchantNames.map((row) => row.name)}
      canCharge={
        user.role === "merchant" &&
        (!request.merchant_user_id || request.merchant_user_id === user.id)
      }
    />
  );
}
