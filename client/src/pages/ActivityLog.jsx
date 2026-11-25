import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import * as Icons from 'lucide-react';
import { ACTIVITY_LOG_URL } from '../Api';
import { logActivity } from '../activityLog';
import TableExports from '../TableExports';
import PageSizeSelect from '../PageSizeSelect';
import { useTablePagination } from '../tablePagination';
import { useMenuPermission } from '../permissions';
import FeaturePageHeader from '../components/layout/FeaturePageHeader';

const ACTION_OPTIONS = [
  { value: 'all', label: 'Semua aksi' },
  { value: 'view', label: 'Klik / Lihat' },
  { value: 'create', label: 'Tambah' },
  { value: 'edit', label: 'Ubah' },
  { value: 'save', label: 'Simpan' },
  { value: 'delete', label: 'Hapus' },
  { value: 'restore', label: 'Pulihkan' },
  { value: 'backup', label: 'Backup' },
  { value: 'export', label: 'Ekspor' },
  { value: 'login', label: 'Masuk' },
  { value: 'logout', label: 'Keluar' }
];

const ACTION_STYLES = {
  login: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  logout: 'bg-slate-100 text-slate-600 border-slate-200',
  view: 'bg-sky-50 text-sky-700 border-sky-100',
  click: 'bg-slate-100 text-slate-600 border-slate-200',
  create: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  edit: 'bg-amber-50 text-amber-700 border-amber-100',
  save: 'bg-blue-50 text-blue-700 border-blue-100',
  delete: 'bg-red-50 text-red-700 border-red-100',
  restore: 'bg-violet-50 text-violet-700 border-violet-100',
  backup: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  export: 'bg-cyan-50 text-cyan-700 border-cyan-100'
};

const ACTION_LABELS = {
  login: 'Masuk',
  logout: 'Keluar',
  view: 'Klik / Lihat',
  click: 'Klik',
  create: 'Tambah',
  edit: 'Ubah',
  save: 'Simpan',
  delete: 'Hapus',
  restore: 'Pulihkan',
  backup: 'Backup',
  export: 'Ekspor'
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
};

const formatRelative = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return '';
};

