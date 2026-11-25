import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import * as Icons from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  USER_URL,
  PORTFOLIO_URL,
  CLIENT_URL,
  LETTER_INVOICE_URL,
  PROJECT_DOCUMENT_URL,
  ARTICLE_URL,
  CATEGORY_URL,
  ACTIVITY_LOG_URL
} from '../Api';
import { useMenuPermission } from '../permissions';
import FeaturePageHeader from '../components/layout/FeaturePageHeader';

const asArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getYear = (item) => {
  const fromContract = toNumber(item.contract_year);
  if (fromContract) return fromContract;
  return parseDate(item.contract_start_date || item.date)?.getFullYear() || new Date().getFullYear();
};

const fullRupiah = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(toNumber(value));

const shortRupiah = (value) => {
  const amount = toNumber(value);
  if (Math.abs(amount) >= 1e9) return `Rp${(amount / 1e9).toFixed(1).replace(/\.0$/, '')} M`;
  if (Math.abs(amount) >= 1e6) return `Rp${(amount / 1e6).toFixed(1).replace(/\.0$/, '')} Jt`;
  if (Math.abs(amount) >= 1e3) return `Rp${(amount / 1e3).toFixed(0)} Rb`;
  return `Rp${amount.toFixed(0)}`;
};

const formatDate = (date) =>
  date ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date) : '-';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
};

const getDisplayName = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    const raw = stored.name || stored.email || '';
    if (raw) return String(raw).split('@')[0];
  } catch {
    return 'Admin';
  }
  return 'Admin';
};

