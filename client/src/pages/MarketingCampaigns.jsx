import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CalendarClock,
  Copy,
  Edit3,
  Eye,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { useMenuPermission } from '../permissions';
import { useTablePagination } from '../tablePagination';
import {
  cancelCampaign,
  deleteCampaign,
  duplicateCampaign,
  getCampaignRecipients,
  getCampaigns,
  pauseCampaign,
  scheduleCampaign,
  startCampaign
} from '../marketingApi';
import CampaignWizard from '../components/marketing/CampaignWizard';
import MarketingLayout from '../components/marketing/MarketingLayout';
import MarketingTable from '../components/marketing/MarketingTable';
import StatusBadge from '../components/marketing/StatusBadge';

const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const MarketingCampaigns = () => {
  const access = useMenuPermission('/marketing-center/campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ type: '', status: '', search: '' });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState('');
  const [scheduleId, setScheduleId] = useState(null);
  const [scheduleValue, setScheduleValue] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((previous) => ({ ...previous, show: false })), 3500);
  };

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const result = await getCampaigns(params);
      setCampaigns(asList(result));
    } catch (error) {
      showNotification(error.message || 'Gagal memuat data kampanye.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!access.canView) return;
    loadCampaigns();
  }, [access.canView, filters.type, filters.status]);

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    if (!term) return campaigns;
    return campaigns.filter((campaign) => [campaign.name, campaign.channel, campaign.type, campaign.status]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [campaigns, filters.search]);

  const pagination = useTablePagination(filtered);
  const range = filtered.length
    ? `Menampilkan ${pagination.indexOfFirstItem + 1} sampai ${Math.min(pagination.indexOfLastItem, filtered.length)} dari ${filtered.length} entri`
    : 'Belum ada kampanye';

  const detailFiltered = useMemo(() => {
    const term = detailSearch.trim().toLowerCase();
    if (!term) return detailRows;
    return detailRows.filter((row) => [row.name, row.email, row.whatsapp, row.status]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [detailRows, detailSearch]);

  const detailPagination = useTablePagination(detailFiltered);

  useEffect(() => {
    if (!detailId || !access.canView) return undefined;
    let active = true;
    setDetailLoading(true);
    getCampaignRecipients(detailId)
      .then((result) => {
        if (active) setDetailRows(asList(result));
      })
      .catch((error) => {
        if (active) showNotification(error.message || 'Gagal memuat penerima kampanye.', 'error');
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [detailId, access.canView]);

  useEffect(() => {
    pagination.setCurrentPage(1);
  }, [filters.search, filters.type, filters.status]);

  const openWizard = (campaign = null) => {
    if (!campaign && !access.canCreate) return;
    if (campaign && !access.canEdit) return;
    setEditingCampaign(campaign);
    setWizardOpen(true);
  };

  const handleAction = async (action, campaign) => {
    if (action === 'delete' && !access.canDelete) return;
    if (action !== 'delete' && !access.canEdit) return;
    if (action === 'delete' && !window.confirm(`Hapus kampanye ${campaign.name}?`)) return;
    try {
      if (action === 'start') await startCampaign(campaign.id);
      if (action === 'pause') await pauseCampaign(campaign.id);
      if (action === 'cancel') await cancelCampaign(campaign.id);
      if (action === 'duplicate') await duplicateCampaign(campaign.id);
      if (action === 'delete') await deleteCampaign(campaign.id);
      showNotification('Aksi kampanye berhasil dilakukan.');
      await loadCampaigns();
    } catch (error) {
      showNotification(error.message || 'Gagal melakukan aksi kampanye.', 'error');
    }
  };

  const handleSchedule = async (event) => {
    event.preventDefault();
    if (!scheduleId || !scheduleValue || !access.canEdit) return;
    try {
      await scheduleCampaign(scheduleId, { scheduled_at: scheduleValue });
      showNotification('Jadwal kampanye berhasil disimpan.');
      setScheduleId(null);
      setScheduleValue('');
      await loadCampaigns();
    } catch (error) {
      showNotification(error.message || 'Gagal menjadwalkan kampanye.', 'error');
    }
  };

  if (!access.canView) {
    return (
      <div className="app-card app-card-padded">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Akses Ditolak</h3>
        <p className="text-gray-500 text-sm mt-2">Anda tidak memiliki hak akses untuk melihat data ini.</p>
      </div>
    );
  }

  const inputStyle = 'app-input';
  const columns = [
    { key: 'name', label: 'Nama Kampanye', render: (row) => <span className="font-semibold text-gray-800">{row.name || '-'}</span> },
    {
      key: 'channel',
      label: 'Tipe',
      render: (row) => <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold capitalize text-gray-700">{row.channel || row.type || '-'}</span>
    },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'recipients_count', label: 'Penerima', render: (row) => row.recipients_count ?? row.total_recipients ?? '-' },
    { key: 'scheduled_at', label: 'Dijadwalkan', render: (row) => row.scheduled_at || '-' },
    { key: 'created_at', label: 'Dibuat', render: (row) => row.created_at || '-' },
    {
      key: 'actions',
      label: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => { setDetailId(row.id); setDetailRows([]); setDetailSearch(''); }} className="rounded-lg p-2 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600" aria-label="Lihat detail"><Eye className="h-4 w-4" /></button>
          {access.canEdit ? (
            <button type="button" onClick={() => openWizard(row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600" aria-label="Ubah kampanye"><Edit3 className="h-4 w-4" /></button>
          ) : null}
          {access.canEdit ? (
            <button type="button" onClick={() => { setScheduleId(row.id); setScheduleValue(''); }} className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600" aria-label="Jadwalkan kampanye"><CalendarClock className="h-4 w-4" /></button>
          ) : null}
          {access.canEdit && ['draft', 'paused'].includes(String(row.status || '').toLowerCase()) ? (
            <button type="button" onClick={() => handleAction('start', row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-green-50 hover:text-green-600" aria-label="Mulai kampanye"><Play className="h-4 w-4" /></button>
          ) : null}
          {access.canEdit && ['running', 'queued'].includes(String(row.status || '').toLowerCase()) ? (
            <button type="button" onClick={() => handleAction('pause', row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-amber-50 hover:text-amber-600" aria-label="Jeda kampanye"><Pause className="h-4 w-4" /></button>
          ) : null}
          {access.canEdit && !['cancelled', 'completed'].includes(String(row.status || '').toLowerCase()) ? (
            <button type="button" onClick={() => handleAction('cancel', row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-orange-50 hover:text-orange-600" aria-label="Batalkan kampanye"><Ban className="h-4 w-4" /></button>
          ) : null}
          {access.canDuplicate !== false ? (
            <button type="button" onClick={() => handleAction('duplicate', row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600" aria-label="Duplikat kampanye"><Copy className="h-4 w-4" /></button>
          ) : null}
          {access.canDelete ? (
            <button type="button" onClick={() => handleAction('delete', row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Hapus kampanye"><Trash2 className="h-4 w-4" /></button>
          ) : null}
        </div>
      )
    }
  ];

  const recipientColumns = [
    { key: 'name', label: 'Nama', render: (row) => row.name || row.contact?.name || '-' },
    { key: 'email', label: 'Email', render: (row) => row.email || row.contact?.email || '-' },
    { key: 'whatsapp', label: 'WhatsApp', render: (row) => row.whatsapp || row.contact?.whatsapp || '-' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'sent_at', label: 'Waktu Kirim', render: (row) => row.sent_at || '-' },
    { key: 'error', label: 'Keterangan', render: (row) => row.error_message || row.error || '-' }
  ];

  return (
    <MarketingLayout
      title="Semua Kampanye"
      subtitle="Pantau dan kelola seluruh kampanye email maupun WhatsApp."
      actions={
        access.canCreate ? (
          <button type="button" onClick={() => openWizard()} className="inline-flex items-center gap-2 app-button app-button-primary">
            <Plus className="h-4 w-4" /> Buat Kampanye
          </button>
        ) : null
      }
      filters={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input value={filters.search} onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))} placeholder="Cari kampanye..." className={`${inputStyle} pl-9`} />
          </div>
          <select value={filters.type} onChange={(event) => setFilters((previous) => ({ ...previous, type: event.target.value }))} className={inputStyle}>
            <option value="">Semua tipe</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="both">Keduanya</option>
          </select>
          <select value={filters.status} onChange={(event) => setFilters((previous) => ({ ...previous, status: event.target.value }))} className={inputStyle}>
            <option value="">Semua status</option>
            <option value="draft">Draf</option>
            <option value="scheduled">Dijadwalkan</option>
            <option value="queued">Antrean</option>
            <option value="running">Berjalan</option>
            <option value="completed">Selesai</option>
            <option value="paused">Dijeda</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
      }
    >
      {notification.show ? (
        <div className={`fixed top-6 right-6 z-[60] max-w-sm rounded-xl border-l-4 px-6 py-4 shadow-2xl ${notification.type === 'success' ? 'border-green-500 bg-white' : 'border-red-500 bg-white'}`}>
          <p className={`text-sm font-semibold ${notification.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{notification.message}</p>
        </div>
      ) : null}

      <MarketingTable
        columns={columns}
        rows={filtered}
        loading={loading}
        currentItems={pagination.currentItems}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        setCurrentPage={pagination.setCurrentPage}
        pageSize={pagination.itemsPerPage}
        setPageSize={pagination.setItemsPerPage}
        range={range}
      />

      <CampaignWizard
        open={wizardOpen}
        initialCampaign={editingCampaign}
        onClose={() => setWizardOpen(false)}
        onSaved={() => loadCampaigns()}
      />

      {scheduleId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
          <form onSubmit={handleSchedule} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Jadwalkan Kampanye</h2>
              <button type="button" onClick={() => setScheduleId(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Tutup"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="campaign-schedule">Waktu Kirim</label>
              <input id="campaign-schedule" type="datetime-local" required value={scheduleValue} onChange={(event) => setScheduleValue(event.target.value)} className={inputStyle} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setScheduleId(null)} className="app-button">Batal</button>
              <button type="submit" disabled={!scheduleValue || !access.canEdit} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">Simpan Jadwal</button>
            </div>
          </form>
        </div>
      ) : null}

      {detailId ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/50">
          <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Detail Kampanye</h2>
                <p className="mt-1 text-sm text-gray-500">{campaigns.find((campaign) => campaign.id === detailId)?.name || 'Penerima kampanye'}</p>
              </div>
              <button type="button" onClick={() => setDetailId(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Tutup"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input value={detailSearch} onChange={(event) => setDetailSearch(event.target.value)} placeholder="Cari penerima..." className={`${inputStyle} pl-9`} />
              </div>
              <MarketingTable
                columns={recipientColumns}
                rows={detailFiltered}
                loading={detailLoading}
                emptyText="Belum ada penerima."
                currentItems={detailPagination.currentItems}
                currentPage={detailPagination.currentPage}
                totalPages={detailPagination.totalPages}
                setCurrentPage={detailPagination.setCurrentPage}
                pageSize={detailPagination.itemsPerPage}
                setPageSize={detailPagination.setItemsPerPage}
                range={detailFiltered.length ? `Menampilkan ${detailPagination.indexOfFirstItem + 1} sampai ${Math.min(detailPagination.indexOfLastItem, detailFiltered.length)} dari ${detailFiltered.length} penerima` : 'Belum ada penerima'}
              />
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-right">
              <button type="button" onClick={() => setDetailId(null)} className="app-button">Tutup</button>
            </div>
          </div>
        </div>
      ) : null}
    </MarketingLayout>
  );
};

export default MarketingCampaigns;
