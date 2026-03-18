"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payslip } from "@/lib/types";
import { Download, Eye } from "lucide-react";
import Link from "next/link";
import { downloadPayslipPdf } from "@/lib/payslip-pdf";
import { useState } from "react";
import { PayslipDetailDialog } from "./payslip-detail-dialog";

interface PayslipDashboardCardProps {
  payslips: Payslip[];
  title?: string;
}

export function PayslipDashboardCard({ payslips, title = "Recent Payslips" }: PayslipDashboardCardProps) {
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);

  return (
    <>
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
                      <Badge variant={payslip.status === "paid" ? "success" : "warning"} className="capitalize">
                        {payslip.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pay date: {formatDate(payslip.pay_date)} &middot; Net pay:{" "}
                      {formatCurrency(Number(payslip.net_pay || 0), payslip.currency)}
                    </p>
                    {payslip.employee_id_display && (
                      <p className="text-xs text-muted-foreground">ID: {payslip.employee_id_display}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setViewingPayslip(payslip)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadPayslipPdf(payslip)}>
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {viewingPayslip && (
        <PayslipDetailDialog
          open={!!viewingPayslip}
          onClose={() => setViewingPayslip(null)}
          payslip={viewingPayslip}
        />
      )}
    </>
  );
}
