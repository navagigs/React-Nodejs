import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { USER_URL, ROLE_URL } from '../Api';
import TableExports from '../TableExports';
import PageSizeSelect from '../PageSizeSelect';
import { useTablePagination } from '../tablePagination';
import { useMenuPermission } from '../permissions';
import FeaturePageHeader from '../components/layout/FeaturePageHeader';

const UserManagement = () => {
  const access = useMenuPermission('/hak-akses/user');
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
    role_id: '',
    phone: '',
    gender: '',
    is_active: 1
  });

  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const [faceUser, setFaceUser] = useState(null);
  const [faceVideoReady, setFaceVideoReady] = useState(false);
  const [faceScanning, setFaceScanning] = useState(false);
  const [faceMessage, setFaceMessage] = useState('');
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const faceVideoRef = useRef(null);
  const faceStreamRef = useRef(null);

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
    if (!access.canView) return;
    fetchData();
  }, [access.canView]);

  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        if (active) setFaceModelsLoaded(true);
      } catch (err) {
        console.error('Gagal memuat model wajah:', err);
      }
    };
    loadModels();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!faceUser) {
      if (faceStreamRef.current) {
        faceStreamRef.current.getTracks().forEach((track) => track.stop());
        faceStreamRef.current = null;
      }
      setFaceVideoReady(false);
      return;
    }

    let active = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        faceStreamRef.current = stream;
        if (faceVideoRef.current) {
          faceVideoRef.current.srcObject = stream;
          await faceVideoRef.current.play();
          setFaceVideoReady(true);
        }
      } catch {
        setFaceMessage('Gagal mengakses kamera. Izinkan akses kamera.');
      }
    };
    startCamera();

    return () => {
      active = false;
      if (faceStreamRef.current) {
        faceStreamRef.current.getTracks().forEach((track) => track.stop());
        faceStreamRef.current = null;
      }
    };
  }, [faceUser]);

  const openFaceModal = (user) => {
    setFaceMessage('');
    setFaceUser(user);
  };

  const closeFaceModal = () => {
    setFaceUser(null);
  };

  const handleCaptureFace = async () => {
    setFaceMessage('');
    setFaceScanning(true);
    try {
      if (!faceModelsLoaded) throw new Error('Model wajah belum siap.');
      if (!faceVideoReady || !faceVideoRef.current) throw new Error('Kamera belum siap.');
      const detection = await faceapi
        .detectSingleFace(faceVideoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detection) throw new Error('Wajah tidak terdeteksi. Posisikan wajah ke kamera.');

      const descriptor = Array.from(detection.descriptor);
      const response = await fetch(`${USER_URL}/${faceUser.id}/face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Gagal menyimpan data wajah.');

      showNotification('Data wajah berhasil disimpan.', 'success');
      closeFaceModal();
    } catch (err) {
      setFaceMessage(err.message || 'Gagal menyimpan data wajah.');
    } finally {
      setFaceScanning(false);
    }
  };

  const handleDeleteFace = async (user) => {
    if (!window.confirm(`Hapus data wajah untuk "${user.name}"?`)) return;
    try {
      const response = await fetch(`${USER_URL}/${user.id}/face`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Gagal menghapus');
      showNotification('Data wajah berhasil dihapus.', 'success');
    } catch {
      showNotification('Gagal menghapus data wajah.', 'error');
    }
  };

  // --- FILTER LOGIC ---
  const filteredUsers = users.filter((user) =>
    ((user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.name_role || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterRole === '' || String(user.role_id) === String(filterRole)) &&
    (filterStatus === '' || String(user.is_active) === filterStatus)
  );

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    currentItems,
    indexOfFirstItem,
    totalPages
  } = useTablePagination(filteredUsers);

  // --- FORM HANDLERS ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEditing && !access.canCreate) return;
    if (isEditing && !access.canEdit) return;

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
    if (!access.canDelete) return;
    if (window.confirm(`Apakah Anda yakin ingin menghapus user "${name}"?`)) {
      try {
        const response = await fetch(`${USER_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Gagal menghapus");

        fetchData();
        showNotification("User berhasil dihapus!", "success");
      } catch {
        showNotification("Gagal menghapus user.", "error");
      }
    }
  };

  const handleToggleStatus = async (user) => {
    if (!access.canEdit) return;
    const newStatus = user.is_active === 0 || user.is_active === '0' ? 1 : 0;
    try {
      const response = await fetch(`${USER_URL}/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name || '',
          email: user.email || '',
          role_id: user.role_id || '',
          phone: user.phone || '',
          gender: user.gender || '',
          is_active: newStatus
        })
      });
      if (!response.ok) throw new Error('Gagal mengubah status');
      fetchData();
      showNotification(newStatus === 1 ? 'User diaktifkan.' : 'User dinonaktifkan.', 'success');
    } catch {
      showNotification('Gagal mengubah status user.', 'error');
    }
  };

  // --- MODAL CONTROL ---
  const handleAddNew = () => {
    if (!access.canCreate) return;
    setIsEditing(false);
    setCurrentUser({ id: null, name: '', email: '', password: '', role_id: roles[0]?.role_id || '', phone: '', gender: '', is_active: 1 });
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    if (!access.canEdit) return;
    setIsEditing(true);
    setCurrentUser({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      password: '', // Biarkan kosong saat mulai mengedit (opsional)
      role_id: user.role_id || '',
      phone: user.phone || '',
      gender: user.gender || '',
      is_active: user.is_active === 0 || user.is_active === '0' ? 0 : 1
    });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  

  // --- STYLES (Tailwind Reusable) ---
  const inputStyle = "w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200";
  const labelStyle = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5";

  if (!access.canView) {
    return (
      <div className="app-card app-card-padded text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">Akses Ditolak</h3>
        <p className="text-gray-500 text-sm mt-2">Anda tidak memiliki hak akses untuk melihat data ini.</p>
      </div>
    );
  }

  return (
    <div className="app-page">
      <FeaturePageHeader
        title="Manajemen User"
        subtitle="Kelola akun pengguna"
        actions={
          <>
            <TableExports
              menuUrl="/hak-akses/user"
              title="Manajemen User"
              filename="data-pengguna"
              columns={[
                { label: 'Nomor', key: 'no', width: 1 },
                { label: 'Nama', key: 'name', width: 3 },
                { label: 'Email', key: 'email', width: 4 },
                { label: 'Peran', key: 'role', width: 3 }
              ]}
              rows={currentItems.map((user, index) => ({
                no: indexOfFirstItem + index + 1,
                name: user.name || '-',
                email: user.email || '-',
                role: user.name_role || 'Tanpa Peran'
              }))}
            />
            {access.canCreate && (
              <button
                onClick={handleAddNew}
                className="app-button app-button-primary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                </svg>
                Tambah
              </button>
            )}
          </>
        }
      />
       <div className="app-page">
      
        
        {/* Toast Notification */}
        {notification.show && (
          <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-2xl border-l-4 bg-white text-gray-800 flex items-center gap-4 ${notification.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        )}

        {/* SEARCH BAR */}
        <div className="app-card app-card-padded">
          <h2 className="mb-4 text-sm font-bold text-slate-800">Filter User</h2>
          <div className="flex flex-col md:flex-row md:flex-wrap gap-3 items-stretch md:items-center">
            <div className="relative w-full md:flex-1">
              <input
                type="text"
                placeholder="Cari berdasarkan nama, email, atau peran..."
                className="app-input pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>

            <select
              className="w-full md:w-64 py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer focus:border-indigo-500 transition"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">Semua Role</option>
              {roles.map((r) => (
                <option key={r.role_id} value={r.role_id}>{r.name_role}</option>
              ))}
            </select>

            <select
              className="w-full md:w-48 py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer focus:border-indigo-500 transition"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="1">Aktif</option>
              <option value="0">Nonaktif</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterRole('');
                setFilterStatus('');
                fetchData();
              }}
              title="Muat Ulang Data & Atur Ulang Filter"
              className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold transition hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Muat Ulang
            </button>
          </div>
        </div>

        {/* TABLE DATA */}
        <div className="app-table-shell">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">No</th>
                  <th className="py-4 px-6">Nama</th>
                  <th className="py-4 px-6">Email</th>
                  <th className="py-4 px-6">Telepon</th>
                  <th className="py-4 px-6">Jenis Kelamin</th>
                  <th className="py-4 px-6">Peran</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 pr-6 text-right w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {currentItems.map((user, index) => (
                  <tr key={user.id} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="py-4 px-6 text-gray-600 text-sm">{indexOfFirstItem + index + 1}</td>
                    <td className="py-4 px-6 font-semibold text-gray-800">{user.name}</td>
                    <td className="py-4 px-6 text-gray-600 text-sm">{user.email}</td>
                    <td className="py-4 px-6 text-gray-600 text-sm">{user.phone || '-'}</td>
                    <td className="py-4 px-6 text-gray-600 text-sm">{user.gender || '-'}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {user.name_role || 'Tanpa Peran'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${user.is_active === 0 || user.is_active === '0' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                        {user.is_active === 0 || user.is_active === '0' ? 'Nonaktif' : 'Aktif'}
                      </span>
                    </td>
                    <td className="py-4 pr-6 text-right space-x-2">
                      {access.canEdit && (
                        <button onClick={() => handleToggleStatus(user)} title={user.is_active === 0 || user.is_active === '0' ? 'Aktifkan' : 'Nonaktifkan'} className="text-gray-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                      )}
                      {access.canEdit && (
                        <button onClick={() => openFaceModal(user)} title="Daftar Wajah" className="text-gray-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm9 3a3 3 0 100 6 3 3 0 000-6z"/></svg>
                        </button>
                      )}
                      {access.canEdit && (
                        <button onClick={() => handleEdit(user)} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                      )}
                      {access.canDelete && (
                        <button onClick={() => handleDelete(user.id, user.name)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {currentItems.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-gray-400">User tidak ditemukan</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 app-pagination">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <PageSizeSelect value={itemsPerPage} onChange={setItemsPerPage} />
              <div className="text-sm text-gray-500"> 
                dari <span className="font-semibold text-gray-700">{filteredUsers.length}</span> records
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Sebelumnya
              </button>
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold border transition ${
                    currentPage === index + 1
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
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
                <label className={labelStyle}>Telepon</label>
                <input type="text" className={inputStyle} value={currentUser.phone} onChange={(e) => setCurrentUser({...currentUser, phone: e.target.value})} placeholder="08xxxxxxxxxx" />
              </div>

              <div>
                <label className={labelStyle}>Jenis Kelamin</label>
                <select className={inputStyle} value={currentUser.gender} onChange={(e) => setCurrentUser({...currentUser, gender: e.target.value})}>
                  <option value="">-- Pilih --</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div>
                <label className={labelStyle}>Status</label>
                <select className={inputStyle} value={currentUser.is_active} onChange={(e) => setCurrentUser({...currentUser, is_active: Number(e.target.value)})}>
                  <option value={1}>Aktif</option>
                  <option value={0}>Nonaktif</option>
                </select>
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

      {faceUser && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">Daftar Wajah - {faceUser.name}</h3>
              <button onClick={closeFaceModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
                <video ref={faceVideoRef} muted playsInline className="h-56 w-full object-cover" />
              </div>
              {faceMessage && (
                <p className="text-xs text-red-500">{faceMessage}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCaptureFace}
                  disabled={!faceModelsLoaded || !faceVideoReady || faceScanning}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {faceScanning ? 'Memindai...' : (faceModelsLoaded ? 'Ambil & Simpan Wajah' : 'Memuat model...')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteFace(faceUser)}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;