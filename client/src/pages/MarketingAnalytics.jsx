import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Download,
  Eye,
  Filter,
  Mail,
  MessageCircle,
  MousePointerClick
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useMenuPermission } from '../permissions';
import { useTablePagination } from '../tablePagination';
import { getAnalytics, getAnalyticsExportUrl } from '../marketingApi';
import MarketingLayout from '../components/marketing/MarketingLayout';
import MarketingTable from '../components/marketing/MarketingTable';
import StatusBadge from '../components/marketing/StatusBadge';

const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const SUMMARY_LABELS = {
  total_contacts: 'Total Kontak',
  total_campaigns: 'Total Kampanye',
  total_sent: 'Total Terkirim',
  sent: 'Terkirim',
  delivered: 'Terdeliver',
  opened: 'Dibuka',
  clicked: 'Diklik',
  bounced: 'Mental',
  failed: 'Gagal',
  read: 'Dibaca',
  open_rate: 'Tingkat Buka',
  click_rate: 'Tingkat Klik',
  delivery_rate: 'Tingkat Pengiriman',
  email_sent: 'Email Terkirim',
  email_failed: 'Email Gagal',
  whatsapp_sent: 'WhatsApp Terkirim',
  whatsapp_failed: 'WhatsApp Gagal'
};

const COLUMN_LABELS = {
  name: 'Nama Kampanye',
  channel: 'Kanal',
  type: 'Tipe',
  status: 'Status',
  recipients: 'Penerima',
  sent: 'Terkirim',
  delivered: 'Terdeliver',
  opened: 'Dibuka',
  clicked: 'Diklik',
  bounced: 'Mental',
  failed: 'Gagal',
  open_rate: 'Tingkat Buka',
  click_rate: 'Tingkat Klik',
  date: 'Tanggal',
  created_at: 'Dibuat'
};

const MARKETING_ANALYTICS_PATH = '/marketing-center/analytics';

