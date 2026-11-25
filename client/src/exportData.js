import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

const asText = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.map(asText).join(', ');
  if (typeof value === 'object') {
    if (value.label || value.name) return String(value.label || value.name);
    return JSON.stringify(value);
  }
  return String(value);
};

const fileName = (value) => String(value || 'ekspor')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '') || 'ekspor';

const isImageColumn = (column) => /logo|image|foto|gambar|photo|thumbnail|avatar/i.test(
  `${column?.label || ''} ${column?.key || ''}`
);

const resolveColumns = (columns) => {
  const explicit = (Array.isArray(columns) ? columns : [])
    .filter((column) => column && column.key && !isImageColumn(column));
  return explicit.length ? explicit : [{ key: 'value', label: 'Data', width: 6 }];
};

const escapeXml = (value) => asText(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const columnName = (index) => {
  let name = '';
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
};

const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

const buildCell = (value, columnIndex, rowNumber) => {
  const reference = `${columnName(columnIndex)}${rowNumber}`;
  const style = rowNumber === 1 ? 1 : 2;
  const numeric = typeof value === 'number' && Number.isFinite(value);
  if (numeric) return `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
};

const buildWorksheet = (columns, rows) => {
  const cols = columns.map((column, index) => {
    const width = Math.min(80, Math.max(12, (Number(column.width) || 3) * 6));
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join('');
  const header = `<row r="1" ht="26" customHeight="1">${columns
    .map((column, index) => buildCell(column.label, index + 1, 1)).join('')}</row>`;
  const body = rows.map((row, rowIndex) => `<row r="${rowIndex + 2}">${columns
    .map((column, columnIndex) => buildCell(row ? row[column.key] : '-', columnIndex + 1, rowIndex + 2)).join('')}</row>`).join('');
  const lastColumn = columnName(columns.length);
  const lastRow = rows.length + 1;
  return `${xmlHeader}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${lastColumn}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${header}${body}</sheetData><autoFilter ref="A1:${lastColumn}${lastRow}"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
};

const buildStyles = () => `${xmlHeader}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE5E7EB"/></left><right style="thin"><color rgb="FFE5E7EB"/></right><top style="thin"><color rgb="FFE5E7EB"/></top><bottom style="thin"><color rgb="FFE5E7EB"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const createExcelWorkbook = async ({ title, columns, rows }) => {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const allColumns = resolveColumns(columns);
  const safeSheetName = escapeXml(String(title || 'Data').replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Data');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `${xmlHeader}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
  zip.file('_rels/.rels', `${xmlHeader}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file('xl/workbook.xml', `${xmlHeader}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `${xmlHeader}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file('xl/styles.xml', buildStyles());
  zip.file('xl/worksheets/sheet1.xml', buildWorksheet(allColumns, sourceRows));
  return zip.generateAsync({ type: 'arraybuffer' });
};

export const exportExcel = async ({ title, columns, rows, filename }) => {
  const buffer = await createExcelWorkbook({ title, columns, rows });
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${fileName(filename)}.xlsx`
  );
};

export const exportPdf = ({ title, columns, rows, filename }) => {
  const sourceRows = Array.isArray(rows) && rows.length ? rows : [null];
  const allColumns = resolveColumns(columns);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const padding = 2.5;
  const lineHeight = 4.4;
  const footerSpace = 10;
  const usableWidth = pageWidth - margin * 2;
  const rawWeights = allColumns.map((column) => Math.max(12, (Number(column.width) || 3) * 8));
  const rawTotal = rawWeights.reduce((sum, weight) => sum + weight, 0) || 1;
  const widths = rawWeights.map((weight) => (usableWidth * weight) / rawTotal);
  const state = { y: margin };

  const wrapCell = (value, maxWidth) => {
    const lines = doc.splitTextToSize(asText(value), Math.max(8, maxWidth - padding * 2));
    return (Array.isArray(lines) ? lines : [lines]).map((line) => String(line));
  };

  const drawHeader = () => {
    const lines = allColumns.map((column, index) => wrapCell(column.label, widths[index]));
    const height = Math.max(...lines.map((item) => item.length), 1) * lineHeight + padding * 2;
    if (state.y + height > pageHeight - margin - footerSpace) {
      doc.addPage();
      state.y = margin;
    }
    let x = margin;
    lines.forEach((_, index) => {
      doc.setFillColor(79, 70, 229);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.1);
      doc.rect(x, state.y, widths[index], height, 'FD');
      x += widths[index];
    });
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    x = margin;
    lines.forEach((cellLines, index) => {
      cellLines.forEach((line, lineIndex) => {
        doc.text(line, x + padding, state.y + padding + lineIndex * lineHeight + lineHeight * 0.8);
      });
      x += widths[index];
    });
    state.y += height;
  };

  const titleLines = doc.splitTextToSize(asText(title), usableWidth);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(titleLines, margin, state.y + 4);
  state.y += Math.max(1, Array.isArray(titleLines) ? titleLines.length : 1) * 6;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(`Diekspor: ${new Date().toLocaleString('id-ID')}`, margin, state.y + 3);
  state.y += 5;
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.5);
  doc.line(margin, state.y + 2, pageWidth - margin, state.y + 2);
  state.y += 7;
  drawHeader();

  sourceRows.forEach((row, rowIndex) => {
    let remaining = allColumns.map((column, index) => wrapCell(row ? row[column.key] : '-', widths[index]));
    const shaded = rowIndex % 2 === 0;

    while (remaining.some((cellLines) => cellLines.length > 0)) {
      const availableHeight = pageHeight - margin - footerSpace - state.y;
      if (availableHeight < lineHeight + padding * 2) {
        doc.addPage();
        state.y = margin;
        drawHeader();
        continue;
      }
      const maxLines = Math.max(...remaining.map((item) => item.length), 1);
      const linesThatFit = Math.max(1, Math.floor((availableHeight - padding * 2) / lineHeight));
      const take = Math.min(maxLines, linesThatFit);
      const height = take * lineHeight + padding * 2;
      let x = margin;
      remaining.forEach((_, index) => {
        if (shaded) {
          doc.setFillColor(249, 250, 251);
          doc.rect(x, state.y, widths[index], height, 'F');
        }
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.1);
        doc.rect(x, state.y, widths[index], height, 'S');
        x += widths[index];
      });
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      x = margin;
      remaining.forEach((cellLines, index) => {
        cellLines.slice(0, take).forEach((line, lineIndex) => {
          doc.text(line, x + padding, state.y + padding + lineIndex * lineHeight + lineHeight * 0.8);
        });
        x += widths[index];
      });
      state.y += height;
      remaining = remaining.map((cellLines) => cellLines.slice(take));
      if (remaining.some((cellLines) => cellLines.length > 0)) {
        doc.addPage();
        state.y = margin;
        drawHeader();
      }
    }
  });

  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.1);
    doc.line(margin, pageHeight - margin + 1, pageWidth - margin, pageHeight - margin + 1);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Halaman ${page} / ${total}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  }
  doc.save(`${fileName(filename)}.pdf`);
};
