"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { listMerchantChargeRequests } from "@/lib/actions/merchant-charges";
import { CHARGE_REQUEST_STATUSES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, Spinner } from "@/components/ui/loading";

function statusLabel(status: string) {
  return CHARGE_REQUEST_STATUSES.find((item) => item.value === status)?.label || status;
}

export function MerchantChargesClient() {
  const { currency } = useCurrency();
  const { data = [], isLoading } = useQuery({
    queryKey: ["merchant-charges"],
    queryFn: listMerchantChargeRequests,
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Card charges</h1>
        <p className="text-sm text-muted-foreground">
          Requests assigned to you. Open one to view the card. Starting a charge locks it so it cannot be charged twice.
        </p>
      </div>
      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : data.length === 0 ? (
            <EmptyState title="No charge requests" description="New card sales sent to you will show up here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.customer_name || "—"}</TableCell>
                    <TableCell>{request.company_name || "—"}</TableCell>
                    <TableCell>{formatCurrency(request.charged_amount || 0, currency)}</TableCell>
                    <TableCell>{request.agent_name || "—"}</TableCell>
                    <TableCell>{statusLabel(request.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/merchant-charges/${request.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
