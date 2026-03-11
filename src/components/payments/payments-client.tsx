"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/loading";
import { PaymentFormDialog } from "./payment-form-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import type { UserRole } from "@/lib/types";
import { Plus, CreditCard, Building2 } from "lucide-react";

interface PaymentsClientProps {
  payments: Array<{
    id: string;
    method: string;
    amount: number;
    card_last_four: string | null;
    bank_name: string | null;
    created_at: string;
    sale: { id: string; company_name: string; status: string } | null;
    customer: { id: string; name: string } | null;
  }>;
  userRole: UserRole;
}

export function PaymentsClient({ payments, userRole }: PaymentsClientProps) {
  const [showForm, setShowForm] = useState(false);
  const canCreate = userRole === "super_admin" || userRole === "sales_agent";
  const { currency } = useCurrency();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Track payment records</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Record Payment
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {payments.length} payment{payments.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState title="No payments recorded" description="Payments will appear here once recorded" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Sale</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.customer?.name || "N/A"}
                    </TableCell>
                    <TableCell>{payment.sale?.company_name || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        {payment.method === "card" ? (
                          <CreditCard className="h-3 w-3" />
                        ) : (
                          <Building2 className="h-3 w-3" />
                        )}
                        {payment.method === "card" ? "Card" : "Bank"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.method === "card"
                        ? `****${payment.card_last_four}`
                        : payment.bank_name || "N/A"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount, currency)}
                    </TableCell>
                    <TableCell>{formatDate(payment.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showForm && <PaymentFormDialog open onClose={() => setShowForm(false)} />}
    </div>
  );
}
