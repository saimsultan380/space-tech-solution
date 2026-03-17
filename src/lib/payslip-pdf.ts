import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payslip } from "@/lib/types";

export function downloadPayslipPdf(payslip: Payslip) {
  const doc = new jsPDF();
  const employeeName = payslip.user?.full_name || "Employee";
  const roleLabel =
    payslip.user?.role === "sales_agent"
      ? "Sales Agent"
      : payslip.user?.role === "processor"
        ? "Processor"
        : payslip.user?.role || "-";

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Space Tech Solution", 14, 12);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Salary Payslip", 14, 19);

  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Employee Information", 14, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(`Name: ${employeeName}`, 14, 46);
  doc.text(`Role: ${roleLabel}`, 14, 52);
  doc.text(`Period: ${formatDate(payslip.period_start)} - ${formatDate(payslip.period_end)}`, 14, 58);
  doc.text(`Pay Date: ${formatDate(payslip.pay_date)}`, 14, 64);
  doc.text(`Status: ${payslip.status.toUpperCase()}`, 14, 70);

  const currency = payslip.currency || "PKR";
  const salaryRows = [
    ["Basic Salary", formatCurrency(Number(payslip.basic_salary || 0), currency)],
    ["Allowances", formatCurrency(Number(payslip.allowances || 0), currency)],
    ["Bonus", formatCurrency(Number(payslip.bonus || 0), currency)],
    ["Deductions", formatCurrency(Number(payslip.deductions || 0), currency)],
  ];

  doc.setFont("helvetica", "bold");
  doc.text("Salary Breakdown", 14, 84);

  let y = 92;
  salaryRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.text(label, 16, y);
    doc.text(value, 160, y, { align: "right" });
    y += 8;
  });

  doc.setDrawColor(229, 231, 235);
  doc.line(14, y, 196, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Net Pay", 16, y);
  doc.text(formatCurrency(Number(payslip.net_pay || 0), currency), 160, y, { align: "right" });
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Notes", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const notes = payslip.notes?.trim() || "No notes";
  const wrapped = doc.splitTextToSize(notes, 180);
  doc.text(wrapped, 14, y);

  const filename = `payslip-${employeeName.replace(/\s+/g, "-").toLowerCase()}-${payslip.pay_date}.pdf`;
  doc.save(filename);
}
