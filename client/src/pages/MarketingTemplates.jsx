import React, { useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import {
  AlertCircle,
  Edit3,
  Eye,
  Mail,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { useMenuPermission } from '../permissions';
import { useTablePagination } from '../tablePagination';
import {
  deleteEmailTemplate,
  deleteWhatsappTemplate,
  getEmailTemplates,
  getWhatsappTemplates,
  saveEmailTemplate,
  saveWhatsappTemplate
} from '../marketingApi';
import MarketingLayout from '../components/marketing/MarketingLayout';
import MarketingTable from '../components/marketing/MarketingTable';

const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const emptyEmail = { name: '', subject: '', from_name: '', from_email: '', html: '' };
const emptyWhatsapp = { name: '', text: '' };

const MarketingTemplates = () => {
  const access = useMenuPermission('/marketing-center/templates');
  const [tab, setTab] = useState('email');
  const [templates, setTemplates] = useState({ email: [], whatsapp: [] });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyEmail);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((previous) => ({ ...previous, show: false })), 3500);
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const [emailResult, whatsappResult] = await Promise.all([getEmailTemplates(), getWhatsappTemplates()]);
      setTemplates({ email: asList(emailResult), whatsapp: asList(whatsappResult) });
    } catch (error) {
      showNotification(error.message || 'Gagal memuat template.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!access.canView) return;
    loadTemplates();
  }, [access.canView]);

  const filtered = useMemo(() => {
    const list = templates[tab] || [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((template) => [template.name, template.subject, template.text, template.html]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [templates, tab, search]);

  const pagination = useTablePagination(filtered);
  const range = filtered.length
    ? `Menampilkan ${pagination.indexOfFirstItem + 1} sampai ${Math.min(pagination.indexOfLastItem, filtered.length)} dari ${filtered.length} entri`
    : `Belum ada template ${tab === 'email' ? 'email' : 'WhatsApp'}`;

  useEffect(() => {
    pagination.setCurrentPage(1);
  }, [search, tab]);

  const openForm = (template = null) => {
    if (!template && !access.canCreate) return;
    if (template && !access.canEdit) return;
    setEditingId(template?.id || null);
    if (tab === 'email') {
      setForm(template ? {
        name: template.name || '',
        subject: template.subject || '',
        from_name: template.from_name || '',
        from_email: template.from_email || '',
        html: template.html || template.body_html || template.content || ''
      } : { ...emptyEmail });
    } else {
      setForm(template ? {
        name: template.name || '',
        text: template.text || template.body || template.message || ''
      } : { ...emptyWhatsapp });
    }
    setFormOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      showNotification('Nama template wajib diisi.', 'error');
      return;
    }
    if (tab === 'email' && !form.subject.trim()) {
      showNotification('Subjek template wajib diisi.', 'error');
      return;
    }
    if (tab === 'whatsapp' && !form.text.trim()) {
      showNotification('Teks template wajib diisi.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...(editingId ? { id: editingId } : {}), ...form };
      if (tab === 'email') {
        await saveEmailTemplate(payload);
      } else {
        await saveWhatsappTemplate(payload);
      }
      showNotification('Template berhasil disimpan.');
      setFormOpen(false);
      await loadTemplates();
    } catch (error) {
      showNotification(error.message || 'Gagal menyimpan template.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (template) => {
    if (!access.canDelete) return;
    if (!window.confirm(`Hapus template ${template.name}?`)) return;
    try {
      if (tab === 'email') await deleteEmailTemplate(template.id);
      else await deleteWhatsappTemplate(template.id);
      showNotification('Template berhasil dihapus.');
      await loadTemplates();
    } catch (error) {
      showNotification(error.message || 'Gagal menghapus template.', 'error');
    }
  };

  if (!access.canView) {
    return (
      <div className="app-card app-card-padded">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Akses Ditolak</h3>
        <p className="text-gray-500 text-sm mt-2">Anda tidak memiliki hak akses untuk melihat data ini.</p>
      </div>
    );
  }

  const inputStyle = 'app-input';
  const columns = [
    { key: 'name', label: 'Nama Template', render: (row) => <span className="font-semibold text-gray-800">{row.name || '-'}</span> },
    tab === 'email'
      ? { key: 'subject', label: 'Subjek', render: (row) => row.subject || '-' }
      : { key: 'text', label: 'Pesan', render: (row) => <span className="block max-w-sm truncate">{row.text || row.body || row.message || '-'}</span> },
    { key: 'updated_at', label: 'Diperbarui', render: (row) => row.updated_at || row.created_at || '-' },
    {
      key: 'actions',
      label: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setPreview(row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600" aria-label="Pratinjau template"><Eye className="h-4 w-4" /></button>
          {access.canEdit ? (
            <button type="button" onClick={() => openForm(row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600" aria-label="Ubah template"><Edit3 className="h-4 w-4" /></button>
          ) : null}
          {access.canDelete ? (
            <button type="button" onClick={() => handleDelete(row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Hapus template"><Trash2 className="h-4 w-4" /></button>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <MarketingLayout
      title="Template Pesan"
      subtitle="Kelola template email dan pesan WhatsApp untuk kampanye."
      actions={
        access.canCreate ? (
          <button type="button" onClick={() => openForm()} className="inline-flex items-center gap-2 app-button app-button-primary">
            <Plus className="h-4 w-4" /> Tambah Template
          </button>
        ) : null
      }
      filters={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
            <button type="button" onClick={() => setTab('email')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === 'email' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Mail className="h-4 w-4" /> Email
            </button>
            <button type="button" onClick={() => setTab('whatsapp')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === 'whatsapp' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
          </div>
          <div className="relative sm:max-w-sm sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari template..." className={`${inputStyle} pl-9`} />
          </div>
        </div>
      }
    >
      {notification.show ? (
        <div className={`fixed top-6 right-6 z-[60] max-w-sm rounded-xl border-l-4 px-6 py-4 shadow-2xl ${notification.type === 'success' ? 'border-green-500 bg-white' : 'border-red-500 bg-white'}`}>
          <p className={`text-sm font-semibold ${notification.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{notification.message}</p>
        </div>
      ) : null}

      <MarketingTable
        columns={columns}
        rows={filtered}
        loading={loading}
        currentItems={pagination.currentItems}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        setCurrentPage={pagination.setCurrentPage}
        pageSize={pagination.itemsPerPage}
        setPageSize={pagination.setItemsPerPage}
        range={range}
      />

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
          <form onSubmit={handleSave} className="flex max-h-[94vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Ubah Template' : 'Tambah Template'}</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Tutup"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="template-name">Nama Template *</label>
                <input id="template-name" className={inputStyle} value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              {tab === 'email' ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="template-subject">Subjek Email *</label>
                    <input id="template-subject" className={inputStyle} value={form.subject || ''} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="template-from-name">Nama Pengirim</label>
                      <input id="template-from-name" className={inputStyle} value={form.from_name || ''} onChange={(event) => setForm({ ...form, from_name: event.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="template-from-email">Email Pengirim</label>
                      <input id="template-from-email" type="email" className={inputStyle} value={form.from_email || ''} onChange={(event) => setForm({ ...form, from_email: event.target.value })} />
                    </div>
                  </div>
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Isi Email</span>
                    <ReactQuill theme="snow" value={form.html || ''} onChange={(value) => setForm({ ...form, html: value })} className="bg-white" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="template-text">Teks Pesan *</label>
                  <textarea id="template-text" rows={8} className={inputStyle} value={form.text || ''} onChange={(event) => setForm({ ...form, text: event.target.value })} />
                  <p className="mt-2 text-xs text-gray-500">Variabel yang tersedia: {'{{nama}}'}, {'{{email}}'}, {'{{perusahaan}}'}, {'{{whatsapp}}'}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button type="button" onClick={() => setFormOpen(false)} className="app-button">Batal</button>
              <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">{submitting ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <h2 className="text-lg font-bold text-gray-900">Pratinjau Template</h2>
              <button type="button" onClick={() => setPreview(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Tutup"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="mb-4 text-sm font-semibold text-gray-700">{preview.name}</p>
              {tab === 'email' ? (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                    <p><span className="font-semibold text-gray-700">Subjek:</span> {preview.subject || '-'}</p>
                    {preview.from_name || preview.from_email ? <p className="mt-1"><span className="font-semibold text-gray-700">Dari:</span> {preview.from_name || '-'} {preview.from_email ? `<${preview.from_email}>` : ''}</p> : null}
                  </div>
                  <div className="prose prose-sm max-w-none px-4 py-5" dangerouslySetInnerHTML={{ __html: preview.html || preview.body_html || preview.content || '' }} />
                </div>
              ) : (
                <div className="mx-auto max-w-sm rounded-2xl bg-[#e5ddd5] p-4">
                  <div className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-lg rounded-tr-none bg-[#dcf8c6] px-3 py-2 text-sm text-gray-800 shadow">
                    {preview.text || preview.body || preview.message || '-'}
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-right">
              <button type="button" onClick={() => setPreview(null)} className="app-button">Tutup</button>
            </div>
          </div>
        </div>
      ) : null}
    </MarketingLayout>
  );
};

export default MarketingTemplates;
