import * as XLSX from "xlsx";

export type TableExportCell = string | number | boolean | null | undefined;

function cellToString(v: TableExportCell): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsvContent(headers: string[], rows: TableExportCell[][]): string {
  const lines = [
    headers.map((h) => escapeCsvCell(h)).join(","),
    ...rows.map((row) => row.map((c) => escapeCsvCell(cellToString(c))).join(",")),
  ];
  return lines.join("\r\n");
}

function triggerDownload(blob: Blob, filename: string) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadTableCsv(
  headers: string[],
  rows: TableExportCell[][],
  filenameBase: string,
) {
  const csv = buildCsvContent(headers, rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filenameBase}.csv`);
}

export function downloadTableXlsx(
  headers: string[],
  rows: TableExportCell[][],
  filenameBase: string,
) {
  const aoa: string[][] = [
    headers,
    ...rows.map((r) => r.map((c) => cellToString(c))),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filenameBase}.xlsx`);
}
