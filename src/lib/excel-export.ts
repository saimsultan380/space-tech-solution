/**
 * Lazy-loaded Excel export functionality
 * Only loads the xlsx library when actually exporting
 */

export async function exportToExcel(data: any[], filename: string) {
  // Dynamically import xlsx only when needed
  const XLSX = await import('xlsx');
  
  // Create worksheet from data
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  
  // Write file
  XLSX.writeFile(wb, filename);
}

export async function exportToCSV(data: any[], filename: string) {
  // Dynamically import xlsx only when needed
  const XLSX = await import('xlsx');
  
  // Create worksheet from data
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Convert to CSV
  const csv = XLSX.utils.sheet_to_csv(ws);
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportMultipleSheets(
  sheets: Array<{ name: string; data: any[] }>,
  filename: string
) {
  // Dynamically import xlsx only when needed
  const XLSX = await import('xlsx');
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Add each sheet
  sheets.forEach(sheet => {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });
  
  // Write file
  XLSX.writeFile(wb, filename);
}
