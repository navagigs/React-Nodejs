import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Outlet, useLocation, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import * as Icons from 'lucide-react';

// Komponen IconButton untuk di Header
const IconButton = ({ icon: Icon, count }) => (
  <button className="relative text-gray-500 hover:text-indigo-600 focus:outline-none">
    <Icon className="w-6 h-6" />
    {count > 0 && (
      <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
        {count}
      </span>
    )}
  </button>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State Sidebar
  const [openMenu, setOpenMenu] = useState(''); 
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // State Profile Dropdown
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Cek Login & event listener untuk klik di luar dropdown
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/');

    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  // --- Mendapatkan Judul Halaman & Breadcrumbs ---
  const getPageInfo = () => {
    const path = location.pathname;
    // Anda dapat mengembangkan logika ini lebih lanjut berdasarkan menu atau file routing
    const segments = path.split('/').filter(Boolean);
    const title = segments.length > 1 
      ? segments[segments.length - 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : 'Dashboard';

    const breadcrumbs = segments.map((segment, index) => ({
      name: segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      path: '/' + segments.slice(0, index + 1).join('/'),
      isCurrent: index === segments.length - 1
    }));

    return { title, breadcrumbs };
  };

  const { title, breadcrumbs } = getPageInfo();

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
        <header className="h-16 bg-white border-b border-gray-200/75 shadow-sm flex items-center justify-between px-6 z-10 shrink-0">
            {/* Sisi Kiri: Tombol Menu & Search Bar */}
            <div className="flex items-center gap-4">
                <button className="md:hidden text-gray-500 hover:text-indigo-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  <Icons.Menu className="w-6 h-6" />
                </button>
                <div className="hidden sm:flex items-center bg-slate-100 rounded-lg px-3 py-2 w-64">
                   <Icons.Search className="w-4 h-4 text-gray-400" />
                   <input type="text" placeholder="Search anything..." className="bg-transparent border-none focus:outline-none text-sm ml-2 w-full text-gray-700 placeholder-gray-400" />
                </div>
            </div>

            {/* Sisi Kanan: Ikon & Profil */}
            <div className="flex items-center gap-6">
                <IconButton icon={Icons.Bell} count={3} />
                <IconButton icon={Icons.Settings} />

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                        <img src="https://i.pravatar.cc/150?img=33" alt="User" className="w-9 h-9 rounded-full object-cover" />
                        <div className="hidden sm:block">
                            <span className="text-sm font-semibold text-gray-700">Admin</span>
                            <Icons.ChevronDown className={`inline w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </div>
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-3 w-56 bg-white rounded-lg shadow-xl border border-gray-100 p-2 z-50 animate-fade-in-up">
                             <div className='p-2'>
                               <p className='text-sm font-semibold'>Administrator</p>
                               <p className='text-xs text-gray-500'>admin@example.com</p>
                             </div>
                             <div className='w-full h-px bg-gray-100 my-1'></div>
                             <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-slate-100 hover:text-indigo-600 rounded-md">
                                <Icons.User className="w-4 h-4" /> Profile
                             </a>
                             <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-md transition text-left">
                               <Icons.LogOut className="w-4 h-4" /> Sign Out
                             </button>
                        </div>
                    )}
                </div>
            </div>
        </header>

       {/* === AREA KONTEN DENGAN PAGE HEADER === */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                <nav className="text-sm font-medium text-gray-500 mt-2" aria-label="Breadcrumb">
                    <ol className="list-none p-0 inline-flex items-center">
                        <li className="flex items-center">
                            <Link to="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
                        </li>
                        {breadcrumbs.slice(1).map((crumb, index) => (
                            <li key={index} className="flex items-center">
                                <Icons.ChevronRight className="h-4 w-4 mx-1" />
                                {crumb.isCurrent ? (
                                    <span className="text-gray-400">{crumb.name}</span>
                                ) : (
                                    <Link to={crumb.path} className="hover:text-indigo-600">{crumb.name}</Link>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>
            </div>

            <Outlet />

        </div>
      </main>
    </div>
  );
};

export default Dashboard;