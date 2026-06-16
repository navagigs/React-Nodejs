import React, { useState, useEffect } from 'react';
import { ROLE_URL } from '../Api'; // Silakan ubah ke ROLE_URL jika endpoint sudah disesuaikan

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // State Form
  const [currentRole, setCurrentRole] = useState({ 
      role_id: null, 
      name_role: '',
      description: '',
      lock: 0
  });
  
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' }); 

  // --- NOTIFICATION HANDLER ---
  const showNotification = (message, type = 'success') => {
      setNotification({ show: true, message, type });
      setTimeout(() => {
          setNotification((prev) => ({ ...prev, show: false }));
      }, 3000);
  };

  // --- FETCH DATA ---
  const fetchRoles = async () => {
    try {
        const response = await fetch(ROLE_URL); 
        const data = await response.json();
        setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error("Gagal mengambil data role:", error);
        showNotification("Gagal mengambil data server", "error");
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // --- FILTER LOGIC ---
  const filteredRoles = roles.filter((role) => 
      (role.name_role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (role.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- QUICK TOGGLE LOCK FUNCTION ---
  // Fungsi ini dipanggil saat tombol gembok di tabel diklik
  const handleToggleLock = async (role) => {
    const newLockStatus = role.lock === 1 || role.lock === true ? 0 : 1;
    const actionText = newLockStatus === 1 ? "mengunci" : "membuka kunci";

    if (window.confirm(`Apakah Anda yakin ingin ${actionText} role "${role.name_role}"?`)) {
        // Siapkan payload pembaruan dengan membalik status lock saat ini
        const payload = {
            name_role: role.name_role,
            description: role.description,
            lock: newLockStatus
        };

        try {
            const response = await fetch(`${ROLE_URL}/${role.role_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Gagal mengubah status kunci');

            fetchRoles(); // Refresh data tabel
            showNotification(`Role berhasil di-${newLockStatus === 1 ? 'lock' : 'unlock'}!`, "success");
        } catch (error) {
            console.error("Error toggling lock:", error);
            showNotification("Gagal mengubah status penguncian.", "error");
        }
    }
  };

  // --- FORM HANDLERS (SUBMIT MODAL) ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentRole.name_role.trim()) {
        showNotification("Nama Role wajib diisi!", "error");
        return;
    }
    
    const payload = { 
        name_role: currentRole.name_role,
        description: currentRole.description,
        lock: currentRole.lock 
    };

    try {
        let url = ROLE_URL;
        let method = 'POST';
        let successMsg = "Role berhasil ditambahkan!";

        if (isEditing) {
            url = `${ROLE_URL}/${currentRole.role_id}`;
            method = 'PUT';
            successMsg = "Role berhasil diperbarui!";
        }

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload) 
        });

        if (!response.ok) throw new Error('Gagal menyimpan data');
        
        fetchRoles(); 
        closeModal();
        showNotification(successMsg, "success");

    } catch (error) {
        console.error("Error saving data:", error);
        showNotification("Terjadi kesalahan saat menyimpan data.", "error");
    }
  };

  const handleDelete = async (id, isLocked) => {
    if (isLocked) {
        showNotification("Role ini dikunci dan tidak dapat dihapus!", "error");
        return;
    }

    if (window.confirm("Yakin ingin menghapus role ini?")) {
        try {
            const response = await fetch(`${ROLE_URL}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error("Gagal menghapus");

            fetchRoles();
            showNotification("Role berhasil dihapus!", "success");
        } catch (error) {
            console.error("Error deleting:", error);
            showNotification("Gagal menghapus data.", "error");
        }
    }
  };

  // --- MODAL CONTROL ---
  const handleAddNew = () => {
    setIsEditing(false);
    setCurrentRole({ role_id: null, name_role: '', description: '', lock: 0 });
    setIsModalOpen(true);
  };

  const handleEdit = (role) => {
    setIsEditing(true);
    setCurrentRole({
        role_id: role.role_id,
        name_role: role.name_role || '',
        description: role.description || '',
        lock: role.lock === 1 || role.lock === true ? 1 : 0
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
  }

  // --- STYLES ---
  const inputStyle = "w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200 placeholder-gray-400";
  const labelStyle = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5";

  return (
    <div className="max-w-6xl mx-auto"> 
      
      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 animate-fade-in-up">
      
        {/* Toast Notification */}
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
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Role Management</h2>
                <p className="text-sm text-gray-500 mt-1">Manage system user roles, access rights, and permissions.</p>
            </div>
            
            <button 
                onClick={handleAddNew}
                className="group bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5"
            >
                <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                Add Role
            </button>
        </div>

        {/* --- SEARCH BAR --- */}
        <div className="mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div className="relative w-full">
                <input 
                    type="text" 
                    placeholder="Search role name or description..." 
                    className="pl-10 pr-4 py-2.5 w-full bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm placeholder-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
        </div>

        {/* --- TABLE DATA --- */}
        <div className="overflow-hidden border border-gray-100 rounded-xl shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-100">
                    <tr className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                        <th className="py-4 px-6">Role Name</th>
                        <th className="py-4 px-6">Description</th>
                        <th className="py-4 px-6 text-center w-28">Status</th>
                        <th className="py-4 pr-6 text-right w-40">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                    {filteredRoles.map((item) => {
                    const isLocked = item.lock === 1 || item.lock === true;
                    return (
                    <tr key={item.role_id} className="hover:bg-indigo-50/30 transition-colors duration-150 group">
                        <td className="py-4 px-6">
                            <span className="font-semibold text-gray-800">{item.name_role}</span>
                        </td>
                        <td className="py-4 px-6">
                            <span className="text-gray-500 text-sm">{item.description || '-'}</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                            {isLocked ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-100 gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                                    Locked
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                    Active
                                </span>
                            )}
                        </td>
                        <td className="py-4 pr-6 text-right space-x-1.5">
                            {/* TOMBOL CEPAT LOCK/UNLOCK (DITAMBAHKAN) */}
                            <button
                                onClick={() => handleToggleLock(item)}
                                className={`p-2 rounded-lg transition-all ${
                                    isLocked 
                                    ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                                    : 'text-green-600 bg-green-50 hover:bg-green-100'
                                }`}
                                title={isLocked ? "Click to Unlock Role" : "Click to Lock Role"}
                            >
                                {isLocked ? (
                                    // Ikon Gembok Terkunci
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                                ) : (
                                    // Ikon Gembok Terbuka
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 016 0v1a1 1 0 102 0V7a5 5 0 00-5-5z"/></svg>
                                )}
                            </button>

                            {/* Tombol Edit */}
                            <button 
                                onClick={() => handleEdit(item)} 
                                className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                title="Edit Role Details"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>

                            {/* Tombol hapus otomatis hilang jika status lock aktif */}
                            {!isLocked && (
                                <button 
                                    onClick={() => handleDelete(item.role_id, isLocked)} 
                                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                    title="Delete Role"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            )}
                        </td>
                    </tr>
                    );
                    })}
                    {filteredRoles.length === 0 && (
                        <tr>
                            <td colSpan="4" className="py-12 text-center text-gray-400">No roles found</td>
                        </tr>
                    )}
                </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* --- MODAL FORM --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 relative animate-scale-up">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                <h3 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Role' : 'Add Role'}</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                  <label className={labelStyle}>Role Name *</label>
                  <input 
                      type="text" 
                      required 
                      className={inputStyle} 
                      value={currentRole.name_role} 
                      onChange={(e) => setCurrentRole({...currentRole, name_role: e.target.value})} 
                      placeholder="e.g. Super Admin, Editor"
                  />
              </div>

              <div>
                  <label className={labelStyle}>Description</label>
                  <textarea 
                      className={`${inputStyle} h-24 resize-none`} 
                      value={currentRole.description} 
                      onChange={(e) => setCurrentRole({...currentRole, description: e.target.value})}
                      placeholder="Describe what this role can do..."
                  />
              </div>

              <div>
                  <label className={labelStyle}>System Lock Config</label>
                  <div className="flex items-center gap-3 mt-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <input 
                          type="checkbox" 
                          id="lockRole"
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                          checked={currentRole.lock === 1}
                          onChange={(e) => setCurrentRole({...currentRole, lock: e.target.checked ? 1 : 0})}
                      />
                      <label htmlFor="lockRole" className="text-xs text-gray-600 select-none cursor-pointer font-medium">
                          {currentRole.lock === 1 ? '🔒 This role is locked.' : '🔓 Check to lock this role.'}
                      </label>
                  </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={closeModal} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 flex-1">Cancel</button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 flex-1">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;