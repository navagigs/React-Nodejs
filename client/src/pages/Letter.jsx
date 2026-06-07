
import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { LETTER_URL, CLIENT_URL } from '../Api';

const angkaKeTerbilang = (num) => {
  const nilai = Math.floor(Math.abs(num));
  const huruf = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let terbilang = "";

  if (nilai < 12) terbilang = " " + huruf[nilai];
  else if (nilai < 20) terbilang = angkaKeTerbilang(nilai - 10) + " Belas";
  else if (nilai < 100) terbilang = " " + angkaKeTerbilang(nilai / 10) + " Puluh " + angkaKeTerbilang(nilai % 10);
  else if (nilai < 200) terbilang = " Seratus" + angkaKeTerbilang(nilai - 100);
  else if (nilai < 1000) terbilang = " " + angkaKeTerbilang(nilai / 100) + " Ratus " + angkaKeTerbilang(nilai % 100);
  else if (nilai < 2000) terbilang = " Seribu" + angkaKeTerbilang(nilai - 1000);
  else if (nilai < 1000000) terbilang = " " + angkaKeTerbilang(nilai / 1000) + " Ribu " + angkaKeTerbilang(nilai % 1000);
  else if (nilai < 1000000000) terbilang = " " + angkaKeTerbilang(nilai / 1000000) + " Juta " + angkaKeTerbilang(nilai % 1000000);
  else if (nilai < 1000000000000) terbilang = " " + angkaKeTerbilang(nilai / 1000000000) + " Milyar " + angkaKeTerbilang(nilai % 1000000000);
  
  return terbilang.trim();
};

const formatRupiah = (angka) => {
  return new Intl.NumberFormat("id-ID").format(angka);
};

