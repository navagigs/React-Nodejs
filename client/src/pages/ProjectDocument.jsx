import React, { useState, useEffect } from 'react';
import { PROJECT_DOCUMENT_URL, PORTFOLIO_URL, CLIENT_URL } from '../Api'; 

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import htmlEditButton from 'quill-html-edit-button';
import { html as beautifyHtml } from 'js-beautify';


// Registrasi modul alignment agar mendukung rata kiri-kanan (justify) di Quill secara absolut
const Quill = ReactQuill.Quill; 
Quill.register('modules/htmlEditButton', htmlEditButton);
// === TAMBAHKAN KODE INI UNTUK MENGAKTIFKAN INLINE STYLE ===
const DirectionAttribute = Quill.import('attributors/style/direction');
const AlignStyle = Quill.import('attributors/style/align');
const BackgroundStyle = Quill.import('attributors/style/background');
const ColorStyle = Quill.import('attributors/style/color');
const FontStyle = Quill.import('attributors/style/font');
const SizeStyle = Quill.import('attributors/style/size');
// === REGISTRASI LANGSUNG TANPA MEMBUAT VARIABEL BARU ===
Quill.register(Quill.import('attributors/style/direction'), true);
Quill.register(Quill.import('attributors/style/align'), true);
Quill.register(Quill.import('attributors/style/background'), true);
Quill.register(Quill.import('attributors/style/color'), true);
Quill.register(Quill.import('attributors/style/font'), true);
Quill.register(Quill.import('attributors/style/size'), true);
// ========================================================
// ========================================================

const ProjectDocument = ({ projectId }) => {
    // STATE MANAGEMENT
    const [documents, setDocuments] = useState([]);
    const [portfolios, setPortfolios] = useState([]); 
    const [viewMode, setViewMode] = useState('table');
      const [clients, setClients] = useState([]);  // 'table', 'form'
    
    const [previewLetter, setPreviewLetter] = useState(null); 
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [docLineSpacing, setDocLineSpacing] = useState('1.5');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterClient, setFilterClient] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10); // Mengatur 10 data per halaman 
   
    const [syncBappPihak1, setSyncBappPihak1] = useState(false);
    const [syncBappPihak2, setSyncBappPihak2] = useState(false);
    const [syncBastPihak1, setSyncBastPihak1] = useState(false);
    const [syncBastPihak2, setSyncBastPihak2] = useState(false);
    const [portfolioSearch, setPortfolioSearch] = useState('');
    const [description, setDescription] = useState('');

    // STATE FORM: MURNI KOSONG SESUAI STRUKTUR API
    const [formData, setFormData] = useState({
        id: null,
        project_id: projectId || '',
        location: '',
        
        inspection_date: '',
        inspection_officer_name_1: '',
        inspection_officer_role_1: '',
        inspection_officer_name_2: '',
        inspection_officer_role_2: '',
        inspection_description: '', 

        progress_date: '',
        progress_officer_name_1: '',
        progress_officer_role_1: '',
        progress_officer_name_2: '',
        progress_officer_role_2: '',
        progress_description: '', 

        handover_date: '',
        handover_officer_name_1: '',
        handover_officer_role_1: '',
        handover_officer_name_2: '',
        handover_officer_role_2: '',
        handover_description: '',
        progress_status: 1, // Default aktif saat create baru
        handover_status: 1,   
    });
    
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' }); 

