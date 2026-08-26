import React, { useState, useEffect } from 'react';
import { BASE_IMAGE_URL, CLIENT_URL } from '../Api';

const Client = () => {
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- STATE PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // Ubah angka ini untuk mengatur jumlah baris per halaman

  // State Form
  const [currentClient, setCurrentClient] = useState({ 
      id: null, 
      name: '', 
      address: '', 
      image: null 
  });
  
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' }); 

  // =========================================================================
  // 🔒 STATE UTK MENAMPUNG HAK AKSES AGAR UI MERESPON REAL-TIME
  // =========================================================================
  const [userAuth, setUserAuth] = useState({ is_view: '0', is_create: '0', is_edit: '0', is_delete: '0' });

  // Ambil permission & bungkus di dalam useEffect agar stabil
  useEffect(() => {
    const checkPermissions = () => {
      try {
        const rawPermissions = localStorage.getItem('permissions');
        if (!rawPermissions) return;
        
        const permissionsArray = JSON.parse(rawPermissions);
        const TARGET_MENU_ID = 147; 

        const currentMenuAuth = permissionsArray.find(
          (auth) => Number(auth.menu_id) === TARGET_MENU_ID
        );
 
        if (currentMenuAuth) {
          setUserAuth({
            is_view: String(currentMenuAuth.is_view ?? '0').trim(),
            is_create: String(currentMenuAuth.is_create ?? '0').trim(),
            is_edit: String(currentMenuAuth.is_edit ?? '0').trim(),
            is_delete: String(currentMenuAuth.is_delete ?? '0').trim()
          });
        }
      } catch (e) {
        console.error("Gagal memuat permission:", e);
      }
    };

    checkPermissions();
  }, []);

  // --- NOTIFICATION HANDLER ---
  const showNotification = (message, type = 'success') => {
      setNotification({ show: true, message, type });
      setTimeout(() => {
          setNotification((prev) => ({ ...prev, show: false }));
      }, 3000);
  };

  // --- FETCH DATA ---
  const fetchClients = async () => {
    try {
        const response = await fetch(CLIENT_URL);
        const data = await response.json();
        const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setClients(sortedData);
    } catch (error) {
        console.error("Gagal mengambil data client:", error);
        showNotification("Gagal mengambil data server", "error");
    }
  };

  // Panggil fetch data hanya jika hak akses view disetujui ('1')
  useEffect(() => {
    if (userAuth.is_view === '1') {
      fetchClients();
    }
  }, [userAuth.is_view]);

  // --- FILTER LOGIC ---
  const filteredClients = clients.filter((client) => {
      const term = searchTerm.toLowerCase();
      return (
          client.name.toLowerCase().includes(term) || 
          client.address.toLowerCase().includes(term)
      );
  });

  // --- CALCULATE PAGINATION ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredClients.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  // Reset ke halaman 1 jika user sedang mengetik pencarian
  const handleSearchChange = (e) => {
      setSearchTerm(e.target.value);
      setCurrentPage(1);
  };

  // --- FORM HANDLERS ---
  const handleFileChange = (e) => {
      if (e.target.files && e.target.files[0]) {
          setSelectedImageFile(e.target.files[0]);
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // PROTEKSI AKSI SUBMIT FORM
    if (!isEditing && userAuth.is_create !== '1') {
        showNotification("Aksi ditolak! Anda tidak memiliki akses Tambah data.", "error");
        return;
    }
    if (isEditing && userAuth.is_edit !== '1') {
        showNotification("Aksi ditolak! Anda tidak memiliki akses Ubah data.", "error");
        return;
    }

    if (!currentClient.name.trim() || !currentClient.address.trim()) {
        showNotification("Nama dan Alamat wajib diisi!", "error");
        return;
    }
    
    const formData = new FormData();
    formData.append('name', currentClient.name);
    formData.append('address', currentClient.address);
    
    if (selectedImageFile) {
        formData.append('image', selectedImageFile);
    }

    try {
        let url = CLIENT_URL;
        let method = 'POST';
        let successMsg = "Client berhasil ditambahkan!";

        if (isEditing) {
            url = `${CLIENT_URL}/${currentClient.id}`;
            method = 'PUT';
            successMsg = "Data client berhasil diperbarui!";
        }

        const response = await fetch(url, {
            method: method,
            body: formData 
        });

        if (!response.ok) throw new Error('Gagal menyimpan data');
        
        fetchClients(); 
        closeModal();
        showNotification(successMsg, "success");

    } catch (error) {
        console.error("Error saving data:", error);
        showNotification("Terjadi kesalahan saat menyimpan data.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (userAuth.is_delete !== '1') {
        showNotification("Anda tidak memiliki hak akses untuk menghapus data ini!", "error");
        return;
    }

    if (window.confirm("Yakin ingin menghapus client ini? Project yang terkait mungkin akan kehilangan data client.")) {
        try {
            const response = await fetch(`${CLIENT_URL}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error("Gagal menghapus");

            fetchClients();
            showNotification("Client berhasil dihapus!", "success");
            
            // Keamanan index jika data terakhir di halaman tersebut habis dihapus
            if (currentItems.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            }
        } catch (error) {
            console.error("Error deleting:", error);
            showNotification("Gagal menghapus data.", "error");
        }
    }
  };

  // --- MODAL CONTROL ---
  const handleAddNew = () => {
    if (userAuth.is_create !== '1') {
        showNotification("Anda tidak memiliki hak akses untuk menambah data!", "error");
        return;
    }
    setIsEditing(false);
    setCurrentClient({ name: '', address: '', image: null });
    setSelectedImageFile(null); 
    setIsModalOpen(true);
  };

  const handleEdit = (client) => {
    if (userAuth.is_edit !== '1') {
        showNotification("Anda tidak memiliki hak akses untuk mengubah data!", "error");
        return;
    }
    setIsEditing(true);
    setCurrentClient(client);
    setSelectedImageFile(null); 
    setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setSelectedImageFile(null);
  }

  const inputStyle = "w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200 placeholder-gray-400";
  const labelStyle = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5";

  // BLOCK SELURUH ELEMEN JIKA TIDAK MEMILIKI AKSES VIEW SAMA SEKALI
  if (userAuth.is_view !== '1') {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center bg-white border border-gray-100 shadow-xl rounded-2xl">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">Akses Ditolak</h3>
        <p className="text-gray-500 text-sm mt-2">Maaf, akun Anda tidak memiliki izin untuk melihat halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 animate-fade-in-up">
      
        {/* Toast Notification */}
        {notification.show && (
            <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 transition-all transform duration-300 ${
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
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Client List</h2>
                <p className="text-sm text-gray-500 mt-1">Manage your business partners and clients.</p>
            </div>
            
            {userAuth.is_create === '1' && (
                <button 
                    onClick={handleAddNew}
                    className="group bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5"
                >
                    <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                     Tambah
                </button>
            )}
        </div>

        {/* --- SEARCH BAR --- */}
        <div className="mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div className="relative w-full">
                <input 
                    type="text" 
                    placeholder="Search client by name or address..." 
                    className="pl-10 pr-4 py-2.5 w-full bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm placeholder-gray-400"
                    value={searchTerm}
                    onChange={handleSearchChange}
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
                        <th className="py-4 pl-6 w-24">Logo</th> 
                        <th className="py-4 px-4">Client Name</th>
                        <th className="py-4 px-4">Address</th>
                        <th className="py-4 pr-6 text-right w-32">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                    {currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors duration-150 group">
                        <td className="py-3 pl-6">
                            {item.image ? (
                                <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 shadow-sm relative group-hover:scale-105 transition-transform">
                                    <img src={BASE_IMAGE_URL + item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-200">
                                    {item.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </td>
                        <td className="py-4 px-4">
                            <span className="font-semibold text-gray-800">{item.name}</span>
                        </td>
                        <td className="py-4 px-4">
                            <span className="text-sm text-gray-600 truncate max-w-xs block" title={item.address}>
                                {item.address}
                            </span>
                        </td>
                        <td className="py-4 pr-6 text-right space-x-2">
                            {userAuth.is_edit === '1' && (
                                <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                            )}
                            {userAuth.is_delete === '1' && (
                                <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            )}
                        </td>
                    </tr>
                    ))}
                    
                    {filteredClients.length === 0 && (
                        <tr>
                            <td colSpan="4" className="py-12 text-center">
                                <div className="flex flex-col items-center justify-center text-gray-400">
                                    <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                    <p className="text-lg font-medium text-gray-500">No clients found</p>
                                    <p className="text-sm">Add your first client to get started.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
                </table>
            </div>
        </div>

        {/* --- PAGINATION CONTROLS (CUSTOM REQ DESIGN) --- */}
        {filteredClients.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-sm text-gray-500">
                    Showing <span className="font-semibold text-gray-700">{indexOfFirstItem + 1}</span> to{' '}
                    <span className="font-semibold text-gray-700">
                        {indexOfLastItem > filteredClients.length ? filteredClients.length : indexOfLastItem}
                    </span>{' '}
                    of <span className="font-semibold text-gray-700">{filteredClients.length}</span> entries
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            currentPage === 1 
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        Previous
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
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            currentPage === totalPages 
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        Next
                    </button>
                </div>
            </div>
        )}

      </div>

      {/* --- MODAL FORM --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-0 relative animate-scale-up">
            
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                <h3 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Client' : 'Add New Client'}</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              
              {/* Image Upload Area */}
              <div className="flex flex-col items-center mb-6">
                <label className={labelStyle}>Client Logo / Photo</label>
                <div className="relative group cursor-pointer mt-2">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-100 shadow-md">
                        <img 
                            src={
                                selectedImageFile ? URL.createObjectURL(selectedImageFile) : 
                                (isEditing && currentClient.image) ? BASE_IMAGE_URL + currentClient.image : 
                                "https://via.placeholder.com/150?text=IMG"
                            } 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    <div className="absolute inset-0 z-10" onClick={(e) => {
                         e.target.previousSibling.click();
                    }}></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Click to upload (JPG, PNG)</p>
              </div>

              {/* Form Inputs */}
              <div>
                  <label className={labelStyle}>Client Name *</label>
                  <input 
                      type="text" required 
                      className={inputStyle} 
                      placeholder="e.g. PT Maju Mundur"
                      value={currentClient.name} 
                      onChange={(e) => setCurrentClient({...currentClient, name: e.target.value})} 
                  />
              </div>
              
              <div>
                  <label className={labelStyle}>Address *</label>
                  <textarea 
                      required 
                      rows="3"
                      className={inputStyle} 
                      placeholder="Full office address..."
                      value={currentClient.address} 
                      onChange={(e) => setCurrentClient({...currentClient, address: e.target.value})} 
                  ></textarea>
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-4 pt-4 border-t border-gray-100 mt-4">
                <button type="button" onClick={closeModal} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 hover:text-gray-900 transition flex-1">
                  Batal
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition flex-1">
                  {isEditing ? 'Simpan' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Client;