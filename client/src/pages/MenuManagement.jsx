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
  const [itemsPerPage] = useState(10); // Menampilkan 10 menu utama per halaman

  // Layout State Manajemen Hirarki & Dropdown
  const [expandedParentIds, setExpandedParentIds] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchDropdownQuery, setSearchDropdownQuery] = useState('');

  // State Form terikat struktur data bd_m_menu
  const [currentMenu, setCurrentMenu] = useState({
    menu_id: '',
    parent_id: '',
    title: '',
    url: '',
    description: '',
    menu_order: 1,
    type: '2',
    is_view: 'N',
    is_create: 'N',
    is_edit: 'N',
    is_delete: 'N',
    is_export: 'N',
    is_duplicate: 'N',
    is_unlock: 'N',
    is_active: 1,
    class_active: '',
    icon: ''
  });

  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // --- NOTIFICATION HANDLER ---
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  // --- FETCH DATA (Menggunakan Async/Await) ---
const fetchMenus = async () => {
    try {
      const response = await fetch(MENU_URL);
      if (!response.ok) throw new Error('Gagal mengambil data dari server');
      const data = await response.json();
      
      // Karena backend sudah mengelompokkan dengan benar ke dalam properti 'subs',
      // kita tinggal langsung set datanya ke state
      setMenus(data);
      console.log("Data Menu dari Backend:", data);
    } catch (error) {
      console.error("Error fetch:", error);
      showNotification("Gagal mengambil data menu dari server", "error");
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  // Reset ke halaman 1 jika user melakukan pencarian
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // --- HIERARCHY UTILITY LOGIC ---
  const groupMenusByHierarchy = (flatMenus) => {
    if (!Array.isArray(flatMenus)) return [];
    const parents = [];
    const children = [];

    flatMenus.forEach(item => {
      if (item.menu_id === 1 || item.parent_id === 1 || !item.parent_id) {
        parents.push({ ...item, subs: [] });
      } else {
        children.push(item);
      }
    });

    children.forEach(child => {
      const parentNode = parents.find(p => p.menu_id === child.parent_id);
      if (parentNode) {
        parentNode.subs.push(child);
      } else {
        parents.push({ ...child, subs: [] });
      }
    });

    return parents.sort((a, b) => a.menu_order - b.menu_order);
  };

  const getDropdownOptions = (groupedMenus) => {
    const options = [];
    groupedMenus.forEach(parent => {
      if (parent.menu_id === 1) return;
      options.push({ menu_id: parent.menu_id, display_title: parent.title });
      if (parent.subs && parent.subs.length > 0) {
        parent.subs.forEach(child => {
          options.push({
            menu_id: child.menu_id,
            display_title: `${parent.title} - ${child.title}`
          });
        });
      }
    });
    return options;
  };

  const toggleExpand = (parentId) => {
    if (expandedParentIds.includes(parentId)) {
      setExpandedParentIds(expandedParentIds.filter(id => id !== parentId));
    } else {
      setExpandedParentIds([...expandedParentIds, parentId]);
    }
  };

  // --- FILTER SEARCH BAR LOGIC ---
  const filteredMenus = menus.filter((parent) => {
    const term = searchTerm.toLowerCase();
    const matchesParent = 
      parent.title.toLowerCase().includes(term) || 
      (parent.description && parent.description.toLowerCase().includes(term));
    
    const matchesChild = parent.subs && parent.subs.some(child => 
      child.title.toLowerCase().includes(term) || 
      (child.description && child.description.toLowerCase().includes(term))
    );

    return matchesParent || matchesChild;
  });

  // --- PAGINATION LOGIC ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  // Memotong data filteredMenus untuk ditampilkan per halaman tertentu
  const currentItems = filteredMenus.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMenus.length / itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // --- FORM HANDLERS ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentMenu({ ...currentMenu, [name]: name === 'is_active' ? Number(value) : value });
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setCurrentMenu({ ...currentMenu, [name]: checked ? 'Y' : 'N' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentMenu.title.trim()) {
      showNotification("Nama menu wajib diisi!", "error");
      return;
    }

    const payload = {
      ...currentMenu,
      parent_id: currentMenu.parent_id === '' ? 1 : Number(currentMenu.parent_id)
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
    if (window.confirm("Apakah Anda yakin ingin menghapus data menu ini beserta seluruh turunannya?")) {
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
      is_view: 'N', is_create: 'N', is_edit: 'N', is_delete: 'N', is_export: 'N', is_duplicate: 'N', is_unlock: 'N',
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
      description: '',
      menu_order: nextOrder,
      type: '2',
      is_view: 'N', is_create: 'N', is_edit: 'N', is_delete: 'N', is_export: 'N', is_duplicate: 'N', is_unlock: 'N',
      is_active: 1,
      class_active: '',
      icon: ''
    });
    setIsDropdownOpen(false);
    setSearchDropdownQuery('');
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setIsEditing(true);
    setCurrentMenu({
      ...item,
      parent_id: item.parent_id === item.menu_id || item.parent_id === 1 ? '' : (item.parent_id || ''),
      url: item.url || '',
      description: item.description || '',
      icon: item.icon || ''
    });
    setIsDropdownOpen(false);
    setSearchDropdownQuery('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsDropdownOpen(false);
  };

  // --- STYLES TEMPLATE ---
  const inputStyle = "w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200 placeholder-gray-400";
  const labelStyle = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5";

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 animate-fade-in-up">
        
        {/* Toast Notification Container */}
        {notification.show && (
          <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 transition-all transform duration-300 animate-slide-in-right ${
            notification.type === 'success' ? 'bg-white border-l-4 border-green-500 text-gray-800' : 'bg-white border-l-4 border-red-500 text-gray-800'
          }`}>
            <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {notification.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              )}
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900">{notification.type === 'success' ? 'Success' : 'Error'}</h4>
              <p className="text-sm text-gray-500">{notification.message}</p>
            </div>
          </div>
        )}

        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Manajemen Modul & Menu</h2>
            <p className="text-sm text-gray-500 mt-1">Pengaturan hak akses, slug url, penataan urutan hirarki, serta status aktif menu aplikasi.</p>
          </div>
          <button 
              onClick={handleAddNew}
              className="group bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5"
          >
              <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
              Add Menu 
          </button>
        </div>

        {/* --- SEARCH BAR --- */}
         <div className="mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div className="relative w-full">
                <input 
                    type="text" 
                    placeholder="Search menu by name..." 
                    className="pl-10 pr-4 py-2.5 w-full bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm placeholder-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
        </div>

        {/* --- TABEL DATA --- */}
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
          <table className="w-full text-left border-collapse bg-white">
            <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4 text-center w-12"></th>
                <th className="py-3.5 px-4 text-center w-12">No</th>
                <th className="py-3.5 px-4">Nama Menu</th>
                <th className="py-3.5 px-4">Link</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4 text-center">Icon</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Urutan</th>
                <th className="py-3.5 pr-6 text-right w-44">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {currentItems.length > 0 ? (
                currentItems.map((parent, index) => {
                  const isExpanded = expandedParentIds.includes(parent.menu_id);
                  const hasChildren = parent.subs && parent.subs.length > 0;
                  
                  // Menyesuaikan penomoran No agar mengikuti urutan halaman page
                  const globalIndex = indexOfFirstItem + index + 1;

                  return (
                    <React.Fragment key={parent.menu_id}>
                      {/* BARIS UTAMA (PARENT MENU) */}
                      <tr className="hover:bg-indigo-50/20 transition-colors font-medium bg-slate-50/30">
                        <td className="py-3.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => hasChildren ? toggleExpand(parent.menu_id) : handleAddSub(parent)}
                            className="w-5 h-5 flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-100 font-bold text-gray-500 text-xs transition shadow-xs mx-auto"
                          >
                            {hasChildren ? (isExpanded ? '−' : '＋') : '＋'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center text-xs font-semibold text-gray-500">{globalIndex}.</td>
                        <td className="py-3.5 px-4 font-bold text-gray-900">{parent.title}</td>
                        <td className="py-3.5 px-4 text-xs font-mono text-gray-500">{parent.url || '-'}</td>
                        <td className="py-3.5 px-4 text-xs text-gray-600">{parent.description || '-'}</td>
                        <td className="py-3.5 px-4 text-center text-sm text-gray-500"> 
                        {(() => {
                            // Ambil komponen dari objek Icons berdasarkan string database, default ke Folder jika tidak ada
                            const TargetIcon = (parent.icon && Icons[parent.icon]) ? Icons[parent.icon] : Icons.Folder;
                            
                            return (
                              <TargetIcon className="w-5 h-5 mx-auto text-gray-300 opacity-60 hover:text-indigo-500 transition-colors" />
                            );
                          })()}
                           </td>
                        <td className="py-3.5 px-4 text-center text-xs">
                          <span className={`px-2 py-1 rounded-md font-semibold ${parent.is_active === 1 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                            {parent.is_active === 1 ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-xs font-bold">{parent.menu_order}</td>
                        <td className="py-3.5 pr-6 text-right space-x-1">
                          {parent.menu_id !== 1 && (
                            <button onClick={() => handleAddSub(parent)} className="text-emerald-600 hover:text-emerald-900 text-xs font-semibold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 transition mr-1">
                              ➕ Sub
                            </button>
                          )}
                          <button onClick={() => handleEdit(parent)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all inline-block" title="Edit">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>
                          <button onClick={() => handleDelete(parent.menu_id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all inline-block" title="Delete">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button> 
                        </td>
                      </tr>

                      {/* SUB-TABLE KHUSUS SUB MENU */}
                      {hasChildren && isExpanded && (
                        <tr>
                          <td colSpan="9" className="bg-gray-50/40 p-4 pl-12 border-l-4 border-indigo-500">
                            <div className="overflow-hidden rounded-xl border border-gray-100 shadow-xs bg-white">
                              <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                  <tr>
                                    <th className="py-2.5 px-4 text-center w-12">No</th> 
                                    <th className="py-2.5 px-4">Nama Sub-Menu</th>
                                    <th className="py-2.5 px-4">Link</th>
                                    <th className="py-2.5 px-4">Keterangan</th>
                                    <th className="py-2.5 px-4 text-center">Status</th>
                                    <th className="py-2.5 px-4 text-center">Urutan</th>
                                    <th className="py-2.5 pr-6 text-right w-24">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs text-gray-600 bg-white">
                                  {parent.subs.map((child, childIndex) => (
                                    <tr key={child.menu_id} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="py-2.5 px-4 text-center font-semibold text-gray-400">{childIndex + 1}.</td> 
                                      <td className="py-2.5 px-4 font-semibold text-gray-700">
                                        <span className="text-gray-300 font-mono mr-1">└──</span> {child.title}
                                      </td>
                                      <td className="py-2.5 px-4 font-mono text-gray-400">{child.url || '-'}</td>
                                      <td className="py-2.5 px-4 text-gray-500">{child.description || '-'}</td>
                                      <td className="py-2.5 px-4 text-center">
                                        <span className={`px-2 py-0.5 rounded font-medium ${child.is_active === 1 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                          {child.is_active === 1 ? 'Aktif' : 'Tidak Aktif'}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-4 text-center font-bold text-gray-500">{child.menu_order}</td>
                                      <td className="py-2.5 pr-6 text-right">
                                          <button onClick={() => handleEdit(child)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all inline-block" title="Edit">
                                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                          </button>
                                          <button onClick={() => handleDelete(child.menu_id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all inline-block" title="Delete">
                                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                          </button> 
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-400 text-xs">
                    Tidak ada data menu ditemukan...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- COMPONENT PAGINATION (PAGE NUMBERS) --- */}
        {filteredMenus.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-700">{indexOfFirstItem + 1}</span> to{' '}
              <span className="font-semibold text-gray-700">
                {indexOfLastItem > filteredMenus.length ? filteredMenus.length : indexOfLastItem}
              </span>{' '}
              of <span className="font-semibold text-gray-700">{filteredMenus.length}</span> entries
            </div>
            
            <div className="flex items-center gap-1">
              {/* Tombol Previous */}
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 active:scale-95'
                }`}
              >
                Previous
              </button>

              {/* Loop Angka Page Number */}
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNum = index + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => paginate(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold border transition ${
                      currentPage === pageNum
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 active:scale-95'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Tombol Next */}
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 active:scale-95'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* --- MODAL DIALOG POPUP FORM --- */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-900">{isEditing ? 'Ubah Menu Terdaftar' : 'Buat Menu Baru'}</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Nama Menu (Title) *</label>
                    <input type="text" name="title" required value={currentMenu.title} onChange={handleInputChange} className={inputStyle} />
                  </div>

                  {/* DROP DOWN PARENT MENU DENGAN SEARCH FILTER */}
                  <div className="relative">
                    <label className={labelStyle}>Parent Menu</label>
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white flex justify-between items-center cursor-pointer select-none text-gray-700 hover:border-gray-300 transition-all duration-200"
                    >
                      <span className="truncate">
                        {currentMenu.parent_id 
                          ? getDropdownOptions(menus).find(o => o.menu_id === Number(currentMenu.parent_id))?.display_title 
                          : '- Pilih -'}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-56 flex flex-col">
                        <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                          <input 
                            type="text"
                            placeholder="Cari parent..."
                            value={searchDropdownQuery}
                            onChange={(e) => setSearchDropdownQuery(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-1.5 text-xs outline-none focus:border-indigo-500 bg-white"
                          />
                        </div>
                        <div className="overflow-y-auto flex-1 divide-y divide-gray-50 text-xs">
                          <div 
                            onClick={() => { setCurrentMenu({ ...currentMenu, parent_id: '' }); setIsDropdownOpen(false); setSearchDropdownQuery(''); }}
                            className={`p-2.5 cursor-pointer transition-colors hover:bg-slate-50 ${!currentMenu.parent_id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-500'}`}
                          >
                            - Pilih (Set Sebagai Menu Utama) -
                          </div>
                          {getDropdownOptions(menus)
                            .filter(opt => opt.display_title.toLowerCase().includes(searchDropdownQuery.toLowerCase()))
                            .map((opt) => {
                              const isSelected = Number(currentMenu.parent_id) === opt.menu_id;
                              return (
                                <div 
                                  key={opt.menu_id}
                                  onClick={() => { setCurrentMenu({ ...currentMenu, parent_id: opt.menu_id }); setIsDropdownOpen(false); setSearchDropdownQuery(''); }}
                                  className={`p-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-900 text-white font-semibold' : 'text-gray-700 hover:bg-slate-100'}`}
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
                    <input type="text" name="url" value={currentMenu.url} onChange={handleInputChange} className={inputStyle} placeholder="contoh: proyek/bimbingan" />
                  </div>
                  <div>
                    <label className={labelStyle}>Icon Class Name</label>
                    <input type="text" name="icon" value={currentMenu.icon} onChange={handleInputChange} className={inputStyle} placeholder="contoh: fas fa-file-code" />
                  </div>
                  <div>
                    <label className={labelStyle}>Urutan Menu (Order)</label>
                    <input type="number" name="menu_order" required value={currentMenu.menu_order} onChange={handleInputChange} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Status Keaktifan</label>
                    <select name="is_active" value={currentMenu.is_active} onChange={handleInputChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white outline-none transition-all duration-200">
                      <option value={1}>Aktif</option>
                      <option value={0}>Tidak Aktif</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelStyle}>Deskripsi Ringkas (Keterangan)</label>
                  <input type="text" name="description" value={currentMenu.description} onChange={handleInputChange} className={inputStyle} />
                </div>

                {/* HORIZONTALLY ALIGNED GRIDS UNTUK OTORITAS AKSES */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">Otoritas Akses</span>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center">
                    {[
                      { key: 'is_view', label: 'View' },
                      { key: 'is_create', label: 'Create' },
                      { key: 'is_edit', label: 'Edit' },
                      { key: 'is_delete', label: 'Delete' },
                      { key: 'is_export', label: 'Export' },
                      { key: 'is_duplicate', label: 'Duplicate' },
                      { key: 'is_unlock', label: 'Unlock' }
                    ].map((priv) => (
                      <div key={priv.key} className="flex flex-col items-center gap-1.5 bg-white p-2 border border-gray-200 rounded-lg shadow-xs">
                        <span className="text-[11px] font-semibold text-gray-500">{priv.label}</span>
                        <input 
                          type="checkbox" 
                          name={priv.key} 
                          checked={currentMenu[priv.key] === 'Y'} 
                          onChange={handleCheckboxChange} 
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5 cursor-pointer" 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Kontrol Panel Modal */}
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button type="button" onClick={closeModal} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50 transition-all">Batal</button>
                  <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 transition-all">Simpan Data</button>
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