import { requireAuth } from "@/lib/auth";
import { getPayments } from "@/lib/actions/payments";
import { PaymentsClient } from "@/components/payments/payments-client";

export default async function PaymentsPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [user, searchParams] = await Promise.all([
    requireAuth(),
    props.searchParams,
  ]);
  const page = Number(searchParams.page) || 1;

  const result = await getPayments({ page, pageSize: 20 });

  const formattedPayments = result.data.map((p) => {
    const saleResult = p.sale as unknown as { id: string; company_name: string; status: string } | null;
    const customerResult = p.customer as unknown as { id: string; name: string } | null;
    return {
      id: String(p.id || ""),
      method: String(p.method || "card"),
      amount: Number(p.amount || 0),
      card_last_four: p.card_last_four ? String(p.card_last_four) : null,
      bank_name: p.bank_name ? String(p.bank_name) : null,
      created_at: String(p.created_at || ""),
      sale: saleResult ? {
        id: String(saleResult.id || ""),
        company_name: String(saleResult.company_name || ""),
        status: String(saleResult.status || ""),
      } : null,
      customer: customerResult ? {
        id: String(customerResult.id || ""),
        name: String(customerResult.name || ""),
      } : null,
    };
  });

  return (
    <PaymentsClient
      payments={formattedPayments}
      userRole={user.role}
      page={result.page}
      totalPages={result.totalPages}
      totalCount={result.count}
      pageSize={result.pageSize}
    />
  );
}
