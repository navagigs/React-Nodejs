import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import * as Icons from 'lucide-react';

// --- KOMPONEN SINGLE MENU ---
const SingleMenuItem = ({ title, icon: Icon, onClick, isActive, className = '' }) => {
  return (
    <div 
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors ${
            isActive 
            ? 'bg-indigo-50 text-indigo-600' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        } ${className}`}
    >
        {/* Render Icon jika ada */}
        {Icon && <Icon className="w-5 h-5" />}
        <span className="font-medium text-sm">{title}</span>
    </div>
  );
};

const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const [isAccessDropdownOpen, setIsAccessDropdownOpen] = useState(false);
  const [isBackupDropdownOpen, setIsBackupDropdownOpen] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);

  // State khusus untuk Dropdown Berita
  const [isNewsDropdownOpen, setIsNewsDropdownOpen] = useState(false);

  // Effect: Otomatis buka dropdown jika URL aktif adalah sub-menu berita
  useEffect(() => {
    if (location.pathname === '/news' || location.pathname === '/category') {
      setIsNewsDropdownOpen(true);
    }
  }, [location.pathname]);

  // Fungsi navigasi
  const handleNavigation = (path) => {
      navigate(path);
      if (window.innerWidth < 768) setIsMobileOpen(false); 
  };

  // Cek apakah parent "Berita" harus aktif
  const isNewsActive = location.pathname === '/news' || location.pathname === '/category';

  return (
    <>
       {/* Overlay Mobile */}
       {isMobileOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsMobileOpen(false)}></div>}

      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        
        {/* Header Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-100">
            <h1 className="text-2xl font-bold text-indigo-600">Admin<span className="text-gray-800">Panel</span></h1>
        </div>

        <nav className="mt-6 px-2 space-y-1">
            
          {/* 1. Dashboard */}
          <SingleMenuItem 
             title="Dashboard" 
             icon={Icons.Home} 
             isActive={location.pathname === '/dashboard'} 
             onClick={() => handleNavigation('/dashboard')}
          /> 

          {/* 2. Client */}
          <SingleMenuItem 
             title="Client" 
             icon={Icons.Users} // Saya ganti ke Users biar lebih cocok
             isActive={location.pathname === '/clients'} 
             onClick={() => handleNavigation('/clients')} 
          />

          <SingleMenuItem 
            title="Surat Keluar" 
            icon={Icons.Mail} // Menggunakan ikon Mail/Envelope agar lebih representatif untuk surat
            isActive={location.pathname === '/letter'} 
            onClick={() => handleNavigation('/letter')} 
          />


          {/* 3. Portfolio */}
          <SingleMenuItem 
             title="Portfolio" 
             icon={Icons.Briefcase} // Saya ganti ke Briefcase biar variatif
             isActive={location.pathname === '/portfolio'} 
             onClick={() => handleNavigation('/portfolio')} 
          />

          {/* ================================================= */}
          {/* 4. DROPDOWN MANAJEMEN BERITA (GABUNGAN)           */}
          {/* ================================================= */}
          <div className="pt-2 pb-1">
            <button 
                onClick={() => setIsNewsDropdownOpen(!isNewsDropdownOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors max-w-[calc(100%-16px)] ${
                    isNewsActive 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
                <div className="flex items-center gap-3">
                    <Icons.Newspaper className="w-5 h-5" />
                    <span className="font-medium text-sm"> News</span>
                </div>
                {/* Chevron Icon Animation */}
                <Icons.ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isNewsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Sub Menu Container */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isNewsDropdownOpen ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-1 relative">
                    {/* Garis vertikal penanda sub-menu */}
                    <div className="absolute left-[34px] top-0 bottom-0 w-0.5 bg-gray-100"></div>

                    {/* Sub-menu 1: Daftar Berita */}
                    <SingleMenuItem 
                        title="News" 
                        // Tidak perlu icon di sub-menu agar bersih, atau bisa pakai Icons.Dot
                        isActive={location.pathname === '/news'} 
                        onClick={() => handleNavigation('/news')} 
                        className="pl-12 !mx-2 text-sm" // Indentasi khusus
                    />

                    {/* Sub-menu 2: Kategori */}
                    <SingleMenuItem 
                        title="Category" 
                        isActive={location.pathname === '/category'} 
                        onClick={() => handleNavigation('/category')}
                        className="pl-12 !mx-2 text-sm" // Indentasi khusus
                    />
                </div>
            </div>
          </div>

         {/* ================================================= */}
{/* 1. DROPDOWN ACCESS MANAGEMENT                    */}
{/* ================================================= */}
<div className="pt-2 pb-1">
  <button 
      onClick={() => setIsAccessDropdownOpen(!isAccessDropdownOpen)}
      className={`w-full flex items-center justify-between px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors max-w-[calc(100%-16px)] ${
          location.pathname.startsWith('/hak_akses') 
          ? 'bg-indigo-50 text-indigo-600' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
  >
      <div className="flex items-center gap-3">
          {/* Menggunakan icon mdi-text-box-multiple-outline / Shield atau Folder */}
          <Icons.ShieldAlert className="w-5 h-5" />
          <span className="font-medium text-sm">Access Management</span>
      </div>
      <Icons.ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isAccessDropdownOpen ? 'rotate-180' : ''}`} />
  </button>

  {/* Sub Menu Container */}
  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isAccessDropdownOpen ? 'max-h-64 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
      <div className="space-y-1 relative">
          <div className="absolute left-[34px] top-0 bottom-0 w-0.5 bg-gray-100"></div>

          <SingleMenuItem 
              title="Module Admin" 
              isActive={location.pathname === '/menu'} 
              onClick={() => handleNavigation('/menu')} 
              className="pl-12 !mx-2 text-sm"
          />
          <SingleMenuItem 
              title="Module Authority" 
              isActive={location.pathname === '/hak_akses/otoritas_modul'} 
              onClick={() => handleNavigation('/hak_akses/otoritas_modul')} 
              className="pl-12 !mx-2 text-sm"
          />
          <SingleMenuItem 
              title="User Management" 
              isActive={location.pathname === '/hak_akses/user'} 
              onClick={() => handleNavigation('/hak_akses/user')} 
              className="pl-12 !mx-2 text-sm"
          />
          <SingleMenuItem 
              title="Role Management" 
              isActive={location.pathname === '/hak_akses/role'} 
              onClick={() => handleNavigation('/hak_akses/role')} 
              className="pl-12 !mx-2 text-sm"
          />
      </div>
  </div>
</div>

{/* ================================================= */}
{/* 2. DROPDOWN BACKUP AND LOG                       */}
{/* ================================================= */}
<div className="pt-2 pb-1">
  <button 
      onClick={() => setIsBackupDropdownOpen(!isBackupDropdownOpen)}
      className={`w-full flex items-center justify-between px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors max-w-[calc(100%-16px)] ${
          location.pathname.startsWith('/backup') 
          ? 'bg-indigo-50 text-indigo-600' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
  >
      <div className="flex items-center gap-3">
          <Icons.Database className="w-5 h-5" />
          <span className="font-medium text-sm">Backup and Log</span>
      </div>
      <Icons.ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isBackupDropdownOpen ? 'rotate-180' : ''}`} />
  </button>

  {/* Sub Menu Container */}
  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isBackupDropdownOpen ? 'max-h-32 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
      <div className="space-y-1 relative">
          <div className="absolute left-[34px] top-0 bottom-0 w-0.5 bg-gray-100"></div>

          <SingleMenuItem 
              title="Log Activity Admin" 
              isActive={location.pathname === '/backup/log'} 
              onClick={() => handleNavigation('/backup/log')} 
              className="pl-12 !mx-2 text-sm"
          />
          <SingleMenuItem 
              title="Backup & Housekeeping" 
              isActive={location.pathname === '/backup/housekeeping'} 
              onClick={() => handleNavigation('/backup/housekeeping')} 
              className="pl-12 !mx-2 text-sm"
          />
      </div>
  </div>
</div>

{/* ================================================= */}
{/* 3. DROPDOWN DATA ADMINISTRATION                  */}
{/* ================================================= */}
<div className="pt-2 pb-1">
  <button 
      onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
      className={`w-full flex items-center justify-between px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors max-w-[calc(100%-16px)] ${
          location.pathname.startsWith('/administrasi') 
          ? 'bg-indigo-50 text-indigo-600' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
  >
      <div className="flex items-center gap-3">
          <Icons.FolderLock className="w-5 h-5" />
          <span className="font-medium text-sm">Data Administration</span>
      </div>
      <Icons.ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isAdminDropdownOpen ? 'rotate-180' : ''}`} />
  </button>

  {/* Sub Menu Container */}
  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isAdminDropdownOpen ? 'max-h-32 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
      <div className="space-y-1 relative">
          <div className="absolute left-[34px] top-0 bottom-0 w-0.5 bg-gray-100"></div>

          <SingleMenuItem 
              title="Proyek" 
              isActive={location.pathname === '/administrasi/mproyek'} 
              onClick={() => handleNavigation('/administrasi/mproyek')} 
              className="pl-12 !mx-2 text-sm"
          />
          {/* <SingleMenuItem 
              title="Kelompok" 
              isActive={location.pathname === '/administrasi/mkelompok'} 
              onClick={() => handleNavigation('/administrasi/mkelompok')} 
              className="pl-12 !mx-2 text-sm"
          /> */}
      </div>
  </div>
</div>

          
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;