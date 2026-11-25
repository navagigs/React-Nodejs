import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import * as Icons from 'lucide-react';
import { LETTER_URL, PROJECT_DOCUMENT_URL, PORTFOLIO_URL } from './Api';
import { logActivity, logButtonClick } from './activityLog';

const PAGE_TITLES = {
  '/dashboard': 'Dasbor',
  '/internal/clients': 'Klien',
  '/internal/project-documents': 'Dokumen Proyek',
  '/internal/letter': 'Surat',
  '/internal/portfolio': 'Portofolio',
  '/category': 'Kategori',
  '/articles': 'Artikel',
  '/hak-akses/menu': 'Manajemen Menu',
  '/hak-akses/role': 'Manajemen Role',
  '/hak-akses/user': 'Manajemen User',
  '/hak-akses/module-authority': 'Otorisasi Modul',
  '/setting': 'Konfigurasi Aplikasi',
  '/qr-code': 'Pembuat Kode QR',
  '/pdf-tools': 'Alat PDF',
  '/ai-photo-filter': 'Filter Foto AI',
  '/backup': 'Backup & Log',
  '/backup/housekeeping': 'Backup Data',
  '/backup/log': 'Log Aktivitas Admin',
  '/marketing-center/dashboard': 'Dashboard Marketing',
  '/marketing-center/contacts': 'Kontak & Database',
  '/marketing-center/groups': 'Grup & Segmentasi',
  '/marketing-center/email': 'Email Marketing',
  '/marketing-center/whatsapp': 'WhatsApp Marketing',
  '/marketing-center/campaigns': 'Campaign Management',
  '/marketing-center/templates': 'Template Pesan',
  '/marketing-center/analytics': 'Analytics & Reports',
  '/marketing-center/settings': 'Integrasi & Pengaturan'
};

const titleFromPath = (pathname) => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || 'dashboard';
  return lastSegment.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const SEARCH_ITEMS = [
  { label: 'Dasbor', path: '/dashboard', icon: Icons.LayoutDashboard, keywords: 'beranda ringkasan home overview' },
  { label: 'Klien', path: '/internal/clients', icon: Icons.Building2, keywords: 'klien pelanggan client' },
  { label: 'Dokumen Proyek', path: '/internal/project-documents', icon: Icons.FolderOpen, keywords: 'dokumen proyek bap berita acara' },
  { label: 'Surat', path: '/internal/letter', icon: Icons.FileText, keywords: 'surat invoice permohonan' },
  { label: 'Portofolio', path: '/internal/portfolio', icon: Icons.Briefcase, keywords: 'proyek portfolio pendapatan kontrak' },
  { label: 'Kategori', path: '/category', icon: Icons.Tags, keywords: 'kategori artikel' },
  { label: 'Artikel', path: '/articles', icon: Icons.Newspaper, keywords: 'artikel berita konten' },
  { label: 'Manajemen Menu', path: '/hak-akses/menu', icon: Icons.ListTree, keywords: 'menu navigasi hak akses' },
  { label: 'Manajemen Role', path: '/hak-akses/role', icon: Icons.ShieldCheck, keywords: 'role peran hak akses' },
  { label: 'Manajemen User', path: '/hak-akses/user', icon: Icons.Users, keywords: 'user pengguna akun admin' },
  { label: 'Otorisasi Modul', path: '/hak-akses/module-authority', icon: Icons.ShieldCheck, keywords: 'modul otorisasi permission akses' },
  { label: 'Konfigurasi Aplikasi', path: '/setting', icon: Icons.Settings, keywords: 'pengaturan konfigurasi setting website' },
  { label: 'Pembuat Kode QR', path: '/qr-code', icon: Icons.QrCode, keywords: 'qr barcode generate' },
  { label: 'Alat PDF', path: '/pdf-tools', icon: Icons.FileImage, keywords: 'pdf gambar word konversi ocr' },
  { label: 'Filter Foto AI', path: '/ai-photo-filter', icon: Icons.Sparkles, keywords: 'foto gambar background ai filter' },
  { label: 'Backup Data', path: '/backup/housekeeping', icon: Icons.Database, keywords: 'backup cadangan ekspor data dump mysql sql csv unduh restore pulihkan riwayat server' },
  { label: 'Log Aktivitas Admin', path: '/backup/log', icon: Icons.History, keywords: 'log aktivitas activity history user edit hapus tambah klik waktu' },
  { label: 'Dashboard Marketing', path: '/marketing-center/dashboard', icon: Icons.LayoutDashboard, keywords: 'marketing dashboard campaign email whatsapp statistik' },
  { label: 'Kontak & Database', path: '/marketing-center/contacts', icon: Icons.Users, keywords: 'kontak penerima database email whatsapp import export' },
  { label: 'Grup & Segmentasi', path: '/marketing-center/groups', icon: Icons.UsersRound, keywords: 'grup segmentasi pelanggan prospek mitra karyawan' },
  { label: 'Email Marketing', path: '/marketing-center/email', icon: Icons.Mail, keywords: 'email kampanye pengiriman massal newsletter' },
  { label: 'WhatsApp Marketing', path: '/marketing-center/whatsapp', icon: Icons.MessageCircle, keywords: 'whatsapp broadcast cloud api pesan kampanye' },
  { label: 'Campaign Management', path: '/marketing-center/campaigns', icon: Icons.Megaphone, keywords: 'kampanye campaign jadwal kirim monitoring' },
  { label: 'Template Pesan', path: '/marketing-center/templates', icon: Icons.FileText, keywords: 'template email whatsapp pesan' },
  { label: 'Analytics & Reports', path: '/marketing-center/analytics', icon: Icons.BarChart3, keywords: 'laporan analitik open rate click rate delivery rate' },
  { label: 'Integrasi & Pengaturan', path: '/marketing-center/settings', icon: Icons.Settings, keywords: 'smtp sendgrid ses brevo whatsapp token webhook integrasi' }
];

const parseNotificationDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatRelativeDate = (date) => {
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(date);
};

const buildNotifications = (letters, documents, projects) => {
  const items = [
    ...letters.slice(0, 3).map((letter) => ({
      id: `letter-${letter.id}`,
      icon: Icons.FileText,
      color: letter.letter_type === 'INVOICE' ? 'bg-sky-50 text-sky-600' : 'bg-violet-50 text-violet-600',
      title: letter.letter_type === 'INVOICE' ? 'Invoice baru dibuat' : 'Surat baru dibuat',
      description: letter.subject || letter.letter_number || 'Lihat detail surat',
      date: parseNotificationDate(letter.letter_date || letter.created_at),
      to: '/internal/letter'
    })),
    ...documents.slice(0, 2).map((document) => ({
      id: `document-${document.id}`,
      icon: Icons.FileCheck2,
      color: 'bg-emerald-50 text-emerald-600',
      title: 'Dokumen proyek diperbarui',
      description: document.location || `Proyek #${document.project_id}`,
      date: parseNotificationDate(document.updated_at || document.created_at),
      to: '/internal/project-documents'
    })),
    ...projects.slice(0, 2).map((project) => ({
      id: `project-${project.id}`,
      icon: Icons.Briefcase,
      color: 'bg-indigo-50 text-indigo-600',
      title: 'Proyek terbaru',
      description: project.title || project.project_name || 'Lihat detail proyek',
      date: parseNotificationDate(project.date || project.created_at),
      to: '/internal/portfolio'
    }))
  ];

  return items
    .filter((item) => item.date)
    .sort((first, second) => second.date - first.date)
    .slice(0, 6);
};

const IconButton = ({ icon: Icon, count, onClick, label, active }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`relative rounded-lg p-1.5 transition ${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-slate-100 hover:text-indigo-600'}`}
  >
    {React.createElement(Icon, { className: 'w-5 h-5' })}
    {count > 0 && (
      <span className="absolute -top-0.5 -right-0.5 flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
        {count}
      </span>
    )}
  </button>
);

