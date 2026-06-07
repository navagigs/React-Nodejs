import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { PORTFOLIO_URL, BASE_IMAGE_URL, CLIENT_URL } from '../Api';

// =========================================================================
// PERBAIKAN: FUNGSI HELPER DILETAKKAN DI LUAR KOMPONEN (HANYA ADA 1 DI SINI)
// =========================================================================
const formatRupiah = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const numberString = value.toString().replace(/[^0-9]/g, '');
    if (!numberString) return '';
    return new Intl.NumberFormat('id-ID').format(numberString);
};

const cleanRupiahToNumber = (value) => {
    if (!value) return 0;
    const clean = value.toString().replace(/[^0-9]/g, '');
    return clean ? parseInt(clean, 10) : 0;
};

// =========================================================================
// KOMPONEN UTAMA
// =========================================================================
const Portfolio = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  

  // State Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');

  const [currentProject, setCurrentProject] = useState({ 
      id: null, 
      title: '', 
      client_id: '', 
      description: '', 
      status: 'Pending', 
      date: '', 
      image: null,
      portfolio_value: '',
      project_name: '',
      contract_number: '',
      contract_year: '',
      contract_start_date: '',
      contract_end_date: ''
  });
  
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' }); 
 
  const showNotification = (message, type = 'success') => {
      setNotification({ show: true, message, type });
      setTimeout(() => {
          setNotification((prev) => ({ ...prev, show: false }));
      }, 3000);
  };

  const fetchClients = async () => {
      try {
          const response = await fetch(CLIENT_URL);
          const data = await response.json();
          setClients(data); 
      } catch (error) {
          console.error("Gagal mengambil data client:", error);
      }
  };