const Letter = () => {
  const [letters, setLetters] = useState([]);
  const [clients, setClients] = useState([]); 
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Menampilkan 10 data per halaman
  
  const [viewMode, setViewMode] = useState('table'); 
  const [isEditing, setIsEditing] = useState(false);

  const [previewLetter, setPreviewLetter] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [docLineSpacing, setDocLineSpacing] = useState('1.6');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState('');
   const paginate = (pageNumber) => {
    const totalPages = Math.ceil(filteredLetters.length / itemsPerPage);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const [currentLetter, setCurrentLetter] = useState({ 
      id: null, 
      client_id: '', 
      letter_number: '', 
      letter_type: 'GENERAL', 
      subject: '', 
      letter_location: '',
      letter_date: '',
      recipient: '',
      description: '', 
      description_closing: '', 
      signer_name: '',
      signer_position: '',
      attachment: '',
      invoice_items: [{ item_name: '', amount: 0 }] 
  });
  
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' }); 
 
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

  const fetchLetters = async () => {
    try {
        const response = await fetch(`${LETTER_URL}/invoice`);
        if (!response.ok) throw new Error("Gagal memuat berkas dari server");
        
        const data = await response.json();
        const formattedData = data.map(item => {
            const rawItems = item.invoice_items || [];
            return {
                ...item,
                letter_date: item.letter_date ? item.letter_date.split('T')[0] : '',
                invoice_items: Array.isArray(rawItems) && rawItems.length > 0 
                    ? rawItems 
                    : [{ item_name: '', amount: 0 }]
            };
        });
        setLetters(formattedData);
    } catch (error) {
        console.error("Gagal mengambil data surat:", error);
        showNotification("Gagal terhubung dengan data server", "error");
    }
  };

  useEffect(() => {
    fetchLetters();
    fetchClients(); 
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterClient]);
  
  useEffect(() => {
    if (viewMode === 'form' && currentLetter.letter_date) {
      const currentCount = parseInt(currentLetter.letter_number.split('/')[0]) || 1;
      const updatedNumber = generateLetterNumber(currentCount, currentLetter.letter_type, currentLetter.letter_date);
      if (currentLetter.letter_number !== updatedNumber) {
        setCurrentLetter(prev => ({ ...prev, letter_number: updatedNumber }));
      }
    }
  }, [currentLetter.letter_date, currentLetter.letter_type, viewMode]);

  const handleInvoiceItemChange = (index, field, value) => {
    const updatedItems = [...currentLetter.invoice_items];
    updatedItems[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    setCurrentLetter({ ...currentLetter, invoice_items: updatedItems });
  };

  const addInvoiceRow = () => {
    setCurrentLetter({ ...currentLetter, invoice_items: [...currentLetter.invoice_items, { item_name: '', amount: 0 }] });
  };

  const removeInvoiceRow = (index) => {
    if (currentLetter.invoice_items.length === 1) return;
    const updatedItems = currentLetter.invoice_items.filter((_, i) => i !== index);
    setCurrentLetter({ ...currentLetter, invoice_items: updatedItems });
  };

  const calculateInvoiceData = (items) => {
    const subtotal = items ? items.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0) : 0;
    const ppn = subtotal * 0.11;
    const total = subtotal + ppn;
    const terbilangStr = total > 0 ? `${angkaKeTerbilang(total)} Rupiah` : '-';
    const terbilangClean = terbilangStr.replace(/\s+/g, ' ');
    return { subtotal, ppn, total, terbilang: terbilangClean };
  };

  const getClientName = (id) => {
      const client = clients.find(c => c.id == id);
      return client ? client.name : 'Klien Tidak Diketahui'; 
  };

  const getRomawiMonth = (monthIndex) => {
      const romawi = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
      return romawi[monthIndex];
  };

  const generateLetterNumber = (count, type, dateString) => {
      const targetDate = dateString ? new Date(dateString) : new Date();
      const year = targetDate.getFullYear();
      const monthRomawi = getRomawiMonth(targetDate.getMonth());
      const typeCode = type ? type.substring(0, 3).toUpperCase() : 'LET';
      const paddedCount = String(count).padStart(3, '0');
      return `${paddedCount}/CROP-${typeCode}/${monthRomawi}/${year}`;
  };

  const filteredLetters = letters.filter((letter) => {
    const matchesSearch = 
        (letter.letter_number && letter.letter_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (letter.recipient && letter.recipient.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (letter.subject && letter.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesClient = filterClient === '' || letter.client_id == filterClient;
    
    // TAMBAHKAN LOGIKA INI:
    const matchesType = filterType === '' || letter.letter_type === filterType;
    
    return matchesSearch && matchesClient && matchesType;
});
  // ==================== BARU: FUNGSI UNTUK COPY DATA KE DATABASE ====================
  const handleCopyData = async (item) => {
    if (window.confirm(`Apakah Anda yakin ingin menyalin/copy data surat ${item.letter_number}?`)) {
        try {
            // 1. Ambil nomor antrean/counter surat terbaru dari server
            let nextCount = 1;
            const numResponse = await fetch(`${LETTER_URL}/next-number`);
            if (numResponse.ok) {
                const numData = await numResponse.json();
                nextCount = numData.nextCount;
            }

            // 2. Set tanggal hari ini sebagai default tanggal surat salinan
            const todayStr = new Date().toISOString().split('T')[0];
            
            // 3. Buat nomor surat otomatis baru berdasarkan counter terbaru
            const autoNumbered = generateLetterNumber(nextCount, item.letter_type, todayStr);

            // 4. Susun objek data baru (buang ID lama agar dikenali sebagai baris data baru)
            const copiedData = {
                ...item,
                id: null, // Dikosongkan agar DB membuat ID auto-increment baru
                letter_number: autoNumbered,
                letter_date: todayStr,
                // Pastikan invoice_items terformat dengan benar tanpa menyimpan ID item lama jika ada
                invoice_items: item.invoice_items.map(inv => ({
                    item_name: inv.item_name,
                    amount: inv.amount
                }))
            };

            // 5. Tentukan route berdasarkan tipe surat
            const pathRoute = item.letter_type === 'INVOICE' ? 'invoice' : 'general';
            
            // 6. POST data salinan ke database
            const response = await fetch(`${LETTER_URL}/${pathRoute}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(copiedData)
            });

            if (!response.ok) throw new Error('Gagal menyimpan data copy ke database');

            // 7. Refresh list dan tampilkan notifikasi sukses
            fetchLetters();
            showNotification(`Sukses menyalin data! Nomor surat baru: ${autoNumbered}`, "success");

        } catch (error) {
            console.error("Error copying data:", error);
            showNotification("Gagal menyalin data ke database.", "error");
        }
    }
  };
  // =================================================================================


  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    let targetData = previewLetter ? { ...previewLetter } : { ...currentLetter };
    const cleanDescription = targetData.description ? targetData.description.replace(/<(.|\n)*?>/g, '').trim() : '';

    if (!targetData.letter_number.trim() || !targetData.recipient.trim() || !targetData.client_id || !targetData.letter_date || !targetData.subject.trim() || !cleanDescription) {
        showNotification("Mohon lengkapi semua data wajib yang bertanda bintang (*)", "error");
        return;
    }

    try {
        const pathRoute = targetData.letter_type === 'INVOICE' ? 'invoice' : 'general';
        let url = `${LETTER_URL}/${pathRoute}`;
        let method = 'POST';
        let successMsg = "Surat & Invoice berhasil disimpan ke database!";

        if (isEditing || previewLetter) {
            url = `${LETTER_URL}/${pathRoute}/${targetData.id}`;
            method = 'PUT';
            successMsg = "Pembaruan data surat & invoice berhasil disimpan!";
        }

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(targetData) 
        });

        if (!response.ok) throw new Error('Gagal memproses data di server');
        
        fetchLetters(); 
        if (!previewLetter) handleBackToTable();
        showNotification(successMsg, "success");
        if (previewLetter) setPreviewLetter(null); 

    } catch (error) {
        console.error("Error saving data:", error);
        showNotification("Gagal terhubung atau menyimpan data ke database server.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus arsip surat ini?")) {
        try {
            const response = await fetch(`${LETTER_URL}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error("Gagal menghapus");
            fetchLetters();
            showNotification("Arsip surat berhasil dihapus!", "success");
        } catch (error) { showNotification("Gagal menghapus data surat.", "error"); }
    }
  };

  const handleOpenPreview = (item) => {
    setPreviewLetter({ ...item });
  };

  const handlePrintPDF = async () => {
    if (!previewLetter) return;
    setIsGeneratingPDF(true);

    try {
      const originalPages = document.querySelectorAll(".pdf-page");
      if (originalPages.length === 0) {
        showNotification("Elemen dokumen tidak ditemukan", "error");
        setIsGeneratingPDF(false);
        return;
      }

      const toolbars = document.querySelectorAll(".ql-toolbar");
      toolbars.forEach(tb => tb.style.display = "none");
      const containers = document.querySelectorAll(".ql-container");
      containers.forEach(ct => ct.style.border = "none");

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      for (let i = 0; i < originalPages.length; i++) {
        const pageElement = originalPages[i];

        const clonedPage = pageElement.cloneNode(true);
        clonedPage.style.position = "fixed";
        clonedPage.style.left = "-99999px";
        clonedPage.style.top = "0";
        document.body.appendChild(clonedPage);

        const img = clonedPage.querySelector(".bg-letterhead-img");
        if (img) {
          await new Promise((resolve) => {
            if (img.complete) resolve();
            else { img.onload = resolve; img.onerror = resolve; }
          });
        }

        const canvas = await html2canvas(clonedPage, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          letterRendering: true,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        
        if (i > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
        document.body.removeChild(clonedPage);
      }

      toolbars.forEach(tb => tb.style.display = "block");

      pdf.save(`${previewLetter.letter_number.replace(/[\\/]/g, "-")}.pdf`);
      showNotification("PDF Berhasil diunduh!", "success");
    } catch (err) {
      console.error(err);
      showNotification("Gagal membuat PDF", "error");
    } finally {
      setIsGeneratingPDF(false);
    } 
  };

  const handleBackToTable = () => { setViewMode('table'); };
  
  const formatDate = (dateString) => {
      if (!dateString) return "-";
      return new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  const formatDateLong = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterType('');
    setFilterClient('');
  };

  const sharedModules = {
    toolbar: [
      ['bold', 'italic', 'underline'], 
      [{ 'list': 'ordered' }, { 'list': 'bullet' }], 
      [{ 'align': [] }], 
      ['clean'] 
    ],
  };

  const handleAddNew = async () => {
    let nextCount = 1; 
    try {
        const response = await fetch(`${LETTER_URL}/next-number`);
        if (response.ok) {
            const data = await response.json();
            nextCount = data.nextCount;
        }
    } catch (error) { console.error(error); }
    const defaultDate = new Date().toISOString().split('T')[0];
    const autoNumbered = generateLetterNumber(nextCount, 'GENERAL', defaultDate);
    setIsEditing(false);
    setCurrentLetter({ 
        client_id: '', letter_number: autoNumbered, letter_type: 'GENERAL', subject: '', letter_location: '', 
        letter_date: defaultDate, recipient: '', description: '', description_closing: '', 
        signer_name: '', signer_position: '', attachment: '', invoice_items: [{ item_name: '', amount: 0 }]
    });
    setViewMode('form'); 
  };

  const handleEdit = (letter) => {
    setIsEditing(true);
    setCurrentLetter({ ...letter });
    setViewMode('form'); 
  };

  const labelStyle = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5";
  const inputStyle = "w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200";
  const activeCalc = calculateInvoiceData(currentLetter.invoice_items);

  return (
    <div className="max-w-7xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      
      <style>{`
        .ql-container, .ql-editor, .ql-editor p, .ql-editor li { font-family: Arial, sans-serif !important; }
      `}</style>

      {/* Toast Notifikasi */}
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
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Surat & Invoice</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Kelola arsip surat, log penomoran, dan invoice.</p>
            </div>
            <button 
                onClick={handleAddNew} 
                className="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-500/30 active:scale-95"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Buat Surat Baru
            </button>
        </div>

        {/* Filter & Search Bar Section */}
        <div className="flex flex-col md:flex-row gap-3 mb-6 bg-gray-50/50 p-3 sm:p-4 rounded-xl border border-gray-100 items-stretch md:items-center">
            <input 
                type="text" 
                placeholder="Cari nomor, perihal, penerima..." 
                className="w-full md:flex-1 pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
            />
            <select 
                className="w-full md:w-48 py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer shadow-sm focus:border-indigo-500 transition"
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
            >
                <option value="">Semua Tipe</option>
                <option value="GENERAL">✉️ SURAT UMUM</option>
                <option value="INVOICE">🧾 INVOICE</option>
            </select>
            <select 
                className="w-full md:w-64 py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer shadow-sm focus:border-indigo-500 transition" 
                value={filterClient} 
                onChange={(e) => setFilterClient(e.target.value)}
            >
                <option value="">Semua Client</option>
                {clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <button
                type="button"
                onClick={() => {
                    setSearchTerm('');
                    setFilterType('');
                    setFilterClient('');
                    fetchLetters();
                    fetchClients();
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
                Tidak ada berkas data surat ditemukan
            </div>
        ) : (
            <>
                {/* TAMPILAN MOBILE LIST (KARTU) */}
                <div className="block md:hidden space-y-3">
                    {currentItems.map((item, index) => (
                        <div key={item.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-indigo-100 transition relative overflow-hidden">
                            {/* Indikator Nomor Otomatis di Pojok Kanan Atas Kartu Mobile */}
                            <div className="absolute top-0 right-0 bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg border-l border-b border-gray-200/60">
                                #{indexOfFirstItem + index + 1}
                            </div>

                            <div className="flex justify-between items-start gap-2 mb-2 pr-6">
                                <span className={`inline-flex items-center justify-center w-[96px] px-2 py-1 rounded-md text-[10px] font-bold tracking-wide ring-1 ring-inset ${
                                    item.letter_type === 'INVOICE' 
                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' 
                                        : 'bg-blue-50 text-blue-700 ring-blue-700/10'
                                }`}>
                                    {item.letter_type === 'INVOICE' ? 'INVOICE' : 'SURAT UMUM'}
                                </span>
                                <span className="text-xs text-gray-400">{formatDate(item.letter_date)}</span>
                            </div>
                            <h3 className="font-bold text-gray-800 text-sm break-all">{item.letter_number}</h3>
                            <p className="text-xs text-gray-500 italic mt-0.5 mb-2 truncate">{item.subject || '-'}</p>
                            <div className="text-xs border-t border-gray-50 pt-2 text-gray-600 space-y-0.5">
                                <div><span className="text-gray-400">Kepada:</span> <span className="font-medium text-gray-800">{item.recipient}</span></div>
                                <div><span className="text-gray-400">Klien:</span> {item.client_name || getClientName(item.client_id)}</div>
                            </div>
                            
                            {/* Tombol Aksi Mobile */}
                            <div className="flex justify-end gap-2 mt-3 border-t border-gray-100 pt-3">
                                <button onClick={() => handleOpenPreview(item)} title="Pratinjau PDF" className="py-2 px-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition flex-1 flex items-center justify-center gap-1 border border-emerald-100"><svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 -960 960 960"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm0 160q-139 0-251.5-76.5T40-500q61-125 173.5-201.5T480-778q139 0 251.5 76.5T920-500q-61 125-173.5 201.5T480-240Z"/></svg><span>Lihat</span></button>
                                <button onClick={() => handleCopyData(item)} title="Salin/Copy Data" className="py-2 px-2 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl transition flex-1 flex items-center justify-center gap-1 border border-amber-100"><svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 -960 960 960"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Z"/></svg><span>Salin</span></button>
                                <button onClick={() => handleEdit(item)} title="Ubah Data" className="py-2 px-2 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition flex-1 flex items-center justify-center gap-1 border border-indigo-100"><svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 -960 960 960"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Z"/></svg><span>Edit</span></button>
                                <button onClick={() => handleDelete(item.id)} title="Hapus Dokumen" className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition border border-red-100 flex items-center justify-center"><svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/></svg></button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* TAMPILAN DESKTOP TABLE */}
                <div className="hidden md:block overflow-hidden border border-gray-100 rounded-xl shadow-sm">
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
                        <tr> 
                            <th className="py-4 px-4 w-12 text-center">No.</th> {/* BARU: Header No. */}
                            <th className="py-4 px-4">Nomor Surat / Perihal</th>
                            <th className="py-4 px-4">Penerima Tujuan & Client</th> 
                            <th className="py-4 px-4">Tanggal dibuat</th>
                            <th className="py-4 pr-6 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {currentItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group"> 
                            {/* BARU: Kolom Nomor Otomatis Sesuai Halaman Aktif */}
                            <td className="py-4 px-4 text-center text-xs font-semibold text-gray-400">
                                {indexOfFirstItem + index + 1}
                            </td>
                            <td className="py-4 px-4">
                                <div className="flex flex-col gap-1.5">
                                    <span className="font-semibold text-gray-800">{item.letter_number}</span>
                                    <span className="text-xs text-gray-500 italic">{item.subject || '-'}</span>
                                    <span className={`inline-flex items-center justify-center w-[96px] px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ring-1 ring-inset ${
                                        item.letter_type === 'INVOICE' 
                                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' 
                                            : 'bg-blue-50 text-blue-700 ring-blue-700/10'
                                    }`}>
                                        {item.letter_type === 'INVOICE' ? 'INVOICE' : 'SURAT UMUM'}
                                    </span>
                                </div>
                            </td>
                            <td className="py-4 px-4">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-medium text-gray-900">{item.recipient}</span>
                                    <span className="text-xs text-gray-400">{item.client_name || getClientName(item.client_id)}</span>
                                </div>
                            </td> 
                            <td className="py-4 px-4 text-sm text-gray-500">{formatDate(item.letter_date)}</td>
                            <td className="py-4 pr-6 text-right space-x-1">
                                <button onClick={() => handleOpenPreview(item)} title="Pratinjau PDF" className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition inline-flex items-center justify-center"><svg className="w-5 h-5" fill="currentColor" viewBox="0 -960 960 960"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm0 160q-139 0-251.5-76.5T40-500q61-125 173.5-201.5T480-778q139 0 251.5 76.5T920-500q-61 125-173.5 201.5T480-240Z"/></svg></button>
                                <button onClick={() => handleCopyData(item)} title="Salin/Duplikat Data" className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition inline-flex items-center justify-center"><svg className="w-5 h-5" fill="currentColor" viewBox="0 -960 960 960"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Z"/></svg></button>
                                <button onClick={() => handleEdit(item)} title="Ubah Data" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition inline-flex items-center justify-center"><svg className="w-5 h-5" fill="currentColor" viewBox="0 -960 960 960"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Z"/></svg></button>
                                <button onClick={() => handleDelete(item.id)} title="Hapus Dokumen" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition inline-flex items-center justify-center"><svg className="w-5 h-5" fill="currentColor" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/></svg></button>
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
            </>
        )}
    </div>
  );
})()}

      {/* 2. HALAMAN FORM INPUT */}
      {viewMode === 'form' && (
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8">
            <div className="flex justify-between items-center pb-6 border-b border-gray-100 mb-6">
                <h3 className="text-xl font-bold text-gray-800">{isEditing ? '✏️ Ubah Data Informasi Surat' : '✨ Buat Form Surat Baru'}</h3>
                <button onClick={handleBackToTable} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl">Kembali</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={labelStyle}>Jenis / Tipe Surat *</label>
                    <select className={inputStyle} value={currentLetter.letter_type} 
                        onChange={(e) => {
                            const newType = e.target.value;
                            const currentCount = parseInt(currentLetter.letter_number.split('/')[0]) || 1;
                            setCurrentLetter({ ...currentLetter, letter_type: newType, letter_number: generateLetterNumber(currentCount, newType, currentLetter.letter_date) });
                        }}
                    >
                        <option value="GENERAL">✉️ SURAT UMUM (GENERAL)</option>
                        <option value="INVOICE">🧾 SURAT TAGIHAN (INVOICE)</option>
                    </select>
                </div>
                <div>
                    <label className={labelStyle}>Nomor Surat *</label>
                    <input 
                      type="text" 
                      required 
                      readOnly
                      className={`${inputStyle} font-mono text-indigo-600 bg-gray-100 cursor-not-allowed`} 
                      value={currentLetter.letter_number} 
                      onChange={(e) => setCurrentLetter({...currentLetter, letter_number: e.target.value})} 
                    />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className={labelStyle}>Client *</label>
                    <select required className={inputStyle} value={currentLetter.client_id} onChange={(e) => setCurrentLetter({...currentLetter, client_id: e.target.value})}>
                        <option value="">-- Pilih --</option>
                        {clients.map((client) => (<option key={client.id} value={client.id}>{client.name}</option>))}
                    </select>
                </div>
                <div>
                    <label className={labelStyle}>Kota Tempat Dibuat</label>
                    <input type="text" className={inputStyle} value={currentLetter.letter_location} onChange={(e) => setCurrentLetter({...currentLetter, letter_location: e.target.value})} />
                </div>
                <div>
                    <label className={labelStyle}>Tanggal Surat *</label>
                    <input type="date" required className={inputStyle} value={currentLetter.letter_date} onChange={(e) => setCurrentLetter({...currentLetter, letter_date: e.target.value})} />
                </div>
              </div>

              <div>
                  <label className={labelStyle}>Penerima / Instansi Tujuan *</label>
                  <input type="text" required className={inputStyle} value={currentLetter.recipient} onChange={(e) => setCurrentLetter({...currentLetter, recipient: e.target.value})} />
              </div> 

              <div>
                  <label className={labelStyle}>Perihal / Hal Surat *</label>
                  <input type="text" required className={inputStyle} value={currentLetter.subject || ''} onChange={(e) => setCurrentLetter({...currentLetter, subject: e.target.value})} />
              </div>
              <div>
                  <label className={labelStyle}>Deskripsi Teks Pembuka Surat *</label>
                  <ReactQuill theme="snow" modules={sharedModules} value={currentLetter.description || ''} onChange={(content) => setCurrentLetter({...currentLetter, description: content})} />
              </div>

              {currentLetter.letter_type === 'INVOICE' && (
                <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200/70 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-amber-900">🧾 Detail Item Biaya Tagihan (Invoice Table)</h4>
                    <button type="button" onClick={addInvoiceRow} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold">➕ Tambah Baris</button>
                  </div>
                  
                  <table className="w-full text-sm bg-white border rounded-xl overflow-hidden shadow-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-700 font-bold text-xs border-b">
                        <th className="p-3 text-center w-12">No</th>
                        <th className="p-3">Nama Deskripsi Item</th>
                        <th className="p-3 w-48">Jumlah Biaya (Rp)</th>
                        <th className="p-3 text-center w-16">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {currentLetter.invoice_items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2 text-center font-bold text-gray-400">{idx + 1}</td>
                          <td className="p-2"><input type="text" required={currentLetter.letter_type === 'INVOICE'} className="w-full border rounded p-1.5 text-sm" value={item.item_name} onChange={(e) => handleInvoiceItemChange(idx, 'item_name', e.target.value)} /></td>
                          <td className="p-2"><input type="number" required={currentLetter.letter_type === 'INVOICE'} className="w-full border rounded p-1.5 text-sm font-mono text-right" value={item.amount || ''} onChange={(e) => handleInvoiceItemChange(idx, 'amount', e.target.value)} /></td>
                          <td className="p-2 text-center">
                            <button type="button" disabled={currentLetter.invoice_items.length === 1} onClick={() => removeInvoiceRow(idx)} className="text-red-500 disabled:opacity-30">❌</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex flex-col items-end gap-1 text-xs font-semibold p-4 bg-white rounded-xl border">
                    <div>SUB TOTAL: <span className="font-mono text-sm ml-2">{formatRupiah(activeCalc.subtotal)}</span></div>
                    <div>PPN 11%: <span className="font-mono text-sm ml-2">{formatRupiah(activeCalc.ppn)}</span></div>
                    <div className="text-indigo-600 pt-1.5 border-t w-full text-right font-bold text-sm">TOTAL KESELURUHAN: <span className="font-mono ml-2 text-base">{formatRupiah(activeCalc.total)}</span></div>
                    <div className="text-gray-400 italic font-medium w-full text-right mt-1">Terbilang: "{activeCalc.terbilang}"</div>
                  </div>
                </div>
              )}

               <div>
                  <label className={labelStyle}>Deskripsi Teks Penutup Surat *</label>
                  <ReactQuill theme="snow" modules={sharedModules} value={currentLetter.description_closing || ''} onChange={(content) => setCurrentLetter({...currentLetter, description_closing: content})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                      <label className={labelStyle}>Lampiran</label>
                      <input type="text" className={inputStyle} value={currentLetter.attachment || ''} onChange={(e) => setCurrentLetter({...currentLetter, attachment: e.target.value})} />
                  </div>
                  <div>
                      <label className={labelStyle}>Nama Penandatangan</label>
                      <input type="text" className={inputStyle} value={currentLetter.signer_name || ''} onChange={(e) => setCurrentLetter({...currentLetter, signer_name: e.target.value})} />
                  </div>
                  <div>
                      <label className={labelStyle}>Jabatan</label>
                      <input type="text" className={inputStyle} value={currentLetter.signer_position || ''} onChange={(e) => setCurrentLetter({...currentLetter, signer_position: e.target.value})} />
                  </div>
              </div>

              <div className="flex justify-end gap-3">
                  <button type="button" onClick={handleBackToTable} className="px-5 py-2.5 text-gray-600 bg-gray-100 rounded-xl">Batal</button>
                  <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl">Simpan & Arsipkan</button>
              </div>
            </form>
        </div>
      )}

      {/* 3. MODAL PREVIEW PDF */}
      {previewLetter && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex justify-center items-stretch p-0">
          <div className="w-full h-full flex flex-col lg:flex-row">
            
            {/* Area Konten Kiri (Scrollable Preview) */}
            <div className="flex-1 bg-slate-950 p-6 overflow-y-auto flex flex-col items-center gap-8">
              
              <style>{`
                .editable-preview-area .ql-toolbar.ql-snow { 
                  display: ${isGeneratingPDF ? 'none !important' : 'block'}; 
                  margin-bottom: 4px; 
                }
                .editable-preview-area .ql-container.ql-snow { border: none !important; }
                
                .editable-preview-area .ql-editor,
                .editable-preview-area .ql-editor *,
                .editable-preview-area .ql-editor p,
                .editable-preview-area .ql-editor span,
                .editable-preview-area .ql-editor li,
                .editable-preview-area .ql-editor div {
                  line-height: ${docLineSpacing} !important;
                }

                .editable-preview-area .ql-editor p,
                .editable-preview-area .ql-editor div {
                  margin-bottom: ${parseFloat(docLineSpacing) * 4}px !important;
                  text-align: justify !important;
                }
                
                .editable-preview-area .ql-editor { 
                  padding: 0 !important; 
                  font-size: 14px !important; 
                  color: #000000 !important; 
                }
              `}</style>

              {/* ==================== HALAMAN 1: SURAT UTAMA / INVOICE ==================== */}
              <div id="page-1" className="pdf-page bg-white relative text-black shrink-0 shadow-2xl" style={{ width: "794px", height: "1122px", boxSizing: "border-box" }}>
                <img src={`${window.location.origin}/crop2026.png`} crossOrigin="anonymous" className="bg-letterhead-img absolute top-0 left-0 w-[794px] h-[1122px] z-0 pointer-events-none select-none" alt="Kop Surat" />

                <div className="relative z-10 w-full h-full box-border pt-[105px] pr-[90px] pb-[60px] pl-[95px] text-[14px] block">
                  
                  {/* Header Meta & Penerima */}
                  <table className="w-full border-collapse mb-2 text-[14px] leading-tight">
                    <tbody>
                      <tr>
                        <td className="py-0.5" style={{ width: "85px" }}>Nomor</td>
                        <td className="py-0.5" style={{ width: "15px" }}>:</td>
                        <td className="py-0.5 font-mono">{previewLetter.letter_number}</td>
                        <td className="py-0.5 text-right">{previewLetter.letter_location || 'Bandung'}, {formatDateLong(previewLetter.letter_date)}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5">Lampiran</td>
                        <td>:</td>
                        <td colSpan={2} className="py-0.5">{previewLetter.attachment && previewLetter.attachment !== '-'  ? `${previewLetter.attachment} set` : '-'}</td>
                      </tr>
                      
                      <tr><td colSpan={4} className="h-3"></td></tr>
                      <tr><td colSpan={4} className="py-0.5">Kepada Yth.</td></tr>
                      <tr><td colSpan={4} className="font-bold py-0.5 text-black">{previewLetter.recipient}</td></tr>
                      <tr><td colSpan={4} className="py-0.5">{previewLetter.client_address}</td></tr>


                      {/* Spacer / Jarak buatan sebelum Baris Perihal */}
                      <tr><td colSpan={4} className="h-4"></td></tr>
                      
                      <tr>
                        <td className="py-0.5">Perihal</td>
                        <td>:</td>
                        <td colSpan={2} className="font-bold py-0.5">{previewLetter.subject}</td>
                      </tr>

                    </tbody>
                  </table>

                  {/* Teks Deskripsi Pembuka */}
                  <div className="editable-preview-area mt-4 mb-4">
                    <ReactQuill theme="snow" modules={sharedModules} value={previewLetter.description || ''} onChange={(content) => setPreviewLetter({...previewLetter, description: content})} />
                  </div>

                  {/* Tabel Berdasarkan Gambar */}
                  {previewLetter.letter_type === 'INVOICE' && previewLetter.invoice_items && (() => {
                    const page1Calc = calculateInvoiceData(previewLetter.invoice_items);
                    return (
                      <div className="mt-2 w-full mb-4">
                        <table className="w-full text-[14px] border-collapse" style={{ border: '1px solid #000000' }}>
                          <thead>
                            <tr className="bg-gray-50 font-bold text-black">
                              <th style={{ border: '1px solid #000000', width: '10%', padding: '8px', textAlign: 'center' }}>NO</th>
                              <th style={{ border: '1px solid #000000', padding: '8px', textAlign: 'left' }}>KETERANGAN</th>
                              <th style={{ border: '1px solid #000000', width: '30%', padding: '8px', textAlign: 'center' }}>JUMLAH (Rp)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewLetter.invoice_items.map((item, idx) => (
                              <tr key={idx}>
                                <td style={{ border: '1px solid #000000', padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                                <td style={{ border: '1px solid #000000', padding: '8px' }}>{item.item_name || '-'}</td>
                                <td style={{ border: '1px solid #000000', padding: '8px', textAlign: 'right', fontClassName: 'monospace' }}>
                                  Rp{formatRupiah(item.amount || 0)}
                                </td>
                              </tr>
                            ))}
                            <tr>
                              <td colSpan={2} style={{ border: '1px solid #000000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>SUB TOTAL</td>
                              <td style={{ border: '1px solid #000000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Rp{formatRupiah(page1Calc.subtotal)}</td>
                            </tr>
                            <tr>
                              <td colSpan={2} style={{ border: '1px solid #000000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>PPN 11%</td>
                              <td style={{ border: '1px solid #000000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Rp{formatRupiah(page1Calc.ppn)}</td>
                            </tr>
                            <tr>
                              <td colSpan={2} style={{ border: '1px solid #000000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>TOTAL KESELURUHAN</td>
                              <td style={{ border: '1px solid #000000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Rp{formatRupiah(page1Calc.total)}</td>
                            </tr>
                            <tr>
                              <td colSpan={3} style={{ border: '1px solid #000000', padding: '8px', textAlign: 'left' }}>
                                <strong>Terbilang:</strong> <em>"{page1Calc.terbilang}"</em>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}

                  {/* Teks Catatan / Penutup */}
                  <div className="editable-preview-area mt-4 mb-4">
                     
                    <ReactQuill theme="snow" modules={sharedModules} value={previewLetter.description_closing || ''} onChange={(content) => setPreviewLetter({...previewLetter, description_closing: content})} />
                  </div>
                  
                  {/* Bagian Tanda Tangan Halaman 1 */}
                  <div className="flex justify-start text-[14px] mt-6">
                    <div className="text-left" style={{ minWidth: '220px' }}>
                      <div className="text-black mb-0.5">Hormat kami,</div>
                      <div className="h-[75px] flex items-center justify-start"></div>
                      <div className="font-bold underline text-black">{previewLetter.signer_name || '-'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{previewLetter.signer_position || '-'}</div>
                    </div>
                  </div>

                </div>
              </div>

              {/* ==================== HALAMAN 2: LEMBAR KWITANSI ==================== */}
              {/* Syarat Diperbarui: Hanya muncul jika bertipe INVOICE DAN nilai lampiran/attachment bernilai "1" */}
              {previewLetter.letter_type === 'INVOICE' && String(previewLetter.attachment).trim() === '1' && (
                <div id="page-2" className="pdf-page bg-white relative text-black shrink-0 shadow-2xl" style={{ width: "794px", height: "1122px", boxSizing: "border-box" }}>
                  <img src={`${window.location.origin}/crop2026.png`} crossOrigin="anonymous" className="bg-letterhead-img absolute top-0 left-0 w-[794px] h-[1122px] z-0 pointer-events-none select-none" alt="Kop Surat" />

                  <div className="relative z-10 w-full h-full box-border pt-[115px] pr-[90px] pb-[60px] pl-[95px] text-[14px] block">
                    
                    {/* Judul Kwitansi */}
                    <div className="text-center mb-8">
                      <h2 className="text-xl font-bold tracking-widest text-black uppercase border-b-2 border-black inline-block pb-1">Kwitansi Pembayaran</h2>
                      <div className="text-xs font-mono text-gray-500 mt-1">No: {previewLetter.letter_number}/KW</div>
                    </div>

                    {/* Form Isian Lembar Kwitansi */}
                    {(() => {
                      const pCalc = calculateInvoiceData(previewLetter.invoice_items);
                      return (
                        <div className="space-y-4 bg-gray-50/50 p-6 rounded-xl border border-gray-200 mb-6">
                          <table className="w-full text-[14px] border-collapse">
                            <tbody>
                              <tr className="align-top">
                                <td className="py-2.5 text-gray-600 uppercase tracking-wider text-xs font-bold" style={{ width: "160px" }}>Telah Terima Dari</td>
                                <td className="py-2.5" style={{ width: "20px" }}>:</td>
                                <td className="py-2.5 font-bold text-gray-900 border-b border-dashed border-gray-300">
                                  {previewLetter.recipient}
                                </td>
                              </tr>
                              <tr className="align-top">
                                <td className="py-2.5 text-gray-600 uppercase tracking-wider text-xs font-bold">Uang Sejumlah</td>
                                <td>:</td>
                                <td className="py-2.5 italic text-gray-800 font-medium bg-white px-1 py-2 rounded border border-gray-100 shadow-sm leading-relaxed">
                                  "{pCalc.terbilang}"
                                </td>
                              </tr>
                              <tr className="align-top">
                                <td className="py-2.5 text-gray-600 uppercase tracking-wider text-xs font-bold">Untuk Pembayaran</td>
                                <td>:</td>
                                <td className="py-2.5 text-gray-800 border-b border-dashed border-gray-300">
                                  {/* Filter penghilang kata PERMOHONAN secara bersih */}
                                  {previewLetter.subject ? previewLetter.subject.replace(/PERMOHONAN\s*/gi, '').replace(/\s+/g, ' ').trim() : '-'}
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Badge Nominal Besar */}
                          <div className="mt-8 pt-4 flex items-center justify-between">
                            <div className="inline-flex items-center gap-4 bg-orange-50 border-2 border-orange-500 px-6 py-3 rounded-xl shadow-inner">
                              <span className="font-mono text-xs font-bold text-orange-700 tracking-wider uppercase">Jumlah Terbayar</span>
                              <span className="font-mono text-xl font-black text-orange-900">
                                Rp. {formatRupiah(pCalc.total)}
                              </span>
                            </div>
                            
                            <div className="text-right text-xs text-gray-500 font-medium italic">
                              {previewLetter.letter_location || 'Bandung'}, {formatDateLong(previewLetter.letter_date)}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Bagian Tanda Tangan Kwitansi */}
                    <div className="flex justify-start text-[14px] mt-6">
                      <div className="text-left" style={{ minWidth: '220px' }}>
                        <div className="text-black mb-0.5">Hormat kami,</div>
                        <div className="h-[85px] flex items-center justify-start"></div>
                        <div className="font-bold underline text-black">{previewLetter.signer_name || '-'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{previewLetter.signer_position || '-'}</div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ==================== HALAMAN 3: PENAMPIL FILE PDF DARI FOLDER PUBLIC ==================== */}
              {/* Syarat: Hanya muncul jika bertipe INVOICE DAN memiliki lampiran/attachment bernilai "1" */}
              {previewLetter.letter_type === 'INVOICE' && String(previewLetter.attachment).trim() === '1' && (
                <div id="page-2" className="pdf-page bg-white relative text-black shrink-0 shadow-2xl overflow-hidden" style={{ width: "794px", height: "1122px", boxSizing: "border-box" }}>
                  
                  {/* Menggunakan iframe: Path folder public langsung dimulai dari '/' */}
                  <iframe 
                    src="/npwp_crop.pdf#toolbar=0&navpanes=0&scrollbar=0" 
                    title="Lampiran NPWP"
                    className="w-full h-full border-none"
                    style={{ width: "794px", height: "1122px" }}
                  />

                </div>
              )}

              {/* ==================== HALAMAN 4: PENAMPIL FILE REF BANK ==================== */}
              {/* Syarat: Hanya muncul jika bertipe INVOICE DAN memiliki lampiran/attachment bernilai "1" */}
              {previewLetter.letter_type === 'INVOICE' && String(previewLetter.attachment).trim() === '1' && (
                <div id="page-2" className="pdf-page bg-white relative text-black shrink-0 shadow-2xl overflow-hidden" style={{ width: "794px", height: "1122px", boxSizing: "border-box" }}>
                  
                  {/* Menggunakan iframe: Path folder public langsung dimulai dari '/' */}
                  <iframe 
                    src="/ref_bank_crop.pdf.pdf#toolbar=0&navpanes=0&scrollbar=0" 
                    title="Lampiran Ref Bank "
                    className="w-full h-full border-none"
                    style={{ width: "794px", height: "1122px" }}
                  />

                </div>
              )}
            </div>

            {/* Sidebar Kontrol Preview Kanan */}
            <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-6 flex flex-col justify-between shrink-0">
              <div className="space-y-6">
                <div>
                  <h4 className="text-white font-bold text-lg">Pratinjau Dokumen Resmi</h4>
                  <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-800">
                    {previewLetter.letter_type === 'INVOICE' && String(previewLetter.attachment).trim() === '1' ? 'Format 2 Halaman Aktif' : 'Format 1 Halaman Aktif'}
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
                <button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition">
                  💾 Simpan Perubahan Review
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
        </div>
      )}

    </div>
  );
};

export default Letter;
 