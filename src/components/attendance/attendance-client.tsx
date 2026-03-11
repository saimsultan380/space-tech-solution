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
import type { UserRole } from "@/lib/types";
import { Clock, CalendarDays, Users, TrendingUp } from "lucide-react";

interface AttendanceRecord {
  id: string;
  check_in: string;
  check_out: string | null;
  date: string;
  user: { id: string; full_name: string; role: string } | null;
}

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
  attendance: AttendanceRecord[];
  users: Array<{ id: string; full_name: string; role: string }>;
  userRole: UserRole;
  monthlySummary: MonthlySummary[];
}

export function AttendanceClient({
  attendance,
  users,
  userRole,
  monthlySummary,
}: AttendanceClientProps) {
  const [dateFilter, setDateFilter] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("daily");
  const [roleFilter, setRoleFilter] = useState<"all" | "super_admin" | "sales_agent" | "processor">("all");

  const filtered = attendance.filter((a) => {
    const matchesDate = !dateFilter || a.date === dateFilter;
    const matchesUser = userFilter === "all" || a.user?.id === userFilter;
    const matchesRole =
      userRole !== "super_admin" ||
      roleFilter === "all" ||
      (a.user?.role as UserRole | undefined) === roleFilter;
    return matchesDate && matchesUser && matchesRole;
  });

  const calculateHours = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "In progress";
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const filteredSummary = monthlySummary.filter((s) => {
    const matchesUser = userFilter === "all" || s.userId === userFilter;
    const matchesRole =
      userRole !== "super_admin" ||
      roleFilter === "all" ||
      (s.role as UserRole | undefined) === roleFilter;
    return matchesUser && matchesRole;
  });

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
            <div className="flex items-center gap-2">
              <Select
                options={[
                  { value: "all", label: "All Roles" },
                  { value: "super_admin", label: "Super Admin" },
                  { value: "sales_agent", label: "Sales Agent" },
                  { value: "processor", label: "Processor" },
                ]}
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value as "all" | "super_admin" | "sales_agent" | "processor")
                }
              />
              <Select
                options={[
                  { value: "all", label: "All Employees" },
                  ...users.map((u) => ({ value: u.id, label: u.full_name })),
                ]}
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
            </div>
          )}
        </div>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-auto"
                />
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
                    {filtered.map((record) => (
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
                        <TableCell>{formatDateTime(record.check_in)}</TableCell>
                        <TableCell>
                          {record.check_out ? formatDateTime(record.check_out) : "-"}
                        </TableCell>
                        <TableCell>{calculateHours(record.check_in, record.check_out)}</TableCell>
                        <TableCell>
                          <Badge variant={record.check_out ? "success" : "warning"}>
                            {record.check_out ? "Completed" : "Active"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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
