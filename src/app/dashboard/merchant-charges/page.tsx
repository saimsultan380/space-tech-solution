import { requireRole } from "@/lib/auth";
import { MerchantChargesClient } from "@/components/merchant-charges/merchant-charges-client";

export default async function MerchantChargesPage() {
  await requireRole(["merchant", "super_admin"]);
  return <MerchantChargesClient />;
}
