import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Edit3,
  MessageCircle,
  Pause,
  Play,
  Plus,
  Trash2,
  Wifi
} from 'lucide-react';
import { useMenuPermission } from '../permissions';
import { useTablePagination } from '../tablePagination';
import {
  deleteCampaign,
  duplicateCampaign,
  getCampaigns,
  getMarketingSettings,
  pauseCampaign,
  startCampaign,
  testWhatsapp
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

const MarketingWhatsApp = () => {
  const access = useMenuPermission('/marketing-center/whatsapp');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [connection, setConnection] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((previous) => ({ ...previous, show: false })), 3500);
  };

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const result = await getCampaigns({ channel: 'whatsapp' });
      setCampaigns(asList(result));
    } catch (error) {
      showNotification(error.message || 'Gagal memuat kampanye WhatsApp.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!access.canView) return;
    loadCampaigns();
    getMarketingSettings()
      .then((result) => {
        const whatsapp = result?.whatsapp || result?.whatsapp_settings || result || {};
        const connected = whatsapp.connected ?? whatsapp.is_connected ?? !!((whatsapp.phone_id || whatsapp.phone_number_id) && (whatsapp.token || whatsapp.access_token || whatsapp.token_saved));
        setConnection({ connected: !!connected, phoneId: whatsapp.phone_id || whatsapp.phone_number_id || '' });
      })
      .catch(() => setConnection({ connected: false, phoneId: '' }));
  }, [access.canView]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return campaigns;
    return campaigns.filter((campaign) => [campaign.name, campaign.whatsapp_text, campaign.message, campaign.status]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [campaigns, search]);

  const pagination = useTablePagination(filtered);
  const range = filtered.length
    ? `Menampilkan ${pagination.indexOfFirstItem + 1} sampai ${Math.min(pagination.indexOfLastItem, filtered.length)} dari ${filtered.length} entri`
    : 'Belum ada kampanye WhatsApp';

  useEffect(() => {
    pagination.setCurrentPage(1);
  }, [search]);

  const stats = useMemo(() => {
    const count = (statuses) => campaigns.filter((campaign) => statuses.includes(String(campaign.status || '').toLowerCase())).length;
    return [
      { label: 'Total Kampanye', value: campaigns.length, color: 'text-green-600 bg-green-50', icon: MessageCircle },
      { label: 'Draf', value: count(['draft']), color: 'text-gray-600 bg-gray-100', icon: Edit3 },
      { label: 'Dijadwalkan', value: count(['scheduled', 'queued']), color: 'text-indigo-600 bg-indigo-50', icon: Play },
      { label: 'Terkirim', value: count(['sent', 'completed', 'delivered', 'read']), color: 'text-teal-600 bg-teal-50', icon: CheckCircle2 },
      { label: 'Gagal', value: count(['failed', 'invalid']), color: 'text-red-600 bg-red-50', icon: AlertCircle }
    ];
  }, [campaigns]);

  const openWizard = (campaign = null) => {
    if (!campaign && !access.canCreate) return;
    if (campaign && !access.canEdit) return;
    setEditingCampaign(campaign);
    setWizardOpen(true);
  };

  const handleAction = async (action, campaign) => {
    if (action !== 'delete' && !access.canEdit) return;
    if (action === 'delete' && !access.canDelete) return;
    if (action === 'delete' && !window.confirm(`Hapus kampanye ${campaign.name}?`)) return;
    try {
      if (action === 'start') await startCampaign(campaign.id);
      if (action === 'pause') await pauseCampaign(campaign.id);
      if (action === 'duplicate') await duplicateCampaign(campaign.id);
      if (action === 'delete') await deleteCampaign(campaign.id);
      showNotification('Aksi kampanye berhasil dilakukan.');
      await loadCampaigns();
    } catch (error) {
      showNotification(error.message || 'Gagal melakukan aksi kampanye.', 'error');
    }
  };

  const handleTest = async () => {
    if (!access.canEdit) return;
    try {
      const result = await testWhatsapp();
      showNotification(result?.message || 'Tes koneksi WhatsApp berhasil dikirim.');
    } catch (error) {
      showNotification(error.message || 'Gagal menguji koneksi WhatsApp.', 'error');
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

  const columns = [
    { key: 'name', label: 'Nama Kampanye', render: (row) => <span className="font-semibold text-gray-800">{row.name || '-'}</span> },
    { key: 'whatsapp_text', label: 'Pesan', render: (row) => <span className="block max-w-xs truncate">{row.whatsapp_text || row.message || '-'}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'recipients_count', label: 'Penerima', render: (row) => row.recipients_count ?? row.total_recipients ?? '-' },
    { key: 'scheduled_at', label: 'Jadwal', render: (row) => row.scheduled_at || row.created_at || '-' },
    {
      key: 'actions',
      label: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-1">
          {access.canEdit ? (
            <button type="button" onClick={() => openWizard(row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600" aria-label="Ubah kampanye"><Edit3 className="h-4 w-4" /></button>
          ) : null}
          {access.canEdit && ['draft', 'paused'].includes(String(row.status || '').toLowerCase()) ? (
            <button type="button" onClick={() => handleAction('start', row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-green-50 hover:text-green-600" aria-label="Mulai kampanye"><Play className="h-4 w-4" /></button>
          ) : null}
          {access.canEdit && ['running', 'queued'].includes(String(row.status || '').toLowerCase()) ? (
            <button type="button" onClick={() => handleAction('pause', row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-amber-50 hover:text-amber-600" aria-label="Jeda kampanye"><Pause className="h-4 w-4" /></button>
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

  return (
    <MarketingLayout
      title="Kampanye WhatsApp"
      subtitle="Buat dan pantau kampanye WhatsApp serta status koneksi gateway."
      actions={
        <>
          {access.canEdit ? (
            <button type="button" onClick={handleTest} className="app-button">
              <Wifi className="h-4 w-4" /> Tes Koneksi
            </button>
          ) : null}
          {access.canCreate ? (
            <button type="button" onClick={() => openWizard()} className="app-button app-button-primary">
              <Plus className="h-4 w-4" /> Buat Kampanye WhatsApp
            </button>
          ) : null}
        </>
      }
      filters={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:max-w-md sm:flex-1">
            <span className="pointer-events-none absolute left-3 top-2.5 text-gray-400"><MessageCircle className="h-4 w-4" /></span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kampanye WhatsApp..." className="app-input pl-9" />
          </div>
          <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${connection?.connected ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {connection?.connected ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {connection === null ? 'Memeriksa koneksi...' : connection.connected ? 'Gateway Terhubung' : 'Gateway Belum Terhubung'}
          </div>
        </div>
      }
    >
      {notification.show ? (
        <div className={`fixed top-6 right-6 z-[60] max-w-sm rounded-xl border-l-4 px-6 py-4 shadow-2xl ${notification.type === 'success' ? 'border-green-500 bg-white' : 'border-red-500 bg-white'}`}>
          <p className={`text-sm font-semibold ${notification.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{notification.message}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className={`inline-flex rounded-lg p-2 ${stat.color}`}><Icon className="h-4 w-4" /></div>
              <p className="mt-2 text-xs font-semibold uppercase text-gray-500">{stat.label}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-7">
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
      </div>

      <CampaignWizard
        open={wizardOpen}
        initialCampaign={editingCampaign}
        onClose={() => setWizardOpen(false)}
        onSaved={() => loadCampaigns()}
      />
    </MarketingLayout>
  );
};

export default MarketingWhatsApp;
