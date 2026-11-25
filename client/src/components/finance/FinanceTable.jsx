import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { statusClass } from '../../financeUtils';
import { FinanceButton } from './FinanceLayout';
import PageSizeSelect from '../../PageSizeSelect';

export const FinanceTable = ({ columns, rows, loading = false, emptyText = 'Belum ada data.', onRowClick, page = 1, limit = 10 }) => {
  const allRows = Array.isArray(rows) ? rows : [];
  const numericLimit = limit === 'all' || limit === 'Semua' ? allRows.length : Number(limit || 10);
  const currentPage = Math.max(1, Number(page || 1));
  const start = (currentPage - 1) * numericLimit;
  const pagedRows = numericLimit > 0 ? allRows.slice(start, start + numericLimit) : allRows;
  const displayRows = loading ? [] : pagedRows;

  return (
    <div className="app-table-shell">
      <table className="w-full table-auto text-left text-sm">
        <thead className="app-thead">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`app-th ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-400">Memuat data...</td></tr>
          ) : allRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-14 text-center">
                <Inbox className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">{emptyText}</p>
              </td>
            </tr>
          ) : displayRows.map((row, index) => (
            <tr
              key={row.id || index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`transition hover:bg-slate-50/80 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((column) => (
                <td key={column.key} className={`app-td ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}`}>
                  {column.render ? column.render(row) : row[column.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const FinancePagination = ({ page = 1, total = 0, limit = 10, onPageChange, onPageSizeChange }) => {
  const pages = Math.max(1, Math.ceil(Number(total || 0) / Number(limit || 10)));
  if (total === 0) return null;
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 app-pagination">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <PageSizeSelect value={limit} onChange={onPageSizeChange || (() => {})} />
        <div className="text-sm text-gray-500">
          dari <span className="font-semibold text-gray-700">{total}</span> records
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(Number(page) - 1, 1))}
          disabled={Number(page) <= 1}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            Number(page) <= 1
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Sebelumnya
        </button>
        {[...Array(pages)].map((_, index) => (
          <button
            key={index + 1}
            type="button"
            onClick={() => onPageChange(index + 1)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold border transition ${
              Number(page) === index + 1
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {index + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(Number(page) + 1, pages))}
          disabled={Number(page) >= pages}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            Number(page) >= pages
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
};

export const StatusBadge = ({ value }) => (
  <span className={`rounded-full border px-2 py-1 text-[11px] font-bold capitalize ${statusClass(value)}`}>
    {String(value || '-').replace(/_/g, ' ')}
  </span>
);

export default FinanceTable;
