"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { TableLoadingOverlay } from "@/components/ui/table-loading-overlay";
import { CreateUserDialog } from "./create-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { toggleUserStatus, deleteUser } from "@/lib/actions/users";
import { formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import { Search, Trash2 } from "@/components/ui/icons";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedUrlSearchInput } from "@/hooks/use-debounced-url-search-input";

const roleVariant: Record<string, "default" | "secondary" | "outline"> = {
  super_admin: "default",
  sales_agent: "secondary",
  processor: "outline",
};

interface UsersClientProps {
  usersResponse: {
    data: any[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export function UsersClient({ usersResponse }: UsersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { data: users, count, page, totalPages, pageSize } = usersResponse;

  const [showCreate, setShowCreate] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const { inputRef, inputValue: searchInput, onInputChange, urlValue: urlSearch } =
    useDebouncedUrlSearchInput(searchParams, updateFilters);

  const handleToggle = async (id: string, current: boolean) => {
    setTogglingId(id);
    try {
      await toggleUserStatus(id, !current);
    } catch {
      // error
    }
    setTogglingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this user?")) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteUser(id);
    } catch {
      // error
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage team members and roles</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Add User</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 w-full flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Search users..."
                  value={searchInput}
                  onChange={(e) => onInputChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              <CardTitle className="text-sm text-muted-foreground sm:shrink-0 sm:whitespace-nowrap">
                {count} user{count !== 1 ? "s" : ""}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <TableLoadingOverlay isLoading={isPending} />
          {users.length === 0 ? (
            <EmptyState
              title="No users found"
              description={urlSearch ? "Try adjusting your search" : "Add your first team member to get started"}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{user.full_name}</span>
                          <span className="text-[11px] text-muted-foreground">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.employee_id || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={roleVariant[user.role] || "outline"} className="capitalize">
                          {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleToggle(user.id, user.is_active)}
                          disabled={togglingId === user.id}
                          title={user.is_active ? "Click to deactivate user" : "Click to activate user"}
                          className="inline-flex items-center gap-2 disabled:opacity-50"
                        >
                          <Badge
                            variant={user.is_active ? "success" : "destructive"}
                            className={
                              user.is_active
                                ? "border border-success/40 bg-success/10 text-success"
                                : "border border-destructive/40 bg-destructive/10 text-destructive"
                            }
                          >
                            {togglingId === user.id ? (
                              <span className="inline-flex items-center gap-2">
                                <Spinner />
                                Updating…
                              </span>
                            ) : user.is_active ? (
                              "Active"
                            ) : (
                              "Inactive"
                            )}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground hidden sm:inline">
                            {user.is_active ? "Deactivate" : "Activate"}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EditUserDialog user={user} />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(user.id)}
                            disabled={deletingId === user.id}
                          >
                            {deletingId === user.id ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
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

      {showCreate && <CreateUserDialog open onClose={() => setShowCreate(false)} />}
    </div>
  );
}