const ActivityLog = () => {
  const access = useMenuPermission('/backup/log');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [message, setMessage] = useState(null);

  const fetchLogs = useCallback(async () => {
    if (!access.canView) return;
    setLoading(true);
    try {
      const response = await axios.get(ACTIVITY_LOG_URL, {
        params: { limit: 500 },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setLogs(Array.isArray(response.data) ? response.data : []);
    } catch {
      setMessage({ type: 'error', text: 'Gagal memuat log aktivitas.' });
    } finally {
      setLoading(false);
    }
  }, [access.canView]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, access.canView]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter]);

  const filteredLogs = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (!needle) return true;
      return [
        log.user_name,
        log.action,
        ACTION_LABELS[log.action],
        log.module,
        log.description,
        formatDateTime(log.created_at)
      ].filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [logs, searchTerm, actionFilter]);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    currentItems,
    indexOfFirstItem,
    indexOfLastItem,
    totalPages
  } = useTablePagination(filteredLogs);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const deleteLog = async (log) => {
    if (!window.confirm(`Hapus log #${log.id}?`)) return;
    try {
      await axios.delete(`${ACTIVITY_LOG_URL}?id=${log.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      await fetchLogs();
      logActivity({ action: 'delete', module: 'Log Activity Admin', description: `Menghapus log aktivitas #${log.id}` });
      setMessage({ type: 'success', text: `Log #${log.id} dihapus.` });
    } catch {
      setMessage({ type: 'error', text: 'Gagal menghapus log aktivitas.' });
    }
  };

  const clearLogs = async () => {
    if (!window.confirm('Hapus semua log aktivitas?')) return;
    try {
      await axios.delete(ACTIVITY_LOG_URL, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      logActivity({ action: 'delete', module: 'Log Activity Admin', description: 'Menghapus semua log aktivitas' });
      await fetchLogs();
      setMessage({ type: 'success', text: 'Semua log aktivitas dihapus.' });
    } catch {
      setMessage({ type: 'error', text: 'Gagal menghapus log aktivitas.' });
    }
  };

  if (!access.canView) {
    return (
      <div className="app-card app-card-padded text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">Akses Ditolak</h3>
        <p className="text-gray-500 text-sm mt-2">Anda tidak memiliki hak akses untuk melihat data ini.</p>
      </div>
    );
  }

  return (
    <div data-no-activity-log className="app-page">
      <FeaturePageHeader
        title="Log Aktivitas Admin"
        subtitle="Pantau aktivitas administrator"
        actions={
          <>
            <TableExports
              menuUrl="/backup/log"
              title="Log Aktivitas Admin"
              filename="log-aktivitas"
              columns={[
                { label: 'Nomor', key: 'no', width: 1 },
                { label: 'Waktu', key: 'time', width: 3 },
                { label: 'Pengguna', key: 'user', width: 2 },
                { label: 'Aksi', key: 'action', width: 2 },
                { label: 'Modul', key: 'module', width: 2 },
                { label: 'Keterangan', key: 'description', width: 5 }
              ]}
              rows={currentItems.map((log, index) => ({
                no: indexOfFirstItem + index + 1,
                time: formatDateTime(log.created_at),
                user: log.user_name || 'Tidak diketahui',
                action: ACTION_LABELS[log.action] || log.action,
                module: log.module || '-',
                description: log.description || '-'
              }))}
            />
            {access.canDelete && (
              <button
                type="button"
                onClick={clearLogs}
                disabled={loading || logs.length === 0}
                className="app-button"
              >
                <Icons.Trash2 className="w-4 h-4" />
                Bersihkan
              </button>
            )}
          </>
        }
      />
      {message && (
        <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-2xl border-l-4 bg-white text-gray-800 flex items-center gap-4 ${
          message.type === 'error' ? 'border-red-500' : 'border-green-500'
        }`}>
          <span className="text-sm font-medium">{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Tutup notifikasi"
          >
            <Icons.X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="app-page">
        {access.canView && (
          <div className="app-card app-card-padded">
            <h2 className="mb-4 text-sm font-bold text-slate-800">Filter Log Aktivitas</h2>
            <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
            <div className="relative w-full flex-1">
                  <input
                    type="text"
                    placeholder="Cari pengguna, aksi, modul, atau keterangan..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="app-input pl-9"
                  />
                  <Icons.Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
                <select
                  value={actionFilter}
                  onChange={(event) => setActionFilter(event.target.value)}
                  className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {ACTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={fetchLogs}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-60"
                >
                  <Icons.RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Muat Ulang
                </button>
            </div>
          </div>
        )}

        <div className="app-table-shell">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">No</th>
                  <th className="py-4 px-6">Waktu</th>
                  <th className="py-4 px-6">Pengguna</th>
                  <th className="py-4 px-6">Aksi</th>
                  <th className="py-4 px-6">Modul</th>
                  <th className="py-4 px-6">Keterangan</th>
                  <th className="py-4 pr-6 text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {currentItems.map((log, index) => (
                  <tr key={log.id} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="py-4 px-6 text-gray-600 text-sm">{indexOfFirstItem + index + 1}</td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <p className="text-sm font-semibold text-gray-800" title={log.created_at}>{formatDateTime(log.created_at)}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{formatRelative(log.created_at)}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-semibold text-gray-800">{log.user_name || 'Tidak diketahui'}</p>
                      <p className="mt-0.5 text-xs text-gray-400">ID #{log.user_id || '-'}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${ACTION_STYLES[log.action] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">{log.module}</td>
                    <td className="py-4 px-6 text-sm text-gray-500">{log.description || '-'}</td>
                    <td className="py-4 pr-6 text-right">
                      {access.canDelete && (
                        <button
                          type="button"
                          onClick={() => deleteLog(log)}
                          title="Hapus log"
                          aria-label="Hapus log"
                          className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                        >
                          <Icons.Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-400">Memuat log aktivitas...</td>
                  </tr>
                )}
                {!loading && currentItems.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-400">
                      {logs.length === 0 ? 'Belum ada aktivitas yang tercatat.' : 'Log tidak ditemukan'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredLogs.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 app-pagination">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <PageSizeSelect value={itemsPerPage} onChange={setItemsPerPage} />
              <div className="text-sm text-gray-500"> 
                dari <span className="font-semibold text-gray-700">{filteredLogs.length}</span> records
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Sebelumnya
              </button>
              <span className="px-2 text-xs font-bold text-slate-600">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
