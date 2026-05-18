import { requireAuth } from "@/lib/auth";
import { canAccessCallLogsResponses } from "@/lib/nav-access";
import { getCustomer } from "@/lib/actions/customers";
import { redirect } from "next/navigation";
import { getNotes } from "@/lib/actions/notes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatDate } from "@/lib/utils";
import { decrypt } from "@/lib/encryption";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/call-logs-responses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{customer.name}</h1>
          <p className="text-muted-foreground">Call Log Response Details</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Email" value={customer.email || "N/A"} />
            <InfoRow label="Phone" value={customer.phone || "N/A"} />
            <InfoRow label="Address" value={customer.address || "N/A"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="Date of Birth"
              value={customer.dob ? formatDate(customer.dob) : "N/A"}
            />
            <InfoRow label="SSN" value={customer.ssn_encrypted ? decrypt(customer.ssn_encrypted) || "N/A" : "N/A"} />
            <InfoRow label="Created" value={formatDate(customer.created_at)} />
          </CardContent>
        </Card>
      </div>

      <NotesSection notes={formattedNotes} customerId={params.id} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
