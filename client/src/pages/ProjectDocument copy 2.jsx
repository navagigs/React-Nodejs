import React, { useState, useEffect } from 'react';
import { PROJECT_DOCUMENT_URL, PORTFOLIO_URL, CLIENT_URL } from '../Api'; 

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// Registrasi modul alignment agar mendukung rata kiri-kanan (justify) di Quill secara absolut
const Quill = ReactQuill.Quill;
const AlignStyle = Quill.import('attributors/style/align');
Quill.register(AlignStyle, true);

const ProjectDocument = ({ projectId }) => {
    // STATE MANAGEMENT
    const [documents, setDocuments] = useState([]);
    const [portfolios, setPortfolios] = useState([]); 
    const [viewMode, setViewMode] = useState('table'); // 'table', 'form'
    const [clients, setClients] = useState([]); 
    
    const [previewLetter, setPreviewLetter] = useState(null); 
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [docLineSpacing, setDocLineSpacing] = useState('1.5');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterClient, setFilterClient] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10); 
   
    const [syncBappPihak1, setSyncBappPihak1] = useState(false);
    const [syncBappPihak2, setSyncBappPihak2] = useState(false);
    const [syncBastPihak1, setSyncBastPihak1] = useState(false);
    const [syncBastPihak2, setSyncBastPihak2] = useState(false);
    const [portfolioSearch, setPortfolioSearch] = useState('');
    
    // Default diatur ke true agar halaman BAPP dan BAST aktif saat buat baru
    const [useBapp, setUseBapp] = useState(true);
    const [useBast, setUseBast] = useState(true);

    // STATE FORM: SESUAI STRUKTUR API + KEEPAN DATA STATUS
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
        
        progress_status: 1,
        handover_status: 1
    });
    
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' }); 

    const formQuillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }], 
            ['clean']
        ],
    };

    const previewQuillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }] 
        ],
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => { setNotification((prev) => ({ ...prev, show: false })); }, 3000);
    };

    const fetchClients = async () => {
        try {
            const response = await fetch(CLIENT_URL);
            const data = await response.json();
            setClients(data); 
        } catch (error) { console.error("Gagal mengambil data klien:", error); }
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

    // ==========================================
    // 1. MEMUAT DATA MASTER 
    // ==========================================
    useEffect(() => {
        const loadMasterData = async () => {
            try {
                if (typeof fetchDocuments === 'function') fetchDocuments();
                if (typeof fetchPortfolios === 'function') fetchPortfolios();
                if (typeof fetchClients === 'function') fetchClients();
            } catch (error) {
                console.error("❌ Gagal fetch data master:", error);
            }
        };
        loadMasterData();
    }, [projectId]); 


    // ==========================================
    // 2. MEMUAT DETAIL DATA DOKUMEN JIKA MODE EDIT
    // ==========================================
    useEffect(() => {
        const loadDocumentData = async () => {
            // Amankan: Jika id form data kosong / mode baru, abaikan hit API
            if (!formData.id || formData.id === "add") {
                return;
            }

            try {
                const res = await fetch(`${PROJECT_DOCUMENT_URL}/${formData.id}`);
                if (!res.ok) return; 
                
                const data = await res.json();
                
                if (data) {
                    setFormData(data);
                    setUseBapp(Number(data.progress_status) === 1);
                    setUseBast(Number(data.handover_status) === 1);
                }
            } catch (error) {
                console.error("❌ Error saat loadDocumentData:", error);
            }
        };

        loadDocumentData();
    }, [formData.id]); 

    const resetForm = () => {
        setFormData({
            id: null, project_id: projectId || '', location: '',
            inspection_date: '', inspection_officer_name_1: '', inspection_officer_role_1: '', inspection_officer_name_2: '', inspection_officer_role_2: '', inspection_description: '', 
            progress_date: '', progress_officer_name_1: '', progress_officer_role_1: '', progress_officer_name_2: '', progress_officer_role_2: '', progress_description: '', 
            handover_date: '', handover_officer_name_1: '', handover_officer_role_1: '', handover_officer_name_2: '', handover_officer_role_2: '', handover_description: '',
            progress_status: 1, handover_status: 1
        });
        setUseBapp(true);
        setUseBast(true);
        setViewMode('table');
    };

    const handleEditClick = (item) => {
        setFormData({ ...item });
        setUseBapp(Number(item.progress_status) === 1);
        setUseBast(Number(item.handover_status) === 1);
        setViewMode('form');
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) return;
        try {
            const response = await fetch(`${PROJECT_DOCUMENT_URL}/${id}`, { method: 'DELETE' });
            if (response.ok) { showNotification("Dokumen Dihapus!", "success"); fetchDocuments(); }
        } catch (error) { showNotification("Gagal menghapus dokumen.", "error"); }
    };

    // ==========================================
    // FUNGSI UTAMA SAVE FORM (DENGAN MANIPULASI STATUS)
    // ==========================================
    const handleSubmit = async (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        setIsSaving(true);

        try {
            const dataKeDatabase = {
                ...formData,
                progress_status: useBapp ? 1 : 0,
                handover_status: useBast ? 1 : 0
            };

            const isEditMode = formData.id && formData.id !== 'add';
            const url = isEditMode 
                ? `${PROJECT_DOCUMENT_URL}/status/${formData.id}` 
                : `${PROJECT_DOCUMENT_URL}/project-documents/status`;

            const res = await fetch(url, {
                method: isEditMode ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataKeDatabase),
            });

            if (!res.ok) throw new Error("Gagal menyimpan data ke server.");

            alert("✅ Dokumen Berhasil Disimpan ke Database!");
            resetForm();
            if (typeof fetchDocuments === 'function') fetchDocuments();
            
        } catch (error) {
            console.error("❌ Error submit ke DB:", error);
            alert("Gagal menyimpan ke database: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // ==========================================
    // FUNGSI UPDATE DATA DARI MODAL PREVIEW DENGAN STATUS
    // ==========================================
    const handleUpdateFromPreview = async () => {
        if (!previewLetter) return;
        setIsSaving(true);
        try {
            const updatedPayload = {
                ...previewLetter,
                progress_status: useBapp ? 1 : 0,
                handover_status: useBast ? 1 : 0
            };

            const res = await fetch(`${PROJECT_DOCUMENT_URL}/${previewLetter.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPayload)
            });

            if (!res.ok) throw new Error("Gagal memperbarui dokumen");

            alert("✅ Perubahan dari pratinjau berhasil disimpan ke Database!");
            if (typeof fetchDocuments === 'function') fetchDocuments();
            setPreviewLetter(null); 
            
        } catch (error) {
            console.error("❌ Error simpan database:", error);
            alert("Gagal menyimpan: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenPreview = (item) => {
        setPreviewLetter({ 
            ...item,
            inspection_description: item.inspection_description || '',
            progress_description: item.progress_description || '',
            handover_description: item.handover_description || ''
        });
        // Sinkronkan status pratinjau lembar kertas berdasarkan data item
        setUseBapp(Number(item.progress_status) === 1);
        setUseBast(Number(item.handover_status) === 1);
    };

    const filteredLetters = (documents || []).filter(item => {
        const matchesSearch = 
            (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.inspection_officer_name_1 && item.inspection_officer_name_1.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.progress_officer_name_1 && item.progress_officer_name_1.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesClient = filterClient === '' || String(item.project_id) === String(filterClient);
        return matchesSearch && matchesClient;
    });

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
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

    const generateBappTemplate = (project) => {
        if (!project) return '';
        const projectTitle = project.title || project.name || '';
        const contractNumber = project.contract_number || project.no_kontrak || '';
        const contractDate = formatDate(project.date) || '';

        return `
            <p>Berdasarkan Kontrak Perjanjian Kerja Sama <strong>${projectTitle}</strong> Nomor: <strong>${contractNumber}</strong> tanggal <strong>${contractDate}</strong></p>
            <p>Dengan ini menerangkan bahwa:</p>
            <ol>
                <li><strong>PIHAK KEDUA</strong> menyatakan telah menyelesaikan pekerjaan sesuai ruang lingkup dan deliverables pengadaan <strong>${projectTitle}</strong> sesuai dengan Kontrak Perjanjian Kerja Sama Nomor: <strong>${contractNumber}</strong></li>
                <li><strong>PIHAK PERTAMA</strong> menyatakan telah memeriksa hasil pekerjaan dan deliverables dimaksud pada butir 1 dengan hasil Baik dan Sesuai.</li>
                <li>Laporan hasil dan/atau checklist penyelesaian pekerjaan sebagaimana terlampir.</li>
            </ol>
            <p>Demikian Berita Acara Penyelesaian Pekerjaan (BAPP) <strong>${projectTitle}</strong> ini dibuat dalam rangkap 2 (dua) asli, masing-masing sama bunyinya serta mempunyai kekuatan hukum yang sama setelah ditandatangani kedua belah pihak untuk dipergunakan sebagaimana mestinya.</p>
        `;
    };

    const generateBastTemplate = (project) => {
        if (!project) return '';
        const projectTitle = project.title || project.name || '[Nama Proyek]';
        const contractNumber = project.contract_number || project.no_kontrak || '[Nomor Kontrak]';
        const contractDate = project.date ? formatDate(project.date) : '[Tanggal Kontrak]';

        return `
            <p>Berdasarkan:</p>
            <ol>
                <li>Kontrak Perjanjian Kerja Sama <strong>${projectTitle}</strong> Nomor: <strong>${contractNumber}</strong> tanggal <strong>${contractDate}</strong></li>
                <li>Amandemen Kesatu Kontrak Perjanjian Kerja Sama <strong>${projectTitle}</strong> Nomor: <strong>${contractNumber}</strong> tanggal <strong>${contractDate}</strong></li>
                <li>Berita Acara Penyelesaian Pekerjaan (BAPP) <strong>${projectTitle}</strong> Nomor: <strong>${contractNumber}</strong> tanggal <strong>${contractDate}</strong></li>
            </ol>
            <p>Dengan ini menyatakan bahwa:</p>
            <p>1.&nbsp;&nbsp;&nbsp;&nbsp;<strong>PIHAK KEDUA</strong> menyerahkan seluruh hasil pekerjaan dan deliverables sesuai dengan dokumen tersebut di atas kepada <strong>PIHAK PERTAMA</strong>.</p>
            <p>2.&nbsp;&nbsp;&nbsp;&nbsp;<strong>PIHAK PERTAMA</strong> menerima seluruh hasil pekerjaan dan deliverables sesuai sesuai dengan dokumen tersebut di atas dari <strong>PIHAK KEDUA</strong>.</p>
            <p>Demikian Berita Acara Serah Terima Pekerjaan (BAST) <strong>${projectTitle}</strong> ini dibuat dalam rangkap 2 (dua) asli, masing-masing sama bunyinya serta mempunyai kekuatan hukum yang sama setelah ditandatangani kedua belah pihak untuk dipergunakan sebagaimana mestinya.</p>
        `;
    };

    const handleProjectChange = (e) => {
        const selectedId = e.target.value;
        if (!selectedId || selectedId === "") {
            setFormData(prev => ({
                ...prev, project_id: '', client_name: '', progress_description: '', handover_description: ''
            }));
            return;
        }

        const selectedProj = portfolios.find(p => String(p.id) === String(selectedId));
        const client_name = selectedProj ? (selectedProj.client_address || selectedProj.location || selectedProj.address || selectedProj.client_name || '') : '';
        const autoBappDescription = selectedProj ? generateBappTemplate(selectedProj) : '';
        const autoBastDescription = selectedProj ? generateBastTemplate(selectedProj) : '';

        setFormData(prev => ({
            ...prev,
            project_id: selectedId,
            company_1: client_name,
            location: client_name,
            client_name: client_name,
            progress_description: autoBappDescription,
            handover_description: autoBastDescription
        }));
    };

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

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredLetters.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredLetters.length / itemsPerPage);

    const renderLembarHalaman = (judulDokumen, tglDokumen, p1Nama, p1Jabacy, p2Nama, p2Jabacy, isiDeskripsiText, fieldKeyName) => {
        const { tanggalTerbilang } = getHariDanTerbilang(tglDokumen);
        return (
            <div className="pdf-page-bundle bg-white text-black shrink-0 shadow-2xl relative p-[65px] pt-[105px] flex flex-col justify-start mb-10" style={{ width: "794px", height: "1122px", boxSizing: "border-box", fontFamily: "Arial, sans-serif" }}>
                <img src={`${window.location.origin}/crop2026.png`} crossOrigin="anonymous" className="absolute top-0 left-0 w-[794px] h-[1122px] z-0 pointer-events-none select-none" alt="Kop Surat" />
                
                <div className="relative z-10 flex-1 flex flex-col justify-start">
                    <div>
                        <div className="text-center mb-5 flex flex-col items-center">
                            <h2 className="text-[14px] font-bold uppercase tracking-wide leading-tight" style={{ fontFamily: "Arial, sans-serif" }}>
                                {judulDokumen}
                            </h2>
                            <h3 className="text-[14px] font-bold uppercase tracking-wide leading-tight mt-1" style={{ fontFamily: "Arial, sans-serif" }}>
                                {getProjectTitle(previewLetter.project_id)}
                            </h3>
                            <div className="border-b border-black mt-2 mb-1 w-full"></div>
                        </div>

                        <div className="text-[12px] text-justify mb-4" style={{ lineHeight: docLineSpacing, fontFamily: "Arial, sans-serif" }}>
                            Pada hari ini, {tanggalTerbilang} bertempat di <span className="font-semibold">{previewLetter.location || "____________________"}</span>, kami yang bertandatangan di bawah ini:
                        </div>

                        <div className="text-[12px] space-y-3 mb-4" style={{ lineHeight: docLineSpacing, fontFamily: "Arial, sans-serif" }}>
                            <div className="grid grid-cols-[30px_1fr] items-start">
                                <div className="font-bold">I.</div>
                                <div>
                                    <table className="text-[12px] border-collapse py-0" style={{ fontFamily: "Arial, sans-serif" }}>
                                        <tbody>
                                            <tr><td className="w-[85px] py-0.5">Nama</td><td className="w-[20px] text-center py-0.5">:</td><td className="font-semibold py-0.5">{p1Nama || '-'}</td></tr>
                                            <tr><td className="py-0.5">Jabatan</td><td className="text-center py-0.5">:</td><td className="py-0.5">{p1Jabacy || '-'}</td></tr>
                                            <tr><td className="py-0.5">Perusahaan</td><td className="text-center py-0.5">:</td><td className="py-0.5">{previewLetter.company_1 || '-'}</td></tr>
                                        </tbody>
                                    </table>
                                    <div className="mt-0.5 text-gray-950 pl-[105px]">selanjutnya disebut sebagai <span className="font-bold">PIHAK PERTAMA,</span></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-[30px_1fr] items-start pt-0.5">
                                <div className="font-bold">II.</div>
                                <div>
                                    <table className="text-[12px] border-collapse py-0" style={{ fontFamily: "Arial, sans-serif" }}>
                                        <tbody>
                                            <tr><td className="w-[85px] py-0.5">Nama</td><td className="w-[20px] text-center py-0.5">:</td><td className="font-semibold py-0.5">{p2Nama || '-'}</td></tr>
                                            <tr><td className="py-0.5">Jabatan</td><td className="text-center py-0.5">:</td><td className="py-0.5">{p2Jabacy || '-'}</td></tr>
                                            <tr><td className="py-0.5">Perusahaan</td><td className="text-center py-0.5">:</td><td className="py-0.5">{previewLetter.company_2 || '-'}</td></tr>
                                        </tbody>
                                    </table>
                                    <div className="mt-0.5 text-gray-950 pl-[105px]">selanjutnya disebut sebagai <span className="font-bold">PIHAK KEDUA,</span></div>
                                </div>
                            </div>
                        </div>

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

    return (
        <div className="max-w-7xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
            <style>{`
                .ql-container, .ql-editor, .ql-editor p, .ql-editor li, .static-html-print-output, .static-html-print-output p, .static-html-print-output li { 
                    font-family: Arial, sans-serif !important; 
                    font-size: 12px !important; 
                    color: #000000 !important; 
                }
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

            {notification.show && (
                <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border-l-4 ${notification.type === 'success' ? 'border-green-500' : 'border-red-500'} bg-white text-gray-800`}>
                    <div className="text-sm font-bold">{notification.message}</div>
                </div>
            )}
  
            {/* 1. HALAMAN TABEL UTAMA */}
            {viewMode === 'table' && (
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 sm:p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 border-b border-gray-100 pb-6">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Dokumen Proyek</h2>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">Kelola data inspeksi, progress, dan serah terima administrasi proyek.</p>
                        </div>
                        <button 
                            onClick={() => setViewMode('form')} 
                            className="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-500/30 active:scale-95"
                        >
                            Buat Dokumen Baru
                        </button>
                    </div>

                    {/* Filter & Search Bar */}
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
                            className="w-full md:w-auto px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
                        >
                            🔄 <span className="md:hidden inline">Reload Data</span>
                        </button>
                    </div>

                    {filteredLetters.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm bg-white">
                            Tidak ada berkas data dokumen ditemukan
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm text-gray-600">
                                <thead>
                                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 font-semibold">
                                        <th className="p-3">No</th>
                                        <th className="p-3">Nama Proyek</th>
                                        <th className="p-3">Lokasi</th>
                                        <th className="p-3">Tgl Pemeriksaan (BAP)</th>
                                        <th className="p-3 text-center">Status Cetak</th>
                                        <th className="p-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map((item, index) => (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition">
                                            <td className="p-3 font-medium">{indexOfFirstItem + index + 1}</td>
                                            <td className="p-3 font-semibold text-gray-900">{getProjectTitle(item.project_id)}</td>
                                            <td className="p-3">{item.location || '-'}</td>
                                            <td className="p-3">{formatDate(item.inspection_date)}</td>
                                            <td className="p-3">
                                                <div className="flex flex-col gap-1 items-center text-[11px]">
                                                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">BAP: Aktif</span>
                                                    <span className={`px-2 py-0.5 rounded font-bold ${Number(item.progress_status) === 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400 line-through'}`}>BAPP</span>
                                                    <span className={`px-2 py-0.5 rounded font-bold ${Number(item.handover_status) === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400 line-through'}`}>BAST</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <button onClick={() => handleOpenPreview(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Pratinjau / Print">👁️ Preview</button>
                                                    <button onClick={() => handleEditClick(item)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="Edit">✏️ Edit</button>
                                                    <button onClick={() => handleDeleteClick(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Hapus">🗑️ Hapus</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* 2. FORM BUAT / EDIT DATA DOKUMEN */}
            {viewMode === 'form' && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-4xl mx-auto">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">{formData.id ? '✏️ Edit Dokumen Berkas' : '✨ Buat Dokumen Administrasi Baru'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Pilih Acuan Dokumen Proyek / Portofolio Kerja</label>
                            <select className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm" value={formData.project_id} onChange={handleProjectChange} required>
                                <option value="">-- Hubungkan dengan Proyek Aktif --</option>
                                {portfolios.map(p => (<option key={p.id} value={p.id}>{p.title || p.name}</option>))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                                <input type="checkbox" checked={useBapp} onChange={(e) => setUseBapp(e.target.checked)} className="w-4 h-4 rounded text-indigo-600" />
                                Sertakan Cetak Lembar ke-2 (BAPP)
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                                <input type="checkbox" checked={useBast} onChange={(e) => setUseBast(e.target.checked)} className="w-4 h-4 rounded text-indigo-600" />
                                Sertakan Cetak Lembar ke-3 (BAST)
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Lokasi Kegiatan</label>
                            <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm" placeholder="Isi alamat lokasi proyek..." required />
                        </div>

                        {/* BAGIAN DATA PEMERIKSAAN BAP */}
                        <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/60 space-y-3">
                            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Bagian 1: Berita Acara Pemeriksaan Pekerjaan (BAP)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600">Tanggal Pemeriksaan</label>
                                    <input type="date" value={formData.inspection_date} onChange={(e) => setFormData({...formData, inspection_date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" placeholder="Nama Petugas Pihak I" value={formData.inspection_officer_name_1} onChange={(e) => setFormData({...formData, inspection_officer_name_1: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" required />
                                <input type="text" placeholder="Jabatan Pihak I" value={formData.inspection_officer_role_1} onChange={(e) => setFormData({...formData, inspection_officer_role_1: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" placeholder="Nama Petugas Pihak II" value={formData.inspection_officer_name_2} onChange={(e) => setFormData({...formData, inspection_officer_name_2: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" required />
                                <input type="text" placeholder="Jabatan Pihak II" value={formData.inspection_officer_role_2} onChange={(e) => setFormData({...formData, inspection_officer_role_2: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" required />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Isi Narasi Deskripsi Pemeriksaan (BAP)</label>
                                <ReactQuill theme="snow" value={formData.inspection_description} onChange={(content) => setFormData({...formData, inspection_description: content})} modules={formQuillModules} />
                            </div>
                        </div>

                        {/* BAGIAN DATA PENYELESAIAN BAPP */}
                        {useBapp && (
                            <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200/60 space-y-3">
                                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Bagian 2: Berita Acara Penyelesaian Pekerjaan (BAPP)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-600">Tanggal Penyelesaian</label>
                                        <input type="date" value={formData.progress_date} onChange={(e) => setFormData({...formData, progress_date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="Nama Petugas Pihak I" value={formData.progress_officer_name_1} onChange={(e) => setFormData({...formData, progress_officer_name_1: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                                    <input type="text" placeholder="Jabatan Pihak I" value={formData.progress_officer_role_1} onChange={(e) => setFormData({...formData, progress_officer_role_1: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="Nama Petugas Pihak II" value={formData.progress_officer_name_2} onChange={(e) => setFormData({...formData, progress_officer_name_2: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                                    <input type="text" placeholder="Jabatan Pihak II" value={formData.progress_officer_role_2} onChange={(e) => setFormData({...formData, progress_officer_role_2: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Isi Narasi Deskripsi Penyelesaian (BAPP)</label>
                                    <ReactQuill theme="snow" value={formData.progress_description} onChange={(content) => setFormData({...formData, progress_description: content})} modules={formQuillModules} />
                                </div>
                            </div>
                        )}

                        {/* BAGIAN DATA SERAH TERIMA BAST */}
                        {useBast && (
                            <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/60 space-y-3">
                                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Bagian 3: Berita Acara Serah Terima (BAST)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-600">Tanggal Serah Terima</label>
                                        <input type="date" value={formData.handover_date} onChange={(e) => setFormData({...formData, handover_date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="Nama Penerima Pihak I" value={formData.handover_officer_name_1} onChange={(e) => setFormData({...formData, handover_officer_name_1: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                                    <input type="text" placeholder="Jabatan Pihak I" value={formData.handover_officer_role_1} onChange={(e) => setFormData({...formData, handover_officer_role_1: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="Nama Penyerah Pihak II" value={formData.handover_officer_name_2} onChange={(e) => setFormData({...formData, handover_officer_name_2: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                                    <input type="text" placeholder="Jabatan Pihak II" value={formData.handover_officer_role_2} onChange={(e) => setFormData({...formData, handover_officer_role_2: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Isi Narasi Deskripsi Serah Terima (BAST)</label>
                                    <ReactQuill theme="snow" value={formData.handover_description} onChange={(content) => setFormData({...formData, handover_description: content})} modules={formQuillModules} />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                            <button type="button" onClick={resetForm} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition">Batal</button>
                            <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition flex items-center gap-2">
                                {isSaving ? '⏳ Memproses...' : '💾 Simpan Dokumen Ke DB'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* 3. WINDOW MODAL SCREEN PREVIEW (SINKRON DENGAN CHECKBOX AKTIF) */}
            {previewLetter && (
                <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col lg:flex-row overflow-hidden">
                    <div className="flex-1 bg-slate-950 p-4 lg:p-8 overflow-y-auto flex flex-col items-center gap-2">
                        <div className="text-white text-xs font-mono uppercase bg-amber-600/20 px-4 py-1.5 rounded-full mb-2 border border-amber-500/30">Lembar 1: (BAP)</div>
                        {renderLembarHalaman(
                            "BERITA ACARA PEMERIKSAAN PEKERJAAN (BAP)",
                            previewLetter.inspection_date,
                            previewLetter.inspection_officer_name_1, previewLetter.inspection_officer_role_1,
                            previewLetter.inspection_officer_name_2, previewLetter.inspection_officer_role_2,
                            previewLetter.inspection_description, "inspection_description"
                        )}

                        {useBapp && (
                            <>
                                <div className="text-white text-xs font-mono uppercase bg-blue-600/20 px-4 py-1.5 rounded-full my-4 border border-blue-500/30">Lembar 2: (BAPP)</div>
                                {renderLembarHalaman(
                                    "BERITA ACARA PENYELESAIAN PEKERJAAN (BAPP)",
                                    previewLetter.progress_date,
                                    previewLetter.progress_officer_name_1, previewLetter.progress_officer_role_1,
                                    previewLetter.progress_officer_name_2, previewLetter.progress_officer_role_2,
                                    previewLetter.progress_description, "progress_description"
                                )}
                            </>
                        )}

                        {useBast && (
                            <>
                                <div className="text-white text-xs font-mono uppercase bg-emerald-600/20 px-4 py-1.5 rounded-full my-4 border border-emerald-500/30">Lembar 3: (BAST)</div>
                                {renderLembarHalaman(
                                    "BERITA ACARA SERAH TERIMA PEKERJAAN (BAST)",
                                    previewLetter.handover_date,
                                    previewLetter.handover_officer_name_1, previewLetter.handover_officer_role_1,
                                    previewLetter.handover_officer_name_2, previewLetter.handover_officer_role_2,
                                    previewLetter.handover_description, "handover_description"
                                )}
                            </>
                        )}
                    </div>

                    {/* PANEL KONTROL KANAN MODAL */}
                    <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-6 flex flex-col justify-between shrink-0">
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-white font-bold text-lg">Pratinjau Dokumen Resmi</h4>
                                <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-800">
                                    Format {1 + (useBapp ? 1 : 0) + (useBast ? 1 : 0)} Halaman Berkas Aktif
                                </span>
                                <p className="text-xs text-slate-400 mt-2">Gunakan editor langsung di area putih untuk merevisi draft teks sebelum dicetak ke berkas PDF.</p>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Jarak Spasi Baris Paragraf</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['1.2', '1.4', '1.6', '1.8'].map((spacing) => (
                                        <button key={spacing} onClick={() => setDocLineSpacing(spacing)} className={`py-2 text-xs font-mono rounded-lg border transition ${docLineSpacing === spacing ? 'bg-indigo-600 border-indigo-500 text-white font-bold' : 'border-slate-700 bg-slate-800/50 text-slate-300'}`}>
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
                            <button onClick={handlePrintPDF} disabled={isGeneratingPDF} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2">
                                {isGeneratingPDF ? '⏳ Memproses Berkas...' : '📥 Unduh Cetak Berkas PDF'}
                            </button>
                            <button onClick={() => setPreviewLetter(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 px-4 rounded-xl text-sm transition">
                                Tutup Pratinjau
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDocument;