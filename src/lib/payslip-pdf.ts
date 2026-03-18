import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payslip } from "@/lib/types";

export function downloadPayslipPdf(payslip: Payslip) {
  const doc = new jsPDF();
  const employeeName = payslip.user?.full_name || "Employee";
  const currency = payslip.currency || "PKR";

  // --- Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(23, 37, 84); // Navy blue
  doc.text("SPACE TECH", 30, 18);
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("Sector J Dha Phase 1, Lahore", 30, 24);
  doc.text("contact@spacetechsolution.com", 30, 28);

  // Logo Icon (Circle with ST)
  doc.setDrawColor(23, 37, 84);
  doc.setLineWidth(0.5);
  doc.circle(20, 22, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ST", 20, 23, { align: "center" });

  // --- Title Section ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Spacetech", 105, 45, { align: "center" });
  doc.setFontSize(12);
  doc.text(payslip.department || "Sales Department", 105, 52, { align: "center" });
  doc.text("Salary Slip", 105, 59, { align: "center" });

  // --- Salary Month ---
  const [year, month] = (payslip.period_start || "").split("-");
  const monthName = month ? new Date(0, Number(month) - 1).toLocaleString('en-US', { month: 'long' }) : "Month";
  doc.setFontSize(11);
  doc.text(`Salary Months: ${monthName} -${year || "2026"}`, 14, 75);

  // --- Employee Info Table ---
  doc.setLineWidth(0.4);
  doc.setDrawColor(0);
  
  let currentY = 82;
  const rowHeight = 9;
  const colWidths = [45, 46, 45, 46];

  const empRows = [
    ["Employee ID", payslip.employee_id_display || "-", "Employee Joining Date", payslip.joining_date || "-"],
    ["Category", payslip.category || "Permanent", "Department", payslip.department || "-"],
    ["Name", employeeName, "Job Position", payslip.job_position || "-"],
    ["Father Name", payslip.father_name || "-", "Pay Days", String(payslip.pay_days || "30")],
    ["CNIC No", payslip.cnic_no || "-", "Pay Rate", formatCurrency(Number(payslip.pay_rate || 0), currency)],
    ["Address", payslip.address || "-", "Gross Pay", formatCurrency(Number(payslip.gross_pay || 0), currency)],
  ];

  empRows.forEach((row) => {
    let currentX = 14;
    row.forEach((cell, i) => {
      doc.rect(currentX, currentY, colWidths[i], rowHeight);
      doc.setFont("helvetica", i % 2 === 0 ? "bold" : "normal");
      doc.setFontSize(9);
      
      // Handle multiline for address
      if (row[0] === "Address" && i === 1) {
        const wrapped = doc.splitTextToSize(String(cell), colWidths[i] - 4);
        doc.text(wrapped, currentX + 2, currentY + 4);
      } else {
        doc.text(String(cell), currentX + 2, currentY + 6);
      }
      currentX += colWidths[i];
    });
    currentY += rowHeight;
  });

  // --- Revenue Table ---
  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.rect(14, currentY, 60.6, 9);
  doc.rect(74.6, currentY, 60.6, 9);
  doc.rect(135.2, currentY, 60.8, 9);
  doc.text("Monthly Revenue", 44.3, currentY + 6, { align: "center" });
  doc.text("Chargeback Amount", 104.9, currentY + 6, { align: "center" });
  doc.text("Remaining", 165.6, currentY + 6, { align: "center" });
  
  currentY += 9;
  doc.rect(14, currentY, 60.6, 9);
  doc.rect(74.6, currentY, 60.6, 9);
  doc.rect(135.2, currentY, 60.8, 9);
  doc.setFont("helvetica", "normal");
  doc.text(`${payslip.monthly_revenue || 0}$`, 44.3, currentY + 6, { align: "center" });
  doc.text(`${payslip.chargeback_amount || 0}$`, 104.9, currentY + 6, { align: "center" });
  doc.text(`${payslip.remaining || 0}$`, 165.6, currentY + 6, { align: "center" });
  currentY += 9;

  // --- Earnings & Deductions Table ---
  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.rect(14, currentY, 91, 9);
  doc.rect(105, currentY, 91, 9);
  doc.text("Pay and Allowances", 59.5, currentY + 6, { align: "center" });
  doc.text("Deductions", 150.5, currentY + 6, { align: "center" });
  currentY += 9;

  const totalAllowances = Number(payslip.basic_salary || 0) + Number(payslip.commission || 0) + Number(payslip.advance || 0);
  const breakRows = [
    [`Basic Salary = ${formatCurrency(Number(payslip.basic_salary || 0), currency)}`, `Late Attendance = ${payslip.late_attendance || 0}`],
    [`Commission = ${formatCurrency(Number(payslip.commission || 0), currency)}`, `Leaves = ${payslip.leaves || 0}`],
    [`Advance = ${formatCurrency(Number(payslip.advance || 0), currency)}`, `Deductions = ${formatCurrency(Number(payslip.deductions || 0), currency)}`],
    [`Total Pay and Allowances = ${formatCurrency(totalAllowances, currency)}`, `Net Pay = ${formatCurrency(Number(payslip.net_pay || 0), currency)}`],
  ];

  breakRows.forEach((row, idx) => {
    doc.rect(14, currentY, 91, 9);
    doc.rect(105, currentY, 91, 9);
    doc.setFont("helvetica", idx === breakRows.length - 1 ? "bold" : "normal");
    doc.text(row[0], 59.5, currentY + 6, { align: "center" });
    doc.text(row[1], 150.5, currentY + 6, { align: "center" });
    currentY += 9;
  });

  // --- Net Pay Summary ---
  currentY += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Net Pay: ${formatCurrency(Number(payslip.net_pay || 0), currency)}`, 196, currentY, { align: "right" });
  currentY += 12;

  // --- Payment Info ---
  doc.setFontSize(10);
  doc.text("Paid Through", 14, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${payslip.paid_through || "Bank"}`, 60, currentY);
  currentY += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Employee's Bank Account", 14, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${payslip.bank_account_no || "-"}`, 60, currentY);
  currentY += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Bank Branch", 14, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${payslip.bank_branch || "-"}`, 60, currentY);
  currentY += 20;

  // --- Footer ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("This is a system-generated salary slip and does not require a signature.", 105, currentY, { align: "center" });

  const filename = `payslip-${employeeName.replace(/\s+/g, "-").toLowerCase()}-${payslip.pay_date}.pdf`;
  doc.save(filename);
}
