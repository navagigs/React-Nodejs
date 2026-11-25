import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Image as ImageIcon, Pencil, QrCode, RotateCcw, Trash2, UploadCloud } from 'lucide-react';
import { BASE_IMAGE_URL, QR_CODE_URL } from '../Api';
import TableExports from '../TableExports';
import PageSizeSelect from '../PageSizeSelect';
import { useTablePagination } from '../tablePagination';
import { useMenuPermission } from '../permissions';
import FeaturePageHeader from '../components/layout/FeaturePageHeader';

const getCurrentUserId = () => {
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    if (!user) return null;
    return user.id || user.user_id || null;
  } catch {
    return null;
  }
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('id-ID');
};

const QrCodeGenerator = () => {
  const access = useMenuPermission('/qr-code');
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const rowCanvasRefs = useRef({});
  const [text, setText] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [size, setSize] = useState(325);
  const [useCenterImage, setUseCenterImage] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [savedImage, setSavedImage] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [records, setRecords] = useState([]);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    currentItems,
    indexOfFirstItem,
    indexOfLastItem,
    totalPages
  } = useTablePagination(records);

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const objectUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ''), [imageFile]);
  const activeImageUrl = objectUrl || (savedImage && !removeImage ? `${BASE_IMAGE_URL}${savedImage}` : '');
  const withImage = useCenterImage && !!activeImageUrl && imageLoaded;

  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  useEffect(() => {
    if (!useCenterImage || !activeImageUrl) return undefined;
    const image = new Image();
    image.onload = () => setImageLoaded(true);
    image.onerror = () => setImageLoaded(false);
    image.src = activeImageUrl;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [activeImageUrl, useCenterImage]);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 3000);
  }, []);

  const fetchRecords = useCallback(async () => {
    if (!access.canView) return;
    setLoading(true);
    try {
      const response = await fetch(QR_CODE_URL);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Gagal memuat data QR');
      setRecords(Array.isArray(result) ? result : []);
    } catch (error) {
      showNotification(error.message || 'Gagal memuat data QR', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification, access.canView]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords, access.canView]);

  const handleGenerate = (event) => {
    event.preventDefault();
    if (!access.canCreate) return;
    if (!text.trim()) {
      showNotification('Teks QR wajib diisi', 'error');
      return;
    }
    if (useCenterImage && !activeImageUrl) {
      showNotification('Pilih gambar untuk bagian tengah QR', 'error');
      return;
    }
    setGeneratedText(text.trim());
  };

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      showNotification('File harus berupa gambar', 'error');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showNotification('Ukuran gambar maksimal 2 MB', 'error');
      event.target.value = '';
      return;
    }
    setImageFile(file);
    setRemoveImage(false);
    setImageLoaded(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setRemoveImage(true);
    setImageLoaded(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = () => {
    if (!access.canExport) return;
    const canvas = canvasRef.current;
    if (!canvas || !generatedText) return;
    const link = document.createElement('a');
    link.download = `qrcode-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleDownloadRecord = (record) => {
    if (!access.canExport) return;
    const canvas = rowCanvasRefs.current[record.id];
    if (!canvas) return;
    try {
      const link = document.createElement('a');
      link.download = `qrcode-${record.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      showNotification('Gagal mengunduh QR code', 'error');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setText('');
    setGeneratedText('');
    setSize(325);
    setUseCenterImage(false);
    setSavedImage('');
    setRemoveImage(false);
    setImageFile(null);
    setImageLoaded(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (record) => {
    if (!access.canEdit) return;
    setEditingId(record.id);
    setText(record.qr_text || '');
    setGeneratedText(record.qr_text || '');
    setSize(Number(record.size) || 325);
    setUseCenterImage(!!record.image);
    setSavedImage(record.image || '');
    setRemoveImage(false);
    setImageFile(null);
    setImageLoaded(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (editingId ? !access.canEdit : !access.canCreate) return;
    if (!text.trim()) {
      showNotification('Teks QR wajib diisi', 'error');
      return;
    }
    if (useCenterImage && !activeImageUrl) {
      showNotification('Pilih gambar untuk bagian tengah QR', 'error');
      return;
    }

    setSaving(true);
    const payload = new FormData();
    payload.append('qr_text', text.trim());
    payload.append('size', String(size));
    payload.append('level', useCenterImage ? 'H' : 'M');
    if (imageFile) payload.append('image', imageFile);
    if (removeImage) payload.append('remove_image', '1');
    const user = getCurrentUserId();
    if (editingId) payload.append('updated_by', user || '');
    else payload.append('created_by', user || '');

    try {
      const response = await fetch(editingId ? `${QR_CODE_URL}/${editingId}` : QR_CODE_URL, {
        method: editingId ? 'PUT' : 'POST',
        body: payload
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Gagal menyimpan QR code');
      if (result.data) {
        setEditingId(result.data.id);
        setGeneratedText(result.data.qr_text);
        setSavedImage(result.data.image || '');
        setRemoveImage(false);
        setImageFile(null);
        setImageLoaded(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      showNotification(result.message || 'QR code berhasil disimpan');
      await fetchRecords();
    } catch (error) {
      showNotification(error.message || 'Terjadi kesalahan saat menyimpan QR code', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!access.canDelete) return;
    if (!window.confirm('Hapus QR code ini?')) return;
    setSaving(true);
    try {
      const response = await fetch(`${QR_CODE_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updated_by: getCurrentUserId() })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Gagal menghapus QR code');
      showNotification(result.message || 'QR code berhasil dihapus');
      if (editingId === id) resetForm();
      await fetchRecords();
    } catch (error) {
      showNotification(error.message || 'Terjadi kesalahan saat menghapus QR code', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = 'w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200 placeholder-gray-400 resize-none';
  const labelStyle = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5';
  const smallButton = 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors';
  const canModifyForm = editingId ? access.canEdit : access.canCreate;

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
    <div className="app-page space-y-5">
      <FeaturePageHeader
        title="Pembuat Kode QR"
        subtitle="Buat dan kelola kode QR"
        actions={
          <>
            <TableExports
              menuUrl="/qr-code"
              title="Data QR"
              filename="data-qr-code"
              columns={[
                { label: 'Nomor', key: 'no', width: 1 },
                { label: 'Isi QRCode', key: 'text', width: 8 },
                { label: 'Diperbarui', key: 'updated', width: 3 },
                { label: 'Unduh Kode QR', key: 'download', width: 3 }
              ]}
              rows={currentItems.map((record, index) => ({
                no: indexOfFirstItem + index + 1,
                text: record.qr_text || '-',
                updated: formatDate(record.updated_at || record.created_at),
                download: record.image ? 'Tersedia' : '-'
              }))}
            />
            {access.canExport && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={!generatedText}
                className="app-button app-button-primary"
              >
                <Download className="w-5 h-5" />
                Download PNG
              </button>
            )}
          </>
        }
      />
      {notification.show && (
        <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 transition-all duration-300 ${
          notification.type === 'success' ? 'bg-white border-l-4 border-green-500 text-gray-800' : 'bg-white border-l-4 border-red-500 text-gray-800'
        }`}>
          <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {notification.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            )}
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900">{notification.type === 'success' ? 'Berhasil' : 'Gagal'}</h4>
            <p className="text-sm text-gray-500">{notification.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="app-card app-card-padded">
        <h2 className="mb-4 text-sm font-bold text-slate-800">Filter Kode QR</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div>
              <label htmlFor="qr-text" className={labelStyle}>Teks atau URL</label>
              <textarea
                id="qr-text"
                rows={4}
                value={text}
                onChange={(event) => setText(event.target.value)}
                disabled={!canModifyForm}
                className={inputStyle}
                placeholder="Contoh: https://example.com atau teks apa saja"
              />
              <p className="text-xs text-gray-400 mt-1.5">Data yang disimpan di QR dan di database.</p>
            </div>

            <div>
              <label htmlFor="qr-size" className={labelStyle}>Ukuran QR: {size} px</label>
              <input
                id="qr-size"
                type="range"
                min="200"
                max="512"
                step="1"
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
                disabled={!canModifyForm}
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="rounded-xl border border-gray-100 bg-slate-50/70 p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCenterImage}
                  onChange={(event) => {
                    setUseCenterImage(event.target.checked);
                    setImageLoaded(false);
                  }}
                  disabled={!canModifyForm}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-sm font-semibold text-gray-700">Gunakan gambar di tengah QR</span>
              </label>

              {useCenterImage && (
                <div className="mt-4 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-white">
                  <div className="w-20 h-20 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden mb-3">
                    {activeImageUrl ? (
                      <img src={activeImageUrl} alt="Preview gambar tengah" className="max-w-full max-h-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="w-7 h-7 text-gray-300" />
                    )}
                  </div>
                  {canModifyForm && (
                    <>
                      <label htmlFor="qr-center-image" className="cursor-pointer inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                        <UploadCloud className="w-4 h-4" />
                        Pilih gambar
                      </label>
                      <input
                        id="qr-center-image"
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <p className="text-xs text-gray-400 mt-2">Format gambar, maksimal 2 MB. Boleh kosong untuk QR tanpa gambar.</p>
                    </>
                  )}
                  {canModifyForm && activeImageUrl && (
                    <button type="button" onClick={handleRemoveImage} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus gambar
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {access.canCreate && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <QrCode className="w-5 h-5" />
                  Generate QR Code
                </button>
              )}
              {(editingId ? access.canEdit : access.canCreate) && (
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {saving ? 'Menyimpan...' : editingId ? 'Perbarui QR' : 'Simpan QR'}
                </button>
              )}
              {editingId && (
                <>
                  {access.canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(editingId)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Hapus
                    </button>
                  )}
                  {access.canCreate && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Baru
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <label className={labelStyle}>Preview</label>
            <div className="min-h-[420px] rounded-xl bg-slate-50 border border-dashed border-slate-200 p-6 flex flex-col items-center justify-center gap-4">
              {generatedText ? (
                <>
                  <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                    <QRCodeCanvas
                      ref={canvasRef}
                      value={generatedText}
                      size={size}
                      level={useCenterImage ? 'H' : 'M'}
                      minVersion={11}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      marginSize={2}
                      imageSettings={withImage ? {
                        src: activeImageUrl,
                        height: Math.round(size * 0.13),
                        width: Math.round(size * 0.13),
                        excavate: true,
                        crossOrigin: 'anonymous'
                      } : undefined}
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-center break-all max-w-full">{generatedText}</p>
                </>
              ) : (
                <div className="text-center text-slate-400">
                  <QrCode className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium">QR code akan tampil di sini</p>
                  <p className="text-xs mt-1">Masukkan teks lalu klik Generate QR Code</p>
                </div>
              )}
               </div>
           </div>
         </div>
       </form>

      <section className="app-card app-card-padded">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">Data QR Tersimpan</h3>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-3 py-1">{records.length} data</span>
          </div>
        </div>
        {!loading && records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-3">No</th>
                  <th className="py-2 pr-3">Isi QRCode</th>
                  <th className="py-2 pr-3">Diperbarui</th>
                  <th className="py-2 pr-3">Unduh Kode QR</th>
                  <th className="py-2">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.map((record, index) => (
                  <tr key={record.id} className={editingId === record.id ? 'bg-indigo-50/60' : ''}>
                    <td className="py-3 pr-3 text-xs font-semibold text-gray-400">{indexOfFirstItem + index + 1}</td>
                    <td className="py-3 pr-3 max-w-[320px]">
                      <p className="text-xs text-gray-700 break-all">{record.qr_text}</p>
                      {record.image && <p className="text-[11px] text-indigo-500 mt-0.5">Memiliki logo</p>}
                      <span className="hidden">
                        <QRCodeCanvas
                          ref={(node) => {
                            if (node) rowCanvasRefs.current[record.id] = node;
                            else delete rowCanvasRefs.current[record.id];
                          }}
                          value={record.qr_text}
                          size={Number(record.size) || 325}
                          level={record.level || 'M'}
                          minVersion={11}
                          bgColor="#ffffff"
                          fgColor="#000000"
                          marginSize={2}
                          imageSettings={record.image ? {
                            src: `${BASE_IMAGE_URL}${record.image}`,
                            height: Math.round((Number(record.size) || 325) * 0.13),
                            width: Math.round((Number(record.size) || 325) * 0.13),
                            excavate: true,
                            crossOrigin: 'anonymous'
                          } : undefined}
                        />
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs text-gray-500">{formatDate(record.updated_at || record.created_at)}</td>
                    <td className="py-3 pr-3">
                      {access.canExport && (
                        <button type="button" onClick={() => handleDownloadRecord(record)} className={`${smallButton} bg-indigo-50 text-indigo-600 hover:bg-indigo-100`} title="Unduh Kode QR">
                          <Download className="w-3.5 h-3.5" />
                          Unduh
                        </button>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        {access.canEdit && (
                          <button type="button" onClick={() => handleEdit(record)} className={`${smallButton} bg-blue-50 text-blue-600 hover:bg-blue-100`} title="Ubah">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {access.canDelete && (
                          <button type="button" onClick={() => handleDeleteRecord(record.id)} className={`${smallButton} bg-red-50 text-red-600 hover:bg-red-100`} title="Hapus">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">Belum ada QR code tersimpan.</p>
        )}
        {records.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 app-pagination">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <PageSizeSelect value={itemsPerPage} onChange={setItemsPerPage} />
              <div className="text-sm text-gray-500"> 
                dari <span className="font-semibold text-gray-700">{records.length}</span> records
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition bg-white text-gray-700 border-gray-200 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNum = index + 1;
                return (
                  <button
                    type="button"
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold border transition ${
                      currentPage === pageNum
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition bg-white text-gray-700 border-gray-200 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default QrCodeGenerator;
