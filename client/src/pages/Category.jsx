import React, { useState, useEffect } from 'react';
import { CATEGORY_URL } from '../Api';

const Category = () => {
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // State Form
  const [currentCategory, setCurrentCategory] = useState({ 
      id: null, 
      name: ''
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
  const fetchCategories = async () => {
    try {
        const response = await fetch(CATEGORY_URL);
        const data = await response.json();
        setCategories(data);
    } catch (error) {
        console.error("Gagal mengambil data category:", error);
        showNotification("Gagal mengambil data server", "error");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // --- FILTER LOGIC ---
  const filteredCategories = categories.filter((cat) => 
      cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- FORM HANDLERS ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentCategory.name.trim()) {
        showNotification("Nama Kategori wajib diisi!", "error");
        return;
    }
    
    // JSON Payload (karena tidak ada gambar)
    const payload = { name: currentCategory.name };

    try {
        let url = CATEGORY_URL;
        let method = 'POST';
        let successMsg = "Kategori berhasil ditambahkan!";

        if (isEditing) {
            url = `${CATEGORY_URL}/${currentCategory.id}`;
            method = 'PUT';
            successMsg = "Kategori berhasil diperbarui!";
        }

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload) 
        });

        if (!response.ok) throw new Error('Gagal menyimpan data');
        
        fetchCategories(); 
        closeModal();
        showNotification(successMsg, "success");

    } catch (error) {
        console.error("Error saving data:", error);
        showNotification("Terjadi kesalahan saat menyimpan data.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Yakin ingin menghapus kategori ini?")) {
        try {
            const response = await fetch(`${CATEGORY_URL}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error("Gagal menghapus");

            fetchCategories();
            showNotification("Kategori berhasil dihapus!", "success");
        } catch (error) {
            console.error("Error deleting:", error);
            showNotification("Gagal menghapus data.", "error");
        }
    }
  };

  // --- MODAL CONTROL ---
  const handleAddNew = () => {
    setIsEditing(false);
    setCurrentCategory({ name: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (category) => {
    setIsEditing(true);
    setCurrentCategory(category);
    setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
  }

  // --- STYLES ---
  const inputStyle = "w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200 placeholder-gray-400";
  const labelStyle = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5";

  return (
    <div className="max-w-5xl mx-auto"> {/* Container lebih kecil untuk kategori */}
      
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
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">article Categories</h2>
                <p className="text-sm text-gray-500 mt-1">Manage categories for your article articles.</p>
            </div>
            
            <button 
                onClick={handleAddNew}
                className="group bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5"
            >
                <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                Tambah
            </button>
        </div>

        {/* --- SEARCH BAR --- */}
        <div className="mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div className="relative w-full">
                <input 
                    type="text" 
                    placeholder="Search category..." 
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
                        <th className="py-4 px-6">Category Name</th>
                        <th className="py-4 pr-6 text-right w-32">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                    {filteredCategories.map((item) => (
                    <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors duration-150 group">
                        <td className="py-4 px-6">
                            <span className="font-semibold text-gray-800">{item.name}</span>
                        </td>
                        <td className="py-4 pr-6 text-right space-x-2">
                            <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </td>
                    </tr>
                    ))}
                    {filteredCategories.length === 0 && (
                        <tr>
                            <td colSpan="2" className="py-12 text-center text-gray-400">No categories found</td>
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
                <h3 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Category' : 'Add Category'}</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                  <label className={labelStyle}>Category Name *</label>
                  <input type="text" required className={inputStyle} value={currentCategory.name} onChange={(e) => setCurrentCategory({...currentCategory, name: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4 border-t border-gray-100 mt-4">
                <button type="button" onClick={closeModal} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 flex-1">Batal</button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 flex-1">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Category;