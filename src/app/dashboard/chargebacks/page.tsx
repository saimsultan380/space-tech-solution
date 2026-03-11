import { requireAuth } from "@/lib/auth";
import { getChargebacks } from "@/lib/actions/chargebacks";
import { ChargebacksClient } from "@/components/chargebacks/chargebacks-client";

export default async function ChargebacksPage() {
  const user = await requireAuth();
  const chargebacks = await getChargebacks();

  return <ChargebacksClient chargebacks={chargebacks} userRole={user.role} />;
}