// Fungsi untuk merapikan isi HTML di dalam State
    const handleFormatHTML = (field) => {
        if (!formData[field]) return;

        // Konfigurasi standar agar susunan tag HTML rapi ke bawah
        const options = {
            indent_size: 2,
            wrap_line_length: 60,
            preserve_newlines: true,
            end_with_newline: true
        };

        // Proses merapikan teks HTML
        const rapiHtml = beautifyHtml(formData[field], options);

        // Simpan kembali ke dalam state
        setFormData(prev => ({
            ...prev,
            [field]: rapiHtml
        }));
    };
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    // Update Konfigurasi Modules Anda
    const formQuillModules = {
        toolbar: [
           [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }], // Pastikan baris warna ini aktif di toolbar
            [{ 'align': [] }],
            ['clean']
        ],
        // Tambahkan konfigurasi htmlEditButton di bawah ini
        htmlEditButton: {
            debug: false,
            msg: "Edit kode HTML",
            okText: "Simpan",
            cancelText: "Batal",
            buttonHTML: "&lt;&gt;", // Menampilkan tombol <> di toolbar
        },
        clipboard: {
             matchVisual: false,
        }
    };

      const fetchClients = async () => {
          try {
              const response = await fetch(CLIENT_URL);
              const data = await response.json();
              setClients(data); 
          } catch (error) { console.error("Gagal mengambil data klien:", error); }
      };
    

    const previewQuillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }] // Ditambahkan alignment rata kiri-kanan (justify)
        ],
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => { setNotification((prev) => ({ ...prev, show: false })); }, 3000);
    };

    const fetchPortfolios = async () => {
        try {
            const response = await fetch(`${PORTFOLIO_URL}`);
            if (response.ok) {
                const data = await response.json();
                setPortfolios(Array.isArray(data) ? data : []);
            }
        } catch (error) { console.error(error); }
    };

    const fetchDocuments = async () => {
        try {
            const url = projectId ? `${PROJECT_DOCUMENT_URL}/project/${projectId}` : `${PROJECT_DOCUMENT_URL}`;
            const response = await fetch(url);
            if (response.status === 404) { setDocuments([]); return; }
            if (!response.ok) throw new Error("Gagal memuat data");
            
            const data = await response.json();
            const dataArray = Array.isArray(data) ? data : [data];
            
            const formattedData = dataArray.map(item => ({
                ...item,
                inspection_date: item.inspection_date ? item.inspection_date.split('T')[0] : '',
                progress_date: item.progress_date ? item.progress_date.split('T')[0] : '',
                handover_date: item.handover_date ? item.handover_date.split('T')[0] : '',
            }));
            setDocuments(formattedData);
        } catch (error) {
            showNotification("Gagal mengambil data dokumen dari database", "error");
        }
    };

    useEffect(() => {
        fetchDocuments();
        fetchPortfolios();

        fetchClients(); 
    }, [projectId]);

    const resetForm = () => {
        setFormData({
            id: null, project_id: projectId || '', location: '',
            inspection_date: '', inspection_officer_name_1: '', inspection_officer_role_1: '', inspection_officer_name_2: '', inspection_officer_role_2: '', inspection_description: '', 
            progress_date: '', progress_officer_name_1: '', progress_officer_role_1: '', progress_officer_name_2: '', progress_officer_role_2: '', progress_description: '', 
            handover_date: '', handover_officer_name_1: '', handover_officer_role_1: '', handover_officer_name_2: '', handover_officer_role_2: '', handover_description: ''
        });
        setViewMode('table');
    };

    // SESUAIKAN ADD NEW: Reset nilai kolom baru
  const handleAddNew = () => {
    setIsEditing(false);
    setCurrentProject({ 
        title: '', client_id: '', description: '', status: 'Pending', date: '', image: null,
        portfolio_value: '', project_name: '', contract_number: '', contract_year: '', 
        contract_start_date: '', contract_end_date: ''
    });
    setSelectedImageFile(null); 
    setIsModalOpen(true);
  };

    const handleEditClick = (item) => {
        setFormData({ ...item });
        setViewMode('form');
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) return;
        try {
            const response = await fetch(`${PROJECT_DOCUMENT_URL}/${id}`, { method: 'DELETE' });
            if (response.ok) { showNotification("Dokumen Dihapus!", "success"); fetchDocuments(); }
        } catch (error) { showNotification("Gagal menghapus dokumen.", "error"); }
    };

    const handleSaveDocument = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id ? `${PROJECT_DOCUMENT_URL}/${formData.id}` : `${PROJECT_DOCUMENT_URL}`;
        
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (response.ok) { showNotification("Data dokumen disimpan!", "success"); fetchDocuments(); resetForm(); }
        } catch (error) { showNotification("Gagal menyimpan dokumen.", "error"); }
        finally { setIsSaving(false); }
    };

    const handleUpdateFromPreview = async () => {
        if (!previewLetter.id) return;
        setIsSaving(true);
        try {
            const response = await fetch(`${PROJECT_DOCUMENT_URL}/${previewLetter.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(previewLetter)
            });
            if (response.ok) {
                showNotification("Perubahan deskripsi berhasil disinkronisasi", "success");
                fetchDocuments();
            }
        } catch (error) { showNotification("Gagal sinkronisasi data preview ke server.", "error"); }
        finally { setIsSaving(false); }
    };

    const handleOpenPreview = (item) => {
        setPreviewLetter({ 
            ...item,
            inspection_description: item.inspection_description || '',
            progress_description: item.progress_description || '',
            handover_description: item.handover_description || ''
        });
    };

    // ==========================================
    // PERBAIKAN: PROSES FILTER DATA (MENGGUNAKAN 'documents' & 'portfolios')
    // ==========================================
    const filteredLetters = (documents || []).filter(item => {
        // Menyesuaikan pencarian berdasarkan field Dokumen Proyek (Lokasi atau Nama Petugas)
        const matchesSearch = 
            (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.inspection_officer_name_1 && item.inspection_officer_name_1.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.progress_officer_name_1 && item.progress_officer_name_1.toLowerCase().includes(searchTerm.toLowerCase()));

        // Menyesuaikan jika ada filter id project/portofolio tertentu
        const matchesClient = filterClient === '' || String(item.project_id) === String(filterClient);

        return matchesSearch && matchesClient;
    });

    // ==========================================
    // FUNGSI UTAMA UNTUK PAGINATION
    // ==========================================
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // ==========================================
    // FUNGSI PEMBANTU (FORMAT TANGGAL & AMBIL NAMA KLIEN)
    // ==========================================
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    const getClientName = (projectId) => {
        // PERBAIKAN: Mengambil nama dari state 'portfolios' Anda yang asli
        const found = (portfolios || []).find(p => String(p.id) === String(projectId));
        return found ? found.title || found.name : `ID Proyek: ${projectId}`;
    };

    // Slice Data Berdasarkan Halaman Aktif
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredLetters.slice(indexOfFirstItem, indexOfLastItem);

    const handlePrintPDF = async () => {
        if (!previewLetter) return;
        setIsGeneratingPDF(true);
        try {
            const pages = document.querySelectorAll(".pdf-page-bundle");
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

            for (let i = 0; i < pages.length; i++) {
                const pageElement = pages[i];
                
                const clonedPage = pageElement.cloneNode(true);
                clonedPage.style.position = "fixed";
                clonedPage.style.left = "-99999px";
                clonedPage.style.top = "0";
                
                const activeEditors = clonedPage.querySelectorAll('.preview-editable-zone');
                activeEditors.forEach((zone, idx) => {
                    const primaryEditor = pageElement.querySelectorAll('.preview-editable-zone')[idx];
                    const innerHtmlContent = primaryEditor.querySelector('.ql-editor')?.innerHTML || '';
                    
                    const staticContainer = document.createElement('div');
                    staticContainer.className = "static-html-print-output text-[12px] text-justify text-black ql-editor";
                    staticContainer.style.fontFamily = "Arial, sans-serif";
                    staticContainer.style.lineHeight = docLineSpacing;
                    staticContainer.innerHTML = innerHtmlContent;
                    
                    zone.innerHTML = '';
                    zone.appendChild(staticContainer);
                });

                const toolbars = clonedPage.querySelectorAll('.ql-toolbar');
                toolbars.forEach(tb => tb.remove());

                document.body.appendChild(clonedPage);

                const canvas = await html2canvas(clonedPage, {
                    scale: 2.3, 
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: "#ffffff",
                    letterRendering: true,
                    logging: false,
                });

                const imgData = canvas.toDataURL("image/jpeg", 1.0);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
                document.body.removeChild(clonedPage);
            }

            pdf.save(`BERKAS_ADMINISTRASI_${previewLetter.id}.pdf`);
            showNotification("PDF Berhasil diunduh!", "success");
        } catch (err) {
            console.error(err);
            showNotification("Gagal memproses cetak PDF.", "error");
        } finally {
            setIsGeneratingPDF(false);
        } 
    };  
    const getProjectTitle = (id) => {
        const found = portfolios.find(p => String(p.id) === String(id));
        return found ? found.title || found.name : `ID Proyek: ${id}`;
    };

    const getHariDanTerbilang = (dateString) => {
        if (!dateString) return { hari: "___________", tanggalTerbilang: "tanggal ____ bulan __________ tahun _____" };
        const dateObj = new Date(dateString);
        const hariArr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const bulanArr = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return {
            hari: hariArr[dateObj.getDay()],
            tanggalTerbilang: `${hariArr[dateObj.getDay()]} tanggal ${dateObj.getDate()} bulan ${bulanArr[dateObj.getMonth()]} tahun ${dateObj.getFullYear()}`
        };
    };

    const labelStyle = "block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5";
    const inputStyle = "w-full border border-gray-300 bg-white rounded-xl px-4 py-2 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all";
 
    const generateBappTemplate = (project) => {
    if (!project) return '';
    const projectTitle = project.title || project.name || '';
    const contractNumber = project.contract_number || project.no_kontrak || '';
    const contractDate = formatDate(project.date) || '';

    return `
        <p>Berdasarkan Kontrak Perjanjian Kerja Sama ${projectTitle} Nomor: ${contractNumber} tanggal  ${contractDate}</p>
        <p>Dengan ini menerangkan bahwa:</p>
        <ol>
            <li><strong>PIHAK KEDUA</strong> menyatakan telah menyelesaikan pekerjaan sesuai ruang lingkup dan deliverables pengadaan ${projectTitle} sesuai dengan Kontrak Perjanjian Kerja Sama Nomor: ${contractNumber}</li>
            <li><strong>PIHAK PERTAMA</strong> menyatakan telah memeriksa hasil pekerjaan dan deliverables dimaksud pada butir 1 dengan hasil Baik dan Sesuai.</li>
            <li>Laporan hasil dan/atau checklist penyelesaian pekerjaan sebagaimana terlampir.</li>
        </ol>
        <p>Demikian Berita Acara Penyelesaian Pekerjaan (BAPP)  ${projectTitle} ini dibuat dalam rangkap 2 (dua) asli, masing-masing sama bunyinya serta mempunyai kekuatan hukum yang sama setelah ditandatangani kedua belah pihak untuk dipergunakan sebagaimana mestinya.</p>
    `;
};

const generateBastTemplate = (project) => {
    if (!project) return '';
    
    // Fallback data proyek dari database
    const projectTitle = project.title || project.name || '[Nama Proyek]';
    const contractNumber = project.contract_number || project.no_kontrak || '[Nomor Kontrak]';
    const contractDate = project.date ? formatDate(project.date) : '[Tanggal Kontrak]';

    return `
        <p>Berdasarkan:</p>
        <ol>
            <li>Kontrak Perjanjian Kerja Sama  ${projectTitle}  Nomor: ${contractNumber} tanggal  ${contractDate}</li>
            <li>Amandemen Kesatu Kontrak Perjanjian Kerja Sama ${projectTitle}  Nomor: ${contractNumber}  tanggal ${contractDate} </li>
            <li>Berita Acara Penyelesaian Pekerjaan (BAPP) ${projectTitle}  Nomor: ${contractNumber}  tanggal ${contractDate} </li>
        </ol>
        <p>Dengan ini menyatakan bahwa:</p>
         
            <p>1.&nbsp;&nbsp;&nbsp;&nbsp;<strong>PIHAK KEDUA</strong> menyerahkan seluruh hasil pekerjaan dan deliverables sesuai dengan dokumen tersebut di atas kepada <strong>PIHAK PERTAMA</strong>.
            <p>2.&nbsp;&nbsp;&nbsp;&nbsp;<strong>PIHAK PERTAMA</strong> menerima seluruh hasil pekerjaan dan deliverables sesuai sesuai dengan dokumen tersebut di atas dari <strong>PIHAK KEDUA</strong>.
         
        <p>Demikian Berita Acara Serah Terima Pekerjaan (BAST) <strong>${projectTitle}</strong> ini dibuat dalam rangkap 2 (dua) asli, masing-masing sama bunyinya serta mempunyai kekuatan hukum yang sama setelah ditandatangani kedua belah pihak untuk dipergunakan sebagaimana mestinya.</p>
    `;
};

 const handleProjectChange = (e) => {
    const selectedId = e.target.value;
    
    if (!selectedId || selectedId === "") {
        setFormData(prev => ({
            ...prev,
            project_id: '',
            client_name: '',
            progress_description: '',
            handover_description: ''
        }));
        return;
    }

    const selectedProj = portfolios.find(p => String(p.id) === String(selectedId));
    
    // Deteksi lokasi/alamat dari database
    const client_name = selectedProj 
        ? ( selectedProj.client_address || selectedProj.location || selectedProj.address || selectedProj.client_name || '') 
        : '';

    // Buat teks HTML template untuk BAPP dan BAST
    const autoBappDescription = selectedProj ? generateBappTemplate(selectedProj) : '';
    const autoBastDescription = selectedProj ? generateBastTemplate(selectedProj) : '';

    // UPDATE SEMUA STATE SEKALIGUS DALAM SATU WAKTU (ONE-SHOT UPDATE)
    setFormData(prev => {
        return {
            ...prev,                      // Pertahankan data lama (termasuk nama petugas, dll)
            project_id: selectedId,       // Pilih acuan proyek
            company_1: client_name,      // Pilih acuan proyek
            location: client_name,      // Pilih acuan proyek
            client_name: client_name,       // Isi tempat pelaksanaan
            progress_description: autoBappDescription, // ISI BAPP (HALAMAN 2)
            handover_description: autoBastDescription   // ISI BAST (HALAMAN 3)
        };
    });
};
    return (
        <div className="max-w-7xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* INJECTOR CSS: MENJAMIN FORMAT ALIGNMENT, LIST BULLET & NUMBERING BERJALAN SEMPURNA */}
            <style>{`
                .ql-container, .ql-editor, .ql-editor p, .ql-editor li, .static-html-print-output, .static-html-print-output p, .static-html-print-output li { 
                    font-family: Arial, sans-serif !important; 
                    font-size: 12px !important; 
                    color: #000000 !important; 
                }
                /* Memaksa text alignment sinkron saat dirender oleh html2canvas */
                .ql-align-justify { text-align: justify !important; }
                .ql-align-center { text-align: center !important; }
                .ql-align-right { text-align: right !important; }
                .ql-align-left { text-align: left !important; }
                
                .preview-editable-zone ol, .static-html-print-output ol { 
                    list-style-type: decimal !important; 
                    padding-left: 20px !important; 
                    margin-top: 4px !important;
                    margin-bottom: 4px !important;
                }
                .preview-editable-zone ul, .static-html-print-output ul { 
                    list-style-type: disc !important; 
                    padding-left: 20px !important; 
                    margin-top: 4px !important;
                    margin-bottom: 4px !important;
                }
                .preview-editable-zone li, .static-html-print-output li { 
                    display: list-item !important;
                    list-style-position: outside !important;
                }
                .preview-editable-zone .ql-toolbar.ql-snow { border: 1px dashed #cbd5e1 !important; background: #f8fafc !important; border-radius: 6px 6px 0 0; padding: 4px !important; }
                .preview-editable-zone .ql-container.ql-snow { border: 1px dashed #cbd5e1 !important; border-top: none !important; border-radius: 0 0 6px 6px; background: #fff; }
                .preview-editable-zone .ql-editor { min-height: 90px !important; padding: 8px 12px !important; }
            `}</style>

           
            {/* Toast Notifikasi Dinamis */}
            {notification.show && (
                <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border-l-4 ${notification.type === 'success' ? 'border-green-500' : 'border-red-500'} bg-white text-gray-800`}>
                    <div className="text-sm font-bold">{notification.message}</div>
                </div>
            )}
  
            {/* 1. HALAMAN TABEL UTAMA */}
            {viewMode === 'table' && (() => {
            // Hitung indeks data untuk Paging
            const indexOfLastItem = currentPage * itemsPerPage;
            const indexOfFirstItem = indexOfLastItem - itemsPerPage;
            const currentItems = filteredLetters.slice(indexOfFirstItem, indexOfLastItem);
            const totalPages = Math.ceil(filteredLetters.length / itemsPerPage);

            return (
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 sm:p-8">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 border-b border-gray-100 pb-6">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Dokumen Proyek</h2>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">Kelola data inspeksi, progress, dan serah terima administrasi proyek.</p>
                        </div>
                        <button 
                            onClick={() => setViewMode('form')} 
                            className="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-500/30 active:scale-95"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                            </svg>
                            Buat Dokumen Baru
                        </button>
                    </div>

                    {/* Filter & Search Bar Section */}
                    <div className="flex flex-col md:flex-row gap-3 mb-6 bg-gray-50/50 p-3 sm:p-4 rounded-xl border border-gray-100 items-stretch md:items-center">
                        <input 
                            type="text" 
                            placeholder="Cari lokasi, nama petugas inspeksi/progress..." 
                            className="w-full md:flex-1 pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                        
                        <select 
                            className="w-full md:w-64 py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer shadow-sm focus:border-indigo-500 transition" 
                            value={filterClient} 
                            onChange={(e) => setFilterClient(e.target.value)}
                        >
                            <option value="">Semua Proyek / Portofolio</option>
                            {portfolios.map(p => (<option key={p.id} value={p.id}>{p.title || p.name}</option>))}
                        </select>
                        
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setFilterType('');
                                setFilterClient('');
                                fetchDocuments();
                                fetchPortfolios();
                                showNotification("Data berhasil diperbarui!", "success");
                            }}
                            title="Refresh Data & Reset Filter"
                            className="w-full md:w-auto px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                        >
                            🔄 <span className="md:hidden inline">Reload Data</span>
                        </button>
                    </div>

                    {filteredLetters.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm bg-white">
                            Tidak ada berkas data dokumen ditemukan
                        </div>
                    ) : (
                        <>
                            {/* TAMPILAN MOBILE LIST (KARTU) */}
                            <div className="block md:hidden space-y-3">
                                {currentItems.map((item, index) => (
                                    <div key={item.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-indigo-100 transition relative overflow-hidden">
                                        {/* Indikator Nomor Otomatis */}
                                        <div className="absolute top-0 right-0 bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg border-l border-b border-gray-200/60">
                                            #{indexOfFirstItem + index + 1}
                                        </div>

                                        <div className="flex justify-between items-start gap-2 mb-2 pr-6">
                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-bold tracking-wide ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-700/10">
                                                DOKUMEN PROYEK
                                            </span>
                                            <span className="text-xs text-gray-400">{formatDate(item.inspection_date || item.progress_date || item.handover_date)}</span>
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-sm break-all">{item.location || 'Lokasi tidak ditentukan'}</h3>
                                        
                                        <div className="text-xs border-t border-gray-50 pt-2 text-gray-600 space-y-0.5 mt-2">
                                            <div><span className="text-gray-400">Petugas 1:</span> <span className="font-medium text-gray-800">{item.inspection_officer_name_1 || '-'}</span></div>
                                            <div><span className="text-gray-400">Proyek:</span> {getClientName(item.project_id)}</div>
                                        </div>
                                        
                                        {/* Tombol Aksi Mobile */}
                                        <div className="flex justify-end gap-2 mt-3 border-t border-gray-100 pt-3">
                                            <button onClick={() => handleOpenPreview(item)} title="Pratinjau PDF" className="py-2 px-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition flex-1 flex items-center justify-center gap-1 border border-emerald-100">
                                                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 -960 960 960"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm0 160q-139 0-251.5-76.5T40-500q61-125 173.5-201.5T480-778q139 0 251.5 76.5T920-500q-61 125-173.5 201.5T480-240Z"/></svg>
                                                <span>Lihat</span>
                                            </button>
                                            <button onClick={() => handleEditClick(item)} title="Ubah Data" className="py-2 px-2 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition flex-1 flex items-center justify-center gap-1 border border-indigo-100">
                                                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 -960 960 960"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Z"/></svg>
                                                <span>Edit</span>
                                            </button>
                                            <button onClick={() => handleDeleteClick(item.id)} title="Hapus Dokumen" className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition border border-red-100 flex items-center justify-center">
                                                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* TAMPILAN DESKTOP TABLE */}
                            <div className="hidden md:block overflow-hidden border border-gray-100 rounded-xl shadow-sm">
                                <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                    <tr> 
                                        <th className="py-4 px-4 w-12 text-center">No.</th> 
                                        <th className="py-4 px-4">Proyek</th> 
                                        <th className="py-4 px-4">Tanggal Inspeksi</th>
                                        <th className="py-4 pr-6 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {currentItems.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group"> 
                                        <td className="py-4 px-4 text-center text-xs font-semibold text-gray-400">
                                            {indexOfFirstItem + index + 1}
                                        </td> 
                                        <td className="py-4 px-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-medium text-gray-900">{getClientName(item.project_id)}</span> 

                                                <span className="text-[11px] text-gray-400 italic">{item.location || '-'}</span>
                                            </div>
                                        </td> 
                                        <td className="py-4 px-4 text-sm text-gray-500">{formatDate(item.inspection_date)}</td>
                                        <td className="py-4 pr-6 text-right space-x-1">
                                            <button onClick={() => handleOpenPreview(item)} title="Pratinjau PDF" className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition inline-flex items-center justify-center">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 -960 960 960"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm0 160q-139 0-251.5-76.5T40-500q61-125 173.5-201.5T480-778q139 0 251.5 76.5T920-500q-61 125-173.5 201.5T480-240Z"/></svg>
                                            </button>
                                            <button onClick={() => handleEditClick(item)} title="Ubah Data" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition inline-flex items-center justify-center">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 -960 960 960"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Z"/></svg>
                                            </button>
                                            <button onClick={() => handleDeleteClick(item.id)} title="Hapus Dokumen" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition inline-flex items-center justify-center">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/></svg>
                                            </button>
                                        </td>
                                    </tr>
                                    ))}
                                </tbody>
                                </table>
                            </div>

                            {/* Panel Navigasi Pagination */}
                            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="text-sm text-gray-500">
                                    Showing <span className="font-semibold text-gray-700">{indexOfFirstItem + 1}</span> to{' '}
                                    <span className="font-semibold text-gray-700">
                                        {indexOfLastItem > filteredLetters.length ? filteredLetters.length : indexOfLastItem}
                                    </span>{' '}
                                    of <span className="font-semibold text-gray-700">{filteredLetters.length}</span> entries
                                </div>
                                
                                <div className="flex items-center gap-1">
                                    {/* Tombol Previous */}
                                    <button
                                        onClick={() => typeof paginate === 'function' && paginate(currentPage - 1)}
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
                                                onClick={() => typeof paginate === 'function' && paginate(pageNum)}
                                                className={`w-8 h-8 rounded-lg text-xs font-semibold border transition ${
                                                    currentPage === pageNum
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 active:scale-95'
                                                }`}
                                            Mentioned                                >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    {/* Tombol Next */}
                                    <button
                                        onClick={() => typeof paginate === 'function' && paginate(currentPage + 1)}
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
                        </>
                    )}
                </div>
            );
            })()}

           {/* VIEW MODE: INPUT FORM UTAMA */}
         {viewMode === 'form' && (
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 max-w-5xl mx-auto my-6">
                    {/* Form Header */}
                    <div className="mb-6 border-b border-gray-100 pb-4">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                            {formData.id ? '✏️ Perbarui Dokumen Administrasi Proyek' : '➕ Buat Dokumen Administrasi Baru'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Lengkapi berkas BAP, BAPP, dan BAST untuk kebutuhan cetak.</p>
                    </div>

                    <form onSubmit={handleSaveDocument} className="space-y-6">
                        
                        {/* ====== KELOMPOK DATA UTAMA & PERUSAHAAN ====== */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/60 space-y-4">
                            <span className="text-xs font-bold text-slate-700 block tracking-wider uppercase">📍 Informasi Umum & Instansi/Perusahaan</span>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className={labelStyle}>Pilih Acuan Proyek</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="🔍 Ketik untuk cari proyek..." 
                                            className="w-full border border-gray-200 bg-gray-50 text-gray-800 rounded-t-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-500 transition border-b-0"
                                            value={portfolioSearch}
                                            onChange={(e) => setPortfolioSearch(e.target.value)}
                                        />
                                        <select 
                                            className={`${inputStyle} rounded-t-none`} 
                                            value={formData.project_id ? String(formData.project_id) : ''} 
                                            onChange={handleProjectChange}
                                            required
                                        >
                                            <option value="">-- Pilih Portofolio Proyek --</option>
                                            {portfolios
                                                .filter(p => (p.title || p.name || '').toLowerCase().includes(portfolioSearch.toLowerCase()))
                                                .map(p => (
                                                    <option key={p.id} value={String(p.id)}>
                                                        {p.title || p.name} {p.client_name ? `(${p.client_name})` : ''}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                    {portfolioSearch && (
                                        <button type="button" onClick={() => setPortfolioSearch('')} className="text-[10px] text-red-500 hover:underline block">❌ Reset Pencarian</button>
                                    )}
                                </div>

                                <div>
                                    <label className={labelStyle}>Tempat Pelaksanaan Berita Acara</label>
                                    <input type="text" className={inputStyle} value={formData.location || ''} onChange={(e) => setFormData({...formData, location: e.target.value})} required placeholder="Lokasi pelaksanaan..." />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                                <div>
                                    <label className={labelStyle}>Nama Perusahaan / Instansi (PIHAK I)</label>
                                    <input type="text" className={inputStyle} value={formData.company_1 || ''} onChange={(e) => setFormData({...formData, company_1: e.target.value})} required placeholder="Contoh: Dana Pensiun Telkom" />
                                </div>
                                <div>
                                    <label className={labelStyle}>Nama Perusahaan / Instansi (PIHAK II)</label>
                                    <input type="text" className={inputStyle} value={formData.company_2 || ''} onChange={(e) => setFormData({...formData, company_2: e.target.value})} required placeholder="Contoh: PT. Crop Inspirasi Digital" />
                                </div>
                            </div>
                        </div>

                        {/* ====== SECTION 1: BAP ====== */}
                        <div className="border border-amber-200 rounded-xl p-5 space-y-5 bg-amber-50/5 shadow-sm">
                            <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wide border-b border-amber-100 pb-2">Halaman 1: Berita Acara Pemeriksaan Pekerjaan (BAP)</h4>
                            <div className="w-full md:w-1/3">
                                <label className={labelStyle}>Tanggal Pelaksanaan BAP</label>
                                <input type="date" className={inputStyle} value={formData.inspection_date} onChange={(e) => setFormData({...formData, inspection_date: e.target.value})} required />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 shadow-sm">
                                    <div className="flex justify-between items-center border-b pb-1"><span className="text-xs font-bold text-gray-700">👤 PIHAK PERTAMA (I)</span></div>
                                    <div><label className={labelStyle}>Nama Petugas / Wakil</label><input type="text" className={inputStyle} value={formData.inspection_officer_name_1 || ''} onChange={(e) => setFormData({...formData, inspection_officer_name_1: e.target.value})} required placeholder="Nama Lengkap Pihak I" /></div>
                                    <div><label className={labelStyle}>Jabatan</label><input type="text" className={inputStyle} value={formData.inspection_officer_role_1 || ''} onChange={(e) => setFormData({...formData, inspection_officer_role_1: e.target.value})} required placeholder="Project Manager" /></div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 shadow-sm">
                                    <div className="flex justify-between items-center border-b pb-1"><span className="text-xs font-bold text-gray-700">👤 PIHAK KEDUA (II)</span></div>
                                    <div><label className={labelStyle}>Nama Petugas / Wakil</label><input type="text" className={inputStyle} value={formData.inspection_officer_name_2 || ''} onChange={(e) => setFormData({...formData, inspection_officer_name_2: e.target.value})} required placeholder="Nama Lengkap Pihak II" /></div>
                                    <div><label className={labelStyle}>Jabatan</label><input type="text" className={inputStyle} value={formData.inspection_officer_role_2 || ''} onChange={(e) => setFormData({...formData, inspection_officer_role_2: e.target.value})} required placeholder="Supervisor" /></div>
                                </div>
                            </div>
 
            <div className="flex justify-between items-center border-b pb-2">
                <label className={labelStyle}>Deskripsi Hasil Pemeriksaan BAP</label>
                
                {/* TOMBOL TOGGLE UNTUK BERGANTI MODE VISUAL <=> HTML */}
                <button
                    type="button"
                    onClick={() => setIsHtmlMode(!isHtmlMode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                        isHtmlMode 
                        ? 'bg-amber-100 text-amber-700 border border-amber-300' 
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
                    }`}
                >
                    {isHtmlMode ? '👁️ Lihat Mode Visual' : '💻 Edit Kode HTML (<>)'}
                </button>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                {isHtmlMode ? (
                    /* ====== JIKA MODE HTML AKTIF: TAMPILKAN TEXTAREA MENTAH ====== */
                    <textarea
                        className="w-full h-[250px] p-4 font-mono text-xs text-indigo-900 bg-slate-50 outline-none focus:bg-white transition leading-relaxed block"
                        value={formData.inspection_description}
                        onChange={(e) => setFormData(prev => ({ ...prev, inspection_description: e.target.value }))}
                        placeholder="Masukkan atau edit tag HTML di sini..."
                    />
                ) : (
                    /* ====== JIKA MODE VISUAL AKTIF: TAMPILKAN TEXTEDITOR BIASA ====== */
                    <ReactQuill 
                        theme="snow" 
                        modules={formQuillModules} 
                        value={formData.inspection_description || ''} 
                        onChange={(content) => setFormData(prev => ({ ...prev, inspection_description: content }))} 
                        placeholder="Ketik di sini..."
                    />
                )}
            </div>
 
                        </div>

                        {/* ====== SECTION 2: BAPP ====== */}
                        <div className={`border rounded-xl p-5 space-y-5 transition-all duration-200 shadow-sm ${Number(formData.progress_status) === 1 ? 'border-blue-200 bg-blue-50/5' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-gray-100 pb-3">
                                <div>
                                    <h4 className={`text-sm font-bold uppercase tracking-wide ${Number(formData.progress_status) === 1 ? 'text-blue-800' : 'text-gray-400'}`}>Halaman 2: Berita Acara Penyelesaian Pekerjaan (BAPP)</h4>
                                </div>
                                <button type="button" onClick={() => setFormData({...formData, progress_status: Number(formData.progress_status) === 1 ? 0 : 1})} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${Number(formData.progress_status) === 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    {Number(formData.progress_status) === 1 ? '🟢 BAPP Aktif' : '❌ BAPP Non-Aktif'}
                                </button>
                            </div>
                            
                            {Number(formData.progress_status) === 1 ? (
                                <div className="space-y-5">
                                    <div className="w-full md:w-1/3">
                                        <label className={labelStyle}>Tanggal Pelaksanaan BAPP</label>
                                        <input type="date" className={inputStyle} value={formData.progress_date || ''} onChange={(e) => setFormData({...formData, progress_date: e.target.value})} required />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        {/* Pihak I BAPP */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 shadow-sm">
                                            <div className="flex justify-between items-center border-b pb-1 gap-2">
                                                <span className="text-xs font-bold text-gray-700">👤 PIHAK PERTAMA (I)</span>
                                                <label className="inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 cursor-pointer text-[10px] font-semibold text-blue-700">
                                                    <input type="checkbox" className="rounded text-blue-600 w-3 h-3" checked={syncBappPihak1} onChange={(e) => setSyncBappPihak1(e.target.checked)} />
                                                    <span>Sama dengan BAP</span>
                                                </label>
                                            </div>
                                            <div><label className={labelStyle}>Nama Petugas</label><input type="text" className={inputStyle} value={formData.progress_officer_name_1 || ''} onChange={(e) => setFormData({...formData, progress_officer_name_1: e.target.value})} disabled={syncBappPihak1} required /></div>
                                            <div><label className={labelStyle}>Jabatan</label><input type="text" className={inputStyle} value={formData.progress_officer_role_1 || ''} onChange={(e) => setFormData({...formData, progress_officer_role_1: e.target.value})} disabled={syncBappPihak1} required /></div>
                                        </div>

                                        {/* Pihak II BAPP */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 shadow-sm">
                                            <div className="flex justify-between items-center border-b pb-1 gap-2">
                                                <span className="text-xs font-bold text-gray-700">👤 PIHAK KEDUA (II)</span>
                                                <label className="inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 cursor-pointer text-[10px] font-semibold text-blue-700">
                                                    <input type="checkbox" className="rounded text-blue-600 w-3 h-3" checked={syncBappPihak2} onChange={(e) => setSyncBappPihak2(e.target.checked)} />
                                                    <span>Sama dengan BAP</span>
                                                </label>
                                            </div>
                                            <div><label className={labelStyle}>Nama Petugas</label><input type="text" className={inputStyle} value={formData.progress_officer_name_2 || ''} onChange={(e) => setFormData({...formData, progress_officer_name_2: e.target.value})} disabled={syncBappPihak2} required /></div>
                                            <div><label className={labelStyle}>Jabatan</label><input type="text" className={inputStyle} value={formData.progress_officer_role_2 || ''} onChange={(e) => setFormData({...formData, progress_officer_role_2: e.target.value})} disabled={syncBappPihak2} required /></div>
                                        </div>
                                    </div>

                                    {/* TEXT EDITOR BAPP */}
                                    <div className="bg-white p-2 rounded-xl border border-gray-200">
                                        <label className={labelStyle}>Deskripsi Kemajuan Pekerjaan BAPP</label>
                                        <ReactQuill 
                                            theme="snow" 
                                            modules={formQuillModules} 
                                            value={formData.progress_description || ''} 
                                            onChange={(content) => setFormData(prev => ({ ...prev, progress_description: content }))} 
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-100/70 text-center py-4 px-4 rounded-xl border border-dashed border-gray-300">
                                    <p className="text-xs font-medium text-gray-500">📄 Berkas halaman BAPP dinonaktifkan.</p>
                                </div>
                            )}
                        </div>

                        {/* ====== SECTION 3: BAST ====== */}
                        <div className={`border rounded-xl p-5 space-y-5 transition-all duration-200 shadow-sm ${Number(formData.handover_status) === 1 ? 'border-emerald-200 bg-emerald-50/5' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-gray-100 pb-3">
                                <div>
                                    <h4 className={`text-sm font-bold uppercase tracking-wide ${Number(formData.handover_status) === 1 ? 'text-emerald-800' : 'text-gray-400'}`}>Halaman 3: Berita Acara Serah Terima Pekerjaan (BAST)</h4>
                                </div>
                                <button type="button" onClick={() => setFormData({...formData, handover_status: Number(formData.handover_status) === 1 ? 0 : 1})} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${Number(formData.handover_status) === 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    {Number(formData.handover_status) === 1 ? '🟢 BAST Aktif' : '❌ BAST Non-Aktif'}
                                </button>
                            </div>
                            
                            {Number(formData.handover_status) === 1 ? (
                                <div className="space-y-5">
                                    <div className="w-full md:w-1/3">
                                        <label className={labelStyle}>Tanggal Pelaksanaan BAST</label>
                                        <input type="date" className={inputStyle} value={formData.handover_date || ''} onChange={(e) => setFormData({...formData, handover_date: e.target.value})} required />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        {/* Pihak I BAST */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 shadow-sm">
                                            <div className="flex justify-between items-center border-b pb-1 gap-2">
                                                <span className="text-xs font-bold text-gray-700">👤 PIHAK PERTAMA (I)</span>
                                                <label className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer text-[10px] font-semibold text-emerald-700">
                                                    <input type="checkbox" className="rounded text-emerald-600 w-3 h-3" checked={syncBastPihak1} onChange={(e) => setSyncBastPihak1(e.target.checked)} />
                                                    <span>Sama dengan BAPP</span>
                                                </label>
                                            </div>
                                            <div><label className={labelStyle}>Nama Petugas</label><input type="text" className={inputStyle} value={formData.handover_officer_name_1 || ''} onChange={(e) => setFormData({...formData, handover_officer_name_1: e.target.value})} disabled={syncBastPihak1} required /></div>
                                            <div><label className={labelStyle}>Jabatan</label><input type="text" className={inputStyle} value={formData.handover_officer_role_1 || ''} onChange={(e) => setFormData({...formData, handover_officer_role_1: e.target.value})} disabled={syncBastPihak1} required /></div>
                                        </div>

                                        {/* Pihak II BAST */} 
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 shadow-sm">
                                            <div className="flex justify-between items-center border-b pb-1 gap-2">
                                                <span className="text-xs font-bold text-gray-700">👤 PIHAK KEDUA (II)</span>
                                                <label className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer text-[10px] font-semibold text-emerald-700">
                                                    <input type="checkbox" className="rounded text-emerald-600 w-3 h-3" checked={syncBastPihak2} onChange={(e) => setSyncBastPihak2(e.target.checked)} />
                                                    <span>Sama dengan BAPP</span>
                                                </label>
                                            </div>
                                            <div><label className={labelStyle}>Nama Petugas</label><input type="text" className={inputStyle} value={formData.handover_officer_name_2 || ''} onChange={(e) => setFormData({...formData, handover_officer_name_2: e.target.value})} disabled={syncBastPihak2} required /></div>
                                            <div><label className={labelStyle}>Jabatan</label><input type="text" className={inputStyle} value={formData.handover_officer_role_2 || ''} onChange={(e) => setFormData({...formData, handover_officer_role_2: e.target.value})} disabled={syncBastPihak2} required /></div>
                                        </div>
                                    </div>

                                    {/* TEXT EDITOR BAST */}
                                    <div className="bg-white p-2 rounded-xl border border-gray-200">
                                        <label className={labelStyle}>Deskripsi Serah Terima BAST</label>
                                        <ReactQuill 
                                            theme="snow" 
                                            modules={formQuillModules} 
                                            value={formData.handover_description || ''} 
                                            onChange={(content) => setFormData(prev => ({ ...prev, handover_description: content }))} 
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-100/70 text-center py-4 px-4 rounded-xl border border-dashed border-gray-300">
                                    <p className="text-xs font-medium text-gray-500">📄 Berkas halaman BAST dinonaktifkan.</p>
                                </div>
                            )}
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => { resetForm(); }} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition">Batal</button>
                            <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 disabled:opacity-50">
                                {isSaving ? '⏳ Menyimpan...' : '⚡ Simpan Berkas Dokumen'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

        {/* PREVIEW CONTAINER MODAL */}
        {previewLetter && (() => {
            
            const renderLembarHalaman = (judulDokumen, tglDokumen, p1Nama, p1Jabacy, p2Nama, p2Jabacy, isiDeskripsiText, fieldKeyName, hasMeterai) => {
                const { hari, tanggalTerbilang } = getHariDanTerbilang(tglDokumen);
                return (
                    /* Mengubah penataan halaman menjadi flex flex-col justify-start agar posisi TTD naik mengikuti isi teks */
                    <div className="pdf-page-bundle bg-white text-black shrink-0 shadow-2xl relative p-[65px] pt-[105px] flex flex-col justify-start mb-10" style={{ width: "794px", height: "1122px", boxSizing: "border-box", fontFamily: "Arial, sans-serif" }}>
                        <img src={`${window.location.origin}/crop2026.png`} crossOrigin="anonymous" className="absolute top-0 left-0 w-[794px] h-[1122px] z-0 pointer-events-none select-none" alt="Kop Surat" />
                        
                        <div className="relative z-10 flex-1 flex flex-col justify-start">
                            <div>
                                {/* JUDUL: Tepat diset ke 14px (text-[14px]) */}
                                <div className="text-center mb-5">
                                    {/* JUDUL: Tepat diset ke 14px & Garis diletakkan di bawah teks kedua */}
                                    <div className="text-center mb-5 flex flex-col items-center">
                                        <h2 className="text-[14px] font-bold uppercase tracking-wide leading-tight" style={{ fontFamily: "Arial, sans-serif" }}>
                                            {judulDokumen}
                                        </h2>
                                        <h3 className="text-[14px] font-bold uppercase tracking-wide leading-tight mt-1" style={{ fontFamily: "Arial, sans-serif" }}>
                                            {getProjectTitle(previewLetter.project_id)}
                                        </h3> 
                                        {/* Garis horizontal ganda (Double Border) khas surat resmi */}
                                        <div className="w-full border-b-[3px] border-double border-black mt-2 mb-1"></div>
                                    </div>
                                </div>

                                {/* PEMBUKA */}
                                <div className="text-[12px] text-justify mb-4" style={{ lineHeight: docLineSpacing, fontFamily: "Arial, sans-serif" }}>
                                    Pada hari ini, {tanggalTerbilang} bertempat di <span className="font-semibold">{previewLetter.location || "____________________"}</span>, kami yang bertandatangan di bawah ini:
                                </div>

                                {/* IDENTITAS PIHAK */}
                                <div className="text-[12px] space-y-3 mb-4" style={{ lineHeight: docLineSpacing, fontFamily: "Arial, sans-serif" }}>
                                    <div className="grid grid-cols-[30px_1fr] items-start">
                                        <div className="font-bold">I.</div>
                                        <div>
                                            <table className="text-[12px] border-collapse py-0" style={{ fontFamily: "Arial, sans-serif" }}>
                                                <tbody>
                                                    <tr><td className="w-[85px] py-0.5">Nama</td><td className="w-[20px] text-center py-0.5">:</td><td className="font-semibold py-0.5">{p1Nama || '-'}</td></tr>
                                                    <tr><td className="py-0.5">Jabatan</td><td className="text-center py-0.5">:</td><td className="py-0.5">{p1Jabacy || '-'}</td></tr>
                                                    <tr><td className="py-0.5">Perusahaan</td><td className="text-center py-0.5">:</td><td className="py-0.5">{ previewLetter.company_1 || '-'}</td></tr>
                                                </tbody>
                                            </table>
                                            <div className="mt-0.5 text-gray-950">selanjutnya disebut sebagai <span className="font-bold">PIHAK PERTAMA,</span></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-[30px_1fr] items-start pt-0.5">
                                        <div className="font-bold">II.</div>
                                        <div>
                                            <table className="text-[12px] border-collapse py-0" style={{ fontFamily: "Arial, sans-serif" }}>
                                                <tbody>
                                                    <tr><td className="w-[85px] py-0.5">Nama</td><td className="w-[20px] text-center py-0.5">:</td><td className="font-semibold py-0.5">{p2Nama || '-'}</td></tr>
                                                    <tr><td className="py-0.5">Jabatan</td><td className="text-center py-0.5">:</td><td className="py-0.5">{p2Jabacy || '-'}</td></tr>
                                                    <tr><td className="py-0.5">Perusahaan</td><td className="text-center py-0.5">:</td><td className="py-0.5">{ previewLetter.company_2 || '-'}</td></tr>
                                                </tbody>
                                            </table>
                                            <div className="mt-0.5 text-gray-950">selanjutnya disebut sebagai <span className="font-bold">PIHAK KEDUA,</span></div>
                                        </div>
                                    </div>
                                </div>

                                {/* AREA EDITOR AKTIF DI PREVIEW: Mendukung formatting alignment penuh */}
                                <div className="text-[12px] mt-3 leading-normal">
                                    <div className="preview-editable-zone" style={{ lineHeight: docLineSpacing }}>
                                        <ReactQuill 
                                            theme="snow"
                                            modules={previewQuillModules}
                                            readOnly={false}
                                            value={isiDeskripsiText}
                                            onChange={(content) => setPreviewLetter(prev => ({ ...prev, [fieldKeyName]: content }))}
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* TANDA TANGAN: Menggunakan margin kecil agar merapat di bawah penutup */}
                            <div className="grid grid-cols-2 text-center text-[12px] pt-1 mt-2" style={{ fontFamily: "Arial, sans-serif" }}>
                                <div className="flex flex-col justify-between items-center h-[150px]">
                                    <p className="font-bold uppercase">PIHAK PERTAMA</p>
                                    <div>
                                        <p className="font-bold text-gray-900 underline">{p1Nama || "____________________"}</p>
                                        <p className="text-[11px] text-gray-600 mt-0.5">{p1Jabacy || "Jabatan Pihak I"}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-between items-center h-[150px] relative">
                                    <p className="font-bold uppercase">PIHAK KEDUA</p>
                                
                                    <div>
                                        <p className="font-bold text-gray-900 underline">{p2Nama || "____________________"}</p>
                                        <p className="text-[11px] text-gray-600 mt-0.5">{p2Jabacy || "Jabatan Pihak II"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            };

            // Hitung total halaman yang aktif untuk teks di badge info panel kanan
            const totalPages = 1 + (Number(previewLetter.progress_status) === 1 ? 1 : 0) + (Number(previewLetter.handover_status) === 1 ? 1 : 0);

            return (
                <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col lg:flex-row overflow-hidden">
                    
                    {/* SCREEN PREVIEW KIRI */}
                    <div className="flex-1 bg-slate-950 p-4 lg:p-8 overflow-y-auto flex flex-col items-center gap-2">
                        
                        {/* Lembar BAP (Selalu muncul karena tidak dinonaktifkan) */}
                        <div className="text-white text-xs font-mono uppercase bg-amber-600/20 px-4 py-1.5 rounded-full mb-2 border border-amber-500/30">Lembar 1: (BAP)</div>
                        {renderLembarHalaman(
                            "BERITA ACARA PEMERIKSAAN PEKERJAAN (BAP)",
                            previewLetter.inspection_date,
                            previewLetter.inspection_officer_name_1, previewLetter.inspection_officer_role_1,
                            previewLetter.inspection_officer_name_2, previewLetter.inspection_officer_role_2,
                            previewLetter.inspection_description, "inspection_description", false
                        )}

                        {/* Lembar BAPP (Hanya di-render jika progress_status aktif) */}
                        {Number(previewLetter.progress_status) === 1 && (
                            <>
                                <div className="text-white text-xs font-mono uppercase bg-blue-600/20 px-4 py-1.5 rounded-full my-4 border border-blue-500/30">Lembar berikutnya: (BAPP)</div>
                                {renderLembarHalaman(
                                    "BERITA ACARA PENYELESAIAN PEKERJAAN (BAPP)",
                                    previewLetter.progress_date,
                                    previewLetter.progress_officer_name_1, previewLetter.progress_officer_role_1,
                                    previewLetter.progress_officer_name_2, previewLetter.progress_officer_role_2,
                                    previewLetter.progress_description, "progress_description", false
                                )}
                            </>
                        )}

                        {/* Lembar BAST (Hanya di-render jika handover_status aktif) */}
                        {Number(previewLetter.handover_status) === 1 && (
                            <>
                                <div className="text-white text-xs font-mono uppercase bg-emerald-600/20 px-4 py-1.5 rounded-full my-4 border border-emerald-500/30">Lembar berikutnya: (BAST)</div>
                                {renderLembarHalaman(
                                    "BERITA ACARA SERAH TERIMA PEKERJAAN (BAST)",
                                    previewLetter.handover_date,
                                    previewLetter.handover_officer_name_1, previewLetter.handover_officer_role_1,
                                    previewLetter.handover_officer_name_2, previewLetter.handover_officer_role_2,
                                    previewLetter.handover_description, "handover_description", true
                                )}
                            </>
                        )}
                    </div>

                    {/* PANEL KONTROL KANAN */}
                    <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-6 flex flex-col justify-between shrink-0">
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-white font-bold text-lg">Pratinjau Dokumen Resmi</h4>
                                <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-800">
                                    Format {totalPages} Halaman Berkas Aktif
                                </span>
                                <p className="text-xs text-slate-400 mt-2">Gunakan editor langsung di area putih untuk merevisi draft teks sebelum dicetak ke berkas PDF.</p>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Jarak Spasi Baris Paragraf</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['1.2', '1.4', '1.6', '1.8'].map((spacing) => (
                                        <button key={spacing} onClick={() => setDocLineSpacing(spacing)} className={`py-2 text-xs font-mono rounded-lg border transition ${docLineSpacing === spacing ? 'bg-indigo-600 border-indigo-500 text-white font-bold' : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800'}`}>
                                            {spacing}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 pt-6 border-t border-slate-800">
                            <button onClick={handleUpdateFromPreview} disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition">
                                {isSaving ? '⏳ Menyimpan...' : '💾 Simpan Perubahan Review'}
                            </button>
                            <button onClick={handlePrintPDF} disabled={isGeneratingPDF} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/40 text-white font-semibold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20">
                                {isGeneratingPDF ? '⏳ Memproses Berkas...' : '📥 Unduh Cetak Berkas PDF'}
                            </button>
                            <button onClick={() => setPreviewLetter(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 px-4 rounded-xl text-sm transition border border-slate-700">
                                Tutup Pratinjau
                            </button>
                        </div>
                    </div>

                </div>
            );
        })()}
        </div>
    );
};

export default ProjectDocument;