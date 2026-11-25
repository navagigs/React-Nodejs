import React from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import PageSizeSelect from '../../PageSizeSelect';

const MarketingTable = ({
  columns = [],
  rows = [],
  loading = false,
  selectable = false,
  selectedIds,
  onToggle,
  onToggleAll,
  sort,
  onSort,
  currentItems,
  currentPage = 1,
  totalPages = 1,
  setCurrentPage,
  pageSize,
  setPageSize,
  itemsPerPage,
  setItemsPerPage,
  range,
  Range,
  emptyText = 'Data tidak ditemukan'
}) => {
  const items = Array.isArray(currentItems) ? currentItems : Array.isArray(rows) ? rows : [];
  const perPage = pageSize ?? itemsPerPage ?? 10;
  const changePageSize = setPageSize || setItemsPerPage;
  const rangeText = Range || range;
  const selected = selectedIds instanceof Set ? selectedIds : new Set(Array.isArray(selectedIds) ? selectedIds : []);
  const allSelected = selectable && items.length > 0 && items.every((row) => selected.has(row.id));
  const partialSelected = selectable && items.some((row) => selected.has(row.id)) && !allSelected;
  const columnCount = columns.length + (selectable ? 1 : 0);

  return (
    <div className="space-y-5">
      <div className="app-table-shell">
        <table className="app-table">
          <thead className="app-thead">
            <tr className="text-slate-500">
              {selectable ? (
                <th className="app-th w-12 text-center">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua data"
                    checked={allSelected}
                    ref={(element) => {
                      if (element) element.indeterminate = partialSelected;
                    }}
                    onChange={() => onToggleAll && onToggleAll(items, !allSelected)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
              ) : null}
              {columns.map((column) => {
                const sortable = !!onSort && !!column.key;
                const active = sort && sort.key === column.key;
                return (
                  <th key={column.key} style={column.width ? { width: column.width } : undefined} className="app-th">
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(column.key)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition hover:text-indigo-600"
                      >
                        {column.label}
                        {active ? (
                          sort.dir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                        ) : null}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={columnCount} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3 text-sm text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    Memuat data...
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-4 py-14 text-center text-sm text-slate-400">{emptyText}</td>
              </tr>
            ) : (
              items.map((row, index) => (
                <tr key={row.id ?? row.uuid ?? index} className="transition hover:bg-slate-50/80">
                  {selectable ? (
                    <td className="app-td text-center">
                      <input
                        type="checkbox"
                        aria-label={`Pilih ${row.name || row.email || row.id || index}`}
                        checked={selected.has(row.id)}
                        onChange={() => onToggle && onToggle(row)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td key={column.key} className="app-td">
                      {column.render ? column.render(row, index) : (row[column.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {setCurrentPage ? (
        <div className="app-pagination">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {changePageSize ? <PageSizeSelect value={perPage} onChange={changePageSize} /> : null}
            <div className="text-xs text-slate-500">{rangeText || `Halaman ${currentPage} dari ${totalPages}`}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
              disabled={currentPage <= 1}
              className="app-button"
            >
              Sebelumnya
            </button>
            <span className="px-2 text-xs font-bold text-slate-600">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="app-button"
            >
              Berikutnya
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MarketingTable;
