import React, { useEffect, useState } from 'react';
import { Check, Download, FileSpreadsheet, FileText, Pencil, Plus, RotateCcw, Search, Trash2, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { useLocation } from 'react-router-dom';
import { useMenuPermission } from '../../permissions';
import { deleteTransaction, getTransactions, saveTransaction, transactionAction } from '../../financeApi';
import { PORTFOLIO_URL } from '../../Api';
import useFinanceBootstrap from '../../useFinanceBootstrap';
import { asList, dateLabel, downloadExport, idr, statusClass } from '../../financeUtils';
import FinanceLayout, { FinanceButton, FinanceCard, FinanceField, inputClass } from '../../components/finance/FinanceLayout';
import { FinancePagination, FinanceTable } from '../../components/finance/FinanceTable';
import FinanceModal from '../../components/finance/FinanceModal';

const emptyForm = { transaction_date: new Date().toISOString().slice(0, 10), category: '', description: '', amount: '', payment_method: 'transfer', account_id: '', invoice_no: '', customer_name: '', vendor_name: '', notes: '', external_ref: '', project_id: '' };

const FinanceTransactions = () => {
  const location = useLocation();
  const isIncome = location.pathname.endsWith('/incomes');
  const type = isIncome ? 'incomes' : 'expenses';
  const menuPath = isIncome ? '/finance/incomes' : '/finance/expenses';
  const access = useMenuPermission(menuPath);
  const { bootstrap } = useFinanceBootstrap();
  const categories = isIncome ? bootstrap.income_categories : bootstrap.expense_categories;

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '', category: '', from: '', to: '', page: 1, limit: 10 });
  const [form, setForm] = useState(emptyForm);
  const [proof, setProof] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [notification, setNotification] = useState(null);
