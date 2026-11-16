import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { MerchantChargesClient } from "@/components/merchant-charges/merchant-charges-client";
import { Spinner } from "@/components/ui/loading";

export default async function MerchantChargesPage() {
  await requireRole(["merchant", "super_admin"]);
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <MerchantChargesClient />
    </Suspense>
  );
}
