"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { TableLoadingOverlay } from "@/components/ui/table-loading-overlay";
import { CustomerFormDialog } from "./customer-form-dialog";
import { DeleteCustomerButton } from "./delete-customer-button";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { Plus, Search, Eye } from "lucide-react";
import Link from "next/link";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface CustomersClientProps {
  customersResponse: {
    data: any[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  userRole: UserRole;
}

export function CustomersClient({ customersResponse, userRole }: CustomersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);

  const { data: customers, count, page, totalPages, pageSize } = customersResponse;

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
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const search = searchParams.get("q") || "";

  const canEdit = userRole === "super_admin" || userRole === "sales_agent";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Call Logs Responses</h1>
          <p className="text-muted-foreground">Manage your call logs responses database</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Add Call Log Response
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search call logs responses..."
                value={search}
                onChange={(e) => updateFilters({ q: e.target.value })}
                className="pl-10"
              />
            </div>
            <CardTitle className="text-sm text-muted-foreground whitespace-nowrap">
              {count} call log response{count !== 1 ? "s" : ""}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <TableLoadingOverlay isLoading={isPending} />
          {customers.length === 0 ? (
            <EmptyState
              title="No call logs responses found"
              description={search ? "Try adjusting your search" : "Add your first call log response to get started"}
              action={
                canEdit && !search ? (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4" /> Add Call Log Response
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Recent Note</TableHead>
                    <TableHead>Created</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/call-logs-responses/${customer.id}`}
                          className="font-medium hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.dob ? formatDate(customer.dob) : "-"}</TableCell>
                      <TableCell>
                        {customer.recent_note ? (
                          <span
                            className="block max-w-[340px] truncate text-sm text-muted-foreground"
                            title={customer.recent_note}
                          >
                            {customer.recent_note}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(customer.created_at)}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/dashboard/call-logs-responses/${customer.id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <CustomerFormDialog customer={customer} />
                            <DeleteCustomerButton id={customer.id} name={customer.name} />
                          </div>
                        </TableCell>
                      )}
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

      {showForm && <CustomerFormDialog open onClose={() => setShowForm(false)} />}
    </div>
  );
}