const [projects, setProjects] = useState([]);
const [incomeSource, setIncomeSource] = useState('manual');
const [importOpen, setImportOpen] = useState(false);
const [importRows, setImportRows] = useState([]);
const [importFileName, setImportFileName] = useState('');

  const notify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const buildParams = (extra = {}) => ({
    search: filters.search,
    status: filters.status,
    category: filters.category,
    from: filters.from,
    to: filters.to,
    page: filters.page,
    limit: filters.limit || 10,
    ...extra
  });

  const load = () => {
    if (!access.canView) return;
    setLoading(true);
    getTransactions(type, buildParams())
      .then((result) => {
        setRows(asList(result));
        setMeta({ total: Number(result?.total || 0), page: Number(result?.page || 1), limit: filters.limit || 10 });
      })
      .catch((error) => notify(error.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [access.canView, type, filters.search, filters.status, filters.category, filters.from, filters.to, filters.page, filters.limit]);

  useEffect(() => {
    if (!isIncome) return;
    fetch(PORTFOLIO_URL)
      .then((response) => response.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]));
  }, [isIncome]);

  const updateForm = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const handleProjectSelect = (projectId) => {
    const project = projects.find((item) => String(item.id) === String(projectId));
    if (!project) {
      updateForm('project_id', '');
      return;
    }
    setForm((previous) => ({
      ...previous,
      project_id: String(project.id),
      description: project.title || project.name || previous.description,
      amount: project.portfolio_value ? String(project.portfolio_value) : previous.amount,
      customer_name: project.client_name || previous.customer_name,
      external_ref: project.contract_number || previous.external_ref,
      transaction_date: project.date ? String(project.date).slice(0, 10) : previous.transaction_date
    }));
  };

  const downloadTemplate = async () => {
    const partyKey = isIncome ? 'customer_name' : 'vendor_name';
    const header = ['transaction_date', 'category', 'description', 'amount', 'payment_method', 'account_id', 'invoice_no', partyKey, 'notes', 'external_ref', 'project_id'];
    const sample = [new Date().toISOString().slice(0, 10), Object.keys(categories)[0] || '', isIncome ? 'Pemasukan dari proyek' : 'Pengeluaran operasional', '1000000', 'transfer', bootstrap.cash_accounts[0]?.id ? String(bootstrap.cash_accounts[0].id) : '', '', isIncome ? 'Nama Pelanggan' : 'Nama Vendor', '', '', ''];
    const ws = XLSX.utils.aoa_to_sheet([header, sample]);
    const validations = [];
    const addList = (columnName, values) => {
      const index = header.indexOf(columnName);
      if (index < 0 || !values.length) return;
      const col = XLSX.utils.encode_col(index);
      const formula = '"' + values.map((value) => String(value).replace(/"/g, '""')).join(',') + '"';
      validations.push({ sqref: `${col}2:${col}1000`, formula1: formula });
    };
    addList('category', Object.keys(categories));
    addList('payment_method', ['cash', 'transfer', 'bank', 'other']);
    addList('account_id', bootstrap.cash_accounts.map((account) => String(account.id)));
    addList('project_id', projects.map((project) => String(project.id)));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
    const array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const zip = await JSZip.loadAsync(array);
    if (validations.length && zip.file('xl/worksheets/sheet1.xml')) {
      let sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string');
      const dvXml = `<dataValidations count="${validations.length}">${validations.map((item) => `<dataValidation type="list" allowBlank="1" showDropDown="0" sqref="${item.sqref}"><formula1>${item.formula1}</formula1></dataValidation>`).join('')}</dataValidations>`;
      if (sheetXml.includes('<ignoredErrors>')) {
        sheetXml = sheetXml.replace('<ignoredErrors>', dvXml + '<ignoredErrors>');
      } else {
        sheetXml = sheetXml.replace('</worksheet>', dvXml + '</worksheet>');
      }
      zip.file('xl/worksheets/sheet1.xml', sheetXml);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template-${type}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      notify('Format file harus .xlsx, .xls, atau .csv.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        let rawRows = [];
        if (ext === 'csv') {
          const wb = XLSX.read(String(reader.result || ''), { type: 'string' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        } else {
          const wb = XLSX.read(reader.result, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        }
        const mapped = rawRows.map((row) => ({
          transaction_date: row.transaction_date || row.tanggal || new Date().toISOString().slice(0, 10),
          category: row.category || row.kategori || '',
          description: row.description || row.keterangan || '',
          amount: String(row.amount || row.nominal || row.jumlah || ''),
          payment_method: row.payment_method || row.metode || 'transfer',
          account_id: row.account_id ? String(row.account_id) : '',
          invoice_no: row.invoice_no || row.no_invoice || '',
          customer_name: isIncome ? (row.customer_name || row.pelanggan || '') : '',
          vendor_name: isIncome ? '' : (row.vendor_name || row.vendor || ''),
          notes: row.notes || row.catatan || '',
          external_ref: row.external_ref || row.referensi || '',
          project_id: row.project_id ? String(row.project_id) : ''
        })).filter((item) => item.amount || item.description);
        if (mapped.length === 0) {
          notify('Tidak ada data yang dapat diimpor.', 'error');
          return;
        }
        setImportRows(mapped);
        setImportFileName(file.name);
        setImportOpen(true);
      } catch (error) {
        notify(error.message || 'Gagal membaca file.', 'error');
      }
    };
    reader.onerror = () => notify('Gagal membaca file.', 'error');
    if (ext === 'csv') reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (importRows.length === 0) return;
    setSubmitting(true);
    let success = 0;
    try {
      for (const row of importRows) {
        await saveTransaction(type, row);
        success += 1;
      }
      notify(`${success} transaksi berhasil diimpor.`);
      setImportOpen(false);
      setImportRows([]);
      setImportFileName('');
      load();
    } catch (error) {
      notify(error.message || 'Gagal mengimpor transaksi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = async () => {
    if (!access.canDelete) return;
    if (!window.confirm(`Hapus semua data ${isIncome ? 'pemasukan' : 'pengeluaran'}? Tindakan ini tidak dapat dibatalkan.`)) return;
    setSubmitting(true);
    try {
      let deleted = 0;
      let page = 1;
      while (true) {
        const result = await getTransactions(type, { page, limit: 100 });
        const rows = asList(result);
        if (rows.length === 0) break;
        for (const row of rows) {
          try {
            await deleteTransaction(type, row.id);
            deleted += 1;
          } catch {
            // continue
          }
        }
        if (rows.length < 100) break;
        page += 1;
      }
      notify(`${deleted} transaksi berhasil direset.`);
      load();
    } catch (error) {
      notify(error.message || 'Gagal mereset data.', 'error');
    } finally {
      setSubmitting(false);
    }
  };
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, category: Object.keys(categories)[0] || '', account_id: bootstrap.cash_accounts[0]?.id ? String(bootstrap.cash_accounts[0].id) : '', project_id: '' });
    setProof(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setIncomeSource(row.project_id ? 'project' : 'manual');
    setForm({
      transaction_date: row.transaction_date || '',
      category: row.category || '',
      description: row.description || '',
      amount: String(row.amount || ''),
      payment_method: row.payment_method || 'transfer',
      account_id: row.account_id ? String(row.account_id) : '',
      invoice_no: row.invoice_no || '',
      customer_name: row.customer_name || '',
      vendor_name: row.vendor_name || '',
      notes: row.notes || '',
      external_ref: row.external_ref || '',
      project_id: row.project_id ? String(row.project_id) : ''
    });
    setProof(null);
    setFormOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (incomeSource === 'manual') delete payload.project_id;
      if (!payload.account_id) delete payload.account_id;
      if (!isIncome) delete payload.customer_name;
      if (isIncome) delete payload.vendor_name;
      let body = payload;
      if (proof) {
        body = new FormData();
        Object.entries(payload).forEach(([key, value]) => body.append(key, value ?? ''));
        body.append('proof_file', proof);
      }
      await saveTransaction(type, body, editingId);
      notify(editingId ? 'Transaksi diperbarui.' : 'Transaksi berhasil disimpan.');
      setFormOpen(false);
      load();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const act = async (row, action) => {
    try {
      const result = await transactionAction(type, row.id, action, action === 'reject' ? { reason: 'Ditolong oleh admin' } : {});
      notify(result?.message || `Transaksi ${action}.`);
      load();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Hapus transaksi ${row.transaction_no}?`)) return;
    try {
      await deleteTransaction(type, row.id);
      notify('Transaksi dihapus.');
      load();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const columns = [
    { key: 'transaction_no', label: 'No. Transaksi' },
    { key: 'transaction_date', label: 'Tanggal', render: (row) => dateLabel(row.transaction_date), export: (row) => dateLabel(row.transaction_date) },
    { key: 'category', label: 'Kategori', render: (row) => categories[row.category] || row.category },
    { key: 'party', label: isIncome ? 'Pelanggan' : 'Vendor', render: (row) => isIncome ? row.customer_name || '-' : row.vendor_name || '-' },
    { key: 'description', label: 'Keterangan' },
    { key: 'amount', label: 'Nominal', align: 'right', render: (row) => idr(row.amount) },
    { key: 'status', label: 'Status', render: (row) => <span className={`rounded-full border px-2 py-1 text-[11px] font-bold capitalize ${statusClass(row.status)}`}>{row.status}</span> }
  ];

  const tableColumns = [
    ...columns.slice(0, 6),
    { key: 'status', label: 'Status', render: (row) => <span className={`rounded-full border px-2 py-1 text-[11px] font-bold capitalize ${statusClass(row.status)}`}>{row.status}</span> },
    { key: 'actions', label: 'Aksi', align: 'right', render: (row) => (
      <div className="flex items-center justify-end gap-1">
        {['draft', 'rejected'].includes(row.status) && access.canEdit ? <FinanceButton onClick={() => openEdit(row)}><Pencil className="h-3.5 w-3.5" /></FinanceButton> : null}
        {row.status === 'draft' && access.canEdit ? <FinanceButton variant="success" onClick={() => act(row, 'post')}><Check className="h-3.5 w-3.5" /> Post</FinanceButton> : null}
        {row.status === 'pending' && bootstrap.can_approve ? <FinanceButton variant="success" onClick={() => act(row, 'approve')}><Check className="h-3.5 w-3.5" /> Setujui</FinanceButton> : null}
        {row.status === 'pending' && bootstrap.can_approve ? <FinanceButton variant="danger" onClick={() => act(row, 'reject')}><X className="h-3.5 w-3.5" /></FinanceButton> : null}
        {['posted'].includes(row.status) && access.canEdit ? <FinanceButton onClick={() => act(row, 'cancel')}><RotateCcw className="h-3.5 w-3.5" /> Batal</FinanceButton> : null}
        {access.canDelete && ['draft', 'rejected'].includes(row.status) ? <FinanceButton variant="danger" onClick={() => remove(row)}><Trash2 className="h-3.5 w-3.5" /></FinanceButton> : null}
      </div>
    ) }
  ];

  const doExport = async (format) => {
    try {
      const result = await getTransactions(type, buildParams({ all: 1, limit: 500 }));
      const exportData = asList(result).map((row) => ({
        ...row,
        transaction_date: dateLabel(row.transaction_date),
        category: categories[row.category] || row.category,
        party: isIncome ? row.customer_name || '-' : row.vendor_name || '-',
        amount: idr(row.amount, false)
      }));
      downloadExport(format, isIncome ? 'Laporan Pemasukan' : 'Laporan Pengeluaran', exportData, columns, `finance-${type}`);
      notify(`Ekspor ${format.toUpperCase()} berhasil.`);
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  return (
    <FinanceLayout
      title={isIncome ? 'Pemasukan' : 'Pengeluaran'}
      subtitle={isIncome ? 'Catat dan kelola semua pemasukan perusahaan' : 'Catat dan kelola semua pengeluaran perusahaan'}
      notification={notification}
      onDismissNotification={() => setNotification(null)}
      actions={[
        access.canExport ? <FinanceButton key="xlsx" onClick={() => doExport('xlsx')}><FileSpreadsheet className="h-4 w-4" /> Excel</FinanceButton> : null,
        access.canExport ? <FinanceButton key="pdf" onClick={() => doExport('pdf')}><FileText className="h-4 w-4" /> PDF</FinanceButton> : null,
        access.canCreate ? <FinanceButton key="template" onClick={downloadTemplate}><Download className="h-4 w-4" /> Template</FinanceButton> : null,
        access.canCreate ? <FinanceButton key="import" onClick={() => document.getElementById('finance-import')?.click()}><Upload className="h-4 w-4" /> Import</FinanceButton> : null,
        access.canDelete ? <FinanceButton key="reset" variant="danger" onClick={resetAll} disabled={submitting}><Trash2 className="h-4 w-4" /> Reset Data</FinanceButton> : null,
        access.canCreate ? <FinanceButton key="add" variant="primary" onClick={openCreate}><Plus className="h-4 w-4" /> Tambah</FinanceButton> : null
      ].filter(Boolean)}
    >
<input type="file" accept=".xlsx,.xls,.csv" className="hidden" id="finance-import" onChange={handleImportFile} />
      <FinanceCard title="Filter Transaksi" subtitle="Cari berdasarkan nomor, keterangan, atau nama pihak">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`${inputClass} pl-9`} placeholder="Cari transaksi..." value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })} />
          </div>
          <select className={inputClass} value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value, page: 1 })}>
            <option value="">Semua kategori</option>
            {Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select className={inputClass} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}>
            <option value="">Semua status</option>
            {['draft', 'pending', 'approved', 'posted', 'rejected', 'cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <input type="date" className={inputClass} value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value, page: 1 })} />
          <input type="date" className={inputClass} value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value, page: 1 })} />
        </div>
      </FinanceCard>

      <FinanceTable columns={tableColumns} rows={rows} loading={loading} emptyText="Belum ada transaksi." page={meta.page} limit={meta.limit} />
      <FinancePagination page={meta.page} total={meta.total} limit={meta.limit} onPageChange={(page) => setFilters({ ...filters, page })} onPageSizeChange={(size) => setFilters({ ...filters, page: 1, limit: Number(size) })} />

      <FinanceModal
        open={formOpen}
        title={editingId ? 'Ubah Transaksi' : isIncome ? 'Tambah Pemasukan' : 'Tambah Pengeluaran'}
        onSubmit={submit}
        submitting={submitting}
        onClose={() => setFormOpen(false)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {isIncome ? (
            <>
              <FinanceField label="Sumber Data">
                <select className={inputClass} value={incomeSource} onChange={(event) => {
                  const next = event.target.value;
                  setIncomeSource(next);
                  if (next === 'manual') updateForm('project_id', '');
                }}>
                  <option value="manual">Input Manual</option>
                  <option value="project">Dari Proyek</option>
                </select>
              </FinanceField>
              {incomeSource === 'project' ? (
                <FinanceField label="Pilih Proyek">
                  <select className={inputClass} value={form.project_id} onChange={(event) => handleProjectSelect(event.target.value)}>
                    <option value="">-- Pilih Proyek --</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.title || project.name || `Proyek #${project.id}`}</option>
                    ))}
                  </select>
                </FinanceField>
              ) : null}
            </>
          ) : null}
          <FinanceField label="Tanggal"><input type="date" required className={inputClass} value={form.transaction_date} onChange={(event) => updateForm('transaction_date', event.target.value)} /></FinanceField>
          <FinanceField label="Kategori">
            <select required className={inputClass} value={form.category} onChange={(event) => updateForm('category', event.target.value)}>
              {Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </FinanceField>
          <FinanceField label="Nominal (Rp)"><input type="number" min="1" required className={inputClass} value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} /></FinanceField>
          <FinanceField label="Metode Pembayaran">
            <select className={inputClass} value={form.payment_method} onChange={(event) => updateForm('payment_method', event.target.value)}>
              {['cash', 'transfer', 'bank', 'other'].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </FinanceField>
          <FinanceField label={isIncome ? 'Pelanggan' : 'Vendor'}>
            <input className={inputClass} value={isIncome ? form.customer_name : form.vendor_name} onChange={(event) => updateForm(isIncome ? 'customer_name' : 'vendor_name', event.target.value)} />
          </FinanceField>
          <FinanceField label="Rekening / Kas">
            <select className={inputClass} value={form.account_id} onChange={(event) => updateForm('account_id', event.target.value)}>
              <option value="">Tanpa rekening</option>
              {bootstrap.cash_accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </FinanceField>
          <FinanceField label="No. Invoice"><input className={inputClass} value={form.invoice_no} onChange={(event) => updateForm('invoice_no', event.target.value)} /></FinanceField>
          <FinanceField label="Referensi Eksternal"><input className={inputClass} value={form.external_ref} onChange={(event) => updateForm('external_ref', event.target.value)} /></FinanceField>
          <FinanceField label="Keterangan" className="sm:col-span-2"><textarea rows="2" className={inputClass} value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></FinanceField>
          <FinanceField label="Bukti Transaksi" className="sm:col-span-2">
            <div className="flex items-center gap-3">
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" id="finance-proof" onChange={(event) => setProof(event.target.files?.[0] || null)} />
              <label htmlFor="finance-proof" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                <Upload className="h-4 w-4" /> Pilih file
              </label>
              {proof ? <span className="text-xs text-slate-500">{proof.name} <button type="button" onClick={() => setProof(null)} className="rounded-md p-1 text-red-500 hover:bg-red-50"><X className="inline h-3 w-3" /></button></span> : <span className="text-xs text-slate-400">JPG, PNG, atau PDF</span>}
            </div>
          </FinanceField>
        </div>
      </FinanceModal>
      {importOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Import Transaksi</h3>
              <button type="button" onClick={() => { setImportOpen(false); setImportRows([]); setImportFileName(''); }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-sm text-slate-500">{importFileName} · {importRows.length} baris siap diimpor</p>
            <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Tanggal</th>
                    <th className="px-3 py-2 text-left">Kategori</th>
                    <th className="px-3 py-2 text-left">Keterangan</th>
                    <th className="px-3 py-2 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importRows.slice(0, 20).map((row, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">{row.transaction_date}</td>
                      <td className="px-3 py-2">{row.category}</td>
                      <td className="px-3 py-2">{row.description}</td>
                      <td className="px-3 py-2 text-right">{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <FinanceButton onClick={() => { setImportOpen(false); setImportRows([]); setImportFileName(''); }}>Batal</FinanceButton>
              <FinanceButton variant="primary" onClick={handleImport} disabled={submitting || importRows.length === 0}>{submitting ? 'Mengimpor...' : 'Import'}</FinanceButton>
            </div>
          </div>
        </div>
      ) : null}
    </FinanceLayout>
  );
};

export default FinanceTransactions;