const MarketingAnalytics = () => {
  const access = useMenuPermission(MARKETING_ANALYTICS_PATH);
  const [filters, setFilters] = useState({ from: '', to: '', type: '', channel: '', segment: '', status: '' });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((previous) => ({ ...previous, show: false })), 3500);
  };

  useEffect(() => {
    if (!access.canView) return undefined;
    let active = true;
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    getAnalytics(params)
      .then((result) => {
        if (active) setAnalytics(result || {});
      })
      .catch((error) => {
        if (active) showNotification(error.message || 'Gagal memuat data analitik.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [access.canView, filters.from, filters.to, filters.type, filters.channel, filters.segment, filters.status]);

  const report = useMemo(() => asList(analytics?.data), [analytics]);
  const series = useMemo(() => asList(analytics?.series), [analytics]);

  const reportColumns = useMemo(() => {
    if (report.length === 0) return [];
    return Object.keys(report[0])
      .filter((key) => key !== 'id')
      .map((key) => ({ key, label: COLUMN_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }));
  }, [report]);

  const pagination = useTablePagination(report);
  const range = report.length
    ? `Menampilkan ${pagination.indexOfFirstItem + 1} sampai ${Math.min(pagination.indexOfLastItem, report.length)} dari ${report.length} entri`
    : 'Belum ada laporan';

  const metricIcons = [Mail, MessageCircle, MousePointerClick, Eye, AlertTriangle, BarChart3];
  const summaryEntries = Object.entries(analytics?.summary || {}).slice(0, 12);
  const areaKeys = series.length > 0
    ? Object.keys(series[0]).filter((key) => key !== 'date' && key !== 'label' && typeof series[0][key] === 'number')
    : [];
  const failureKeys = areaKeys.filter((key) => ['failed', 'bounced', 'invalid'].includes(key));

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
  const columns = reportColumns.map((column) => ({
    ...column,
    render: column.key === 'status'
      ? (row) => <StatusBadge status={row.status} />
      : (row) => String(row[column.key] ?? '-')
  }));
  const exportParams = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));

  return (
    <MarketingLayout
      title="Analitik Marketing"
      subtitle="Laporan performa kampanye email dan WhatsApp."
      actions={
        access.canExport ? (
          <>
            <a href={getAnalyticsExportUrl(exportParams, 'pdf')} className="inline-flex items-center gap-2 rounded-xl app-button">
              <Download className="h-4 w-4" /> Ekspor PDF
            </a>
            <a href={getAnalyticsExportUrl(exportParams, 'xlsx')} className="inline-flex items-center gap-2 app-button app-button-primary">
              <Download className="h-4 w-4" /> Ekspor Excel
            </a>
          </>
        ) : null
      }
      filters={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input type="date" value={filters.from} onChange={(event) => setFilters((previous) => ({ ...previous, from: event.target.value }))} className={inputStyle} aria-label="Tanggal mulai" />
          <input type="date" value={filters.to} onChange={(event) => setFilters((previous) => ({ ...previous, to: event.target.value }))} className={inputStyle} aria-label="Tanggal akhir" />
          <select value={filters.type} onChange={(event) => setFilters((previous) => ({ ...previous, type: event.target.value }))} className={inputStyle}>
            <option value="">Semua tipe</option>
            <option value="campaign">Kampanye</option>
            <option value="contact">Kontak</option>
          </select>
          <select value={filters.channel} onChange={(event) => setFilters((previous) => ({ ...previous, channel: event.target.value }))} className={inputStyle}>
            <option value="">Semua kanal</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <input value={filters.segment} onChange={(event) => setFilters((previous) => ({ ...previous, segment: event.target.value }))} placeholder="Segmen" className={inputStyle} />
          <select value={filters.status} onChange={(event) => setFilters((previous) => ({ ...previous, status: event.target.value }))} className={inputStyle}>
            <option value="">Semua status</option>
            <option value="sent">Terkirim</option>
            <option value="delivered">Terdeliver</option>
            <option value="opened">Dibuka</option>
            <option value="clicked">Diklik</option>
            <option value="failed">Gagal</option>
          </select>
        </div>
      }
    >
      {notification.show ? (
        <div className={`fixed top-6 right-6 z-[60] max-w-sm rounded-xl border-l-4 px-6 py-4 shadow-2xl ${notification.type === 'success' ? 'border-green-500 bg-white' : 'border-red-500 bg-white'}`}>
          <p className={`text-sm font-semibold ${notification.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{notification.message}</p>
        </div>
      ) : null}

      <div className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-800">
        <Filter className="h-4 w-4 text-indigo-600" /> Ringkasan Metrik
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryEntries.length === 0 ? <p className="text-sm text-gray-400">Belum ada metrik tersedia.</p> : null}
        {summaryEntries.map(([key, value], index) => {
          const Icon = metricIcons[index % metricIcons.length];
          return (
            <div key={key} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="inline-flex rounded-lg bg-indigo-50 p-2 text-indigo-600"><Icon className="h-4 w-4" /></div>
              <p className="mt-2 text-xs font-semibold uppercase text-gray-500">{SUMMARY_LABELS[key] || key.replace(/_/g, ' ')}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{loading ? '...' : value ?? 0}{String(key).includes('_rate') && value !== undefined ? '%' : ''}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-800">Tren Pengiriman</h2>
          {series.length === 0 || areaKeys.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">Belum ada data tren.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={series} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                {areaKeys.map((key, index) => (
                  <Area key={key} type="monotone" dataKey={key} stroke={['#4f46e5', '#16a34a', '#0891b2', '#7c3aed'][index % 4]} fill={['#e0e7ff', '#dcfce7', '#cffafe', '#ede9fe'][index % 4]} strokeWidth={2} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-800">Grafik Kegagalan</h2>
          {series.length === 0 || failureKeys.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">Belum ada data kegagalan.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={series} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                {failureKeys.map((key, index) => <Bar key={key} dataKey={key} fill={['#ef4444', '#f97316', '#be123c'][index % 3]} radius={[4, 4, 0, 0]} />)}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-bold text-gray-800">Laporan Lengkap</h2>
        </div>
        <MarketingTable
          columns={columns}
          rows={report}
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
    </MarketingLayout>
  );
};

export default MarketingAnalytics;
