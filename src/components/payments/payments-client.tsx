"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
import { TableDataExport } from "@/components/ui/table-data-export";
import { Pagination } from "@/components/ui/pagination";
import { PaymentFormDialog } from "./payment-form-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import type { UserRole } from "@/lib/types";
import { Plus, CreditCard, Building2 } from "@/components/ui/icons";

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
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export function PaymentsClient({ payments, userRole, page, totalPages, totalCount, pageSize }: PaymentsClientProps) {
  const [showForm, setShowForm] = useState(false);
  const canCreate = userRole === "super_admin" || userRole === "sales_agent";
  const { currency } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              {totalCount} payment{totalCount !== 1 ? "s" : ""}
            </CardTitle>
            <TableDataExport
              filenameBase="payments"
              headers={["Customer", "Sale", "Method", "Details", "Amount", "Date"]}
              rows={payments.map((p) => [
                p.customer?.name || "N/A",
                p.sale?.company_name || "N/A",
                p.method === "card" ? "Card" : "Bank",
                p.method === "card" ? `****${p.card_last_four || ""}` : p.bank_name || "N/A",
                formatCurrency(p.amount, currency),
                formatDate(p.created_at),
              ])}
              disabled={payments.length === 0}
            />
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState title="No payments recorded" description="Payments will appear here once recorded" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Sale</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(payment.created_at)}</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={totalCount}
          pageSize={pageSize}
        />
      </Card>

      {showForm && <PaymentFormDialog open onClose={() => setShowForm(false)} />}
    </div>
  );
}
