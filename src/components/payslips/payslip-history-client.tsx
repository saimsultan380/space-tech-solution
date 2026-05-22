"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/loading";
import type { Payslip } from "@/lib/types";
import { PayslipHistory } from "./payslip-history";
import { ChevronLeft } from "@/components/ui/icons";
import { useRouter } from "next/navigation";

interface Employee {
  id: string;
  full_name: string;
  employee_id?: string | null;
  role: string;
}

interface PayslipHistoryClientProps {
  employees: Employee[];
  allPayslips: Payslip[];
}

export function PayslipHistoryClient({
  employees,
  allPayslips,
}: PayslipHistoryClientProps) {
  const router = useRouter();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const employeeOptions = useMemo(
    () =>
      employees.map((emp) => ({
        value: emp.id,
        label: `${emp.full_name} (${emp.employee_id || "N/A"})`,
      })),
    [employees],
  );

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId),
    [selectedEmployeeId, employees],
  );

  const employeePayslips = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return allPayslips.filter((p) => p.user_id === selectedEmployeeId);
  }, [selectedEmployeeId, allPayslips]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="h-9"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Payslip History
          </h1>
          <p className="text-muted-foreground">
            View complete payslip history of employees by month and year.
          </p>
        </div>
      </div>

      <Card className="border-border p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground">
              Select Employee
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Choose an employee to view their payslip history
            </p>
          </div>
          <Select
            id="employee_select"
            options={employeeOptions}
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            placeholder="Select an employee..."
          />
        </div>
      </Card>

      {selectedEmployeeId && selectedEmployee ? (
        <PayslipHistory
          employeeName={selectedEmployee.full_name}
          employeeId={selectedEmployee.employee_id || "N/A"}
          payslips={employeePayslips}
        />
      ) : (
        <Card className="border-border">
          <EmptyState
            title="No employee selected"
            description="Please select an employee from the dropdown above to view their payslip history."
          />
        </Card>
      )}
    </div>
  );
}
