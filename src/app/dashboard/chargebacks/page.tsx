import { requireAuth } from "@/lib/auth";
import { getChargebacks } from "@/lib/actions/chargebacks";
import { ChargebacksClient } from "@/components/chargebacks/chargebacks-client";

export default async function ChargebacksPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireAuth();
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;

  const chargebacksResponse = await getChargebacks({ page, pageSize: 10 });

  return <ChargebacksClient chargebacksResponse={chargebacksResponse} userRole={user.role} />;
}
