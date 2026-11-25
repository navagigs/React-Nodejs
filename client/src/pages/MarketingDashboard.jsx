import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Eye,
  Mail,
  MessageCircle,
  MousePointerClick,
  Send,
  Users
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useMenuPermission } from '../permissions';
import { useTablePagination } from '../tablePagination';
import { getMarketingDashboard } from '../marketingApi';
import MarketingLayout from '../components/marketing/MarketingLayout';
import MarketingTable from '../components/marketing/MarketingTable';
import StatusBadge from '../components/marketing/StatusBadge';

const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const MarketingDashboard = () => {
  const access = useMenuPermission('/marketing-center/dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const recent = useMemo(() => asList(dashboard?.recent_campaigns), [dashboard]);
  const activity = useMemo(() => asList(dashboard?.activity), [dashboard]);
  const pagination = useTablePagination(recent);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((previous) => ({ ...previous, show: false })), 3000);
  };

  useEffect(() => {
    if (!access.canView) return;
    let active = true;
    getMarketingDashboard()
      .then((result) => {
        if (active) setDashboard(result || {});
      })
      .catch((error) => {
        if (active) showNotification(error.message || 'Gagal memuat data dashboard marketing.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [access.canView]);

  if (!access.canView) {
    return (
      <div className="app-card app-card-padded">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Akses Ditolak</h3>
        <p className="text-gray-500 text-sm mt-2">Anda tidak memiliki hak akses untuk melihat data ini.</p>
      </div>
    );
  }

  const summary = dashboard?.summary || {};
  const stats = [
    { label: 'Total Kontak', value: summary.total_contacts, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Kontak WhatsApp', value: summary.total_whatsapp, icon: MessageCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Total Kampanye', value: summary.total_campaigns, icon: Send, color: 'text-blue-600 bg-blue-50' },
    { label: 'Email Terkirim', value: summary.email_sent, icon: Mail, color: 'text-cyan-600 bg-cyan-50' },
    { label: 'Email Gagal', value: summary.email_failed, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'WhatsApp Terkirim', value: summary.whatsapp_sent, icon: MessageCircle, color: 'text-teal-600 bg-teal-50' },
    { label: 'WhatsApp Gagal', value: summary.whatsapp_failed, icon: AlertTriangle, color: 'text-rose-600 bg-rose-50' },
    { label: 'Tingkat Buka', value: summary.open_rate, suffix: '%', icon: Eye, color: 'text-violet-600 bg-violet-50' },
    { label: 'Tingkat Klik', value: summary.click_rate, suffix: '%', icon: MousePointerClick, color: 'text-purple-600 bg-purple-50' },
    { label: 'Aktivitas Kampanye', value: summary.total_campaigns, icon: Activity, color: 'text-amber-600 bg-amber-50' }
  ];

  const columns = [
    { key: 'name', label: 'Nama Kampanye', render: (row) => <span className="font-semibold text-gray-800">{row.name || row.title || '-'}</span> },
    { key: 'channel', label: 'Kanal', render: (row) => <span className="capitalize">{row.channel || row.type || '-'}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'recipients_count', label: 'Penerima', render: (row) => row.recipients_count ?? row.total_recipients ?? '-' },
    { key: 'created_at', label: 'Dibuat', render: (row) => row.created_at || '-' }
  ];

  const indexOfFirst = pagination.indexOfFirstItem;
  const indexOfLast = Math.min(pagination.indexOfLastItem, recent.length);
  const range = recent.length
    ? `Menampilkan ${indexOfFirst + 1} sampai ${indexOfLast} dari ${recent.length} entri`
    : 'Belum ada kampanye';

  return (
    <MarketingLayout
      title="Dashboard Marketing"
      subtitle="Ringkasan performa kontak, kampanye email, dan WhatsApp."
    >
      {notification.show ? (
        <div className={`fixed top-6 right-6 z-[60] rounded-xl border-l-4 px-6 py-4 shadow-2xl ${notification.type === 'success' ? 'border-green-500 bg-white' : 'border-red-500 bg-white'}`}>
          <p className={`text-sm font-semibold ${notification.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{notification.message}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className={`inline-flex rounded-lg p-2 ${stat.color}`}><Icon className="h-5 w-5" /></div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className="mt-1 app-title">{loading ? '...' : (stat.value ?? 0)}{stat.suffix || ''}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-bold text-gray-800">Aktivitas Pengiriman</h2>
        </div>
        {loading ? (
          <div className="flex h-72 items-center justify-center text-sm text-gray-400">Memuat grafik...</div>
        ) : activity.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-gray-400">Belum ada aktivitas pengiriman.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={activity} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="email" name="Email" stroke="#4f46e5" fill="#e0e7ff" strokeWidth={2} />
              <Area type="monotone" dataKey="whatsapp" name="WhatsApp" stroke="#16a34a" fill="#dcfce7" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Send className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-bold text-gray-800">Kampanye Terbaru</h2>
        </div>
        <MarketingTable
          columns={columns}
          loading={loading}
          emptyText="Belum ada kampanye terbaru."
          currentItems={pagination.currentItems}
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          setCurrentPage={pagination.setCurrentPage}
          pageSize={pagination.itemsPerPage}
          setPageSize={pagination.setItemsPerPage}
          range={range}
        />
      </div>
    </MarketingLayout>
  );
};

export default MarketingDashboard;
