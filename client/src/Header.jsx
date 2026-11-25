import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { MENU_URL_ACCESS_BY_ROLE } from './Api';

const Header = ({ isMobileMenuOpen, setIsMobileMenuOpen, isProfileOpen, setIsProfileOpen, profileRef, handleLogout }) => {
  const navigate = useNavigate();
  const profileDropdownRef = useRef(null);

  // Menggabungkan ref internal dan eksternal untuk amannya menutup dropdown profile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef?.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileRef, setIsProfileOpen]);

  const IconButton = ({ icon: Icon, count }) => (
    <button className="relative text-slate-500 hover:text-slate-800 transition-colors focus:outline-none p-2 hover:bg-slate-50 rounded-full">
      <Icon className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
          {count}
        </span>
      )}
    </button>
  );

  return (
    <header className="bg-white text-slate-800 shadow-sm z-40 sticky top-0 border-b border-slate-100 h-16">
      <div className="mx-auto px-6 h-full">
        <div className="flex items-center justify-between h-full">
          
          {/* Sisi Kiri: Tombol Menu Seluler & Search Bar seperti gambar */}
          <div className="flex items-center flex-1 max-w-xl gap-4">
            <button className="lg:hidden text-slate-500 hover:text-slate-800" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <Icons.X className="w-6 h-6" /> : <Icons.Menu className="w-6 h-6" />}
            </button>
            
            {/* Input Search besar di tengah/kiri sesuai gambar */}
            <div className="relative w-full hidden sm:block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Icons.Search className="w-4 h-4 text-slate-400" />
              </span>
              <input 
                type="text" 
                placeholder="Cari apa saja..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700"
              />
            </div>
          </div>

          {/* Sisi Kanan: Teks Menu Tambahan, Fitur, dan Avatar Profil */}
          <div className="flex items-center gap-6">
            
            {/* Teks link tengah kanan di gambar */}
            <div className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-500">
              <a href="#" className="hover:text-slate-800 transition-colors">Laporan & Analitik</a>
              <a href="#" className="hover:text-slate-800 transition-colors">Bantuan</a>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden lg:block"></div>

            {/* Icon Group */}
            <div className="flex items-center gap-2">
              <IconButton icon={Icons.Sun} />
              <IconButton icon={Icons.Mail} count={1} />
              <IconButton icon={Icons.Bell} count={3} />
              <IconButton icon={Icons.Calendar} />
            </div>

            <div className="h-6 w-px bg-slate-200"></div>

            {/* Akun Pengguna / Profile */}
            <div className="relative" ref={profileRef}>
              <div className="flex items-center gap-3 cursor-pointer select-none group" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-800 leading-tight">Robert Brown</p>
                  <p className="text-xs text-slate-400 font-medium">Manager</p>
                </div>
                <img 
                  src="https://i.pravatar.cc/150?img=33" 
                  alt="User" 
                  className="w-9 h-9 rounded-full object-cover border-2 border-transparent group-hover:border-blue-500 transition-colors shadow-sm" 
                />
              </div>

              {/* Dropdown Card */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className='p-2'>
                    <p className='text-sm font-bold text-slate-800'>Robert Brown</p>
                    <p className='text-xs text-slate-400'>robert.brown@example.com</p>
                  </div>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                    <Icons.User className="w-4 h-4 text-slate-400" /> Profil
                  </a>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                    <Icons.Settings className="w-4 h-4 text-slate-400" /> Pengaturan Akun
                  </a>
                  <div className='w-full h-px bg-slate-100 my-1.5'></div>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors text-left font-semibold">
                    <Icons.LogOut className="w-4 h-4" /> Keluar
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;