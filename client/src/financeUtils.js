import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

export const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  return [];
};

export const numeric = (value) => {
  const parsed = Number(String(value ?? 0).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const idr = (value, withSymbol = true) => {
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(numeric(value));
  return withSymbol ? `Rp ${formatted}` : formatted;
};

export const idrCompact = (value) => {
  const amount = numeric(value);
  const abs = Math.abs(amount);
  if (abs >= 1e9) return `${(amount / 1e9).toFixed(2)} M`;
  if (abs >= 1e6) return `${(amount / 1e6).toFixed(2)} Jt`;
  if (abs >= 1e3) return `${(amount / 1e3).toFixed(1)} Rb`;
  return idr(amount);
};

export const dateLabel = (value) => {
  if (!value) return '-';
  const date = new Date(String(value).length <= 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

export const dateTimeLabel = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
};

export const monthOptions = () => {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return months.map((label, index) => ({ value: index + 1, label }));
};

export const periodOptions = () => {
  const now = new Date();
  const options = [];
  for (let offset = 0; offset < 12; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value, label: monthOptions()[date.getMonth()].label + ' ' + date.getFullYear() });
  }
  return options;
};

export const statusClass = (status) => {
  const value = String(status || '').toLowerCase();
  if (['posted', 'paid', 'approved', 'active', 'balanced', 'success'].includes(value)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['draft', 'pending', 'submitted', 'warning'].includes(value)) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (['cancelled', 'rejected', 'overdue', 'inactive'].includes(value)) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

export const pickValue = (row, keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '') return row[key];
  }
  return '-';
};

export const exportXlsx = (rows, columns, filename) => {
  const sheetData = rows.map((row) => Object.fromEntries(columns.map((column) => [column.label, row[column.key] ?? '-'])));
  const sheet = XLSX.utils.json_to_sheet(sheetData.length ? sheetData : [Object.fromEntries(columns.map((column) => [column.label, '']))]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Data');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportPdf = (title, rows, columns, filename) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(13);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Diekspor: ${dateTimeLabel(new Date().toISOString())}`, 14, 20);
  doc.setTextColor(30);

  let y = 29;
  const pageHeight = doc.internal.pageSize.getHeight();
  const widths = columns.map((column) => column.width || 42);
  const drawRow = (cells, isHeader = false) => {
    if (y > pageHeight - 14) {
      doc.addPage();
      y = 16;
    }
    let x = 14;
    cells.forEach((cell, index) => {
      const text = doc.splitTextToSize(String(cell ?? '-'), widths[index] - 3);
      doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
      doc.setFontSize(isHeader ? 8.5 : 8);
      doc.text(text, x, y);
      x += widths[index];
    });
    y += Math.max(6, ...cells.map((cell, index) => doc.splitTextToSize(String(cell ?? '-'), widths[index] - 3).length * 4));
    doc.setDrawColor(225);
    doc.line(14, y - 1.5, 14 + widths.reduce((sum, width) => sum + width, 0), y - 1.5);
  };

  drawRow(columns.map((column) => column.label), true);
  rows.forEach((row) => drawRow(columns.map((column) => row[column.key] ?? '-')));
  doc.save(`${filename}.pdf`);
};

export const downloadExport = (format, title, rows, columns, filename) => {
  if (format === 'xlsx') exportXlsx(rows, columns, filename);
  else exportPdf(title, rows, columns, filename);
};
