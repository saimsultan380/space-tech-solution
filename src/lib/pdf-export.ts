/**
 * Lazy-loaded PDF export functionality
 * Only loads the jspdf library when actually generating PDFs
 */

export async function generatePDF(options: {
  title: string;
  content: string;
  filename: string;
}) {
  // Dynamically import jspdf only when needed
  const { default: jsPDF } = await import('jspdf');
  
  // Create new PDF document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(options.title, 20, 20);
  
  // Add content
  doc.setFontSize(12);
  const lines = doc.splitTextToSize(options.content, 170);
  doc.text(lines, 20, 40);
  
  // Save PDF
  doc.save(options.filename);
}

export async function generateTablePDF(options: {
  title: string;
  headers: string[];
  rows: string[][];
  filename: string;
}) {
  // Dynamically import jspdf only when needed
  const { default: jsPDF } = await import('jspdf');
  
  // Create new PDF document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(options.title, 20, 20);
  
  // Add table (simple implementation)
  doc.setFontSize(10);
  let y = 40;
  
  // Headers
  doc.setFont('helvetica', 'bold');
  doc.text(options.headers.join(' | '), 20, y);
  y += 10;
  
  // Rows
  doc.setFont('helvetica', 'normal');
  options.rows.forEach(row => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(row.join(' | '), 20, y);
    y += 7;
  });
  
  // Save PDF
  doc.save(options.filename);
}

export async function generatePayslipPDF(payslip: {
  employeeName: string;
  period: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  filename: string;
}) {
  // Dynamically import jspdf only when needed
  const { default: jsPDF } = await import('jspdf');
  
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text('Payslip', 105, 20, { align: 'center' });
  
  // Employee details
  doc.setFontSize(12);
  doc.text(`Employee: ${payslip.employeeName}`, 20, 40);
  doc.text(`Period: ${payslip.period}`, 20, 50);
  
  // Salary breakdown
  doc.text('Salary Breakdown:', 20, 70);
  doc.setFontSize(10);
  doc.text(`Basic Salary: $${payslip.basicSalary.toFixed(2)}`, 30, 80);
  doc.text(`Allowances: $${payslip.allowances.toFixed(2)}`, 30, 90);
  doc.text(`Deductions: -$${payslip.deductions.toFixed(2)}`, 30, 100);
  
  // Net pay
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Net Pay: $${payslip.netPay.toFixed(2)}`, 30, 120);
  
  // Save
  doc.save(payslip.filename);
}
