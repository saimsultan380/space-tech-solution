import { requireAuth } from "@/lib/auth";
import { getPayments } from "@/lib/actions/payments";
import { PaymentsClient } from "@/components/payments/payments-client";

export default async function PaymentsPage() {
  const user = await requireAuth();
  const result = await getPayments();

  return <PaymentsClient payments={result.data} userRole={user.role} />;
}
