import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import * as Icons from 'lucide-react';
import { BACKUP_URL } from '../Api';
import { logActivity } from '../activityLog';
import TableExports from '../TableExports';
import PageSizeSelect from '../PageSizeSelect';
import { useTablePagination } from '../tablePagination';
import { useMenuPermission } from '../permissions';
import FeaturePageHeader from '../components/layout/FeaturePageHeader';

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const apiError = (error, fallback) => error?.response?.data?.message || fallback;

const formatBytes = (bytes) => {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const BackupData = () => {
  const access = useMenuPermission('/backup/housekeeping');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [restoreId, setRestoreId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState(null);

  const isBusy = creating || restoring || actionId !== null;

  const fetchHistory = useCallback(async (options = {}) => {
    if (!access.canView) return;
    if (!options.silent) setHistoryLoading(true);
    try {
      const response = await axios.get(BACKUP_URL, { headers: authHeaders() });
      const rows = Array.isArray(response.data) ? response.data : [];
      setHistory(rows);
      setRestoreId((current) => {
        if (current && rows.some((row) => String(row.id) === String(current))) return current;
        return rows.length ? String(rows[0].id) : '';
      });
    } catch {
      setHistory([]);
      setMessage({ type: 'error', text: 'Gagal memuat riwayat backup dari server.' });
    } finally {
      if (!options.silent) setHistoryLoading(false);
    }
  }, [access.canView]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, access.canView]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredHistory = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return history;
    return history.filter((backup) => [
      backup.id,
      backup.filename,
      backup.original_name,
      backup.note,
      backup.created_at,
      formatBytes(backup.size)
    ].filter(Boolean).join(' ').toLowerCase().includes(needle));
  }, [history, searchTerm]);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    currentItems,
    indexOfFirstItem,
    indexOfLastItem,
    totalPages
  } = useTablePagination(filteredHistory);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const createServerBackup = async () => {
    if (isBusy) return;
    setCreating(true);
    setMessage(null);
    try {
      const response = await axios.post(BACKUP_URL, {}, { headers: authHeaders() });
      await fetchHistory({ silent: true });
      logActivity({ action: 'backup', module: 'Backup Data', description: `Membuat backup MySQL #${response.data.id}` });
      setMessage({ type: 'success', text: `Backup #${response.data.id} berhasil disimpan di server.` });
    } catch (error) {
      setMessage({ type: 'error', text: apiError(error, 'Gagal membuat backup di server.') });
    } finally {
      setCreating(false);
    }
  };

  const downloadServerBackup = async (backup) => {
    if (isBusy) return;
    setActionId(backup.id);
    setMessage(null);
    try {
      const response = await axios.get(`${BACKUP_URL}/${backup.id}/download`, {
        headers: authHeaders(),
        responseType: 'blob'
      });
      downloadBlob(new Blob([response.data], { type: 'application/sql;charset=utf-8' }), backup.original_name || backup.filename);
      logActivity({ action: 'export', module: 'Backup Data', description: `Mengunduh dump backup #${backup.id}` });
    } catch (error) {
      setMessage({ type: 'error', text: apiError(error, 'Gagal mengunduh dump backup.') });
    } finally {
      setActionId(null);
    }
  };

  const restoreBackup = async (backup, mode) => {
    if (!backup || isBusy) return;
    if (!window.confirm(`Restore backup #${backup.id} (${formatDateTime(backup.created_at)})? Seluruh data saat ini akan ditimpa.`)) return;
    if (mode === 'top') setRestoring(true);
    else setActionId(backup.id);
    setMessage(null);
    try {
      await axios.post(`${BACKUP_URL}/${backup.id}/restore`, {}, { headers: authHeaders() });
      await fetchHistory({ silent: true });
      logActivity({ action: 'restore', module: 'Backup Data', description: `Merestore backup #${backup.id}` });
      setMessage({ type: 'success', text: `Backup #${backup.id} berhasil direstore.` });
    } catch (error) {
      setMessage({ type: 'error', text: apiError(error, 'Gagal merestore backup.') });
    } finally {
      if (mode === 'top') setRestoring(false);
      else setActionId(null);
    }
  };

  const restoreSelected = () => {
    const backup = history.find((row) => String(row.id) === String(restoreId));
    if (!backup) {
      setMessage({ type: 'error', text: 'Pilih backup yang akan direstore.' });
      return;
    }
    restoreBackup(backup, 'top');
  };

  const deleteServerBackup = async (backup) => {
    if (isBusy) return;
    if (!window.confirm(`Hapus backup #${backup.id} dari server?`)) return;
    setActionId(backup.id);
    setMessage(null);
    try {
      await axios.delete(`${BACKUP_URL}/${backup.id}`, { headers: authHeaders() });
      await fetchHistory({ silent: true });
      logActivity({ action: 'delete', module: 'Backup Data', description: `Menghapus backup #${backup.id}` });
      setMessage({ type: 'success', text: `Backup #${backup.id} dihapus.` });
    } catch (error) {
      setMessage({ type: 'error', text: apiError(error, 'Gagal menghapus backup.') });
    } finally {
      setActionId(null);
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
        title="Backup Data"
        subtitle="Kelola cadangan database"
        actions={
          <>
            <TableExports
              menuUrl="/backup/housekeeping"
              title="Backup Data"
              filename="data-backup"
              columns={[
                { label: 'Nomor', key: 'no', width: 1 },
                { label: 'ID', key: 'id', width: 1 },
                { label: 'File', key: 'file', width: 4 },
                { label: 'Waktu', key: 'time', width: 3 },
                { label: 'Ukuran', key: 'size', width: 2 },
                { label: 'Tabel', key: 'tables', width: 2 },
                { label: 'Catatan', key: 'note', width: 3 }
              ]}
              rows={currentItems.map((backup, index) => ({
                no: indexOfFirstItem + index + 1,
                id: backup.id,
                file: backup.original_name || backup.filename || '-',
                time: formatDateTime(backup.created_at),
                size: formatBytes(backup.size),
                tables: backup.tables ?? '-',
                note: backup.note || '-'
              }))}
            />
            {access.canCreate && (
              <button
                type="button"
                onClick={createServerBackup}
                disabled={isBusy}
                className="app-button app-button-primary"
              >
                <Icons.Database className="w-4 h-4" />
                {creating ? 'Menyimpan...' : 'Buat Backup MySQL'}
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
        <div className="app-card app-card-padded">
          <h2 className="mb-4 text-sm font-bold text-slate-800">Filter Backup</h2>
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
            {access.canView && (
            <div className="relative w-full flex-1">
              <input
                type="text"
                placeholder="Cari cadangan berdasarkan ID, nama file, atau catatan..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="app-input pl-9"
              />
              <Icons.Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {access.canEdit && (
                <select
                  value={restoreId}
                  onChange={(event) => setRestoreId(event.target.value)}
                  disabled={historyLoading || isBusy || history.length === 0}
                  className="min-w-[190px] border border-gray-200 bg-white rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-60"
                >
                  <option value="">Pilih backup untuk restore</option>
                  {history.map((backup) => (
                    <option key={backup.id} value={backup.id}>
                      #{backup.id} · {formatDateTime(backup.created_at)}
                    </option>
                  ))}
                </select>
              )}
              {access.canEdit && (
                <button
                  type="button"
                  onClick={restoreSelected}
                  disabled={!restoreId || historyLoading || isBusy}
                  className="inline-flex items-center justify-center gap-2 bg-white border border-indigo-200 text-indigo-600 px-4 py-2.5 rounded-xl text-sm font-semibold transition hover:bg-indigo-50 disabled:opacity-60"
                >
                  <Icons.RotateCcw className={`w-4 h-4 ${restoring ? 'animate-spin' : ''}`} />
                  {restoring ? 'Memulihkan...' : 'Restore'}
                </button>
              )}
              <button
                type="button"
                onClick={() => fetchHistory()}
                disabled={historyLoading || isBusy}
                className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-60"
              >
                <Icons.RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
                Muat Ulang
              </button>
            </div>
          </div>
        </div>

        <div className="app-table-shell">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">No</th>
                  <th className="py-4 px-6">Backup</th>
                  <th className="py-4 px-6">Waktu</th>
                  <th className="py-4 px-6">Ukuran</th>
                  <th className="py-4 px-6">Tabel</th>
                  <th className="py-4 px-6">Catatan</th>
                  <th className="py-4 pr-6 text-right w-40">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {currentItems.map((backup, index) => (
                  <tr key={backup.id} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="py-4 px-6 text-gray-600 text-sm">{indexOfFirstItem + index + 1}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        #{backup.id}
                      </span>
                      <p className="mt-1.5 max-w-[220px] truncate text-xs text-gray-400">{backup.filename}</p>
                    </td>
                    <td className="py-4 px-6 text-gray-600 text-sm">{formatDateTime(backup.created_at)}</td>
                    <td className="py-4 px-6 text-gray-600 text-sm">{formatBytes(backup.size)}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        {backup.tables} tabel
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-500 text-sm">{backup.note || '-'}</td>
                    <td className="py-4 pr-6 text-right space-x-1">
                      {access.canExport && (
                        <button
                          type="button"
                          onClick={() => downloadServerBackup(backup)}
                          disabled={isBusy}
                          title="Unduh dump"
                          aria-label="Unduh dump"
                          className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition disabled:opacity-60"
                        >
                          <Icons.Download className="w-5 h-5" />
                        </button>
                      )}
                      {access.canEdit && (
                        <button
                          type="button"
                          onClick={() => restoreBackup(backup, 'row')}
                          disabled={isBusy}
                          title="Pulihkan Backup"
                          aria-label="Restore backup"
                          className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition disabled:opacity-60"
                        >
                          <Icons.RotateCcw className="w-5 h-5" />
                        </button>
                      )}
                      {access.canDelete && (
                        <button
                          type="button"
                          onClick={() => deleteServerBackup(backup)}
                          disabled={isBusy}
                          title="Hapus backup"
                          aria-label="Hapus backup"
                          className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-60"
                        >
                          <Icons.Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {historyLoading && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-400">Memuat riwayat backup...</td>
                  </tr>
                )}
                {!historyLoading && currentItems.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-400">
                      {history.length === 0 ? 'Belum ada backup di server.' : 'Backup tidak ditemukan'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredHistory.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 app-pagination">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <PageSizeSelect value={itemsPerPage} onChange={setItemsPerPage} />
              <div className="text-sm text-gray-500"> 
                dari <span className="font-semibold text-gray-700">{filteredHistory.length}</span> records
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
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold border transition ${
                    currentPage === index + 1
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
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

export default BackupData;