const STATUS_META = {
  Completed: { label: 'Selesai', bar: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700', hex: '#10b981' },
  'In Progress': { label: 'Berjalan', bar: 'bg-indigo-500', soft: 'bg-indigo-50 text-indigo-700', hex: '#6366f1' },
  Pending: { label: 'Menunggu', bar: 'bg-amber-400', soft: 'bg-amber-50 text-amber-700', hex: '#f59e0b' }
};

const statusMeta = (status) =>
  STATUS_META[status] || { label: status || 'Lainnya', bar: 'bg-slate-400', soft: 'bg-slate-100 text-slate-600', hex: '#94a3b8' };

  const quickLinks = [
    { label: 'Portofolio', desc: 'Kelola proyek', icon: Icons.Briefcase, to: '/internal/portfolio', color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Surat & Invoice', desc: 'Dokumen surat', icon: Icons.FileText, to: '/internal/letter', color: 'bg-sky-50 text-sky-600' },
    { label: 'Dokumen Proyek', desc: 'BAP & progress', icon: Icons.FileCheck2, to: '/internal/project-documents', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Alat PDF', desc: 'Konversi PDF', icon: Icons.FileImage, to: '/pdf-tools', color: 'bg-rose-50 text-rose-600' },
    { label: 'Kode QR', desc: 'Buat QR', icon: Icons.QrCode, to: '/qr-code', color: 'bg-violet-50 text-violet-600' },
    { label: 'Filter Foto AI', desc: 'Hapus background', icon: Icons.Sparkles, to: '/ai-photo-filter', color: 'bg-amber-50 text-amber-600' },
    { label: 'Backup Data', desc: 'Dump MySQL & restore', icon: Icons.Database, to: '/backup/housekeeping', color: 'bg-slate-100 text-slate-600' },
    { label: 'Pengaturan', desc: 'Konfigurasi site', icon: Icons.Settings, to: '/setting', color: 'bg-cyan-50 text-cyan-600' }
  ];

const StatCard = ({ title, value, note, icon, color, loading, linkTo }) => {
  const Icon = icon;
  const content = (
    <div className="group h-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-100 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
          {loading ? (
            <div className="mt-3 h-8 w-28 animate-pulse rounded-lg bg-gray-100" />
          ) : (
            <p className="mt-2 truncate text-2xl font-bold text-gray-800">{value}</p>
          )}
          {note && <p className="mt-1 truncate text-xs text-gray-500">{note}</p>}
        </div>
        <div className={`shrink-0 rounded-xl p-3 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {linkTo && (
        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-500 transition group-hover:gap-2">
          Lihat detail <Icons.ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );

  return linkTo ? <Link to={linkTo} className="block h-full">{content}</Link> : content;
};

const FilterSelect = ({ label, value, onChange, children }) => (
  <label className="flex min-w-[140px] flex-col gap-1">
    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
    <select
      value={value}
      onChange={onChange}
      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
    >
      {children}
    </select>
  </label>
);

const DashboardHome = () => {
  const access = useMenuPermission('/dashboard');
  const [data, setData] = useState({
    users: [],
    projects: [],
    clients: [],
    letters: [],
    documents: [],
    articles: [],
    categories: []
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [activePeriod, setActivePeriod] = useState('month');
  const [activeUsers, setActiveUsers] = useState([]);
  const [activeLoading, setActiveLoading] = useState(false);

  useEffect(() => {
    if (!access.canView) return;
    let active = true;
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    const request = (url) => axios.get(url, { headers }).then((response) => asArray(response.data)).catch(() => []);

    Promise.all([
      request(USER_URL),
      request(PORTFOLIO_URL),
      request(CLIENT_URL),
      request(LETTER_INVOICE_URL),
      request(PROJECT_DOCUMENT_URL),
      request(ARTICLE_URL),
      request(CATEGORY_URL)
    ]).then(([users, projects, clients, letters, documents, articles, categories]) => {
      if (!active) return;
      setData({ users, projects, clients, letters, documents, articles, categories });
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [access.canView]);

  useEffect(() => {
    if (!access.canView) return;
    let active = true;
    setActiveLoading(true);
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    axios.get(`${ACTIVITY_LOG_URL}/active-users`, { headers, params: { period: activePeriod } })
      .then((response) => {
        if (!active) return;
        setActiveUsers(asArray(response.data).map((item) => ({ name: item.name, count: toNumber(item.count) })));
      })
      .catch(() => {
        if (active) setActiveUsers([]);
      })
      .finally(() => {
        if (active) setActiveLoading(false);
      });
    return () => { active = false; };
  }, [access.canView, activePeriod]);

  const { users, projects, clients, letters, documents, articles, categories } = data;

  const years = useMemo(
    () => Array.from(new Set(projects.map(getYear))).filter(Boolean).sort((a, b) => b - a),
    [projects]
  );

  const filteredProjects = useMemo(() => projects.filter((project) => {
    const matchStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchYear = yearFilter === 'all' || String(getYear(project)) === String(yearFilter);
    const matchClient = clientFilter === 'all' || String(project.client_id) === String(clientFilter);
    return matchStatus && matchYear && matchClient;
  }), [projects, statusFilter, yearFilter, clientFilter]);

  const revenueTotal = useMemo(
    () => filteredProjects.reduce((sum, project) => sum + toNumber(project.portfolio_value), 0),
    [filteredProjects]
  );

  const statusCards = useMemo(() => ['Completed', 'In Progress', 'Pending'].map((status) => {
    const items = filteredProjects.filter((project) => project.status === status);
    return {
      status,
      ...statusMeta(status),
      count: items.length,
      value: items.reduce((sum, project) => sum + toNumber(project.portfolio_value), 0)
    };
  }), [filteredProjects]);

  const monthlyRevenue = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('id-ID', { month: 'short' });
    const buckets = Array.from({ length: 12 }, (_, index) => ({
      month: formatter.format(new Date(2026, index, 1)),
      value: 0
    }));
    filteredProjects.forEach((project) => {
      const date = parseDate(project.contract_start_date || project.date);
      if (date) buckets[date.getMonth()].value += toNumber(project.portfolio_value);
    });
    return buckets;
  }, [filteredProjects]);

  const invoices = useMemo(
    () => letters.filter((letter) => String(letter.letter_type).toUpperCase() === 'INVOICE'),
    [letters]
  );

  const invoiceTotal = useMemo(() => invoices.reduce((sum, letter) =>
    sum + asArray(letter.invoice_items).reduce((itemSum, item) => itemSum + toNumber(item.amount), 0)
  , 0), [invoices]);

  const publishedArticles = articles.filter((article) => article.status === 'published').length;
  const completedDocuments = documents.filter((document) => document.handover_date).length;

  const recentActivities = useMemo(() => {
    const items = [
      ...projects.slice(0, 5).map((project) => ({
        id: `project-${project.id}`,
        icon: Icons.Briefcase,
        color: 'bg-indigo-50 text-indigo-600',
        title: project.title || project.project_name || 'Proyek',
        subtitle: project.client_name || 'Klien',
        date: parseDate(project.date || project.contract_start_date),
        to: '/internal/portfolio'
      })),
      ...letters.slice(0, 5).map((letter) => ({
        id: `letter-${letter.id}`,
        icon: Icons.FileText,
        color: letter.letter_type === 'INVOICE' ? 'bg-sky-50 text-sky-600' : 'bg-violet-50 text-violet-600',
        title: letter.subject || letter.letter_number || 'Surat',
        subtitle: letter.client_name || 'Klien',
        date: parseDate(letter.letter_date),
        to: '/internal/letter'
      })),
      ...documents.slice(0, 5).map((document) => ({
        id: `document-${document.id}`,
        icon: Icons.FileCheck2,
        color: 'bg-emerald-50 text-emerald-600',
        title: 'Dokumen proyek diperbarui',
        subtitle: document.location || `Proyek #${document.project_id}`,
        date: parseDate(document.updated_at || document.created_at),
        to: '/internal/project-documents'
      }))
    ];

    return items.filter((item) => item.date).sort((a, b) => b.date - a.date).slice(0, 6);
  }, [projects, letters, documents]);

  const progressBase = revenueTotal || 1;
  const activeProjects = projects.filter((project) => project.status === 'In Progress').length;
  const displayName = getDisplayName();

  if (!access.canView) {
    return (
      <div className="app-card app-card-padded text-center text-sm text-slate-500">
        Anda tidak memiliki hak akses untuk melihat data ini.
      </div>
    );
  }

  return (
    <div className="app-page">
      <FeaturePageHeader title="Dasbor" subtitle="Ringkasan aktivitas dan performa bisnis" />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-7 text-white shadow-lg shadow-indigo-200/70">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-56 w-56 rounded-full bg-fuchsia-400/20" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-indigo-50 ring-1 ring-white/20">
              <Icons.CalendarDays className="h-3.5 w-3.5" />
              {formatDate(new Date())}
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {getGreeting()}, {displayName}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-indigo-100">
              Pantau pendapatan, proyek, surat, dan aktivitas tim dari satu tempat.
            </p>
          </div>
          {access.canView && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[420px]">
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                <Icons.Wallet className="h-5 w-5 text-indigo-100" />
                <p className="mt-3 text-xl font-bold">{loading ? '...' : shortRupiah(revenueTotal)}</p>
                <p className="text-[11px] text-indigo-100">Pendapatan</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                <Icons.TrendingUp className="h-5 w-5 text-indigo-100" />
                <p className="mt-3 text-xl font-bold">{loading ? '...' : activeProjects}</p>
                <p className="text-[11px] text-indigo-100">Proyek jalan</p>
              </div>
              <div className="col-span-2 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur sm:col-span-1">
                <Icons.FileText className="h-5 w-5 text-indigo-100" />
                <p className="mt-3 text-xl font-bold">{loading ? '...' : invoices.length}</p>
                <p className="text-[11px] text-indigo-100">Invoice</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {access.canView && (
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Pendapatan Proyek"
          value={fullRupiah(revenueTotal)}
          note={`${filteredProjects.length} proyek terpilih`}
          icon={Icons.Wallet}
          color="bg-emerald-50 text-emerald-600"
          loading={loading}
        />
        <StatCard
          title="Total Pengguna"
          value={users.length}
          note="Pengguna terdaftar"
          icon={Icons.Users}
          color="bg-indigo-50 text-indigo-600"
          loading={loading}
          linkTo="/hak-akses/user"
        />
        <StatCard
          title="Total Klien"
          value={clients.length}
          note="Klien aktif"
          icon={Icons.Building2}
          color="bg-sky-50 text-sky-600"
          loading={loading}
          linkTo="/internal/clients"
        />
      </section>
      )}

      {access.canView && (
      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="app-card app-card-padded">
            <h2 className="mb-4 text-sm font-bold text-slate-800">Filter Dasbor</h2>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Pendapatan Proyek</h3>
              <p className="mt-1 text-sm text-gray-500">Filter status, tahun kontrak, dan klien.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <FilterSelect label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Semua status</option>
                {Object.keys(STATUS_META).map((status) => (
                  <option key={status} value={status}>{statusMeta(status).label}</option>
                ))}
              </FilterSelect>
              <FilterSelect label="Tahun" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
                <option value="all">Semua tahun</option>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </FilterSelect>
              <FilterSelect label="Klien" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
                <option value="all">Semua klien</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </FilterSelect>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-6 rounded-2xl bg-slate-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total pendapatan terfilter</p>
              <p className="mt-1 text-3xl font-bold text-gray-800">{loading ? '...' : fullRupiah(revenueTotal)}</p>
              <p className="mt-1 text-xs text-gray-500">{filteredProjects.length} proyek · {invoiceTotal ? `${invoices.length} invoice senilai ${shortRupiah(invoiceTotal)}` : `${invoices.length} invoice`}</p>
            </div>
            <div className="w-full sm:w-48">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-200">
                {statusCards.map((item) => item.value > 0 && (
                  <div
                    key={item.status}
                    className={item.bar}
                    style={{ width: `${(item.value / progressBase) * 100}%` }}
                    title={`${item.label}: ${fullRupiah(item.value)}`}
                  />
                ))}
              </div>
              <div className="mt-3 space-y-1.5">
                {statusCards.map((item) => (
                  <div key={item.status} className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${item.bar}`} />
                      {item.label}
                    </span>
                    <span>{Math.round((item.value / progressBase) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={shortRupiah} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={68} />
                <Tooltip
                  formatter={(value) => fullRupiah(value)}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)' }}
                />
                <Bar dataKey="value" name="Pendapatan" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Status Proyek</h3>
              <p className="mt-1 text-sm text-gray-500">Berdasarkan filter yang aktif.</p>
            </div>
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <Icons.ChartNoAxesColumn className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6 space-y-5">
            {statusCards.map((item) => (
              <div key={item.status}>
                <div className="flex items-center justify-between text-sm">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${item.soft}`}>{item.label}</span>
                  <span className="font-semibold text-gray-700">{item.count} proyek</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${item.bar}`} style={{ width: `${(item.count / (filteredProjects.length || 1)) * 100}%` }} />
                </div>
                <p className="mt-1.5 text-right text-xs text-gray-400">{shortRupiah(item.value)}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white p-2 text-emerald-600 shadow-sm">
                <Icons.FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{completedDocuments} dokumen selesai</p>
                <p className="text-xs text-gray-500">Dari {documents.length} dokumen proyek</p>
              </div>
            </div>
            <Link to="/internal/project-documents" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
              Lihat dokumen <Icons.ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
      )}

      <section className="grid gap-6 lg:grid-cols-3">
        {access.canView && (
          <>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Aktivitas Terbaru</h3>
                  <p className="mt-1 text-sm text-gray-500">Proyek, surat, dan dokumen terakhir.</p>
                </div>
                <Icons.Clock3 className="h-5 w-5 text-gray-300" />
              </div>
              <div className="mt-5 divide-y divide-gray-100">
                {recentActivities.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-400">Belum ada aktivitas terbaru.</p>
                )}
                {recentActivities.map((activity) => {
                  const ActivityIcon = activity.icon;
                  return (
                    <Link key={activity.id} to={activity.to} className="group flex items-center gap-4 py-3 transition hover:bg-slate-50/70">
                      <div className={`shrink-0 rounded-xl p-2.5 ${activity.color}`}>
                        <ActivityIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-700 group-hover:text-indigo-600">{activity.title}</p>
                        <p className="truncate text-xs text-gray-400">{activity.subtitle}</p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">{formatDate(activity.date)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800">Akses Cepat</h3>
              <p className="mt-1 text-sm text-gray-500">Fitur yang sering digunakan.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {quickLinks.map((link) => {
                  const LinkIcon = link.icon;
                  return (
                    <Link
                      key={link.label}
                      to={link.to}
                      className="group rounded-xl border border-gray-100 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md"
                    >
                      <div className={`inline-flex rounded-lg p-2 ${link.color}`}>
                        <LinkIcon className="h-4 w-4" />
                      </div>
                      <p className="mt-3 text-xs font-semibold text-gray-700 group-hover:text-indigo-600">{link.label}</p>
                      <p className="truncate text-[11px] text-gray-400">{link.desc}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>

      <section className="mt-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-800">User Paling Aktif</h3>
              <p className="mt-1 text-sm text-gray-500">Berdasarkan log aktivitas.</p>
            </div>
            <select
              value={activePeriod}
              onChange={(event) => setActivePeriod(event.target.value)}
              className="rounded-xl border border-gray-200 bg-slate-50/60 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500"
            >
              <option value="week">Per Minggu</option>
              <option value="month">Per Bulan</option>
              <option value="year">Per Tahun</option>
            </select>
          </div>
          <div className="mt-6 h-72">
            {activeLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">Memuat data...</div>
            ) : activeUsers.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">Belum ada aktivitas.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeUsers} layout="vertical" margin={{ top: 8, right: 8, left: 40, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="#eef2f7" />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip
                    cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)' }}
                  />
                  <Bar dataKey="count" name="Aktivitas" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardHome;
