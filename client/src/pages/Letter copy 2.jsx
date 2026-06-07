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
  
  const [viewMode, setViewMode] = useState('table'); 
  const [isEditing, setIsEditing] = useState(false);

  const [previewLetter, setPreviewLetter] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [docLineSpacing, setDocLineSpacing] = useState('1.6');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState('');

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
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Surat & Invoice</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Kelola arsip surat, log penomoran, dan invoice.</p>
                </div>
                <button onClick={handleAddNew} className="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-500/30">
                   
                <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                 Buat Surat
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-gray-50/50 p-3 sm:p-4 rounded-xl border border-gray-100">
                <input type="text" placeholder="Cari nomor, perihal, penerima..." className="w-full pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <select 
                  className="w-full sm:w-48 py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer shadow-sm focus:border-indigo-500 transition"
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
              >
                  <option value="">Semua Tipe</option>
                  <option value="GENERAL">✉️ SURAT UMUM</option>
                  <option value="INVOICE">🧾 INVOICE</option>
              </select>
                <select className="w-full sm:w-64 py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer shadow-sm focus:border-indigo-500 transition" value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
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
                {/* TAMPILAN MOBILE LIST */}
                <div className="block md:hidden space-y-3">
                  {filteredLetters.map((item) => (
                    <div key={item.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-indigo-100 transition">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${item.letter_type === 'INVOICE' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-700/10'}`}>
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
                      
                      {/* MODIFIKASI TOMBOL AKSI MOBILE - TAMBAH TOMBOL COPY */}
                      <div className="flex justify-end gap-1.5 mt-3 border-t border-gray-100 pt-2.5">
                        <button onClick={() => handleOpenPreview(item)} title="Lihat" className="p-2 text-sm bg-gray-50 hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 rounded-lg transition flex-1 flex justify-center">👁️</button>
                        <button onClick={() => handleEdit(item)} title="Ubah" className="p-2 text-sm bg-gray-50 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 rounded-lg transition flex-1 flex justify-center">✏️</button>
                        <button onClick={() => handleCopyData(item)} title="Salin/Copy Data" className="p-2 text-sm bg-gray-50 hover:bg-amber-50 text-gray-500 hover:text-amber-600 rounded-lg transition flex-1 flex justify-center">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 -960 960 960"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
                        </button>
                        <button onClick={() => handleDelete(item.id)} title="Hapus" className="p-2 text-sm bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg transition px-3">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* TAMPILAN DESKTOP TABLE */}
                <div className="hidden md:block overflow-hidden border border-gray-100 rounded-xl shadow-sm">
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
                        <tr> 
                            <th className="py-4 px-4">Nomor Surat / Perihal</th>
                            <th className="py-4 px-4">Penerima Tujuan & Client</th> 
                            <th className="py-4 px-4">Tanggal dibuat</th>
                            <th className="py-4 pr-6 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {filteredLetters.map((item) => (
                        <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group"> 
                            <td className="py-4 px-4">
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-semibold text-gray-800">{item.letter_number}</span>
                                    <span className="text-xs text-gray-500 italic">{item.subject || '-'}</span>
                                    <span className={`inline-flex items-center justify-center w-[106px] px-2 py-1 rounded-md text-xs font-semibold ring-1 ring-inset ${
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
                            
                            {/* MODIFIKASI TOMBOL AKSI DESKTOP - TAMBAH TOMBOL COPY */}
                            <td className="py-4 pr-6 text-right space-x-1">
                                <button onClick={() => handleOpenPreview(item)} title="Pratinjau" className="p-2 text-gray-400 hover:text-emerald-600 transition-colors">👁️</button>
                                <button onClick={() => handleEdit(item)} title="Ubah" className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">✏️</button>
                                <button onClick={() => handleCopyData(item)} title="Copy Data ke Baru" className="p-2 text-gray-400 hover:text-amber-600 transition-colors inline-flex items-center justify-center">
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 -960 960 960"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
                                </button>
                                <button onClick={() => handleDelete(item.id)} title="Hapus" className="p-2 text-gray-400 hover:text-red-600 transition-colors">🗑️</button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
              </>
            )}
        </div>
      )}

      {/* 2. HALAMAN FORM INPUT */}
      {viewMode === 'form' && (
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8">
            <div className="flex justify-between items-center pb-6 border-b border-gray-100 mb-6">
                <h3 className="text-xl font-bold text-gray-800">{isEditing ? '✏️ Ubah Data Informasi Surat' : '✨ Buat Form Surat Baru'}</h3>
                <button type="button" onClick={handleBackToTable} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl">Kembali</button>
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
                      <label className={labelStyle}>Nama Penandatangan *</label>
                      <input type="text" required className={inputStyle} value={currentLetter.signer_name || ''} onChange={(e) => setCurrentLetter({...currentLetter, signer_name: e.target.value})} />
                  </div>
                  <div>
                      <label className={labelStyle}>Jabatan Penandatangan *</label>
                      <input type="text" required className={inputStyle} value={currentLetter.signer_position || ''} onChange={(e) => setCurrentLetter({...currentLetter, signer_position: e.target.value})} />
                  </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={handleBackToTable} className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">Batal</button>
                  <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition">Simpan ke Database</button>
              </div>
            </form>
        </div>
      )}
    </div>
  );
};

export default Letter;