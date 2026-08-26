import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { BASE_IMAGE_URL, ARTICLE_URL, CATEGORY_URL } from '../Api';

const Articles = () => {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // --- STATE FILTER & SEARCH ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // --- STATE PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // State Form
  const [currentArticle, setCurrentArticle] = useState({ 
      id: null, 
      title: '', 
      content: '', 
      category_id: '',
      status: 'published',
      image: null 
  });
  
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' }); 
   
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');

  // --- KONFIGURASI TOOLBAR TEXT EDITOR ---
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link'
  ];

  // --- NOTIFICATION HANDLER ---
  const showNotification = (message, type = 'success') => {
      setNotification({ show: true, message, type });
      setTimeout(() => {
          setNotification((prev) => ({ ...prev, show: false }));
      }, 3000);
  };

  // --- FETCH DATA ---
  const fetchData = async () => {
    try {
        const articleRes = await fetch(ARTICLE_URL);
        const articleData = await articleRes.json();
        
        const catRes = await fetch(CATEGORY_URL);
        const catData = await catRes.json();

        setCategories(catData);
        setArticles(articleData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

    } catch (error) {
        console.error("Gagal mengambil data:", error);
        showNotification("Gagal mengambil data server", "error");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- FILTER LOGIC ---
  const filteredArticles = articles.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(term);
      const matchCategory = filterCategory === '' || String(item.category_id) === String(filterCategory);
      const matchStatus = filterStatus === '' || item.status === filterStatus;
      return matchTitle && matchCategory && matchStatus;
  });

  // Reset ke halaman 1 jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStatus]);

  // --- PAGINATION LOGIC ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredArticles.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);

  // --- FORM HANDLERS ---
  const handleFileChange = (e) => {
      if (e.target.files && e.target.files[0]) {
          setSelectedImageFile(e.target.files[0]);
      }
  };

  const handleContentChange = (value) => {
      setCurrentArticle(prev => ({ ...prev, content: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentArticle.title.trim() || !currentArticle.category_id || currentArticle.content.replace(/<(.|\n)*?>/g, '').trim().length === 0) {
        showNotification("Judul, Kategori, dan Konten wajib diisi!", "error");
        return;
    }
    
    const formData = new FormData();
    formData.append('title', currentArticle.title);
    formData.append('content', currentArticle.content);
    formData.append('category_id', currentArticle.category_id);
    formData.append('status', currentArticle.status || 'published');
    
    if (selectedImageFile) {
        formData.append('image', selectedImageFile);
    }

    try {
        let url = ARTICLE_URL;
        let method = 'POST'; 
        let successMsg = "Artikel berhasil diterbitkan!";

        if (isEditing) {
            url = `${ARTICLE_URL}/${currentArticle.id}`;
            formData.append('_method', 'PUT'); 
            successMsg = "Artikel berhasil diperbarui!";
        }

        const response = await fetch(url, {
            method: method,
            body: formData 
        });

        if (!response.ok) throw new Error('Gagal menyimpan data');
        
        fetchData(); 
        closeModal();
        showNotification(successMsg, "success");

    } catch (error) {
        console.error("Error saving data:", error);
        showNotification("Terjadi kesalahan saat menyimpan data.", "error");
    }
  };

  // --- TOGGLE PUBLISH / UNPUBLISH ---
  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    const formData = new FormData();
    formData.append('title', item.title);
    formData.append('content', item.content);
    formData.append('category_id', item.category_id);
    formData.append('status', newStatus);
    formData.append('_method', 'PUT');

    try {
        const response = await fetch(`${ARTICLE_URL}/${item.id}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Gagal mengupdate status");

        fetchData();
        showNotification(`Status artikel diubah menjadi ${newStatus === 'published' ? 'Published' : 'Draft'}`);
    } catch (error) {
        console.error("Error updating status:", error);
        showNotification("Gagal memperbarui status", "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Yakin ingin menghapus artikel ini?")) {
        try {
            const response = await fetch(`${ARTICLE_URL}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error("Gagal menghapus");

            fetchData();
            showNotification("Artikel berhasil dihapus!", "success");
        } catch (error) {
            console.error("Error deleting:", error);
            showNotification("Gagal menghapus data.", "error");
        }
    }
  };

  // --- MODAL CONTROL ---
  const handleAddNew = () => {
    setIsEditing(false);
    setCurrentArticle({ title: '', content: '', category_id: '', status: 'published', image: null });
    setSelectedImageFile(null); 
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setIsEditing(true);
    setCurrentArticle({
        ...item,
        category_id: String(item.category_id),
        status: item.status || 'published'
    });
    setSelectedImageFile(null); 
    setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setSelectedImageFile(null);
  }

  const formatDate = (dateString) => {
      if (!dateString) return "-";
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const inputStyle = "w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200 placeholder-gray-400";
  const labelStyle = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5";

  return (
    <div className="max-w-7xl mx-auto">
      
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
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Articles List</h2>
                <p className="text-sm text-gray-500 mt-1">Manage articles. Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredArticles.length)} of {filteredArticles.length}</p>
            </div>
            
            <button 
                onClick={handleAddNew}
                className="group bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5"
            >
                <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                Write Article
            </button>
        </div>

        {/* --- SEARCH & FILTER --- */}
        <div className="mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative w-full md:flex-1">
                    <input 
                        type="text" 
                        placeholder="Search article title..." 
                        className="pl-10 pr-4 py-2.5 w-full bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm placeholder-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>

                {/* Filter Status */}
                <div className="w-full md:w-48">
                    <select
                        className="w-full py-2.5 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition cursor-pointer"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft (Unpublished)</option>
                    </select>
                </div>

                {/* Category Dropdown */}
                <div className="w-full md:w-64 relative"> 
                <div className="relative">
                    <input
                        type="text"
                        className="pl-10 pr-10 py-2.5 w-full bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition cursor-pointer"
                        placeholder={filterCategory ? categories.find(c => String(c.id) === String(filterCategory))?.name : "Search Category..."}
                        value={catSearchQuery}
                        onFocus={() => setIsCatDropdownOpen(true)}
                        onChange={(e) => {
                            setCatSearchQuery(e.target.value);
                            setIsCatDropdownOpen(true);
                        }}
                    />
                    
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>

                    {filterCategory && (
                        <button 
                            onClick={() => { setFilterCategory(''); setCatSearchQuery(''); }}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-red-500"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    )}

                    {isCatDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                            <div 
                                className="px-4 py-2.5 text-sm text-indigo-600 font-semibold hover:bg-indigo-50 cursor-pointer border-b border-gray-50"
                                onClick={() => {
                                    setFilterCategory('');
                                    setCatSearchQuery('');
                                    setIsCatDropdownOpen(false);
                                }}
                            >
                                All Categories
                            </div>
                            {categories
                                .filter(cat => cat.name.toLowerCase().includes(catSearchQuery.toLowerCase()))
                                .map((cat) => (
                                    <div
                                        key={cat.id}
                                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${String(filterCategory) === String(cat.id) ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                        onClick={() => {
                                            setFilterCategory(cat.id);
                                            setCatSearchQuery(cat.name);
                                            setIsCatDropdownOpen(false);
                                        }}
                                    >
                                        {cat.name}
                                    </div>
                                ))}
                            {categories.filter(cat => cat.name.toLowerCase().includes(catSearchQuery.toLowerCase())).length === 0 && (
                                <div className="px-4 py-3 text-sm text-gray-400 text-center">No category found</div>
                            )}
                        </div>
                    )}
                </div>
                
                {isCatDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsCatDropdownOpen(false)}></div>
                )}
            </div>
            </div>
        </div>

        {/* --- TABLE DATA --- */}
        <div className="overflow-hidden border border-gray-100 rounded-xl shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-100">
                    <tr className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                        <th className="py-4 pl-6 w-24">Image</th> 
                        <th className="py-4 px-4">Title</th>
                        <th className="py-4 px-4">Category</th>
                        <th className="py-4 px-4">Status</th>
                        <th className="py-4 px-4">Date</th>
                        <th className="py-4 pr-6 text-right w-36">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                    {currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors duration-150 group">
                        <td className="py-3 pl-6">
                            {item.image ? (
                                <div className="w-16 h-12 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative">
                                    <img src={BASE_IMAGE_URL + item.image} alt={item.title} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-16 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400 border border-gray-200">
                                    No Img
                                </div>
                            )}
                        </td>
                        <td className="py-4 px-4">
                            <span className="font-semibold text-gray-800 line-clamp-1">{item.title}</span>
                        </td>
                        <td className="py-4 px-4">
                            <span className="px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {item.category_name || 'Uncategorized'}
                            </span>
                        </td>
                        <td className="py-4 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                item.status === 'published' 
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>
                                {item.status === 'published' ? 'Published' : 'Draft'}
                            </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-500">
                            {formatDate(item.created_at)}
                        </td>
                        <td className="py-4 pr-6 text-right space-x-1">
                            <button 
                                onClick={() => handleToggleStatus(item)} 
                                className={`p-2 rounded-lg transition-all ${
                                    item.status === 'published' 
                                        ? 'text-emerald-600 hover:bg-emerald-50' 
                                        : 'text-amber-600 hover:bg-amber-50'
                                }`}
                                title={item.status === 'published' ? 'Unpublish Article' : 'Publish Article'}
                            >
                                {item.status === 'published' ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a8.959 8.959 0 013.682-.793c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18"/></svg>
                                )}
                            </button>
                            <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </td>
                    </tr>
                    ))}
                    
                    {filteredArticles.length === 0 && (
                        <tr>
                            <td colSpan="6" className="py-12 text-center text-gray-400">
                                {filterCategory || filterStatus ? "No articles found with active filters" : "No articles found"}
                            </td>
                        </tr>
                    )}
                </tbody>
                </table>
            </div>

            {/* --- PAGINATION CONTROLS --- */}
            {filteredArticles.length > itemsPerPage && (
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-indigo-500'}`}
                        >
                            Previous
                        </button>
                        <div className="hidden sm:flex gap-1">
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-500'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-indigo-500'}`}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- MODAL FORM --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0 relative animate-scale-up">
            
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                <h3 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Article' : 'Write Article'}</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              
              <div>  
                    <label className={labelStyle}>Title *</label>
                    <input 
                        type="text" required 
                        className={inputStyle} 
                        value={currentArticle.title} 
                        onChange={(e) => setCurrentArticle({...currentArticle, title: e.target.value})} 
                    />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className={labelStyle}>Category *</label>
                        <select 
                            required 
                            className={inputStyle}
                            value={currentArticle.category_id}
                            onChange={(e) => setCurrentArticle({...currentArticle, category_id: e.target.value})}
                        >
                            <option value="">-- Select Category --</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                </div>

                <div>
                   <label className={labelStyle}>Status *</label>
                        <select 
                            required 
                            className={inputStyle}
                            value={currentArticle.status || 'published'}
                            onChange={(e) => setCurrentArticle({...currentArticle, status: e.target.value})}
                        >
                            <option value="published">Publish Direct</option>
                            <option value="draft">Save as Draft (Unpublish)</option>
                        </select>
                </div>
              </div>
              
              <div className="pb-8"> 
                  <label className={labelStyle}>Content *</label>
                  <div className="bg-white">
                    <ReactQuill 
                        theme="snow"
                        value={currentArticle.content}
                        onChange={handleContentChange}
                        modules={modules}
                        formats={formats}
                        className="h-64 mb-4" 
                        placeholder="Write your article content here..."
                    />
                  </div>
              </div>

              <div className="flex flex-col mb-6">
                <label className={labelStyle}>Cover Image</label>
                <div className="relative group cursor-pointer mt-2 w-full h-48 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors">
                    {selectedImageFile || (isEditing && currentArticle.image) ? (
                         <img 
                            src={selectedImageFile ? URL.createObjectURL(selectedImageFile) : BASE_IMAGE_URL + currentArticle.image} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            <span className="text-sm">Click to upload image</span>
                        </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    <div className="absolute inset-0 z-10" onClick={(e) => e.target.previousSibling.click()}></div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100 mt-8">
                <button type="button" onClick={closeModal} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition flex-1">
                  Batal
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition flex-1">
                  {isEditing ? 'Simpan' : 'Save Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Articles;