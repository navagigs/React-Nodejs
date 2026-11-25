import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Trash2, UploadCloud, Image as ImageIcon } from 'lucide-react';
import { APP_SETTINGS_URL } from '../Api';
import { useAppConfig } from '../useAppConfig';
import { useMenuPermission } from '../permissions';
import FeaturePageHeader from '../components/layout/FeaturePageHeader';

const AppConfiguration = () => {
  const access = useMenuPermission('/setting');
  const { config, logoUrl, signatureUrl, refreshConfig } = useAppConfig();
  const [form, setForm] = useState({
    site_title: '',
    site_description: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [signatureFile, setSignatureFile] = useState(null);
  const [removeSignature, setRemoveSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    setForm({
      site_title: config.site_title || '',
      site_description: config.site_description || '',
      meta_title: config.meta_title || '',
      meta_description: config.meta_description || '',
      meta_keywords: config.meta_keywords || ''
    });
    setRemoveLogo(false);
    setRemoveSignature(false);
  }, [config]);

  const objectUrl = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : ''), [logoFile]);
  const signatureObjectUrl = useMemo(() => (signatureFile ? URL.createObjectURL(signatureFile) : ''), [signatureFile]);
  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (signatureObjectUrl) URL.revokeObjectURL(signatureObjectUrl);
  }, [objectUrl, signatureObjectUrl]);

  const previewLogo = objectUrl || (removeLogo ? '' : logoUrl);
  const previewSignature = signatureObjectUrl || (removeSignature ? '' : signatureUrl);
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 3000);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (event) => {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    if (!file) {
      setLogoFile(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      showNotification('Logo harus berupa file gambar', 'error');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showNotification('Ukuran logo maksimal 2 MB', 'error');
      event.target.value = '';
      return;
    }
    setLogoFile(file);
    setRemoveLogo(false);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setRemoveLogo(true);
    const input = document.getElementById('app-logo-input');
    if (input) input.value = '';
  };

  const handleSignatureChange = (event) => {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    if (!file) {
      setSignatureFile(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      showNotification('Tanda tangan harus berupa file gambar', 'error');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showNotification('Ukuran tanda tangan maksimal 2 MB', 'error');
      event.target.value = '';
      return;
    }
    setSignatureFile(file);
    setRemoveSignature(false);
  };

  const handleRemoveSignature = () => {
    setSignatureFile(null);
    setRemoveSignature(true);
    const input = document.getElementById('app-signature-input');
    if (input) input.value = '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!access.canEdit) return;
    if (!form.site_title.trim()) {
      showNotification('Site title wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = new FormData();
      Object.keys(form).forEach((key) => payload.append(key, form[key]));
      if (logoFile) payload.append('logo', logoFile);
      if (removeLogo) payload.append('remove_logo', '1');
      if (signatureFile) payload.append('digital_signature', signatureFile);
      if (removeSignature) payload.append('remove_digital_signature', '1');

      const response = await fetch(APP_SETTINGS_URL, { method: 'PUT', body: payload });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Gagal menyimpan konfigurasi');

      setLogoFile(null);
      setRemoveLogo(false);
      setSignatureFile(null);
      setRemoveSignature(false);
      await refreshConfig();
      showNotification(result.message || 'Konfigurasi aplikasi berhasil disimpan!');
    } catch (error) {
      showNotification(error.message || 'Terjadi kesalahan saat menyimpan konfigurasi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = 'w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200 placeholder-gray-400';
  const labelStyle = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5';

  if (!access.canView) {
    return (
      <div className="app-card app-card-padded text-center text-sm text-slate-500">
        Anda tidak memiliki hak akses untuk melihat data ini.
      </div>
    );
  }

  return (
    <div className="app-page">
      <FeaturePageHeader
        title="Konfigurasi Aplikasi"
        subtitle="Atur identitas dan preferensi aplikasi"
        actions={access.canEdit ? (
          <button
            type="submit"
            form="app-config-form"
            disabled={saving}
            className="app-button app-button-primary"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        ) : null}
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

      <form onSubmit={handleSubmit} id="app-config-form" className="app-card app-card-padded animate-fade-in-up">
        {access.canView && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div>
              <label className={labelStyle}>Logo Website</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center text-center bg-gray-50/60">
                <div className="w-24 h-24 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm mb-4">
                  {previewLogo ? (
                    <img src={previewLogo} alt="Logo preview" className="max-w-full max-h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                {access.canEdit && (
                  <>
                    <label htmlFor="app-logo-input" className="cursor-pointer inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                      <UploadCloud className="w-4 h-4" />
                      Pilih logo
                    </label>
                    <input id="app-logo-input" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    <p className="text-xs text-gray-400 mt-2">Format gambar, maksimal 2 MB</p>
                  </>
                )}
                {access.canEdit && previewLogo && (
                  <button type="button" onClick={handleRemoveLogo} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus logo
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className={labelStyle}>Tanda Tangan Digital</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center text-center bg-gray-50/60">
                <div className="w-36 h-20 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm mb-4">
                  {previewSignature ? (
                    <img src={previewSignature} alt="Tanda tangan digital preview" className="max-w-full max-h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                {access.canEdit && (
                  <>
                    <label htmlFor="app-signature-input" className="cursor-pointer inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                      <UploadCloud className="w-4 h-4" />
                      Pilih tanda tangan
                    </label>
                    <input id="app-signature-input" type="file" accept="image/*" onChange={handleSignatureChange} className="hidden" />
                    <p className="text-xs text-gray-400 mt-2">Gambar TTD untuk surat dengan mode tanda tangan digital, maksimal 2 MB</p>
                  </>
                )}
                {access.canEdit && previewSignature && (
                  <button type="button" onClick={handleRemoveSignature} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus tanda tangan
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview Judul Tab</p>
              <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-2 text-xs text-gray-600 shadow-sm">
                {previewLogo && <img src={previewLogo} alt="Favicon preview" className="w-4 h-4 object-contain" />}
                <span className="truncate">{form.meta_title || form.site_title || 'Panel Admin'}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="site_title" className={labelStyle}>Site Title</label>
                <input id="site_title" name="site_title" value={form.site_title} onChange={handleChange} disabled={!access.canEdit} className={inputStyle} placeholder="Nama aplikasi" />
                <p className="text-xs text-gray-400 mt-1.5">Ditampilkan di sidebar dan halaman login.</p>
              </div>
              <div>
                <label htmlFor="site_description" className={labelStyle}>Site Description</label>
                <input id="site_description" name="site_description" value={form.site_description} onChange={handleChange} disabled={!access.canEdit} className={inputStyle} placeholder="Deskripsi singkat website" />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Metadata Website</h3>
              <div className="space-y-5">
                <div>
                  <label htmlFor="meta_title" className={labelStyle}>Meta Title</label>
                  <input id="meta_title" name="meta_title" value={form.meta_title} onChange={handleChange} disabled={!access.canEdit} className={inputStyle} placeholder="Judul untuk tab browser" />
                </div>
                <div>
                  <label htmlFor="meta_description" className={labelStyle}>Meta Description</label>
                  <textarea id="meta_description" name="meta_description" rows="3" value={form.meta_description} onChange={handleChange} disabled={!access.canEdit} className={inputStyle} placeholder="Deskripsi untuk mesin pencari" />
                </div>
                <div>
                  <label htmlFor="meta_keywords" className={labelStyle}>Meta Keywords</label>
                  <input id="meta_keywords" name="meta_keywords" value={form.meta_keywords} onChange={handleChange} disabled={!access.canEdit} className={inputStyle} placeholder="kata kunci, dipisah koma" />
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </form>
    </div>
  );
};

export default AppConfiguration;
