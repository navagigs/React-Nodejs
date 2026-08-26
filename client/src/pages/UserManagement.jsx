import React, { useState, useEffect } from 'react';
import { USER_URL, ROLE_URL } from '../Api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]); // Penampung pilihan dropdown
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // State Form User
  const [currentUser, setCurrentUser] = useState({
    id: null,
    name: '',
    email: '',
    password: '', // Kosongkan saat edit jika tidak ingin mengubah password
    role_id: ''
  });

  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // --- NOTIFICATION HANDLER ---
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 3000);
  };

  // --- FETCH DATA (USERS & ROLES) ---
  const fetchData = async () => {
    try {
      // Ambil data users
      const resUsers = await fetch(`${USER_URL}/roles`);
      const dataUsers = await resUsers.json();
      setUsers(Array.isArray(dataUsers) ? dataUsers : []);

      // Ambil data roles untuk dropdown select
      const resRoles = await fetch(ROLE_URL);
      const dataRoles = await resRoles.json();
      setRoles(Array.isArray(dataRoles) ? dataRoles : []);
    } catch (error) {
      console.error("Gagal mengambil data dari server:", error);
      showNotification("Koneksi server gagal", "error");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- FILTER LOGIC ---
  const filteredUsers = users.filter((user) =>
    (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.name_role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- FORM HANDLERS ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser.name.trim() || !currentUser.email.trim() || !currentUser.role_id) {
      showNotification("Mohon isi semua field yang wajib!", "error");
      return;
    }

    if (!isEditing && !currentUser.password.trim()) {
      showNotification("Password wajib diisi untuk user baru!", "error");
      return;
    }

    try {
      let url = USER_URL;
      let method = 'POST';
      let successMsg = "User berhasil ditambahkan!";

      if (isEditing) {
        url = `${USER_URL}/${currentUser.id}`;
        method = 'PUT';
        successMsg = "User berhasil diperbarui!";
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentUser)
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Terjadi kesalahan sistem');
      }

      fetchData();
      closeModal();
      showNotification(successMsg, "success");
    } catch (error) {
      console.error(error);
      showNotification(error.message, "error");
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus user "${name}"?`)) {
      try {
        const response = await fetch(`${USER_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Gagal menghapus");

        fetchData();
        showNotification("User berhasil dihapus!", "success");
      } catch (error) {
        showNotification("Gagal menghapus user.", "error");
      }
    }
  };

  // --- MODAL CONTROL ---
  const handleAddNew = () => {
    setIsEditing(false);
    setCurrentUser({ id: null, name: '', email: '', password: '', role_id: roles[0]?.role_id || '' });
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    setIsEditing(true);
    setCurrentUser({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      password: '', // Biarkan kosong saat mulai mengedit (opsional)
      role_id: user.role_id || ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  

  // --- STYLES (Tailwind Reusable) ---
  const inputStyle = "w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200";
  const labelStyle = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5";
 
  
 

  return (
    <div className="max-w-6xl mx-auto">
       <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 animate-fade-in-up">
      
        
        {/* Toast Notification */}
        {notification.show && (
          <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-2xl border-l-4 bg-white text-gray-800 flex items-center gap-4 ${notification.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        )}

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">User Management</h2>
            <p className="text-sm text-gray-500 mt-1">Kelola data pengguna aplikasi beserta hak aksesnya.</p>
          </div>
           
            <button 
                onClick={handleAddNew} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                </svg>
                Tambah
            </button> 

        </div>

        {/* SEARCH BAR */}
        <div className="mb-6">
          <input 
            type="text" 
            placeholder="Cari berdasarkan nama, email, atau role..." 
            className="pl-4 pr-4 py-2.5 w-full bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* TABLE DATA */}
        <div className="overflow-hidden border border-gray-100 rounded-xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Nama</th>
                  <th className="py-4 px-6">Email</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 pr-6 text-right w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="py-4 px-6 font-semibold text-gray-800">{user.name}</td>
                    <td className="py-4 px-6 text-gray-600 text-sm">{user.email}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {user.name_role || 'No Role'}
                      </span>
                    </td>
                    <td className="py-4 pr-6 text-right space-x-2">
                      <button onClick={() => handleEdit(user)} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button onClick={() => handleDelete(user.id, user.name)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-gray-400">User tidak ditemukan</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">{isEditing ? 'Edit Data User' : 'Tambah User Baru'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div>
                <label className={labelStyle}>Nama Lengkap *</label>
                <input type="text" required className={inputStyle} value={currentUser.name} onChange={(e) => setCurrentUser({...currentUser, name: e.target.value})} placeholder="Masukkan nama..." />
              </div>

              <div>
                <label className={labelStyle}>Email Address *</label>
                <input type="email" required className={inputStyle} value={currentUser.email} onChange={(e) => setCurrentUser({...currentUser, email: e.target.value})} placeholder="nama@email.com" />
              </div>

              <div>
                <label className={labelStyle}>Password {isEditing && <span className="text-gray-400 lowercase italic">(Kosongkan jika tidak diubah)</span>}*</label>
                <input type="password" required={!isEditing} className={inputStyle} value={currentUser.password} onChange={(e) => setCurrentUser({...currentUser, password: e.target.value})} placeholder="••••••••" />
              </div>

              <div>
                <label className={labelStyle}>Pilih Hak Akses (Role) *</label>
                <select required className={inputStyle} value={currentUser.role_id} onChange={(e) => setCurrentUser({...currentUser, role_id: e.target.value})}>
                  <option value="" disabled>-- Pilih Role --</option>
                  {roles.map((r) => (
                    <option key={r.role_id} value={r.role_id}>{r.name_role}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 flex-1">Batal</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-lg flex-1">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;