import React, { useState, useEffect } from 'react';
import { MENU_URL } from '../Api';
import * as Icons from 'lucide-react';

const MenuManagement = () => {
  const [menus, setMenus] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Layout State
  const [expandedParentIds, setExpandedParentIds] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchDropdownQuery, setSearchDropdownQuery] = useState('');

  // State Form terikat struktur data database
  const [currentMenu, setCurrentMenu] = useState({
    menu_id: '',
    parent_id: '',
    title: '',
    url: '',
    description: '',
    menu_order: 1,
    type: '2',
    is_view: 1,
    is_create: 1,
    is_edit: 1,
    is_delete: 1,
    is_export: 1,
    is_duplicate: 1,
    is_unlock: 1,
    is_active: 1,
    class_active: '',
    icon: ''
  });

  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  // --- FETCH DATA FROM API ---
  const fetchMenus = async () => {
    try {
      const response = await fetch(MENU_URL);
      if (!response.ok) throw new Error('Gagal mengambil data dari server');
      const data = await response.json();
      setMenus(data);
    } catch (error) {
      console.error("Error fetch:", error);
      showNotification("Gagal mengambil data menu dari server", "error");
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // --- HELPER REKURSIF UTAMA MENCARI PARENT ---
  const findMenuByIdRecursive = (menuList, id) => {
    if (!id) return null;
    for (let item of menuList) {
      if (item.menu_id?.toString() === id.toString()) {
        return item;
      }
      if (item.subs && item.subs.length > 0) {
        const found = findMenuByIdRecursive(item.subs, id);
        if (found) return found;
      }
    }
    return null;
  };

  const toggleExpand = (parentId) => {
    if (expandedParentIds.includes(parentId)) {
      setExpandedParentIds(expandedParentIds.filter(id => id !== parentId));
    } else {
      setExpandedParentIds([...expandedParentIds, parentId]);
    }
  };

  // --- REKURSIF: OPSI DROPDOWN ---
  const getDropdownOptionsRecursive = (menuList, prefix = '') => {
    let options = [];
    menuList.forEach(item => {
      const currentTitle = prefix ? `${prefix} ➔ ${item.title}` : item.title;
      options.push({ menu_id: item.menu_id, display_title: currentTitle });
      
      if (item.subs && item.subs.length > 0) {
        options = [...options, ...getDropdownOptionsRecursive(item.subs, currentTitle)];
      }
    });
    return options;
  };

  // --- REKURSIF: PENCARIAN BARIS LIST ---
  const checkMenuMatchRecursive = (menuItem, term) => {
    const matchesCurrent = 
      menuItem.title.toLowerCase().includes(term) || 
      (menuItem.description && menuItem.description.toLowerCase().includes(term));
    
    if (matchesCurrent) return true;

    if (menuItem.subs && menuItem.subs.length > 0) {
      return menuItem.subs.some(sub => checkMenuMatchRecursive(sub, term));
    }
    return false;
  };

  const filteredMenus = menus.filter(parent => checkMenuMatchRecursive(parent, searchTerm.toLowerCase()));

  // --- PAGINATION LOGIC ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMenus.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMenus.length / itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // --- FORM HANDLERS (SINKRONISASI MANDELE REALTME) ---
 const handleInputChange = (e) => {
  const { name, value } = e.target;

  setCurrentMenu(prev => {
    // Buat objek baru dari state sebelumnya
    const updated = { ...prev, [name]: name === 'is_active' ? Number(value) : value };

    // JIKA YANG DIKETIK ADALAH KOLOM TITLE
    if (name === 'title') {
      if (prev.parent_id) {
        // Cari data induk di dalam state menus
        const parentData = findMenuByIdRecursive(menus, prev.parent_id);
        
        // PENGAMAN: Jika parentData ketemu, ambil description-nya. 
        // Jika tidak ketemu, kita coba cari paksa di seluruh opsi dropdown.
        let parentDesc = '';
        if (parentData) {
          parentDesc = parentData.description || '';
        } else {
          // Alternatif cadangan jika rekursif terhambat tipe data
          const fallbackOptions = getDropdownOptionsRecursive(menus);
          const foundFallback = fallbackOptions.find(o => o.menu_id?.toString() === prev.parent_id?.toString());
          if (foundFallback) {
            // Ambil text dari display title dropdown (bersih tanpa tanda panah)
            parentDesc = foundFallback.display_title.split(' ➔ ').pop() || '';
          }
        }
        
        // Gabungkan: Deskripsi Induk + Ketikan Title Baru
        updated.description = value.trim() ? `${parentDesc} - ${value}` : parentDesc;
      } else {
        // Jika Menu Utama (tanpa induk)
        updated.description = value;
      }
    }
    return updated;
  });
};

  const handleCheckboxChange = (e) => {
  const { name, checked } = e.target;
  // Memastikan nilai yang disimpan ke state selalu angka 1 atau 0
  const value = checked ? 1 : 0;
  
  setCurrentMenu((prev) => ({
    ...prev,
    [name]: value
  }));
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentMenu.title.trim()) {
      showNotification("Nama menu wajib diisi!", "error");
      return;
    }

    const payload = {
      ...currentMenu,
      parent_id: currentMenu.parent_id === '' ? 1 : currentMenu.parent_id
    };

    try {
      let url = MENU_URL;
      let method = 'POST';
      let successMsg = "Menu baru berhasil ditambahkan!";

      if (isEditing) {
        url = `${MENU_URL}/${currentMenu.menu_id}`;
        method = 'PUT';
        successMsg = "Data menu berhasil diperbarui!";
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Gagal menyimpan data');

      fetchMenus();
      closeModal();
      showNotification(successMsg, "success");

      if (payload.parent_id && !expandedParentIds.includes(payload.parent_id)) {
        setExpandedParentIds([...expandedParentIds, payload.parent_id]);
      }
    } catch (error) {
      console.error("Error saving data:", error);
      showNotification("Terjadi kesalahan saat menyimpan data.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus menu ini beserta seluruh sub-menu di bawahnya?")) {
      try {
        const response = await fetch(`${MENU_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Gagal menghapus");

        fetchMenus();
        showNotification("Menu berhasil dihapus!", "success");
      } catch (error) {
        console.error("Error deleting:", error);
        showNotification("Gagal menghapus data dari server.", "error");
      }
    }
  };

  // --- MODAL CONTROL ---
  const handleAddNew = () => {
    setIsEditing(false);
    setCurrentMenu({
      menu_id: '', parent_id: '', title: '', url: '', description: '', menu_order: 1, type: '2',
      is_view: '0', is_create: '0', is_edit: '0', is_delete: '0', is_export: '0', is_duplicate: '0', is_unlock: '0',
      is_active: 1, class_active: '', icon: ''
    });
    setIsDropdownOpen(false);
    setSearchDropdownQuery('');
    setIsModalOpen(true);
  };

 const handleAddSub = (parentItem) => {
  setIsEditing(false);
  const nextOrder = parentItem.subs && parentItem.subs.length > 0 
    ? Math.max(...parentItem.subs.map(s => s.menu_order)) + 1 
    : 1;

  setCurrentMenu({
    menu_id: '',
    parent_id: parentItem.menu_id, 
    title: '', 
    url: '', 
    description: parentItem.description || '', // <--- Memasukkan deskripsi induk di awal
    menu_order: nextOrder, 
    type: '2',
    is_view: '0', is_create: '0', is_edit: '0', is_delete: '0', is_export: '0', is_duplicate: '0', is_unlock: '0',
    is_active: 1, class_active: '', icon: ''
  });
  setIsDropdownOpen(false);
  setSearchDropdownQuery('');
  setIsModalOpen(true);
};

  const handleEdit = (item) => {
  setIsEditing(true);
  
  // Helper kecil untuk normalisasi integer 1 atau 0
  const parseFlag = (val) => (val === 1 || val === '1' || val === true ? 1 : 0);

  setCurrentMenu({
    ...item,
    parent_id: item.parent_id?.toString() === item.menu_id?.toString() || item.parent_id === 0 || item.parent_id === '0' ? '' : (item.parent_id || ''),
    url: item.url || '',
    description: item.description || '',
    icon: item.icon || '',
    is_view: parseFlag(item.is_view),
    is_create: parseFlag(item.is_create),
    is_edit: parseFlag(item.is_edit),
    is_delete: parseFlag(item.is_delete),
    is_export: parseFlag(item.is_export),
    is_duplicate: parseFlag(item.is_duplicate),
    is_unlock: parseFlag(item.is_unlock),
    is_active: parseFlag(item.is_active ?? 1)
  });
  setIsDropdownOpen(false);
  setSearchDropdownQuery('');
  setIsModalOpen(true);
};

  const closeModal = () => {
    setIsModalOpen(false);
    setIsDropdownOpen(false);
  };

  const inputStyle = "w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200";
  const labelStyle = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5";

  // --- REKURSIF KOMPONEN: LIST TREE VIEW ---
  const renderMenuTreeRecursive = (menuList, depth = 0) => {
    return (
      <div className={`flex flex-col ${depth > 0 ? 'ml-8 pl-4 border-l-2 border-indigo-100 border-dashed my-1' : 'gap-3'}`}>
        {menuList.map((item) => {
          const isExpanded = expandedParentIds.includes(item.menu_id);
          const hasChildren = item.subs && item.subs.length > 0;

          return (
            <div key={item.menu_id} className="flex flex-col">
              <div className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl border transition-all duration-150 ${
                depth === 0 ? 'bg-slate-50 border-slate-200/80 shadow-xs' : 'bg-white border-gray-100 hover:border-gray-200 shadow-2xs'
              }`}>
                <div className="flex items-center gap-3 w-full md:w-5/12">
                  <button
                    type="button"
                    onClick={() => hasChildren ? toggleExpand(item.menu_id) : handleAddSub(item)}
                    className={`w-6 h-6 flex items-center justify-center rounded-md border text-xs font-bold font-mono transition-all ${
                      hasChildren ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {hasChildren ? (isExpanded ? '−' : '＋') : '＋'}
                  </button>

                  <div className="flex items-center gap-2 truncate">
                    {(() => {
                      const TargetIcon = (item.icon && Icons[item.icon]) ? Icons[item.icon] : Icons.Folder;
                      return <TargetIcon className={`w-4 h-4 flex-shrink-0 ${depth === 0 ? 'text-indigo-600' : 'text-gray-400'}`} />;
                    })()}
                    <span className={`text-sm truncate ${depth === 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                      {item.title}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:w-4/12 my-2 md:my-0 text-xs text-gray-500">
                  <div className="truncate font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded max-w-max">
                    /{item.url || '-'}
                  </div>
                  <div className="truncate text-gray-400" title={item.description}>
                    {item.description || '-'}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-3/12 border-t md:border-t-0 pt-2 md:pt-0 border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                      {item.menu_order}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${item.is_active === 1 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {item.is_active === 1 ? 'Aktif' : 'Off'}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button onClick={() => handleAddSub(item)} className="text-emerald-600 hover:text-white hover:bg-emerald-600 text-xs font-semibold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 transition mr-1">
                      ➕ Sub
                    </button>
                    <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Edit">
                      <Icons.Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.menu_id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                      <Icons.Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {hasChildren && isExpanded && renderMenuTreeRecursive(item.subs, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
        
        {/* Notifikasi */}
        {notification.show && (
          <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border-l-4 ${
            notification.type === 'success' ? 'bg-white border-green-500 text-gray-800' : 'bg-white border-red-500 text-gray-800'
          }`}>
            <div className="p-1.5 rounded-full bg-slate-50">
              <Icons.Info className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-gray-700">{notification.message}</p>
          </div>
        )}

        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Manajemen Modul & Menu</h2>
            <p className="text-sm text-gray-500 mt-1">Pengaturan menu dinamis multi-level tak terbatas berdasarkan relasi parent-child.</p>
          </div>
          <button 
              onClick={handleAddNew}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
              <Icons.Plus className="w-4 h-4" />
              Tambah
          </button>
        </div>

        {/* --- SEARCH BAR --- */}
         <div className="mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div className="relative w-full">
                <input 
                    type="text" 
                    placeholder="Cari menu berdasarkan nama atau keterangan..." 
                    className="pl-10 pr-4 py-2.5 w-full bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Icons.Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
        </div>

        {/* --- RECURSIVE TREE CONTAINER --- */}
        <div className="flex flex-col gap-3 min-h-[150px]">
          {currentItems.length > 0 ? (
            renderMenuTreeRecursive(currentItems)
          ) : (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm bg-gray-50/30">
               Tidak ada struktur data menu ditemukan...
            </div>
          )}
        </div>

        {/* --- PAGINATION --- */}
        {filteredMenus.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="text-sm text-gray-500">
              Menampilkan Utama <span className="font-semibold text-gray-700">{indexOfFirstItem + 1}</span> sampai{' '}
              <span className="font-semibold text-gray-700">
                {indexOfLastItem > filteredMenus.length ? filteredMenus.length : indexOfLastItem}
              </span>{' '}
              dari <span className="font-semibold text-gray-700">{filteredMenus.length}</span> induk utama
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  currentPage === 1 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index + 1}
                  onClick={() => paginate(index + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold border transition ${
                    currentPage === index + 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  currentPage === totalPages ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* --- FORM MODAL DIALOG --- */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-900">{isEditing ? 'Ubah Menu Terdaftar' : 'Buat Menu Baru'}</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Nama Menu (Title) *</label>
                    <input type="text" name="title" required value={currentMenu.title} onChange={handleInputChange} className={inputStyle} placeholder="Masukkan nama menu..." />
                  </div>

                  {/* DROP DOWN PARENT */}
                  <div className="relative">
                    <label className={labelStyle}>Induk Atasan (Parent)</label>
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white flex justify-between items-center cursor-pointer text-gray-700 hover:border-gray-300 transition-all"
                    >
                      <span className="truncate">
                        {currentMenu.parent_id 
                          ? getDropdownOptionsRecursive(menus).find(o => o.menu_id?.toString() === currentMenu.parent_id?.toString())?.display_title 
                          : '- Pilih (Jadikan Menu Utama) -'}
                      </span>
                      <Icons.ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-56 flex flex-col">
                        <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                          <input 
                            type="text"
                            placeholder="Cari induk menu..."
                            value={searchDropdownQuery}
                            onChange={(e) => setSearchDropdownQuery(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-1.5 text-xs outline-none focus:border-indigo-500 bg-white"
                          />
                        </div>
                        <div className="overflow-y-auto flex-1 text-xs">
                          <div 
                           onClick={() => { 
                            setCurrentMenu({ 
                              ...currentMenu, 
                              parent_id: '', 
                              description: currentMenu.title // Kembali ke title sendiri karena tidak punya induk
                            }); 
                            setIsDropdownOpen(false); 
                            setSearchDropdownQuery(''); 
                          }}
                            className={`p-2.5 cursor-pointer transition-colors hover:bg-slate-50 ${!currentMenu.parent_id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-500'}`}
                          >
                            - Pilih (Jadikan Menu Utama) -
                          </div>
                          {getDropdownOptionsRecursive(menus)
                            .filter(opt => opt.display_title.toLowerCase().includes(searchDropdownQuery.toLowerCase()))
                            .map((opt) => {
                              const isSelected = currentMenu.parent_id?.toString() === opt.menu_id?.toString();
                              return (
                                <div 
                                  key={opt.menu_id}
                                 onClick={() => { 
                                      const parentData = findMenuByIdRecursive(menus, opt.menu_id);
                                      const parentTitle = parentData ? (parentData.title || '') : '';
                                      
                                      setCurrentMenu({ 
                                        ...currentMenu, 
                                        parent_id: opt.menu_id,
                                        // Saat parent diklik, langsung set kombinasi Parent Title + Current Title
                                        description: currentMenu.title.trim() ? `${parentTitle} - ${currentMenu.title}` : parentTitle
                                      }); 
                                      setIsDropdownOpen(false); 
                                      setSearchDropdownQuery(''); 
                                    }}
                                  className={`p-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-700 hover:bg-slate-100'}`}
                                >
                                  {opt.display_title}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelStyle}>Path URL</label>
                    <input type="text" name="url" value={currentMenu.url} onChange={handleInputChange} className={inputStyle} placeholder="contoh: setting/user" />
                  </div>
                  <div>
                    <label className={labelStyle}>Icon</label>
                    <input type="text" name="icon" value={currentMenu.icon} onChange={handleInputChange} className={inputStyle} placeholder="contoh: Folder, User, Settings" />
                  </div>
                  <div>
                    <label className={labelStyle}>Urutan Tampil (Order)</label>
                    <input type="number" name="menu_order" required value={currentMenu.menu_order} onChange={handleInputChange} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Status Keaktifan</label>
                    <select name="is_active" value={currentMenu.is_active} onChange={handleInputChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 bg-white outline-none">
                      <option value={1}>Aktif</option>
                      <option value={0}>Tidak Aktif</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelStyle}>Keterangan (Deskripsi)</label>
                  <input type="text" name="description" value={currentMenu.description} onChange={handleInputChange} className={inputStyle} placeholder="Otomatis terisi gabungan..." />
                </div>

                {/* OTORITAS AKSES */} 
<div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
  <span className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">
    Otoritas Akses
  </span>
  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center">
    {[
      { key: 'is_view', label: 'View' },
      { key: 'is_create', label: 'Create' },
      { key: 'is_edit', label: 'Edit' },
      { key: 'is_delete', label: 'Delete' },
      { key: 'is_export', label: 'Export' },
      { key: 'is_duplicate', label: 'Duplicate' },
      { key: 'is_unlock', label: 'Unlock' }
    ].map((priv) => {
      // Evaluasi nilai boolean secara fleksibel (mendukung integer 1, string "1", atau boolean true)
      const isChecked = 
        currentMenu[priv.key] === 1 || 
        currentMenu[priv.key] === 1 || 
        currentMenu[priv.key] === true;

      return (
        <label 
          key={priv.key} 
          className="flex flex-col items-center gap-1.5 bg-white p-2 border border-gray-200 rounded-lg shadow-xs cursor-pointer hover:bg-slate-50 transition"
        >
          <span className="text-[11px] font-semibold text-gray-500 select-none">
            {priv.label}
          </span>
          <input 
            type="checkbox" 
            name={priv.key} 
            checked={isChecked} 
            onChange={handleCheckboxChange} 
            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5 cursor-pointer" 
          />
        </label>
      );
    })}
  </div>
</div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={closeModal} className="px-5 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition flex-1">
                    Batal
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition flex-1 shadow-md">
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MenuManagement;