"use client";

import { useState } from "react";
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
import { CustomerFormDialog } from "./customer-form-dialog";
import { DeleteCustomerButton } from "./delete-customer-button";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

interface CustomersClientProps {
  customers: Array<{
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    dob: string;
    cnic: string;
    account_no: string;
    created_at: string;
    created_by_user: { full_name: string } | null;
  }>;
  userRole: UserRole;
}

export function CustomersClient({ customers, userRole }: CustomersClientProps) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const canEdit = userRole === "super_admin" || userRole === "sales_agent";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <CardTitle className="text-sm text-muted-foreground whitespace-nowrap">
              {filtered.length} customer{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              title="No customers found"
              description={search ? "Try adjusting your search" : "Add your first customer to get started"}
              action={
                canEdit && !search ? (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4" /> Add Customer
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>CNIC</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Created</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        className="font-medium hover:underline"
                      >
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.cnic || "-"}</TableCell>
                    <TableCell>{customer.dob ? formatDate(customer.dob) : "-"}</TableCell>
                    <TableCell>{formatDate(customer.created_at)}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <CustomerFormDialog customer={customer} />
                          <DeleteCustomerButton id={customer.id} name={customer.name} />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showForm && <CustomerFormDialog open onClose={() => setShowForm(false)} />}
    </div>
  );
}
