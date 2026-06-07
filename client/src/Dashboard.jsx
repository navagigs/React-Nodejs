import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom'; // Import Outlet & useLocation
import Sidebar from './Sidebar';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State Sidebar
  const [openMenu, setOpenMenu] = useState(''); 
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // State Profile
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Cek Login
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

  // Tentukan Judul Halaman berdasarkan URL
  const getPageTitle = () => {
      if (location.pathname === '/dashboard/portfolio') return 'Project Management';
      return 'Dashboard Overview';
  };

  return (
    <div className="flex h-screen bg-[#F4F5F7] font-sans text-gray-600">
      
      <Sidebar 
         openMenu={openMenu} 
         setOpenMenu={setOpenMenu} 
         isMobileOpen={mobileMenuOpen}
         setIsMobileOpen={setMobileMenuOpen}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 z-10">
            <div className="flex items-center gap-4">
                <button className="md:hidden text-gray-500 hover:text-indigo-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
                {/* Search Bar... (sama) */}
                <div className="hidden sm:flex items-center bg-gray-100 rounded-full px-4 py-2 w-64">
                   <span className="text-gray-400">🔍</span>
                   <input type="text" placeholder="Search..." className="bg-transparent border-none focus:outline-none text-sm ml-2 w-full text-gray-600" />
                </div>
            </div>

            <div className="flex items-center gap-5">
                {/* Profile Dropdown... (sama) */}
                <div className="relative" ref={profileRef}>
                    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                        <img src="https://i.pravatar.cc/150?img=33" alt="User" className="w-9 h-9 rounded-full border border-gray-200 p-0.5" />
                        <span className="text-sm font-medium text-gray-600 hidden sm:block">Admin ▼</span>
                    </div>
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-3 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50 transform origin-top-right transition-all">
                             <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition text-left">Sign Out</button>
                        </div>
                    )}
                </div>
            </div>
        </header>

       {/* --- AREA KONTEN --- */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="flex justify-between items-center mb-8">
                {/* Logic Judul Halaman Sederhana */}
                {/* <h1 className="text-2xl font-bold text-gray-800">
                    {location.pathname === '/portfolio' ? 'Project Management' : 'Dashboard Overview'}
                </h1> */}
            </div>

            {/* Outlet ini akan berubah isi sesuai URL: 
                - Kalau /dashboard -> isinya DashboardHome
                - Kalau /portfolio -> isinya Portfolio 
            */}
            <Outlet />
             
        </div>
      </main>
    </div>
  );
};

export default Dashboard;