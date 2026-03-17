"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payslip } from "@/lib/types";
import { Download } from "lucide-react";
import Link from "next/link";
import { downloadPayslipPdf } from "@/lib/payslip-pdf";

interface PayslipDashboardCardProps {
  payslips: Payslip[];
  title?: string;
}

export function PayslipDashboardCard({ payslips, title = "Recent Payslips" }: PayslipDashboardCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Link href="/dashboard/payslips" className="text-sm font-medium text-primary hover:underline">
            View All
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {payslips.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No payslips available yet.</p>
        ) : (
          <div className="space-y-3">
            {payslips.map((payslip) => (
              <div
                key={payslip.id}
                className="flex flex-col gap-3 rounded-xl border border-border/50 p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {formatDate(payslip.period_start)} - {formatDate(payslip.period_end)}
                    </p>
                    <Badge variant={payslip.status === "sent" ? "success" : "warning"}>
                      {payslip.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pay date: {formatDate(payslip.pay_date)} &middot; Net pay:{" "}
                    {formatCurrency(Number(payslip.net_pay || 0), payslip.currency)}
                  </p>
                  {payslip.notes && (
                    <p className="max-w-2xl truncate text-sm text-muted-foreground">{payslip.notes}</p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => downloadPayslipPdf(payslip)}>
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
