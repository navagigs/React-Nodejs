import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  AlertCircle,
  Download,
  Edit3,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { useMenuPermission } from '../permissions';
import { useTablePagination } from '../tablePagination';
import {
  bulkDeleteContacts,
  createContact,
  deleteContact,
  exportContactsUrl,
  getContacts,
  getGroups,
  importContacts,
  updateContact
} from '../marketingApi';
import MarketingLayout from '../components/marketing/MarketingLayout';
import MarketingTable from '../components/marketing/MarketingTable';
import StatusBadge from '../components/marketing/StatusBadge';

const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const emptyContact = {
  name: '',
  email: '',
  whatsapp: '',
  company: '',
  segment: '',
  category: '',
  source: '',
  opt_in: true,
  notes: ''
};

const readValue = (row, keys) => {
  const normalized = Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [String(key).trim().toLowerCase(), value]));
  for (const key of keys) {
    const value = normalized[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return '';
};

const mapImportRow = (row) => {
  const optIn = readValue(row, ['opt_in', 'optin', 'opt in']).toLowerCase();
  return {
    name: readValue(row, ['name', 'nama']),
    email: readValue(row, ['email', 'e-mail']),
    whatsapp: readValue(row, ['whatsapp', 'wa', 'phone', 'telepon', 'no hp', 'no_hp', 'nomor']),
    company: readValue(row, ['company', 'perusahaan']),
    segment: readValue(row, ['segment', 'segmen']),
    category: readValue(row, ['category', 'kategori']),
    source: readValue(row, ['source', 'sumber']),
    opt_in: ['1', 'true', 'ya', 'yes', 'aktif'].includes(optIn),
    notes: readValue(row, ['notes', 'catatan'])
  };
};

const MarketingContacts = () => {
  const access = useMenuPermission('/marketing-center/contacts');
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ segment: '', category: '', group: '', status: '' });
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [form, setForm] = useState(emptyContact);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((previous) => ({ ...previous, show: false })), 3500);
  };

  const loadContacts = async () => {
    setLoading(true);
    try {
      const result = await getContacts({ limit: 'all' });
      setContacts(asList(result));
    } catch (error) {
      showNotification(error.message || 'Gagal memuat data kontak.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!access.canView) return;
    loadContacts();
    getGroups()
      .then((result) => setGroups(asList(result)))
      .catch(() => setGroups([]));
  }, [access.canView]);

  const segmentOptions = useMemo(() => [...new Set(contacts.map((contact) => contact.segment).filter(Boolean))].sort(), [contacts]);
  const categoryOptions = useMemo(() => [...new Set(contacts.map((contact) => contact.category).filter(Boolean))].sort(), [contacts]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      const matchTerm = !term || [contact.name, contact.email, contact.whatsapp, contact.company]
        .some((value) => String(value || '').toLowerCase().includes(term));
      const matchSegment = !filters.segment || contact.segment === filters.segment;
      const matchCategory = !filters.category || contact.category === filters.category;
      const matchGroup = !filters.group || String(contact.group_id) === String(filters.group)
        || asList(contact.groups).some((group) => String(group.id) === String(filters.group));
      const contactStatus = contact.status || (contact.opt_in ? 'active' : 'nonaktif');
      const matchStatus = !filters.status || contactStatus === filters.status;
      return matchTerm && matchSegment && matchCategory && matchGroup && matchStatus;
    });
  }, [contacts, search, filters]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const read = (row) => String(row[sort.key] ?? '').toLowerCase();
    list.sort((first, second) => {
      const comparison = read(first).localeCompare(read(second));
      return sort.dir === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filtered, sort]);

  const pagination = useTablePagination(sorted);
  const range = sorted.length
    ? `Menampilkan ${pagination.indexOfFirstItem + 1} sampai ${Math.min(pagination.indexOfLastItem, sorted.length)} dari ${sorted.length} entri`
    : 'Belum ada kontak';

  const handleSort = (key) => {
    setSort((previous) => ({ key, dir: previous.key === key && previous.dir === 'asc' ? 'desc' : 'asc' }));
  };

  useEffect(() => {
    pagination.setCurrentPage(1);
  }, [search, filters.segment, filters.category, filters.group, filters.status]);

  const toggleRow = (row) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
  };

  const toggleAll = (items, shouldSelect) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      items.forEach((item) => {
        if (shouldSelect) next.add(item.id);
        else next.delete(item.id);
      });
      return next;
    });
  };

  const openForm = (contact = null) => {
    if (!contact && !access.canCreate) return;
    if (contact && !access.canEdit) return;
    setEditingId(contact?.id || null);
    setForm(contact ? { ...emptyContact, ...contact, opt_in: !!contact.opt_in } : { ...emptyContact });
    setFormOpen(true);
  };

  const handleSaveContact = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      showNotification('Nama kontak wajib diisi.', 'error');
      return;
    }
    if (!form.email.trim() && !form.whatsapp.trim()) {
      showNotification('Email atau WhatsApp wajib diisi.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp.trim(),
        company: form.company.trim(),
        segment: form.segment.trim(),
        category: form.category.trim(),
        source: form.source.trim(),
        opt_in: !!form.opt_in,
        notes: form.notes.trim()
      };
      if (editingId) await updateContact(editingId, payload);
      else await createContact(payload);
      showNotification(editingId ? 'Kontak berhasil diperbarui.' : 'Kontak berhasil ditambahkan.');
      setFormOpen(false);
      await loadContacts();
    } catch (error) {
      showNotification(error.message || 'Gagal menyimpan kontak.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (contact) => {
    if (!access.canDelete) return;
    if (!window.confirm(`Hapus kontak ${contact.name || contact.email || ''}?`)) return;
    try {
      await deleteContact(contact.id);
      setSelectedIds((previous) => {
        const next = new Set(previous);
        next.delete(contact.id);
        return next;
      });
      showNotification('Kontak berhasil dihapus.');
      await loadContacts();
    } catch (error) {
      showNotification(error.message || 'Gagal menghapus kontak.', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!access.canDelete || selectedIds.size === 0) return;
    if (!window.confirm(`Hapus ${selectedIds.size} kontak yang dipilih?`)) return;
    try {
      await bulkDeleteContacts([...selectedIds]);
      setSelectedIds(new Set());
      showNotification('Kontak terpilih berhasil dihapus.');
      await loadContacts();
    } catch (error) {
      showNotification(error.message || 'Gagal menghapus kontak terpilih.', 'error');
    }
  };

  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extension)) {
      showNotification('Format file harus .xlsx, .xls, atau .csv.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        let rawRows = [];
        if (extension === 'csv') {
          const parsed = Papa.parse(String(reader.result || ''), { header: true, skipEmptyLines: true });
          if (parsed.errors?.length) {
            showNotification(parsed.errors[0].message || 'Gagal membaca file CSV.', 'error');
            return;
          }
          rawRows = parsed.data;
        } else {
          const workbook = XLSX.read(reader.result, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        }
        const mapped = rawRows.map(mapImportRow).filter((row) => row.name || row.email || row.whatsapp);
        const invalid = mapped.filter((row) => !row.email && !row.whatsapp);
        if (invalid.length) {
          showNotification(`${invalid.length} baris tidak memiliki email atau WhatsApp. Periksa kembali file Anda.`, 'error');
          return;
        }
        if (mapped.length === 0) {
          showNotification('Tidak ada data kontak yang dapat diimpor.', 'error');
          return;
        }
        setImportRows(mapped);
        setImportFileName(file.name);
      } catch (error) {
        showNotification(error.message || 'Gagal membaca file.', 'error');
      }
    };
    reader.onerror = () => showNotification('Gagal membaca file.', 'error');
    if (extension === 'csv') reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!access.canCreate || importRows.length === 0) return;
    setSubmitting(true);
    try {
      const result = await importContacts(importRows);
      const imported = result?.imported ?? result?.data?.imported ?? importRows.length;
      showNotification(`${imported} kontak berhasil diimpor.`);
      setImportOpen(false);
      setImportRows([]);
      setImportFileName('');
      await loadContacts();
    } catch (error) {
      showNotification(error.message || 'Gagal mengimpor kontak.', 'error');
    } finally {
      setSubmitting(false);
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
  const labelStyle = 'block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5';
  const columns = [
    { key: 'name', label: 'Nama', render: (row) => <span className="font-semibold text-gray-800">{row.name || '-'}</span> },
    { key: 'email', label: 'Email', render: (row) => row.email || '-' },
    { key: 'whatsapp', label: 'WhatsApp', render: (row) => row.whatsapp || '-' },
    { key: 'company', label: 'Perusahaan', render: (row) => row.company || '-' },
    { key: 'segment', label: 'Segmen', render: (row) => row.segment || '-' },
    { key: 'category', label: 'Kategori', render: (row) => row.category || '-' },
    { key: 'opt_in', label: 'Opt-in', render: (row) => <StatusBadge status={row.opt_in ? 'active' : 'nonaktif'} /> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status || (row.opt_in ? 'active' : 'nonaktif')} /> },
    {
      key: 'actions',
      label: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-1">
          {access.canEdit ? (
            <button type="button" onClick={() => openForm(row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600" aria-label="Ubah kontak"><Edit3 className="h-4 w-4" /></button>
          ) : null}
          {access.canDelete ? (
            <button type="button" onClick={() => handleDelete(row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Hapus kontak"><Trash2 className="h-4 w-4" /></button>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <MarketingLayout
      title="Kontak Marketing"
      subtitle="Kelola kontak, segmentasi, serta data email dan WhatsApp."
      actions={
        <>
          {access.canCreate ? (
            <button type="button" onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 rounded-xl app-button">
              <Upload className="h-4 w-4" /> Impor
            </button>
          ) : null}
          {access.canExport ? (
            <a href={exportContactsUrl({}, 'xlsx')} className="inline-flex items-center gap-2 rounded-xl app-button">
              <Download className="h-4 w-4" /> Ekspor
            </a>
          ) : null}
          {access.canCreate ? (
            <button type="button" onClick={() => openForm()} className="inline-flex items-center gap-2 app-button app-button-primary">
              <Plus className="h-4 w-4" /> Tambah Kontak
            </button>
          ) : null}
        </>
      }
      filters={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, email, WhatsApp..." className={`${inputStyle} pl-9`} />
          </div>
          <select value={filters.segment} onChange={(event) => setFilters((previous) => ({ ...previous, segment: event.target.value }))} className={inputStyle}>
            <option value="">Semua segmen</option>
            {segmentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={filters.category} onChange={(event) => setFilters((previous) => ({ ...previous, category: event.target.value }))} className={inputStyle}>
            <option value="">Semua kategori</option>
            {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={filters.group} onChange={(event) => setFilters((previous) => ({ ...previous, group: event.target.value }))} className={inputStyle}>
            <option value="">Semua grup</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          <select value={filters.status} onChange={(event) => setFilters((previous) => ({ ...previous, status: event.target.value }))} className={inputStyle}>
            <option value="">Semua status</option>
            <option value="active">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
            <option value="pending">Menunggu</option>
            <option value="invalid">Tidak valid</option>
          </select>
        </div>
      }
    >
      {notification.show ? (
        <div className={`fixed top-6 right-6 z-[60] max-w-sm rounded-xl border-l-4 px-6 py-4 shadow-2xl ${notification.type === 'success' ? 'border-green-500 bg-white' : 'border-red-500 bg-white'}`}>
          <p className={`text-sm font-semibold ${notification.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{notification.message}</p>
        </div>
      ) : null}

      {selectedIds.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
          <span className="text-sm font-semibold text-indigo-700">{selectedIds.size} kontak dipilih</span>
          {access.canDelete ? (
            <button type="button" onClick={handleBulkDelete} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700">
              <Trash2 className="h-4 w-4" /> Hapus Terpilih
            </button>
          ) : null}
        </div>
      ) : null}

      <MarketingTable
        columns={columns}
        rows={sorted}
        loading={loading}
        selectable
        selectedIds={selectedIds}
        onToggle={toggleRow}
        onToggleAll={toggleAll}
        sort={sort}
        onSort={handleSort}
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
          <form onSubmit={handleSaveContact} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Ubah Kontak' : 'Tambah Kontak'}</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Tutup"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2">
              <div>
                <label className={labelStyle} htmlFor="contact-name">Nama *</label>
                <input id="contact-name" className={inputStyle} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div>
                <label className={labelStyle} htmlFor="contact-email">Email</label>
                <input id="contact-email" type="email" className={inputStyle} value={form.email || ''} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              <div>
                <label className={labelStyle} htmlFor="contact-whatsapp">WhatsApp</label>
                <input id="contact-whatsapp" className={inputStyle} value={form.whatsapp || ''} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} />
              </div>
              <div>
                <label className={labelStyle} htmlFor="contact-company">Perusahaan</label>
                <input id="contact-company" className={inputStyle} value={form.company || ''} onChange={(event) => setForm({ ...form, company: event.target.value })} />
              </div>
              <div>
                <label className={labelStyle} htmlFor="contact-segment">Segmen</label>
                <input id="contact-segment" className={inputStyle} value={form.segment || ''} onChange={(event) => setForm({ ...form, segment: event.target.value })} />
              </div>
              <div>
                <label className={labelStyle} htmlFor="contact-category">Kategori</label>
                <input id="contact-category" className={inputStyle} value={form.category || ''} onChange={(event) => setForm({ ...form, category: event.target.value })} />
              </div>
              <div>
                <label className={labelStyle} htmlFor="contact-source">Sumber</label>
                <input id="contact-source" className={inputStyle} value={form.source || ''} onChange={(event) => setForm({ ...form, source: event.target.value })} />
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700">
                  <input type="checkbox" checked={!!form.opt_in} onChange={(event) => setForm({ ...form, opt_in: event.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  Opt-in
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className={labelStyle} htmlFor="contact-notes">Catatan</label>
                <textarea id="contact-notes" rows={3} className={inputStyle} value={form.notes || ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button type="button" onClick={() => setFormOpen(false)} className="app-button">Batal</button>
              <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">{submitting ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </div>
      ) : null}

      {importOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Impor Kontak</h2>
                <p className="mt-1 text-xs text-gray-500">Format didukung: .xlsx, .xls, .csv</p>
              </div>
              <button type="button" onClick={() => { setImportOpen(false); setImportRows([]); setImportFileName(''); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Tutup"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-6 py-6">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40">
                <FileSpreadsheet className="h-8 w-8 text-indigo-500" />
                <span className="text-sm font-semibold text-gray-700">Pilih file kontak</span>
                <span className="text-xs text-gray-500">{importFileName || 'Kolom: name, email, whatsapp, company, segment, category, source, opt_in, notes'}</span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="hidden" />
              </label>
              {importRows.length > 0 ? (
                <div className="rounded-xl border border-gray-200">
                  <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600">{importRows.length} baris siap diimpor</div>
                  <div className="max-h-56 overflow-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr><th className="px-4 py-2">Nama</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">WhatsApp</th><th className="px-4 py-2">Opt-in</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importRows.slice(0, 20).map((row, index) => (
                          <tr key={`${row.email || row.whatsapp || index}`}>
                            <td className="px-4 py-2">{row.name || '-'}</td>
                            <td className="px-4 py-2">{row.email || '-'}</td>
                            <td className="px-4 py-2">{row.whatsapp || '-'}</td>
                            <td className="px-4 py-2">{row.opt_in ? 'Ya' : 'Tidak'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button type="button" onClick={() => { setImportOpen(false); setImportRows([]); setImportFileName(''); }} className="app-button">Batal</button>
              <button type="button" onClick={handleImport} disabled={importRows.length === 0 || submitting || !access.canCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">{submitting ? 'Mengimpor...' : 'Impor Sekarang'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </MarketingLayout>
  );
};

export default MarketingContacts;
