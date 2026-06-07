import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import * as Icons from 'lucide-react';
import { MENU_URL } from './Api';

// --- KOMPONEN SINGLE MENU ---
const SingleMenuItem = ({ title, iconName, onClick, isActive, className = '' }) => {
  const IconComponent = iconName && Icons[iconName] ? Icons[iconName] : null;

  return (
    <div 
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors ${
            isActive 
            ? 'bg-indigo-50 text-indigo-600' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        } ${className}`}
    >
        {IconComponent ? (
          <IconComponent className="w-5 h-5 shrink-0" />
        ) : (
          className.includes('pl-12') ? null : <Icons.Menu className="w-5 h-5 shrink-0" />
        )}
        <span className="font-medium text-sm">{title}</span>
    </div>
  );
};

const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const [menus, setMenus] = useState([]);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // 1. Ambil data menu bertingkat dari API Backend
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setIsLoading(true);
        
        // REVISI 1: Tanda kutip dihapus agar benar-benar memanggil variabel MENU_URL
        console.log("Menghubungkan ke API:", MENU_URL); 
        const response = await fetch(MENU_URL); 
        
        if (!response.ok) throw new Error('Gagal memuat menu server');
        const data = await response.json();
        
        console.log("Data menu yang diterima dari DB:", data); // Cek log ini di inspect element browser Anda
        setMenus(data);

        // Otomatis buka dropdown parent jika ada sub-menu di dalamnya yang sedang aktif
        const initialDropdowns = {};
        data.forEach(parent => {
          if (parent.children && parent.children.length > 0) {
            const hasActiveChild = parent.children.some(child => {
              const childUrl = child.url || child.url || '';
              return location.pathname === childUrl;
            });
            if (hasActiveChild) {
              initialDropdowns[parent.menu_id] = true;
            }
          }
        });
        setOpenDropdowns(initialDropdowns);
      } catch (error) {
        console.error("Error fetching dynamic menus:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenuData();
  }, [location.pathname]);

  const toggleDropdown = (menuId) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const handleNavigation = (path) => {
      if (!path) return;
      navigate(path);
      if (window.innerWidth < 768) setIsMobileOpen(false); 
  };

  return (
    <>
      {/* Overlay Mobile */}
      {isMobileOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsMobileOpen(false)}></div>}

      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        
        {/* Header Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-100">
            <h1 className="text-2xl font-bold text-indigo-600">Admin<span className="text-gray-800">Panel</span></h1>
        </div>

        {/* Container Navigasi Dinamis */}
        <nav className="mt-6 px-2 space-y-1 overflow-y-auto max-h-[calc(100vh-80px)]">
          {isLoading ? (
            <div className="space-y-3 px-4 animate-pulse">
              <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
              <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
              <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
            </div>
          ) : menus.length === 0 ? (
            // Fallback jika respons sukses tapi array kosong
            <div className="p-4 text-xs text-center text-gray-400">Tidak ada menu tersedia</div>
          ) : (
            menus.map((parent) => {
              const hasChildren = parent.children && parent.children.length > 0;
              const isDropdownOpen = !!openDropdowns[parent.menu_id];
              
              // REVISI 2: Pemetaan nama properti agar aman mengikuti penamaan database Anda
              const parentUrl = parent.url || parent.url || '';
              const parentTitle = parent.title || parent.title || 'Untitled';
              const parentIconName = parent.icon || parent.icon;

              const isParentActive = location.pathname === parentUrl || 
                (hasChildren && parent.children.some(child => location.pathname === (child.url || child.url)));

              const ParentIcon = parentIconName && Icons[parentIconName] ? Icons[parentIconName] : Icons.Menu;

              // JIKA MEMILIKI SUB-MENU (DROPDOWN)
              if (hasChildren) {
                return (
                  <div key={parent.menu_id} className="pt-1 pb-1">
                    <button 
                        onClick={() => toggleDropdown(parent.menu_id)}
                        className={`w-full flex items-center justify-between px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors max-w-[calc(100%-16px)] ${
                            isParentActive 
                            ? 'bg-indigo-50 text-indigo-600' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <ParentIcon className="w-5 h-5 shrink-0" />
                            <span className="font-medium text-sm">{parentTitle}</span>
                        </div>
                        <Icons.ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Sub Menu Container */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out`}
                      style={{
                        maxHeight: isDropdownOpen ? `${parent.children.length * 48}px` : '0px',
                        opacity: isDropdownOpen ? 1 : 0
                      }}
                    >
                        <div className="space-y-1 relative mt-1">
                            <div className="absolute left-[34px] top-0 bottom-0 w-0.5 bg-gray-100"></div>

                            {parent.children.map((child) => {
                              const childUrl = child.url || child.url || '';
                              const childTitle = child.title || child.title || 'Untitled';
                              const childIconName = child.icon || child.icon;

                              return (
                                <SingleMenuItem 
                                    key={child.menu_id}
                                    title={childTitle}
                                    iconName={childIconName} 
                                    isActive={location.pathname === childUrl} 
                                    onClick={() => handleNavigation(childUrl)} 
                                    className="pl-12 !mx-2 text-sm"
                                />
                              );
                            })}
                        </div>
                    </div>
                  </div>
                );
              }

              // JIKA STANDALONE MENU (TIDAK MEMILIKI SUB-MENU)
              return (
                <SingleMenuItem 
                   key={parent.menu_id}
                   title={parentTitle} 
                   iconName={parentIconName} 
                   isActive={location.pathname === parentUrl} 
                   onClick={() => handleNavigation(parentUrl)}
                /> 
              );
            })
          )}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;