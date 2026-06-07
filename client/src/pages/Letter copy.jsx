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
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 3000);
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
    const matchesType = filterType === '' || letter.letter_type === filterType;
    
    return matchesSearch && matchesClient && matchesType;
  });

  const handleCopyData = async (item) => {
    if (window.confirm(`Apakah Anda yakin ingin menyalin/copy data surat ${item.letter_number}?`)) {
        try {
            let nextCount = 1;
            const numResponse = await fetch(`${LETTER_URL}/next-number`);
            if (numResponse.ok) {
                const numData = await numResponse.json();
                nextCount = numData.nextCount;
            }

            const todayStr = new Date().toISOString().split('T')[0];
            const autoNumbered = generateLetterNumber(nextCount, item.letter_type, todayStr);

            const copiedData = {
                ...item,
                id: null, 
                letter_number: autoNumbered,
                letter_date: todayStr,
                invoice_items: item.invoice_items.map(inv => ({
                    item_name: inv.item_name,
                    amount: inv.amount
                }))
            };

            const pathRoute = item.letter_type === 'INVOICE' ? 'invoice' : 'general';
            
            const response = await fetch(`${LETTER_URL}/${pathRoute}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(copiedData)
            });

            if (!response.ok) throw new Error('Gagal menyimpan data copy ke database');

            fetchLetters();
            showNotification(`Sukses menyalin data! Nomor surat baru: ${autoNumbered}`, "success");

        } catch (error) {
            console.error("Error copying data:", error);
            showNotification("Gagal menyalin data ke database.", "error");
        }
    }
  };

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

  const paginate = (pageNumber) => {
    const totalPages = Math.ceil(filteredLetters.length / itemsPerPage);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const labelStyle = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5";
  const inputStyle = "w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200";

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
                                  <th className="py-4 px-4 w-12 text-center">No.</th>
                                  <th className="py-4 px-4">Nomor Surat / Perihal</th>
                                  <th className="py-4 px-4">Penerima Tujuan & Client</th> 
                                  <th className="py-4 px-4">Tanggal dibuat</th>
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

                      {/* PANEL NAVIGASI PAGINATION (DISESUAIKAN SEPERTI STRUKTUR MENU) */}
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

      {/* 2. FORM PEMBUATAN / EDIT SURAT */}
      {viewMode === 'form' && (
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
           {/* Konten Form ... (Pertahankan implementasi form bawaan Anda) */}
           <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Ubah Arsip Surat' : 'Buat Format Surat Baru'}</h2>
              <button onClick={handleBackToTable} className="text-sm font-semibold text-gray-500 hover:text-gray-700">✕ Kembali</button>
           </div>
           <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tipe Dokumen Surat *</label>
                    <select 
                      name="letter_type" 
                      value={currentLetter.letter_type} 
                      onChange={(e) => setCurrentLetter({...currentLetter, letter_type: e.target.value})} 
                      className={inputStyle}
                    >
                       <option value="GENERAL">GENERAL (SURAT UMUM)</option>
                       <option value="INVOICE">INVOICE (TAGIHAN AKSES)</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Pilih Relasi Klien *</label>
                    <select 
                      name="client_id" 
                      required 
                      value={currentLetter.client_id} 
                      onChange={(e) => setCurrentLetter({...currentLetter, client_id: e.target.value})} 
                      className={inputStyle}
                    >
                       <option value="">-- Pilih Client --</option>
                       {clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nomor Surat Otomatis *</label>
                    <input type="text" name="letter_number" required value={currentLetter.letter_number} onChange={(e) => setCurrentLetter({...currentLetter, letter_number: e.target.value})} className={inputStyle} />
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tanggal Surat *</label>
                    <input type="date" name="letter_date" required value={currentLetter.letter_date} onChange={(e) => setCurrentLetter({...currentLetter, letter_date: e.target.value})} className={inputStyle} />
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Lokasi Penerbitan Surat</label>
                    <input type="text" name="letter_location" value={currentLetter.letter_location} onChange={(e) => setCurrentLetter({...currentLetter, letter_location: e.target.value})} className={inputStyle} placeholder="Contoh: Jakarta" />
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Penerima (Tujuan Kepada) *</label>
                    <input type="text" name="recipient" required value={currentLetter.recipient} onChange={(e) => setCurrentLetter({...currentLetter, recipient: e.target.value})} className={inputStyle} placeholder="Contoh: Direktur PT. ABC" />
                 </div>
                 <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Perihal / Subject Surat *</label>
                    <input type="text" name="subject" required value={currentLetter.subject} onChange={(e) => setCurrentLetter({...currentLetter, subject: e.target.value})} className={inputStyle} placeholder="Perihal isi surat..." />
                 </div>
              </div>

              {/* Input Dinamis Khusus INVOICE */}
              {currentLetter.letter_type === 'INVOICE' && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Item Rincian Tagihan Invoice</span>
                      <button type="button" onClick={addInvoiceRow} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-3 py-1 rounded-md shadow-xs">＋ Tambah Baris</button>
                   </div>
                   {currentLetter.invoice_items.map((row, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                         <input type="text" placeholder="Nama item / Deskripsi pekerjaan" value={row.item_name} onChange={(e) => handleInvoiceItemChange(idx, 'item_name', e.target.value)} className={`${inputStyle} flex-1`} />
                         <input type="number" placeholder="Jumlah (Rp)" value={row.amount || ''} onChange={(e) => handleInvoiceItemChange(idx, 'amount', e.target.value)} className={`${inputStyle} w-44`} />
                         <button type="button" onClick={() => removeInvoiceRow(idx)} className="p-2.5 text-red-500 bg-white border border-red-200 hover:bg-red-50 rounded-lg">✕</button>
                      </div>
                   ))}
                   <div className="text-right text-xs text-gray-500 pt-1 font-mono">
                      Subtotal: Rp {formatRupiah(activeCalc.subtotal)} | PPN 11%: Rp {formatRupiah(activeCalc.ppn)} | Total: <span className="font-bold text-gray-900">Rp {formatRupiah(activeCalc.total)}</span>
                   </div>
                </div>
              )}

              <div>
                 <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Isi Pembuka / Deskripsi Utama *</label>
                 <ReactQuill theme="snow" value={currentLetter.description} onChange={(val) => setCurrentLetter({...currentLetter, description: val})} modules={sharedModules} className="bg-white rounded-lg" />
              </div>

              <div>
                 <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Isi Penutup / Keterangan Tambahan</label>
                 <ReactQuill theme="snow" value={currentLetter.description_closing} onChange={(val) => setCurrentLetter({...currentLetter, description_closing: val})} modules={sharedModules} className="bg-white rounded-lg" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nama Penandatangan</label>
                    <input type="text" name="signer_name" value={currentLetter.signer_name} onChange={(e) => setCurrentLetter({...currentLetter, signer_name: e.target.value})} className={inputStyle} />
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Jabatan Penandatangan</label>
                    <input type="text" name="signer_position" value={currentLetter.signer_position} onChange={(e) => setCurrentLetter({...currentLetter, signer_position: e.target.value})} className={inputStyle} />
                 </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                 <button type="button" onClick={handleBackToTable} className="px-5 py-2.5 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
                 <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md">Simpan Dokumen</button>
              </div>
           </form>
        </div>
      )}

      {/* 3. MODAL PREVIEW & CETAK DOKUMEN (PREVIEW LETTER) */}
      {previewLetter && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-start justify-center p-2 sm:p-6">
           <div className="bg-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-4 border border-slate-700 flex flex-col md:flex-row h-[90vh]">
              {/* Sisi Kiri: Panel Pengaturan Edit Cepat */}
              <div className="w-full md:w-80 bg-slate-900 p-4 border-b md:border-b-0 md:border-r border-slate-700 text-slate-300 flex flex-col justify-between overflow-y-auto">
                 <div className="space-y-4">
                    <h3 className="font-bold text-white tracking-wide text-sm border-b border-slate-700 pb-2">⚙️ Opsi Sunting Cepat</h3>
                    <div>
                       <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Nomor Dokumen</label>
                       <input type="text" value={previewLetter.letter_number} onChange={(e) => setPreviewLetter({...previewLetter, letter_number: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                       <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Perihal Surat</label>
                       <input type="text" value={previewLetter.subject} onChange={(e) => setPreviewLetter({...previewLetter, subject: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                       <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Jarak Spasi Dokumen</label>
                       <select value={docLineSpacing} onChange={(e) => setDocLineSpacing(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500">
                          <option value="1.2">Kerapatan Sedang (1.2)</option>
                          <option value="1.4">Spasi Normal (1.4)</option>
                          <option value="1.6">Spasi Renggang (1.6)</option>
                          <option value="1.8">Sangat Renggang (1.8)</option>
                       </select>
                    </div>
                    <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-xs text-indigo-200 leading-relaxed">
                       💡 Anda dapat mengubah teks langsung pada halaman dokumen kertas di sebelah kanan sebelum mencetak PDF.
                    </div>
                 </div>
                 <div className="space-y-2 pt-4 border-t border-slate-700 mt-4">
                    <button type="button" onClick={handleSubmit} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20">💾 Simpan Perubahan</button>
                    <button type="button" onClick={handlePrintPDF} disabled={isGeneratingPDF} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5">
                       {isGeneratingPDF ? '⏳ Memproses...' : '📥 Unduh Berkas PDF'}
                    </button>
                    <button type="button" onClick={() => setPreviewLetter(null)} className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium py-2 rounded-xl transition">Tutup Pratinjau</button>
                 </div>
              </div>

              {/* Sisi Kanan: Lembar Kertas A4 Digital */}
              <div className="flex-1 bg-slate-700 p-2 sm:p-6 overflow-y-auto flex justify-center items-start">
                 <div id="capture-pdf-element" className="pdf-page bg-white text-black shadow-2xl relative select-text" style={{ width: '210mm', minHeight: '297mm', padding: '0mm 0mm 20mm 0mm', boxSizing: 'border-box', lineHeight: docLineSpacing }}>
                    
                    {/* Gambar Letterhead */}
                    <div className="w-full border-b-[3px] border-black relative" style={{ height: '42mm' }}>
                       <img src="/letterhead.png" alt="Letterhead" className="bg-letterhead-img w-full h-full object-cover" style={{ display: 'block' }} />
                    </div>

                    {/* Konten Utama Lembar Surat */}
                    <div className="px-[20mm] pt-[8mm] text-[11pt]" style={{ textAlign: 'justify' }}>
                       
                       {/* Lokasi & Tanggal Surat */}
                       <div className="text-right mb-4">
                          <span contentEditable suppressContentEditableWarning onBlur={(e) => setPreviewLetter({...previewLetter, letter_location: e.target.innerText})}>{previewLetter.letter_location || 'Jakarta'}</span>,{' '}
                          <span contentEditable suppressContentEditableWarning onBlur={(e) => setPreviewLetter({...previewLetter, letter_date: e.target.innerText})}>{formatDateLong(previewLetter.letter_date)}</span>
                       </div>

                       {/* Detail Meta Dokumen */}
                       <div className="grid grid-cols-[22mm_3mm_1fr] gap-y-1 mb-6">
                          <div>Nomor</div><div>:</div><div contentEditable suppressContentEditableWarning onBlur={(e) => setPreviewLetter({...previewLetter, letter_number: e.target.innerText})} className="font-bold">{previewLetter.letter_number}</div>
                          <div>Lampiran</div><div>:</div><div contentEditable suppressContentEditableWarning onBlur={(e) => setPreviewLetter({...previewLetter, attachment: e.target.innerText})}>{previewLetter.attachment || '-'}</div>
                          <div>Perihal</div><div>:</div><div contentEditable suppressContentEditableWarning onBlur={(e) => setPreviewLetter({...previewLetter, subject: e.target.innerText})} className="font-semibold underline">{previewLetter.subject}</div>
                       </div>

                       {/* Alamat Penerima */}
                       <div className="mb-6 leading-normal">
                          <div className="font-medium">Kepada Yth.</div>
                          <div contentEditable suppressContentEditableWarning onBlur={(e) => setPreviewLetter({...previewLetter, recipient: e.target.innerText})} className="font-bold">{previewLetter.recipient}</div>
                          <div>Di Tempat</div>
                       </div>

                       {/* Isi Pembuka / Deskripsi Utama */}
                       <div className="mb-6 rounded focus:outline-dashed focus:outline-1 focus:outline-indigo-500/50 p-1">
                          <ReactQuill theme="bubble" value={previewLetter.description} onChange={(content) => setPreviewLetter({...previewLetter, description: content})} />
                       </div>

                       {/* Blok Dinamis Rincian Tabel Jika Berjenis INVOICE */}
                       {previewLetter.letter_type === 'INVOICE' && (() => {
                          const calc = calculateInvoiceData(previewLetter.invoice_items);
                          return (
                            <div className="mb-6 mt-4">
                               <table className="w-full border-collapse text-[10pt] border border-black">
                                  <thead>
                                     <tr className="bg-slate-100/80 border-b border-black text-center font-bold">
                                        <th className="py-2 px-3 border-r border-black w-10">No</th>
                                        <th className="py-2 px-3 border-r border-black text-left">Deskripsi Pekerjaan / Rincian Item</th>
                                        <th className="py-2 px-3 w-36 text-right">Jumlah (IDR)</th>
                                     </tr>
                                  </thead>
                                  <tbody>
                                     {previewLetter.invoice_items?.map((row, rIdx) => (
                                        <tr key={rIdx} className="border-b border-black">
                                           <td className="py-1.5 px-3 border-r border-black text-center">{rIdx + 1}</td>
                                           <td className="py-1.5 px-3 border-r border-black">{row.item_name || '-'}</td>
                                           <td className="py-1.5 px-3 text-right font-mono">{formatRupiah(row.amount)}</td>
                                        </tr>
                                     ))}
                                     <tr className="font-semibold border-b border-black">
                                        <td colSpan="2" className="py-1.5 px-3 text-right border-r border-black bg-slate-50">Subtotal :</td>
                                        <td className="py-1.5 px-3 text-right font-mono bg-slate-50">Rp {formatRupiah(calc.subtotal)}</td>
                                     </tr>
                                     <tr className="font-semibold border-b border-black">
                                        <td colSpan="2" className="py-1.5 px-3 text-right border-r border-black bg-slate-50">PPN (11%) :</td>
                                        <td className="py-1.5 px-3 text-right font-mono bg-slate-50">Rp {formatRupiah(calc.ppn)}</td>
                                     </tr>
                                     <tr className="font-bold bg-slate-100">
                                        <td colSpan="2" className="py-2 px-3 text-right border-r border-black uppercase tracking-wide">Total Pembayaran :</td>
                                        <td className="py-2 px-3 text-right font-mono text-indigo-900">Rp {formatRupiah(calc.total)}</td>
                                     </tr>
                                  </tbody>
                               </table>
                               <div className="mt-2 text-[9.5pt] italic leading-relaxed text-gray-700">
                                  <b>Terbilang:</b> "# {calc.terbilang} #"
                               </div>
                            </div>
                          );
                       })()}

                       {/* Isi Penutup / Keterangan Tambahan */}
                       <div className="mb-8 rounded focus:outline-dashed focus:outline-1 focus:outline-indigo-500/50 p-1">
                          <ReactQuill theme="bubble" value={previewLetter.description_closing} onChange={(content) => setPreviewLetter({...previewLetter, description_closing: content})} />
                       </div>

                       {/* Tanda Tangan Dokumen */}
                       <div className="grid grid-cols-2 mt-8">
                          <div></div>
                          <div className="text-center leading-normal">
                             <div className="font-semibold mb-16">
                                <div contentEditable suppressContentEditableWarning onBlur={(e) => setPreviewLetter({...previewLetter, signer_position: e.target.innerText})}>{previewLetter.signer_position || 'Hormat Kami,'}</div>
                             </div>
                             <div contentEditable suppressContentEditableWarning onBlur={(e) => setPreviewLetter({...previewLetter, signer_name: e.target.innerText})} className="font-bold underline text-[11.5pt]">{previewLetter.signer_name || 'Nama Penandatangan'}</div>
                          </div>
                       </div>

                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Letter;