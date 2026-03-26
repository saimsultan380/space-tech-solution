"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { formatDate, formatDateTime } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole, Leave } from "@/lib/types";
import { Clock, CalendarDays, Users, TrendingUp, ListFilter, Download, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";

interface AttendanceRecord {
  id: string;
  check_in: string;
  check_out: string | null;
  date: string;
  user: { id: string; full_name: string; role: string } | null;
}

type DailyRow = AttendanceRecord & {
  isLeaveOnly?: boolean;
  leaveStatus?: "approved" | "rejected";
  leaveSource?: "manual" | "auto";
};

interface MonthlySummary {
  userId: string;
  name: string;
  role: string;
  daysPresent: number;
  workingDays: number;
  totalHours: number;
  avgHoursPerDay: number;
  attendanceRate: number;
}

interface AttendanceClientProps {
  attendanceResponse: {
    data: AttendanceRecord[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  users: Array<{ id: string; full_name: string; role: string }>;
  userRole: UserRole;
  monthlySummary: MonthlySummary[];
  leaves: Leave[];
  initialMonth?: string | null;
}

export function AttendanceClient({
  attendanceResponse,
  users,
  userRole,
  monthlySummary,
  leaves,
  initialMonth,
}: AttendanceClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: attendance, count, page, totalPages, pageSize } = attendanceResponse;

  const [activeTab, setActiveTab] = useState("daily");
  
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

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthParam = searchParams.get("month") ?? currentMonth;
  const roleFilter = (searchParams.get("role") as any) || "all";
  const selectedEmployeeId = searchParams.get("user_id") || "all";

  const handleMonthChange = (value: string) => {
    if (!value) return;
    updateFilters({ month: value });
  };

  const monthStart = `${monthParam}-01`;
  const monthEndDate = new Date(monthParam + "-01");
  monthEndDate.setMonth(monthEndDate.getMonth() + 1);
  const monthEnd = monthEndDate.toISOString().split("T")[0];

  const attendanceSet = new Set(
    attendance.map((a) => `${a.user?.id ?? ""}-${a.date}`)
  );

  const leaveOnlyRows: DailyRow[] = [];
  leaves.forEach((leave) => {
    if ((leave.status !== "approved" && leave.status !== "rejected") || !leave.user)
      return;
    const start = leave.start_date;
    const end = leave.end_date || leave.start_date;
    for (let d = new Date(start); ; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      if (dateStr >= monthEnd || dateStr > end) break;
      if (dateStr < monthStart) continue;
      const key = `${leave.user_id}-${dateStr}`;
      if (!attendanceSet.has(key)) {
        leaveOnlyRows.push({
          id: `leave-${leave.id}-${dateStr}`,
          check_in: "",
          check_out: null,
          date: dateStr,
          user: leave.user as { id: string; full_name: string; role: string },
          isLeaveOnly: true,
          leaveStatus: leave.status,
          leaveSource: leave.source || "manual",
        });
      }
    }
  });

  const allDailyRows: DailyRow[] = [
    ...attendance.map((a) => ({ ...a, isLeaveOnly: false })),
    ...leaveOnlyRows,
  ].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  const filtered = allDailyRows.filter((a) => {
    const matchesUser =
      selectedEmployeeId === "all" ? true : a.user?.id === selectedEmployeeId;
    const matchesRole =
      userRole !== "super_admin" ||
      roleFilter === "all" ||
      (a.user?.role as UserRole | undefined) === roleFilter;
    return matchesUser && matchesRole;
  });

  const isOnLeave = (userId: string | undefined, date: string) => {
    if (!userId) return false;
    return leaves.some((leave) => {
      if (leave.status !== "approved" || leave.user_id !== userId) return false;
      const start = leave.start_date;
      const end = leave.end_date || leave.start_date;
      return start <= date && date <= end;
    });
  };


  const today = new Date().toISOString().split("T")[0];

  const calculateHours = (checkIn: string, checkOut: string | null, date: string) => {
    if (!checkOut) {
      return date === today ? "In progress" : "—";
    }
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const getAttendanceStatus = (record: DailyRow) => {
    const isToday = record.date === today;
    
    if (record.leaveStatus === "rejected") {
      return { label: "Leave Rejected", variant: "destructive" as const };
    }
    
    if (record.isLeaveOnly) {
      if (record.leaveSource === "auto") {
        return { label: "Auto Absent", variant: "secondary" as const, showBot: true };
      }
      return { label: "On Leave", variant: "secondary" as const };
    }
    
    if (isOnLeave(record.user?.id, record.date)) {
      return { label: "On Leave", variant: "secondary" as const };
    }
    
    if (record.check_out) {
      return { label: "Completed", variant: "success" as const };
    }
    
    if (isToday) {
      return { label: "Active", variant: "warning" as const };
    }
    
    return { label: "Missed Checkout", variant: "destructive" as const };
  };

  const countLeaveDaysInMonth = (
    userId: string,
    status: "approved" | "rejected"
  ) => {
    let count = 0;
    leaves.forEach((leave) => {
      if (leave.status !== status || leave.user_id !== userId) return;
      const start = leave.start_date;
      const end = leave.end_date || leave.start_date;
      for (let d = new Date(start); ; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        if (dateStr >= monthEnd || dateStr > end) break;
        if (dateStr >= monthStart) count++;
      }
    });
    return count;
  };

  const filteredSummary = monthlySummary.filter((s) => {
    const matchesUser =
      selectedEmployeeId === "all" ? true : s.userId === selectedEmployeeId;
    const matchesRole =
      userRole !== "super_admin" ||
      roleFilter === "all" ||
      (s.role as UserRole | undefined) === roleFilter;
    return matchesUser && matchesRole;
  });

  const roleSummary = monthlySummary.reduce<
    Record<
      string,
      {
        employees: number;
        avgAttendanceRate: number;
        totalHours: number;
      }
    >
  >((acc, item) => {
    const key = item.role;
    if (!acc[key]) {
      acc[key] = { employees: 0, avgAttendanceRate: 0, totalHours: 0 };
    }
    acc[key].employees += 1;
    acc[key].avgAttendanceRate += item.attendanceRate;
    acc[key].totalHours += item.totalHours;
    return acc;
  }, {});

  const selectedEmployeeSummary =
    selectedEmployeeId === "all"
      ? null
      : monthlySummary.find((m) => m.userId === selectedEmployeeId) || null;

  const handleDownloadSheet = () => {
    const headers = [
      "Employee",
      "Role",
      "Days Present",
      "Working Days",
      "Attendance %",
      "Total Hours",
      "Avg Hours/Day",
    ];
    const rows = filteredSummary.map((emp) => [
      emp.name,
      ROLE_LABELS[emp.role] || emp.role,
      String(emp.daysPresent),
      String(emp.workingDays),
      `${emp.attendanceRate}%`,
      `${emp.totalHours}`,
      String(emp.avgHoursPerDay),
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `attendance-report-${monthParam}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track employee check-ins and work hours</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {monthlySummary.length} employees tracked
        </div>
      </div>

      {userRole === "super_admin" && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-3">
          {Object.entries(roleSummary).map(([role, stats]) => {
            const label = ROLE_LABELS[role] || role;
            const avgRate =
              stats.employees > 0 ? Math.round((stats.avgAttendanceRate / stats.employees) * 10) / 10 : 0;
            const isActiveRole = roleFilter === role;

            const handleRoleClick = () => {
              if (isActiveRole) {
                updateFilters({ role: "all" });
              } else {
                updateFilters({ role, user_id: "all" });
              }
            };

            return (
              <button
                key={role}
                type="button"
                onClick={handleRoleClick}
                className="text-left"
              >
                <Card
                  className={`relative overflow-hidden border bg-card shadow-sm transition-all ${
                    isActiveRole ? "border-primary ring-1 ring-primary/40 scale-[1.01]" : "border-border"
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_55%)]" />
                  <CardContent className="relative py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {label}
                        </p>
                        <p className="mt-1 text-xl font-bold">
                          {stats.employees} employee{stats.employees !== 1 ? "s" : ""}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {Math.round(stats.totalHours)} total hours logged this month
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {avgRate}% avg attendance
                </span>
                        <span className="text-[11px] text-muted-foreground">
                          {stats.employees > 0
                            ? isActiveRole
                              ? "Showing this role below"
                              : "Click to filter by role"
                            : "No activity yet"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {selectedEmployeeSummary && (
        <Card className="border border-primary/30 bg-primary/5 shadow-sm">
          <CardContent className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Selected Employee
              </p>
              <p className="text-lg font-bold">{selectedEmployeeSummary.name}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABELS[selectedEmployeeSummary.role] || selectedEmployeeSummary.role}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Days Present</p>
                <p className="font-semibold">{selectedEmployeeSummary.daysPresent}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Attendance</p>
                <p className="font-semibold">{selectedEmployeeSummary.attendanceRate}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="font-semibold">{selectedEmployeeSummary.totalHours}h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Hours / Day</p>
                <p className="font-semibold">{selectedEmployeeSummary.avgHoursPerDay}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="daily">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="daily" onClick={() => setActiveTab("daily")}>
              <Clock className="mr-1.5 h-3.5 w-3.5" /> Daily Log
            </TabsTrigger>
            <TabsTrigger value="monthly" onClick={() => setActiveTab("monthly")}>
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Monthly Summary
            </TabsTrigger>
          </TabsList>

          {userRole === "super_admin" && (
            <div className="flex flex-row items-center gap-2">
              <Select
                containerClassName="w-fit"
                className="w-auto"
                options={[
                  { value: "all", label: "All Roles" },
                  { value: "super_admin", label: "Super Admin" },
                  { value: "sales_agent", label: "Sales Agent" },
                  { value: "processor", label: "Processor" },
                ]}
                value={roleFilter}
                onChange={(e) =>
                  updateFilters({ role: e.target.value })
                }
              />
              <Select
                containerClassName="w-fit"
                className="w-auto"
                options={[
                  { value: "all", label: "All Employees" },
                  ...users.map((u) => ({ value: u.id, label: u.full_name })),
                ]}
                value={selectedEmployeeId}
                onChange={(e) => {
                  updateFilters({ user_id: e.target.value });
                }}
              />
              {(roleFilter !== "all" || selectedEmployeeId !== "all") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateFilters({ role: "all", user_id: "all" });
                  }}
                  className="shrink-0"
                >
                  <ListFilter className="mr-1.5 h-3.5 w-3.5" />
                  Show all
                </Button>
              )}
            </div>
          )}
        </div>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3 sm:mr-4">
                  <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Month
                  </label>
                  <Input
                    type="month"
                    value={monthParam}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <CardTitle className="ml-auto text-sm text-muted-foreground">
                  {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <EmptyState title="No attendance records" description="Records will appear here" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((record) => {
                      const leaveOnly = record.isLeaveOnly === true;
                      return (
                  <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.user?.full_name || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {ROLE_LABELS[record.user?.role || ""] || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell>
                          {leaveOnly ? "-" : formatDateTime(record.check_in)}
                        </TableCell>
                        <TableCell>
                          {leaveOnly
                            ? "-"
                            : record.check_out
                              ? formatDateTime(record.check_out)
                              : "-"}
                        </TableCell>
                        <TableCell>
                          {leaveOnly
                            ? "—"
                            : calculateHours(record.check_in, record.check_out, record.date)}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const status = getAttendanceStatus(record);
                            return (
                              <Badge variant={status.variant} className={status.showBot ? "gap-1" : ""}>
                                {status.showBot && <Bot className="h-3 w-3" />}
                                {status.label}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
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
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Monthly Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSummary.length === 0 ? (
                <EmptyState
                  title="No attendance data"
                  description="Employee attendance data will appear here"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Days Present</TableHead>
                      <TableHead>Days on Leave</TableHead>
                      <TableHead>Days Rejected</TableHead>
                      <TableHead>Working Days</TableHead>
                      <TableHead>Attendance %</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Avg Hours/Day</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSummary.map((emp) => (
                      <TableRow key={emp.userId}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{ROLE_LABELS[emp.role] || emp.role}</Badge>
                        </TableCell>
                        <TableCell>{emp.daysPresent}</TableCell>
                        <TableCell>
                          {countLeaveDaysInMonth(emp.userId, "approved")}
                        </TableCell>
                        <TableCell>
                          {countLeaveDaysInMonth(emp.userId, "rejected")}
                        </TableCell>
                        <TableCell>{emp.workingDays}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              emp.attendanceRate >= 80
                                ? "success"
                                : emp.attendanceRate >= 60
                                ? "warning"
                                : "destructive"
                            }
                          >
                            {emp.attendanceRate}%
                          </Badge>
                        </TableCell>
                        <TableCell>{emp.totalHours}h</TableCell>
                        <TableCell>{emp.avgHoursPerDay}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
