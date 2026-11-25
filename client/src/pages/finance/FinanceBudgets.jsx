import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useMenuPermission } from '../../permissions';
import { deleteBudget, getBudgets, saveBudget } from '../../financeApi';
import useFinanceBootstrap from '../../useFinanceBootstrap';
import { asList, idr, monthOptions, statusClass } from '../../financeUtils';
import FinanceLayout, { FinanceButton, FinanceCard, FinanceField, inputClass } from '../../components/finance/FinanceLayout';
import { FinancePagination, FinanceTable } from '../../components/finance/FinanceTable';
import FinanceModal from '../../components/finance/FinanceModal';

const emptyBudget = { category: '', budget_year: new Date().getFullYear(), budget_month: new Date().getMonth() + 1, amount: '', warning_threshold: 80, notes: '' };

const FinanceBudgets = () => {
  const access = useMenuPermission('/finance/budgets');
  const { bootstrap } = useFinanceBootstrap();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyBudget);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const notify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const load = () => {
    if (!access.canView) return;
    setLoading(true);
    getBudgets({ year, month })
      .then((result) => {
        setRows(asList(result));
        setMeta({ total: Number(result?.total || 0), page: Number(result?.page || 1), limit: 10 });
      })
      .catch((error) => notify(error.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [access.canView, year, month]);

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const open = (row = null) => {
    setForm(row ? { ...emptyBudget, ...row } : { ...emptyBudget, budget_year: year, budget_month: month, category: Object.keys(bootstrap.expense_categories)[0] || '' });
    setModalOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await saveBudget(form);
      notify('Anggaran berhasil disimpan.');
      setModalOpen(false);
      load();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm('Hapus anggaran ini?')) return;
    try {
      await deleteBudget(row.id);
      notify('Anggaran dihapus.');
      load();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const columns = [
    { key: 'category', label: 'Kategori', render: (row) => bootstrap.expense_categories[row.category] || row.category },
    { key: 'budget_month', label: 'Bulan', render: (row) => row.budget_month ? monthOptions()[Number(row.budget_month) - 1]?.label : 'Sepanjang tahun' },
    { key: 'amount', label: 'Anggaran', align: 'right', render: (row) => idr(row.amount) },
    { key: 'realization', label: 'Realisasi', align: 'right', render: (row) => idr(row.realization) },
    { key: 'difference', label: 'Sisa', align: 'right', render: (row) => idr(row.difference) },
    { key: 'usage_percentage', label: 'Penggunaan', align: 'right', render: (row) => (
      <div className="flex items-center justify-end gap-2">
        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${row.warning === 'over' ? 'bg-rose-500' : row.warning === 'near' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, Number(row.usage_percentage))}%` }} />
        </div>
        <span className="font-bold">{Number(row.usage_percentage).toFixed(1)}%</span>
      </div>
    ) },
    { key: 'warning', label: 'Status', render: (row) => <span className={`rounded-full border px-2 py-1 text-[11px] font-bold capitalize ${statusClass(row.warning)}`}>{row.warning === 'safe' ? 'aman' : row.warning === 'near' ? 'mendekati' : 'terlampaui'}</span> },
    { key: 'actions', label: 'Aksi', align: 'right', render: (row) => (
      <div className="flex items-center justify-end gap-1">
        {access.canEdit ? <FinanceButton onClick={() => open(row)}>Ubah</FinanceButton> : null}
        {access.canDelete ? <FinanceButton variant="danger" onClick={() => remove(row)}><Trash2 className="h-3.5 w-3.5" /></FinanceButton> : null}
      </div>
    ) }
  ];

  return (
    <FinanceLayout
      title="Anggaran"
      subtitle="Rencanakan dan pantau realisasi anggaran per kategori"
      notification={notification}
      onDismissNotification={() => setNotification(null)}
      actions={[
        access.canCreate ? <FinanceButton key="add" variant="primary" onClick={() => open()}><Plus className="h-4 w-4" /> Tambah</FinanceButton> : null
      ].filter(Boolean)}
    >
      <FinanceCard title="Filter Periode" subtitle="Pilih tahun dan bulan anggaran yang ingin ditampilkan">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <select className={inputClass} value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className={inputClass} value={month} onChange={(event) => setMonth(Number(event.target.value))}>
            <option value="0">Sepanjang tahun</option>
            {monthOptions().map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </FinanceCard>
      <FinanceTable columns={columns} rows={rows} loading={loading} emptyText="Belum ada anggaran pada periode ini." page={meta.page} limit={meta.limit} />
      <FinancePagination page={meta.page} total={meta.total} limit={meta.limit} onPageChange={(page) => setMeta({ ...meta, page })} onPageSizeChange={(size) => setMeta({ ...meta, page: 1, limit: Number(size) })} />

      <FinanceModal open={modalOpen} title={form.id ? 'Ubah Anggaran' : 'Anggaran Baru'} onClose={() => setModalOpen(false)} onSubmit={submit} submitting={submitting}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FinanceField label="Kategori">
            <select required className={inputClass} value={form.category} onChange={(event) => update('category', event.target.value)}>
              {Object.entries(bootstrap.expense_categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </FinanceField>
          <FinanceField label="Tahun"><input type="number" required className={inputClass} value={form.budget_year} onChange={(event) => update('budget_year', Number(event.target.value))} /></FinanceField>
          <FinanceField label="Bulan">
            <select className={inputClass} value={form.budget_month} onChange={(event) => update('budget_month', Number(event.target.value))}>
              <option value="0">Sepanjang tahun</option>
              {monthOptions().map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </FinanceField>
          <FinanceField label="Nominal Anggaran"><input type="number" min="1" required className={inputClass} value={form.amount} onChange={(event) => update('amount', event.target.value)} /></FinanceField>
          <FinanceField label="Ambang Peringatan (%)"><input type="number" min="1" max="100" className={inputClass} value={form.warning_threshold} onChange={(event) => update('warning_threshold', event.target.value)} /></FinanceField>
          <FinanceField label="Catatan" className="sm:col-span-2"><textarea rows="2" className={inputClass} value={form.notes || ''} onChange={(event) => update('notes', event.target.value)} /></FinanceField>
        </div>
      </FinanceModal>
    </FinanceLayout>
  );
};

export default FinanceBudgets;
