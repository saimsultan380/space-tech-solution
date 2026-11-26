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

export async function generateSalesReportPDF(options: {
  title?: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  filename: string;
}) {
  const { default: jsPDF } = await import("jspdf");

  // Landscape A4: 297mm x 210mm
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 10;
  const marginY = 12;

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(options.title || "Sales Report", marginX, marginY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  const sub =
    options.subtitle ||
    `Generated on ${new Date().toLocaleDateString()} | Total records: ${options.rows.length}`;
  doc.text(sub, marginX, marginY + 9);

  // Column definitions for landscape
  const numCols = options.headers.length;
  const availableWidth = pageWidth - marginX * 2; // 277mm

  // Standard sales headers: Date (20), Customer (32), Phone (22), Company (32), Type (20), Amount (16), Charged (16), CB Status (22), Agent (30), Status (18)
  const colWidths: number[] = [];
  if (numCols === 10) {
    colWidths.push(20, 35, 24, 35, 20, 18, 18, 25, 34, 28);
  } else {
    const w = availableWidth / numCols;
    for (let i = 0; i < numCols; i++) colWidths.push(w);
  }

  let y = marginY + 14;
  const rowHeight = 6.2;

  const renderTableHeader = () => {
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(marginX, y, availableWidth, rowHeight + 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let curX = marginX + 1.5;
    options.headers.forEach((h, idx) => {
      const colW = colWidths[idx] || 25;
      doc.text(h, curX, y + 4.8);
      curX += colW;
    });

    y += rowHeight + 1;
  };

  renderTableHeader();

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  options.rows.forEach((row, rowIdx) => {
    if (y + rowHeight > pageHeight - marginY - 6) {
      doc.addPage();
      y = marginY + 4;
      renderTableHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
    }

    if (rowIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252); // slate-50 alternating
      doc.rect(marginX, y, availableWidth, rowHeight, "F");
    }

    // Grid bottom line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.1);
    doc.line(marginX, y + rowHeight, marginX + availableWidth, y + rowHeight);

    doc.setTextColor(51, 65, 85); // slate-700
    let curX = marginX + 1.5;
    row.forEach((cell, idx) => {
      const colW = colWidths[idx] || 25;
      const text = String(cell ?? "—");
      const truncated = doc.splitTextToSize(text, colW - 3)[0] || text;
      doc.text(truncated, curX, y + 4.3);
      curX += colW;
    });

    y += rowHeight;
  });

  // Page numbering
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - marginX - 16,
      pageHeight - 5,
    );
  }

  doc.save(options.filename);
}
