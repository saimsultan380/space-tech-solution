import { requireAuth } from "@/lib/auth";
import { getPayments } from "@/lib/actions/payments";
import { PaymentsClient } from "@/components/payments/payments-client";

export default async function PaymentsPage() {
  const user = await requireAuth();
  const payments = await getPayments();

  return <PaymentsClient payments={payments} userRole={user.role} />;
}
