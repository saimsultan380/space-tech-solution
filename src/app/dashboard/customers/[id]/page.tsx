import { requireAuth } from "@/lib/auth";
import { canAccessCallLogsResponses } from "@/lib/nav-access";
import { getCustomer } from "@/lib/actions/customers";
import { redirect } from "next/navigation";
import { getNotes } from "@/lib/actions/notes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatDate } from "@/lib/utils";
import { NotesSection } from "@/components/shared/notes-section";
import Link from "next/link";
import { ArrowLeft } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export default async function CustomerDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const user = await requireAuth();
  if (!canAccessCallLogsResponses(user.role, user.allowed_modules)) {
    redirect("/dashboard");
  }
  const [customer, notes] = await Promise.all([
    getCustomer(params.id),
    getNotes({ customer_id: params.id }),
  ]);

  const formattedNotes = notes.map((n) => ({
    id: n.id,
    content: n.content,
    is_important: n.is_important,
    created_at: n.created_at,
    user: n.user ? {
      id: n.user.id,
      full_name: n.user.full_name,
      role: n.user.role,
    } : null,
  }));
  const latestResponse = formattedNotes[0]?.content?.trim() || "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/call-logs-responses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{customer.phone || "Call Log Response"}</h1>
          <p className="text-muted-foreground">Call Log Response Details</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call Log Response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Date" value={customer.created_at ? formatDate(customer.created_at) : "N/A"} />
          <InfoRow label="Phone" value={customer.phone || "N/A"} />
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Response</span>
            <p className="text-sm font-medium whitespace-pre-wrap">
              {latestResponse || "N/A"}
            </p>
          </div>
        </CardContent>
      </Card>

      <NotesSection notes={formattedNotes} customerId={params.id} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