const fetchProjects = async () => {
  try {
      const response = await fetch(PORTFOLIO_URL);
      const data = await response.json();
      
      const formattedData = data.map(item => {
          // Fungsi pembantu agar tanggal UTC dikonversi ke tanggal lokal YYYY-MM-DD dengan benar
          const toLocalDateString = (dateString) => {
              if (!dateString) return '';
              const d = new Date(dateString);
              // Mengambil Tahun, Bulan, dan Tanggal lokal browser (WIB) tanpa terikat jam UTC
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
          };

          return {
              ...item,
              date: item.date ? item.date.split('T')[0] : '', // Tanggal input umum biasanya aman dengan split
              contract_start_date: toLocalDateString(item.contract_start_date), // FIX: Menggunakan waktu lokal
              contract_end_date: toLocalDateString(item.contract_end_date)     // FIX: Menggunakan waktu lokal
          };
      });
      
      setProjects(formattedData);
  } catch (error) {
      console.error("Gagal mengambil data project:", error);
      showNotification("Gagal mengambil data server", "error");
  }
};

  useEffect(() => {
    fetchProjects();
    fetchClients(); 
  }, []);

  const getClientName = (id) => {
      const client = clients.find(c => c.id == id);
      return client ? client.name : 'Unknown Client'; 
  };

  const filteredProjects = projects.filter((project) => {
      const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (project.project_name && project.project_name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesClient = filterClient === '' || project.client_id == filterClient;
      return matchesSearch && matchesClient;
  });

  const handleFileChange = (e) => {
      setSelectedImageFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanDescription = currentProject.description.replace(/<(.|\n)*?>/g, '').trim();

    if (!currentProject.title.trim() || !currentProject.description.trim() || !currentProject.client_id || !currentProject.date || !cleanDescription) {
        showNotification("Mohon lengkapi semua data wajib!", "error");
        return;
    }
    
    const formData = new FormData();
    formData.append('title', currentProject.title);
    formData.append('description', currentProject.description);
    formData.append('client_id', currentProject.client_id); 
    formData.append('status', currentProject.status);
    formData.append('date', currentProject.date);
    
    // Konversi nilai state ke angka bersih sebelum dikirim ke MySQL
    const pureNumberValue = cleanRupiahToNumber(currentProject.portfolio_value);
    formData.append('portfolio_value', pureNumberValue);
    
    formData.append('project_name', currentProject.project_name || '');
    formData.append('contract_number', currentProject.contract_number || '');
    formData.append('contract_year', currentProject.contract_year || '');
    formData.append('contract_start_date', currentProject.contract_start_date || '');
    formData.append('contract_end_date', currentProject.contract_end_date || '');
    
    if (selectedImageFile) {
        formData.append('image', selectedImageFile);
    }

    try {
        let url = PORTFOLIO_URL;
        let method = 'POST';
        let successMsg = "Data berhasil ditambahkan!";

        if (isEditing) {
            url = `${PORTFOLIO_URL}/${currentProject.id}`;
            method = 'PUT';
            successMsg = "Data berhasil diperbarui!";
        }

        const response = await fetch(url, {
            method: method,
            body: formData 
        });

        if (!response.ok) throw new Error('Gagal menyimpan data');
        
        fetchProjects(); 
        closeModal();
        showNotification(successMsg, "success");

    } catch (error) {
        console.error("Error saving data:", error);
        showNotification("Terjadi kesalahan saat menyimpan data.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Yakin ingin menghapus project ini?")) {
        try {
            const response = await fetch(`${PORTFOLIO_URL}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error("Gagal menghapus");
            fetchProjects();
            showNotification("Data berhasil dihapus!", "success");
        } catch (error) {
            console.error("Error deleting:", error);
            showNotification("Gagal menghapus data.", "error");
        }
    }
  };

  const handleAddNew = () => {
    setIsEditing(false);
    setCurrentProject({ 
        title: '', client_id: '', description: '', status: 'Pending', date: '', image: null,
        portfolio_value: '', 
        project_name: '', contract_number: '', contract_year: '', 
        contract_start_date: '', contract_end_date: ''
    });
    setSelectedImageFile(null); 
    setIsModalOpen(true);
  };

  const handleEdit = (project) => {
    setIsEditing(true);
    setCurrentProject({
        ...project,
        client_id: project.client_id || project.client,
        portfolio_value: project.portfolio_value ? project.portfolio_value.toString() : '', 
        project_name: project.project_name || '',
        contract_number: project.contract_number || '',
        contract_year: project.contract_year || '',
        contract_start_date: project.contract_start_date ? project.contract_start_date.split('T')[0] : '',
        contract_end_date: project.contract_end_date ? project.contract_end_date.split('T')[0] : ''
    });
    setSelectedImageFile(null); 
    setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setSelectedImageFile(null);
  };
  
  const formatDate = (dateString) => {
      if (!dateString) return "-";
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link'],
      ['clean']
    ],
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

        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Portfolio Projects</h2>
                <p className="text-sm text-gray-500 mt-1">Manage your creative works and case studies.</p>
            </div>
            
            <button 
                onClick={handleAddNew}
                className="group bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5"
            >
                <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                New Project
            </button>
        </div>

        {/* --- FILTER BAR --- */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div className="relative flex-grow">
                <input 
                    type="text" 
                    placeholder="Search projects by title or project name..." 
                    className="pl-10 pr-4 py-2.5 w-full bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm placeholder-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>

            <div className="relative sm:w-64">
                <select 
                    className="w-full py-2.5 pl-10 pr-4 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm appearance-none cursor-pointer"
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                >
                    <option value="">All Clients</option>
                    {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-2a2 2 0 01-2-2h-4v4h6v-4z"/></svg>
                <div className="absolute right-3 top-3 pointer-events-none">
                     <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                </div>
            </div>
        </div>

        {/* --- TABLE DATA --- */}
        <div className="overflow-hidden border border-gray-100 rounded-xl shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-100">
                    <tr className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                        <th className="py-4 pl-6">Cover</th> 
                        <th className="py-4 px-4">Title / Project Name</th>
                        <th className="py-4 px-4">Contract No</th>
                        <th className="py-4 px-4">Value</th>
                        <th className="py-4 px-4">Client</th>
                        <th className="py-4 px-4">Start Date</th>
                        <th className="py-4 px-4">End Date</th>
                        <th className="py-4 pr-6 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                    {filteredProjects.map((item) => (
                    <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors duration-150 group">
                        <td className="py-3 pl-6">
                            {item.image ? (
                                <div className="w-16 h-12 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group-hover:scale-105 transition-transform">
                                    <img src={BASE_IMAGE_URL + item.image} alt={item.title} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200">
                                    <svg className="w-6 h-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                </div>
                            )}
                        </td>
                        <td className="py-4 px-4">
                            <div className="flex flex-col">
                                <span className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">{item.title}</span>
                                <span className="text-xs text-gray-400 italic">{item.project_name || '-'}</span>
                            </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600 font-mono">{item.contract_number || '-'}</td>
                        <td className="py-4 px-4 text-sm font-semibold text-gray-700">
                            {item.portfolio_value ? `Rp ${formatRupiah(item.portfolio_value)}` : '-'}
                        </td>
                        <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                    {(item.client_name || getClientName(item.client_id)).charAt(0)}
                                </div>
                                <span className="text-sm text-gray-600">{item.client_name || getClientName(item.client_id)}</span>
                            </div>
                        </td>
                        {/* <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ring-1 ring-inset 
                                ${item.status === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                                item.status === 'In Progress' ? 'bg-blue-50 text-blue-700 ring-blue-700/10' : 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'}`}>
                                {item.status === 'Completed' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>}
                                {item.status === 'In Progress' && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse"></span>}
                                {item.status === 'Pending' && <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1.5"></span>}
                                {item.status}
                            </span>
                        </td> */}
                        <td className="py-4 px-4 text-sm text-gray-500">{formatDate(item.contract_start_date)}</td>
                        <td className="py-4 px-4 text-sm text-gray-500">{formatDate(item.contract_end_date)}</td>
                        
                        <td className="py-4 pr-6 text-right space-x-2">
                            <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </td>
                    </tr>
                    ))}
                    
                    {filteredProjects.length === 0 && (
                        <tr>
                            <td colSpan="8" className="py-12 text-center">
                                <div className="flex flex-col items-center justify-center text-gray-400">
                                    <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                                    <p className="text-lg font-medium text-gray-500">No projects found</p>
                                    <p className="text-sm">Try adjusting your search or add a new project.</p>
                                </div>
                            </td>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0 relative animate-scale-up">
            
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                <h3 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Project' : 'Create New Project'}</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              
              {/* Image Upload Area */}
              <div className="mb-6">
                <label className={labelStyle}>Project Cover</label>
                <div className="flex items-start gap-6">
                    {((isEditing && currentProject.image && !selectedImageFile) || selectedImageFile) && (
                        <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-gray-200 shadow-sm flex-shrink-0 group">
                             <img 
                                src={selectedImageFile ? URL.createObjectURL(selectedImageFile) : BASE_IMAGE_URL + currentProject.image} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                             />
                             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-xs font-medium">Change</span>
                             </div>
                        </div>
                    )}

                    <div className="flex-grow">
                        <label className="flex justify-center w-full h-24 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-lg appearance-none cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 focus:outline-none">
                            <span className="flex items-center space-x-2">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                <span className="font-medium text-gray-500 text-sm">Drop image here or <span className="text-indigo-600 underline">browse</span></span>
                            </span>
                            <input type="file" name="file_upload" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                        <p className="mt-2 text-xs text-gray-400">Supported formats: JPG, PNG, WEBP (Max 5MB)</p>
                    </div>
                </div>
              </div>

              {/* Form Grid 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={labelStyle}>Title / Headline *</label>
                    <input type="text" required className={inputStyle} placeholder="e.g. Portfolio Case Study Redesign"
                    value={currentProject.title} onChange={(e) => setCurrentProject({...currentProject, title: e.target.value})} />
                </div>
                
                <div>
                    <label className={labelStyle}>Client *</label>
                    <div className="relative">
                        <select required className={`${inputStyle} appearance-none`}
                        value={currentProject.client_id} onChange={(e) => setCurrentProject({...currentProject, client_id: e.target.value})}>
                            <option value="">-- Select Client --</option>
                            {clients.map((client) => (<option key={client.id} value={client.id}>{client.name}</option>))}
                        </select>
                        <div className="absolute right-3 top-3 pointer-events-none text-gray-400">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                    </div>
                </div>
              </div>

              {/* Form Grid 2: Input Rupiah Fix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={labelStyle}>Project Name</label>
                    <input type="text" className={inputStyle} placeholder="e.g. Tokopedia E-Commerce Redesign"
                    value={currentProject.project_name} onChange={(e) => setCurrentProject({...currentProject, project_name: e.target.value})} />
                </div>
                
                <div>
                    <label className={labelStyle}>Portfolio Value (IDR)</label>
                    <div className="relative rounded-lg shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <span className="text-sm font-semibold text-gray-500">Rp</span>
                        </div>
                        <input 
                            type="text" 
                            className={`${inputStyle} pl-10`} 
                            placeholder="0"
                            value={formatRupiah(currentProject.portfolio_value)} 
                            onChange={(e) => {
                                const rawValue = e.target.value.replace(/[^0-9]/g, '');
                                setCurrentProject({ ...currentProject, portfolio_value: rawValue });
                            }} 
                        />
                    </div>
                </div>
              </div>

              {/* Form Grid 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={labelStyle}>Contract Number</label>
                    <input type="text" className={inputStyle} placeholder="e.g. 012/CROP-CONT/XII/2026"
                    value={currentProject.contract_number} onChange={(e) => setCurrentProject({...currentProject, contract_number: e.target.value})} />
                </div>
                
                <div>
                    <label className={labelStyle}>Contract Year</label>
                    <input type="number" min="2000" max="2099" className={inputStyle} placeholder="e.g. 2026"
                    value={currentProject.contract_year} onChange={(e) => setCurrentProject({...currentProject, contract_year: e.target.value})} />
                </div>
              </div>

              {/* Form Grid 4 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={labelStyle}>Contract Start Date</label>
                    <input type="date" className={inputStyle}
                    value={currentProject.contract_start_date} onChange={(e) => setCurrentProject({...currentProject, contract_start_date: e.target.value})} />
                </div>
                
                <div>
                    <label className={labelStyle}>Contract End Date</label>
                    <input type="date" className={inputStyle}
                    value={currentProject.contract_end_date} onChange={(e) => setCurrentProject({...currentProject, contract_end_date: e.target.value})} />
                </div>
              </div>

              {/* Text Editor */}
              <div>
                  <label className={labelStyle}>Description *</label>
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all">
                      <ReactQuill theme="snow" value={currentProject.description || ''} onChange={(content) => setCurrentProject({ ...currentProject, description: content })} modules={modules} className="h-48 mb-10" />
                  </div>
              </div>
 

              {/* Footer Buttons */}
              <div className="flex gap-4 pt-6 mt-4 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 hover:text-gray-900 transition flex-1 md:flex-none">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition flex-1">
                  {isEditing ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Portfolio;