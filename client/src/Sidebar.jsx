import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { MENU_URL_ACCESS_BY_ROLE } from './Api';

// --- FUNGSI UTAMA UNTUK CEK NORMALISASI PATH AGAR PASTI COCOK ---
const checkActivePath = (currentPath, menuUrl) => {
  if (!menuUrl || !currentPath) return false;
  
  // Normalisasi hilangkan trailing slash di awal dan akhir untuk komparasi aman
  const cleanCurrent = currentPath.replace(/^\/+|\/+$/g, '');
  const cleanMenu = menuUrl.replace(/^\/+|\/+$/g, '');
  
  if (cleanMenu === '' && cleanCurrent === '') return true;
  if (cleanMenu === '') return false;

  return cleanCurrent === cleanMenu || cleanCurrent.startsWith(cleanMenu + '/');
};

// --- KOMPONEN BERULANG (REKURSIF) UNTUK SETIAP ITEM MENU ---
const NavMenuItem = ({ item, depth = 0, activePath, openDropdowns, handleParentClick, handleItemClick }) => {
  const menuTitle = item.title || item.menu_name;
  const menuUrl = item.url || item.menu_url;
  const menuIconStr = item.icon || item.menu_icon;
  const hasChildren = item.subs && item.subs.length > 0;

  // Pengecekan aktif menggunakan fungsi normalisasi path di atas
  const isDirectlyActive = checkActivePath(activePath, menuUrl);

  // Cek rekursif apakah ada sub-menu di dalamnya yang sedang aktif
  const isChildActive = (currentItem) => {
    if (!currentItem.subs) return false;
    return currentItem.subs.some(sub => {
      const subUrl = sub.url || sub.menu_url;
      return checkActivePath(activePath, subUrl) || isChildActive(sub);
    });
  };
  
  const isParentOfActive = hasChildren && isChildActive(item);

  // Logika Block Aktif Penuh: Berlaku jika dirinya aktif ATAU anak di dalamnya aktif
  const isBlockActive = isDirectlyActive || isParentOfActive;

  const isOpen = !!openDropdowns[item.menu_id] || isParentOfActive;
  const MenuIcon = Icons[menuIconStr] || (hasChildren ? Icons.Folder : Icons.File);

  // Padding menjorok ke dalam disesuaikan tingkat kedalamannya agar rapi
  const paddingLeft = `${(depth * 1.2) + 1}rem`; 

  if (hasChildren) {
    return (
      <div className="w-full">
        {/* Tombol Menu Utama yang Mempunyai Dropdown */}
        <button 
          onClick={() => handleParentClick(item.menu_id)}
          style={{ paddingLeft }}
          className={`w-full flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer transition-all duration-200 select-none ${
            isBlockActive
              ? ' text-indigo' 
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3 truncate">
            <MenuIcon className={`w-5 h-5 flex-shrink-0 ${isBlockActive ? 'text-indigo' : 'text-slate-400'}`} />
            <span className="text-sm truncate font-semibold tracking-wide">{menuTitle}</span>
          </div>
          <Icons.ChevronDown className={`w-4 h-4 transition-transform duration-300 ease-in-out flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Container Sub-Menu */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] mt-1' : 'max-h-0'}`}>
          <div className="space-y-1 py-0.5 border-l-2 border-slate-100 ml-5 pl-1">
            {item.subs.map((subItem) => (
              <NavMenuItem
                key={subItem.menu_id}
                item={subItem}
                depth={depth + 0.5}
                activePath={activePath}
                openDropdowns={openDropdowns}
                handleParentClick={handleParentClick}
                handleItemClick={handleItemClick}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render Untuk Single Menu / Sub-Menu Paling Ujung
  return (
    <div 
      onClick={() => handleItemClick(menuUrl)}
      style={{ paddingLeft }}
      className={`flex items-center gap-3 py-3 px-4 rounded-xl cursor-pointer transition-all duration-200 ${
        isDirectlyActive
          ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-blue-600/25 scale-[1.01]' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {/* Tampilkan icon pada depth utama, atau jika data sub-menu memiliki icon spesifik */}
      {(depth === 0 || item.icon || item.menu_icon) && (
        <MenuIcon className={`w-5 h-5 flex-shrink-0 ${isDirectlyActive ? 'text-white' : 'text-slate-400'}`} />
      )}
      <span className="text-sm truncate font-medium tracking-wide">{menuTitle}</span>
    </div>
  );
};


// --- KOMPONEN UTAMA SIDEBAR ---
const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [menus, setMenus] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [openDropdowns, setOpenDropdowns] = useState({}); 

  useEffect(() => {
    const currentRoleId = localStorage.getItem('role_id'); 

    if (!currentRoleId) {
      console.error("Role ID tidak ditemukan.");
      setLoading(false);
      return;
    }

    fetch(`${MENU_URL_ACCESS_BY_ROLE}/${currentRoleId}`)
      .then((res) => res.json())
      .then((data) => {
        setMenus(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal memuat menu:", err);
        setLoading(false);
      });
  }, []);

  const handleParentClick = (menuId) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const handleItemClick = (path) => {
    if (path) navigate(path);
    if (window.innerWidth < 768) setIsMobileOpen(false); 
  };

  if (loading) {
    return (
      <aside className="w-72 bg-white border-r border-slate-100 flex items-center justify-center shrink-0">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </aside>
    );
  }

  return (
    <>
      {isMobileOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-20 md:hidden" onClick={() => setIsMobileOpen(false)}></div>}

      {/* MODIFIKASI: Lebar diubah menjadi w-72 agar tampak lebih kokoh dan menarik */}
      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shrink-0 flex flex-col shadow-sm`}>

        {/* Logo Header Sidebar */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-blue-600/20">
              <Icons.ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Admin<span className="font-light text-blue-600">Panel</span></h1>
        </div>

        {/* MODIFIKASI: Navigasi List dengan Scrollbar Cantik & Halus */}
        <nav className="flex-1 mt-4 px-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-4rem)] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {menus.map((menu) => (
            <NavMenuItem
              key={menu.menu_id}
              item={menu}
              depth={0}
              activePath={location.pathname}
              openDropdowns={openDropdowns}
              handleParentClick={handleParentClick}
              handleItemClick={handleItemClick}
            />
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;