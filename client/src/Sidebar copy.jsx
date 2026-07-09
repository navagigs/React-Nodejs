import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import * as Icons from 'lucide-react';
import { MENU_URL_ACCESS_BY_ROLE } from './Api';

// --- KOMPONEN SINGLE MENU ---
const SingleMenuItem = ({ title, icon, onClick, isActive, className = '' }) => {
  const TargetIcon = typeof icon === 'string' ? Icons[icon] : icon;

  return (
    <div 
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg cursor-pointer transition-all duration-200 ${
            isActive 
            ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-sm' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        } ${className}`}
    >
        {TargetIcon ? (
            <TargetIcon className="w-5 h-5" />
        ) : (
            <Icons.Folder className="w-5 h-5 opacity-40" />
        )}
        <span className="text-sm">{title}</span>
    </div>
  );
};

const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const navigate = useNavigate();
  
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- STATE UNTUK MENCATAT YANG AKTIF SAAT DIKLIK ---
  const [activeMenuId, setActiveMenuId] = useState(null); 
  const [activeParentId, setActiveParentId] = useState(null); 
  const [openDropdowns, setOpenDropdowns] = useState({}); 

 
  // 1. Ambil data Menu langsung berdasarkan Role ID dari Database
  useEffect(() => {
    // Kita tetap butuh role_id dari user yang login untuk tahu dia siapa
    const currentRoleId = localStorage.getItem('role_id'); 
    
    if (!currentRoleId) {
      console.error("Role ID tidak ditemukan di storage, pastikan sudah login.");
      setLoading(false);
      return;
    }

    // Panggil API baru yang langsung melakukan filter di MySQL server
    fetch(`${MENU_URL_ACCESS_BY_ROLE}/${currentRoleId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengambil data menu berizin");
        return res.json();
      })
      .then((data) => {
        const allowedMenus = Array.isArray(data) ? data : [];
        
        // Langsung pasang ke state tanpa perlu filter manual di frontend lagi!
        setMenus(allowedMenus);
        setLoading(false);

        // Set menu aktif default dari menu pertama yang diizinkan
        if (allowedMenus.length > 0) {
            if (allowedMenus[0].subs && allowedMenus[0].subs.length > 0) {
                setActiveMenuId(allowedMenus[0].subs[0].menu_id);
                setActiveParentId(allowedMenus[0].menu_id);
                setOpenDropdowns({ [allowedMenus[0].menu_id]: true });
            } else {
                setActiveMenuId(allowedMenus[0].menu_id);
            }
        }
      })
      .catch((err) => {
        console.error("Gagal memuat menu sidebar:", err);
        setLoading(false);
      });
  }, []);

  // 2. Fungsi ketika Parent Dropdown diklik
  const handleParentClick = (menuId) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  // 3. Fungsi ketika Menu Biasa / Sub-Menu diklik (Navigasi & Set Aktif)
  const handleItemClick = (menuId, parentId, path) => {
    setActiveMenuId(menuId);     
    setActiveParentId(parentId); 
    
    if (path) {
        navigate(path);
    }
    
    if (window.innerWidth < 768) setIsMobileOpen(false); 
  };

  if (loading) {
    return (
      <aside className="w-64 bg-white border-r border-gray-100 flex items-center justify-center">
        <span className="text-gray-400 text-sm animate-pulse">Loading Menu...</span>
      </aside>
    );
  }

  return (
    <>
      {/* Overlay Mobile */}
      {isMobileOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsMobileOpen(false)}></div>}

      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        
        {/* Header Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-100">
            <h1 className="text-2xl font-bold text-indigo-600">Admin<span className="text-gray-800">Panel</span></h1>
        </div>

        <nav className="mt-6 px-2 space-y-1 overflow-y-auto max-h-[calc(100vh-5rem)]">
          
          {menus.map((menu) => {
            const menuTitle = menu.menu_name || menu.title;
            const menuUrl = menu.menu_url || menu.url;
            const menuIconStr = menu.menu_icon || menu.icon;

            const hasChildren = menu.subs && menu.subs.length > 0;
            
            const isParentActive = activeMenuId === menu.menu_id || activeParentId === menu.menu_id;
            const isOpen = !!openDropdowns[menu.menu_id];
            
            const ParentIcon = Icons[menuIconStr] || Icons.Folder;

            // KONDISI A: DROPDOWN (HANYA MUNCUL JIKA SEBELUMNYA SUBS TIDAK KOSONG)
            if (hasChildren) {
              return (
                <div key={menu.menu_id} className="pt-1 pb-1">
                  <button 
                      onClick={() => handleParentClick(menu.menu_id)}
                      className={`w-full flex items-center justify-between px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors max-w-[calc(100%-16px)] ${
                          isParentActive 
                          ? 'text-indigo-600 bg-indigo-50/50 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                      <div className="flex items-center gap-3">
                          <ParentIcon className="w-5 h-5" />
                          <span className="text-sm">{menuTitle}</span>
                      </div>
                      <Icons.ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Wrapper Sub-Menu */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                      <div className="space-y-1 relative">
                          <div className={`absolute left-[34px] top-0 bottom-0 w-0.5 transition-colors ${isParentActive ? 'bg-indigo-200' : 'bg-gray-100'}`}></div>

                          {menu.subs.map((child) => {
                            const childTitle = child.menu_name || child.title;
                            const childUrl = child.menu_url || child.url;
                            const childIconStr = child.menu_icon || child.icon;
                            
                            const isChildActive = activeMenuId === child.menu_id;

                            return (
                              <SingleMenuItem 
                                  key={child.menu_id}
                                  title={childTitle} 
                                  icon={childIconStr || null}
                                  isActive={isChildActive}
                                  onClick={() => handleItemClick(child.menu_id, menu.menu_id, childUrl)} 
                                  className="pl-12 !mx-2 text-sm"
                              />
                            );
                          })}
                      </div>
                  </div>
                </div>
              );
            }

            // KONDISI B: JIKA MENU TUNGGAL
            const isSingleActive = activeMenuId === menu.menu_id;
            return (
              <SingleMenuItem 
                 key={menu.menu_id}
                 title={menuTitle} 
                 icon={menuIconStr} 
                 isActive={isSingleActive}
                 onClick={() => handleItemClick(menu.menu_id, null, menuUrl)}
              />
            );
          })}
          
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;