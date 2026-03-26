"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";
import type { Leave, UserRole } from "@/lib/types";
import { LeaveFormDialog } from "./leave-form-dialog";
import { CalendarDays, Bot } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";

interface MyLeavesClientProps {
  leavesResponse: {
    data: Leave[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  userRole: UserRole;
}

const statusVariant: Record<string, "default" | "success" | "destructive" | "warning"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

export function MyLeavesClient({ leavesResponse, userRole }: MyLeavesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: leaves, count, page, totalPages, pageSize } = leavesResponse;

  const [showForm, setShowForm] = useState(false);

  const updateFilters = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "all" || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    if (!updates.page) {
      params.delete("page");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const title = userRole === "sales_agent" ? "My Leaves" : "Leave Requests";
  const subtitle =
    userRole === "sales_agent"
      ? "Apply for leave and track your requests"
      : "Apply for leave and view your request history";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <CalendarDays className="mr-2 h-4 w-4" />
          Apply Leave
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {count} request{count !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaves.length === 0 ? (
            <EmptyState
              title="No leave requests yet"
              description="Click “Apply Leave” to submit your first leave request."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dates</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Approver Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>
                        {formatDate(leave.start_date)}
                        {leave.end_date && leave.end_date !== leave.start_date
                          ? ` - ${formatDate(leave.end_date)}`
                          : ""}
                      </TableCell>
                      <TableCell className="capitalize">{leave.type}</TableCell>
                      <TableCell>
                        {leave.source === "auto" ? (
                          <Badge variant="secondary" className="gap-1">
                            <Bot className="h-3 w-3" />
                            Auto
                          </Badge>
                        ) : (
                          <Badge variant="outline">Manual</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate" title={leave.reason}>
                        {leave.reason}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[leave.status] || "default"} className="capitalize">
                          {leave.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(leave.created_at)}</TableCell>
                      <TableCell className="max-w-[200px] truncate italic text-muted-foreground">
                        {leave.approver_notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => updateFilters({ page: p })}
            totalItems={count}
            pageSize={pageSize}
          />
        </CardContent>
      </Card>

      {showForm && <LeaveFormDialog open onClose={() => setShowForm(false)} />}
    </div>
  );
}