const decodeTokenUser = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return {};
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));
    return {
      name: decoded.email ? decoded.email.split('@')[0] : '',
      email: decoded.email || ''
    };
  } catch {
    return {};
  }
};

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && (parsed.name || parsed.email)) return parsed;
    }
  } catch (error) {
    console.error(error);
  }
  return decodeTokenUser();
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(getStoredUser);

  // State Sidebar
  const [openMenu, setOpenMenu] = useState(''); 
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // State Profile Dropdown
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    const request = (url) => axios.get(url, { headers })
      .then((response) => (Array.isArray(response.data) ? response.data : []))
      .catch(() => []);

    Promise.all([request(LETTER_URL), request(PROJECT_DOCUMENT_URL), request(PORTFOLIO_URL)])
      .then(([letters, documents, projects]) => {
        const items = buildNotifications(letters, documents, projects);
        setNotifications(items);
        setUnreadCount(items.length);
      });
  }, []);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return SEARCH_ITEMS.slice(0, 5);
    return SEARCH_ITEMS.filter((item) =>
      `${item.label} ${item.keywords}`.toLowerCase().includes(query)
    ).slice(0, 6);
  }, [searchQuery]);

  // Cek Login & event listener untuk klik di luar dropdown
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/');

    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [navigate]);

  useEffect(() => {
    const handleActionClick = (event) => {
      const button = event.target.closest('button, a');
      if (!button) return;
      logButtonClick(button, titleFromPath(location.pathname));
    };
    document.addEventListener('click', handleActionClick);
    return () => document.removeEventListener('click', handleActionClick);
  }, [location.pathname]);

  const goToSearchResult = (path) => {
    const item = SEARCH_ITEMS.find((entry) => entry.path === path);
    logActivity({
      action: 'view',
      module: item?.label || titleFromPath(path),
      description: `Klik hasil pencarian ${item?.label || path}`
    });
    navigate(path);
    setSearchQuery('');
    setIsSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsSearchOpen(false);
      return;
    }
    if (event.key === 'Enter' && searchResults.length > 0) {
      event.preventDefault();
      goToSearchResult(searchResults[0].path);
    }
  };

  const closeHeaderMenus = () => {
    setIsProfileOpen(false);
    setIsNotificationOpen(false);
    setIsSearchOpen(false);
  };

  const goToPage = (path) => {
    closeHeaderMenus();
    navigate(path);
  };

  const openNotification = (notification) => {
    setUnreadCount((current) => Math.max(0, current - 1));
    goToPage(notification.to);
  };

  const handleLogout = () => {
    logActivity({ action: 'logout', module: 'Login', description: 'User keluar dari sistem' });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role_id');
    localStorage.removeItem('permissions');
    setUser({});
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-gray-800">

      <Sidebar 
         openMenu={openMenu} 
         setOpenMenu={setOpenMenu} 
         isMobileOpen={mobileMenuOpen}
         setIsMobileOpen={setMobileMenuOpen}
         isCollapsed={isSidebarCollapsed}
         setIsCollapsed={setIsSidebarCollapsed}
      />

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* === TOPBAR YANG DISEMPURNAKAN === */}
        <header data-no-activity-log className="h-16 bg-white border-b border-gray-200/75 shadow-sm flex items-center justify-between px-6 z-10 shrink-0">
            {/* Sisi Kiri: Tombol Menu & Search Bar */}
            <div className="flex items-center gap-4">
                <button className="md:hidden text-gray-500 hover:text-indigo-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  <Icons.Menu className="w-6 h-6" />
                </button>
                <div className="relative hidden sm:block" ref={searchRef}>
                    <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2 w-72 border border-transparent transition focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                       <Icons.Search className="w-4 h-4 shrink-0 text-gray-400" />
                       <input
                         type="text"
                         value={searchQuery}
                         placeholder="Cari halaman atau fitur..."
                         onChange={(event) => {
                           setSearchQuery(event.target.value);
                           setIsSearchOpen(true);
                         }}
                         onFocus={() => setIsSearchOpen(true)}
                         onKeyDown={handleSearchKeyDown}
                         className="bg-transparent border-none focus:outline-none text-sm ml-2 w-full min-w-0 text-gray-700 placeholder-gray-400"
                       />
                       {searchQuery && (
                         <button
                           type="button"
                           onClick={() => setSearchQuery('')}
                           aria-label="Bersihkan pencarian"
                           className="ml-1 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                         >
                           <Icons.X className="w-3.5 h-3.5" />
                         </button>
                       )}
                    </div>
                    {isSearchOpen && (
                      <div className="app-dropdown-panel absolute left-0 right-0 top-full mt-2 rounded-xl bg-white p-2">
                        <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {searchQuery.trim() ? 'Hasil pencarian' : 'Akses cepat'}
                        </p>
                        {searchResults.length === 0 ? (
                          <p className="px-2 py-4 text-center text-xs text-gray-400">Tidak ada halaman yang cocok.</p>
                        ) : (
                          searchResults.map((item) => {
                            const ItemIcon = item.icon;
                            return (
                              <button
                                key={item.path}
                                type="button"
                                onClick={() => goToSearchResult(item.path)}
                                className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                              >
                                <span className="rounded-md bg-slate-100 p-1.5 text-gray-500 transition group-hover:bg-white">
                                  <ItemIcon className="w-4 h-4" />
                                </span>
                                <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                                <Icons.ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-gray-300" />
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                </div>
            </div>

            {/* Sisi Kanan: Ikon & Profil */}
            <div className="flex items-center gap-2 sm:gap-4">
                <div className="relative" ref={notificationRef}>
                    <IconButton
                      icon={Icons.Bell}
                      count={unreadCount}
                      label="Notifikasi"
                      active={isNotificationOpen}
                      onClick={() => setIsNotificationOpen((open) => !open)}
                    />
                    {isNotificationOpen && (
                      <div className="app-dropdown-panel absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-white">
                        <div className="flex items-center justify-between px-4 pb-1 pt-3">
                          <div>
                            <p className="text-sm font-bold text-gray-800">Notifikasi</p>
                            <p className="text-[11px] text-gray-400">{unreadCount} belum dibaca</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setUnreadCount(0)}
                            className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-800"
                          >
                            Tandai dibaca
                          </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto p-2">
                          {notifications.length === 0 ? (
                            <p className="px-2 py-8 text-center text-xs text-gray-400">Belum ada notifikasi.</p>
                          ) : (
                            notifications.map((notification) => {
                              const NotificationIcon = notification.icon;
                              return (
                                <button
                                  key={notification.id}
                                  type="button"
                                  onClick={() => openNotification(notification)}
                                  className="group flex w-full gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-slate-50"
                                >
                                  <span className={`shrink-0 rounded-lg p-2 ${notification.color}`}>
                                    <NotificationIcon className="h-4 w-4" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-start justify-between gap-2">
                                      <span className="truncate text-sm font-semibold text-gray-700 group-hover:text-indigo-600">
                                        {notification.title}
                                      </span>
                                      <span className="shrink-0 text-[10px] text-gray-400">
                                        {formatRelativeDate(notification.date)}
                                      </span>
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-gray-500">{notification.description}</span>
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => goToPage('/dashboard')}
                          className="w-full px-4 py-2.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                        >
                          Lihat dashboard
                        </button>
                      </div>
                    )}
                </div>

                <IconButton
                  icon={Icons.Settings}
                  label="Pengaturan"
                  active={location.pathname === '/setting'}
                  onClick={() => goToPage('/setting')}
                />

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                    <button
                      type="button"
                      onClick={() => setIsProfileOpen((open) => !open)}
                      className="flex items-center gap-3 rounded-lg p-1 transition hover:bg-slate-100"
                    >
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
                          {(user.name || user.email || 'U').trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="hidden sm:flex items-center gap-1">
                            <span className="text-sm font-semibold text-gray-700">{user.name || user.email || 'User'}</span>
                            <Icons.ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </button>
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-3 w-60 rounded-xl bg-white p-2">
                              <div className="flex items-center gap-3 p-2 pb-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                                  {(user.name || user.email || 'U').trim().charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-gray-800">{user.name || user.email || 'User'}</p>
                                  <p className="truncate text-xs text-gray-500">{user.email || '-'}</p>
                                </div>
                              </div>
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => goToPage('/hak-akses/user')}
                                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-600 transition hover:bg-slate-100 hover:text-indigo-600"
                                >
                                  <Icons.User className="w-4 h-4" /> Profil Saya
                                </button>
                                <button
                                  type="button"
                                  onClick={() => goToPage('/setting')}
                                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-600 transition hover:bg-slate-100 hover:text-indigo-600"
                                >
                                  <Icons.Settings className="w-4 h-4" /> Pengaturan Aplikasi
                                </button>
                              </div>
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={handleLogout}
                                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-500 transition hover:bg-red-50"
                                >
                                  <Icons.LogOut className="w-4 h-4" /> Keluar
                                </button>
                              </div>
                        </div>
                    )}
                </div>
            </div>
        </header>

        {/* === AREA KONTEN DENGAN PAGE HEADER === */}
         <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <Outlet />

        </div>
      </main>
    </div>
  );
};

export default Dashboard;