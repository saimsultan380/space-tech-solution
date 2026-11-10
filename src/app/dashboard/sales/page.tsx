import { requireAuth } from "@/lib/auth";
import { SalesClient } from "@/components/sales/sales-client";
import { redirect } from "next/navigation";

export default async function SalesPage() {
  const user = await requireAuth();
  if (user.role === "merchant") {
    redirect("/dashboard/merchant-charges");
  }

  return (
    <SalesClient 
      userRole={user.role} 
      userId={user.id} 
    />
  );
}
