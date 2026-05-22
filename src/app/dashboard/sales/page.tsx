import { requireAuth } from "@/lib/auth";
import { SalesClient } from "@/components/sales/sales-client";

export default async function SalesPage() {
  const user = await requireAuth();

  return (
    <SalesClient 
      userRole={user.role} 
      userId={user.id} 
    />
  );
}
