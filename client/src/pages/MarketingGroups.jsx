import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Edit3,
  Plus,
  Search,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { useMenuPermission } from '../permissions';
import { useTablePagination } from '../tablePagination';
import {
  deleteGroup,
  getContacts,
  getGroupMembers,
  getGroups,
  saveGroup,
  setGroupMembers
} from '../marketingApi';
import MarketingLayout from '../components/marketing/MarketingLayout';
import MarketingTable from '../components/marketing/MarketingTable';

const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const emptyGroup = { name: '', description: '' };

const MarketingGroups = () => {
  const access = useMenuPermission('/marketing-center/groups');
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyGroup);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [memberGroup, setMemberGroup] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [contactSearch, setContactSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((previous) => ({ ...previous, show: false })), 3500);
  };

  const loadGroups = async () => {
    setLoading(true);
    try {
      const result = await getGroups();
      setGroups(asList(result));
    } catch (error) {
      showNotification(error.message || 'Gagal memuat data grup.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!access.canView) return;
    loadGroups();
    getContacts({ limit: 'all' })
      .then((result) => setContacts(asList(result)))
      .catch(() => setContacts([]));
  }, [access.canView]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((group) => [group.name, group.description].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [groups, search]);

  const filteredContacts = useMemo(() => {
    const term = contactSearch.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((contact) => [contact.name, contact.email, contact.whatsapp, contact.company]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [contacts, contactSearch]);

  const pagination = useTablePagination(filtered);
  const range = filtered.length
    ? `Menampilkan ${pagination.indexOfFirstItem + 1} sampai ${Math.min(pagination.indexOfLastItem, filtered.length)} dari ${filtered.length} entri`
    : 'Belum ada grup';

  useEffect(() => {
    pagination.setCurrentPage(1);
  }, [search]);

  const openForm = (group = null) => {
    if (!group && !access.canCreate) return;
    if (group && !access.canEdit) return;
    setEditingId(group?.id || null);
    setForm(group ? { name: group.name || '', description: group.description || '' } : { ...emptyGroup });
    setFormOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      showNotification('Nama grup wajib diisi.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await saveGroup({ ...(editingId ? { id: editingId } : {}), name: form.name.trim(), description: form.description.trim() });
      showNotification(editingId ? 'Grup berhasil diperbarui.' : 'Grup berhasil ditambahkan.');
      setFormOpen(false);
      await loadGroups();
    } catch (error) {
      showNotification(error.message || 'Gagal menyimpan grup.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (group) => {
    if (!access.canDelete) return;
    if (!window.confirm(`Hapus grup ${group.name}?`)) return;
    try {
      await deleteGroup(group.id);
      showNotification('Grup berhasil dihapus.');
      await loadGroups();
    } catch (error) {
      showNotification(error.message || 'Gagal menghapus grup.', 'error');
    }
  };

  const openMembers = async (group) => {
    if (!access.canEdit) return;
    setMemberGroup(group);
    setContactSearch('');
    setSelectedIds(new Set());
    try {
      const result = await getGroupMembers(group.id);
      const values = asList(result);
      const ids = values.map((item) => item.contact_id ?? item.id ?? item);
      setSelectedIds(new Set(ids.map(String)));
    } catch (error) {
      showNotification(error.message || 'Gagal memuat anggota grup.', 'error');
    }
  };

  const toggleContact = (id) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSaveMembers = async () => {
    if (!memberGroup || !access.canEdit) return;
    setSubmitting(true);
    try {
      await setGroupMembers(memberGroup.id, [...selectedIds]);
      showNotification('Anggota grup berhasil disimpan.');
      setMemberGroup(null);
      await loadGroups();
    } catch (error) {
      showNotification(error.message || 'Gagal menyimpan anggota grup.', 'error');
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
    { key: 'name', label: 'Nama Grup', render: (row) => <span className="font-semibold text-gray-800">{row.name || '-'}</span> },
    { key: 'description', label: 'Deskripsi', render: (row) => row.description || '-' },
    {
      key: 'member_count',
      label: 'Anggota',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-gray-600">
          <Users className="h-4 w-4 text-gray-400" />
          {row.member_count ?? row.members?.length ?? row.contact_count ?? 0}
        </span>
      )
    },
    { key: 'created_at', label: 'Dibuat', render: (row) => row.created_at || '-' },
    {
      key: 'actions',
      label: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-1">
          {access.canEdit ? (
            <button type="button" onClick={() => openMembers(row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-green-50 hover:text-green-600" aria-label="Kelola anggota"><Users className="h-4 w-4" /></button>
          ) : null}
          {access.canEdit ? (
            <button type="button" onClick={() => openForm(row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600" aria-label="Ubah grup"><Edit3 className="h-4 w-4" /></button>
          ) : null}
          {access.canDelete ? (
            <button type="button" onClick={() => handleDelete(row)} className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Hapus grup"><Trash2 className="h-4 w-4" /></button>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <MarketingLayout
      title="Grup Kontak"
      subtitle="Kelompokkan kontak untuk penargetan kampanye."
      actions={
        access.canCreate ? (
          <button type="button" onClick={() => openForm()} className="inline-flex items-center gap-2 app-button app-button-primary">
            <Plus className="h-4 w-4" /> Tambah Grup
          </button>
        ) : null
      }
      filters={
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari grup..." className={`${inputStyle} pl-9`} />
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
          <form onSubmit={handleSave} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Ubah Grup' : 'Tambah Grup'}</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Tutup"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-6 py-6">
              <div>
                <label className={labelStyle} htmlFor="group-name">Nama Grup *</label>
                <input id="group-name" className={inputStyle} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div>
                <label className={labelStyle} htmlFor="group-description">Deskripsi</label>
                <textarea id="group-description" rows={4} className={inputStyle} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button type="button" onClick={() => setFormOpen(false)} className="app-button">Batal</button>
              <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">{submitting ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </div>
      ) : null}

      {memberGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Anggota Grup</h2>
                <p className="mt-1 text-sm text-gray-500">{memberGroup.name}</p>
              </div>
              <button type="button" onClick={() => setMemberGroup(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Tutup"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 px-6 py-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} placeholder="Cari kontak..." className={`${inputStyle} pl-9`} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{selectedIds.size} kontak dipilih</span>
                <button type="button" onClick={() => setSelectedIds(new Set(filteredContacts.map((contact) => String(contact.id))))} className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700">
                  <Check className="h-3.5 w-3.5" /> Pilih hasil pencarian
                </button>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-3">
                {filteredContacts.length === 0 ? <p className="py-4 text-center text-sm text-gray-400">Kontak tidak ditemukan.</p> : null}
                {filteredContacts.map((contact) => (
                  <label key={contact.id} className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition ${selectedIds.has(String(contact.id)) ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={selectedIds.has(String(contact.id))} onChange={() => toggleContact(contact.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-800">{contact.name || contact.email}</span>
                      <span className="block truncate text-xs text-gray-500">{contact.email || contact.whatsapp || '-'}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button type="button" onClick={() => setMemberGroup(null)} className="app-button">Batal</button>
              <button type="button" onClick={handleSaveMembers} disabled={submitting || !access.canEdit} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">{submitting ? 'Menyimpan...' : 'Simpan Anggota'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </MarketingLayout>
  );
};

export default MarketingGroups;
