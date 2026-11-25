import React from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { useCanExport } from './permissions';
import { exportExcel, exportPdf } from './exportData';
import { logActivity } from './activityLog';

const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 shrink-0';
const pdfClass = buttonClass;
const excelClass = buttonClass;

const TableExports = ({ menuUrl, title, columns, rows, filename }) => {
  const canExport = useCanExport(menuUrl);

  if (!canExport) return null;

  const runExport = (format) => {
    const payload = { title, columns, rows: rows || [], filename: filename || title };
    if (format === 'excel') exportExcel(payload);
    else exportPdf(payload);
    logActivity({
      action: 'export',
      module: title,
      description: `Ekspor data ${title} ke ${format === 'excel' ? 'Excel' : 'PDF'}`
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        data-no-activity-log
        onClick={() => runExport('pdf')}
        className={pdfClass}
        title={`Ekspor PDF ${title}`}
      >
        <FileDown className="w-3 h-3" />
        PDF
      </button>
      <button
        type="button"
        data-no-activity-log
        onClick={() => runExport('excel')}
        className={excelClass}
        title={`Ekspor Excel ${title}`}
      >
        <FileSpreadsheet className="w-3 h-3" />
        EXCEL
      </button>
    </div>
  );
};

export default TableExports;
