import React from 'react';
import { PAGE_SIZE_OPTIONS } from './tablePagination';

const PageSizeSelect = ({ value, onChange }) => (
  <div className="flex items-center gap-2 text-xs text-slate-600">
    <span className="whitespace-nowrap">Tampilkan</span>
    <select
      value={String(value)}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Jumlah data per halaman"
      className="px-3 py-2 border border-gray-200 bg-white text-xs font-semibold text-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
    >
      {PAGE_SIZE_OPTIONS.map((option) => (
        <option key={option} value={option}>{option === 'all' ? 'Semua' : option}</option>
      ))}
    </select>
  </div>
);

export default PageSizeSelect;
