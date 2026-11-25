import React, { useEffect, useState } from 'react';
import { Calculator, Plus, Trash2 } from 'lucide-react';
import { useMenuPermission } from '../../permissions';
import { deleteAsset, depreciateAssets, getAssets, getDepreciations, saveAsset } from '../../financeApi';
import useFinanceBootstrap from '../../useFinanceBootstrap';
import { asList, dateLabel, idr, periodOptions } from '../../financeUtils';
import FinanceLayout, { FinanceButton, FinanceCard, FinanceField, inputClass } from '../../components/finance/FinanceLayout';
import { FinancePagination, FinanceTable, StatusBadge } from '../../components/finance/FinanceTable';
import FinanceModal from '../../components/finance/FinanceModal';

const emptyAsset = { asset_code: '', name: '', category: '', purchase_date: new Date().toISOString().slice(0, 10), cost: '', useful_life_months: 12, residual_value: 0, depreciation_method: 'straight_line', status: 'active', account_id: '', notes: '' };

const FinanceAssets = () => {
  const access = useMenuPermission('/finance/assets');
  const { bootstrap } = useFinanceBootstrap();
  const [tab, setTab] = useState('assets');
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(false);
  const [depreciations, setDepreciations] = useState([]);
  const [period, setPeriod] = useState(periodOptions()[0]?.value || '');
  const [form, setForm] = useState(emptyAsset);
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
    getAssets()
      .then((result) => {
        setRows(asList(result));
        setMeta({ total: Number(result?.total || 0), page: Number(result?.page || 1), limit: 10 });
      })
      .catch((error) => notify(error.message, 'error'))
      .finally(() => setLoading(false));
    getDepreciations().then((result) => setDepreciations(asList(result))).catch((error) => notify(error.message, 'error'));
  };

  useEffect(() => { load(); }, [access.canView]);

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const open = (row = null) => {
    setForm(row ? { ...emptyAsset, ...row, account_id: row.account_id ? String(row.account_id) : '' } : { ...emptyAsset, account_id: bootstrap.cash_accounts[0]?.id ? String(bootstrap.cash_accounts[0].id) : '' });
    setModalOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.account_id) delete payload.account_id;
      await saveAsset(payload);
      notify('Aset berhasil disimpan.');
      setModalOpen(false);
      load();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Hapus aset ${row.name}?`)) return;
    try {
      await deleteAsset(row.id);
      notify('Aset dihapus.');
      load();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const runDepreciation = async () => {
    try {
      const result = await depreciateAssets({ period });
      notify(result?.message || 'Penyusutan berhasil.');
      load();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const columns = [
    { key: 'asset_code', label: 'Kode', render: (row) => <span className="font-bold text-slate-700">{row.asset_code}</span> },
    { key: 'name', label: 'Nama Aset' },
    { key: 'category', label: 'Kategori' },
    { key: 'purchase_date', label: 'Tanggal Beli', render: (row) => dateLabel(row.purchase_date) },
    { key: 'cost', label: 'Harga Perolehan', align: 'right', render: (row) => idr(row.cost) },
    { key: 'accumulated_depreciation', label: 'Akumulasi Penyusutan', align: 'right', render: (row) => idr(row.accumulated_depreciation) },
    { key: 'book_value', label: 'Nilai Buku', align: 'right', render: (row) => <span className="font-bold text-slate-800">{idr(row.book_value)}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
    { key: 'actions', label: 'Aksi', align: 'right', render: (row) => (
      <div className="flex items-center justify-end gap-1">
        {access.canEdit ? <FinanceButton onClick={() => open(row)}>Ubah</FinanceButton> : null}
        {access.canDelete ? <FinanceButton variant="danger" onClick={() => remove(row)}><Trash2 className="h-3.5 w-3.5" /></FinanceButton> : null}
      </div>
    ) }
  ];

  const depreciationColumns = [
    { key: 'period', label: 'Periode' },
    { key: 'asset_code', label: 'Kode Aset' },
    { key: 'asset_name', label: 'Nama Aset' },
    { key: 'amount', label: 'Penyusutan', align: 'right', render: (row) => idr(row.amount) },
    { key: 'accumulated_after', label: 'Akumulasi', align: 'right', render: (row) => idr(row.accumulated_after) },
    { key: 'book_value_after', label: 'Nilai Buku', align: 'right', render: (row) => idr(row.book_value_after) }
  ];

  return (
    <FinanceLayout
      title="Aset Perusahaan"
      subtitle="Kelola aset tetap dan jurnal penyusutannya"
      notification={notification}
      onDismissNotification={() => setNotification(null)}
      actions={[
        <FinanceButton key="assets" variant={tab === 'assets' ? 'primary' : 'secondary'} onClick={() => setTab('assets')}>Daftar Aset</FinanceButton>,
        <FinanceButton key="dep" variant={tab === 'depreciations' ? 'primary' : 'secondary'} onClick={() => setTab('depreciations')}>Penyusutan</FinanceButton>,
        tab === 'assets' && access.canCreate ? <FinanceButton key="add" variant="primary" onClick={() => open()}><Plus className="h-4 w-4" /> Tambah</FinanceButton> : null
      ].filter(Boolean)}
    >
      {tab === 'assets' ? <>
        <FinanceTable columns={columns} rows={rows} loading={loading} emptyText="Belum ada aset." page={meta.page} limit={meta.limit} />
        <FinancePagination page={meta.page} total={meta.total} limit={meta.limit} onPageChange={(page) => setMeta({ ...meta, page })} onPageSizeChange={(size) => setMeta({ ...meta, page: 1, limit: Number(size) })} />
      </> : (
        <div className="space-y-5">
          <FinanceCard title="Hitung Penyusutan" subtitle="Penyusutan diposting otomatis ke jurnal">
            <div className="flex flex-wrap items-end gap-3">
              <FinanceField label="Periode">
                <select className={inputClass} value={period} onChange={(event) => setPeriod(event.target.value)}>
                  {periodOptions().map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </FinanceField>
              {access.canCreate ? <FinanceButton variant="primary" onClick={runDepreciation}><Calculator className="h-4 w-4" /> Proses Penyusutan</FinanceButton> : null}
            </div>
          </FinanceCard>
          <FinanceTable columns={depreciationColumns} rows={depreciations} loading={loading} emptyText="Belum ada riwayat penyusutan." page={meta.page} limit={meta.limit} />
          <FinancePagination page={meta.page} total={meta.total} limit={meta.limit} onPageChange={(page) => setMeta({ ...meta, page })} onPageSizeChange={(size) => setMeta({ ...meta, page: 1, limit: Number(size) })} />
        </div>
      )}

      <FinanceModal open={modalOpen} title={form.id ? 'Ubah Aset' : 'Aset Baru'} onClose={() => setModalOpen(false)} onSubmit={submit} submitting={submitting}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FinanceField label="Kode Aset"><input required className={inputClass} value={form.asset_code} onChange={(event) => update('asset_code', event.target.value)} /></FinanceField>
          <FinanceField label="Nama Aset"><input required className={inputClass} value={form.name} onChange={(event) => update('name', event.target.value)} /></FinanceField>
          <FinanceField label="Kategori"><input className={inputClass} value={form.category} onChange={(event) => update('category', event.target.value)} /></FinanceField>
          <FinanceField label="Tanggal Pembelian"><input type="date" required className={inputClass} value={form.purchase_date} onChange={(event) => update('purchase_date', event.target.value)} /></FinanceField>
          <FinanceField label="Harga Perolehan"><input type="number" min="1" required className={inputClass} value={form.cost} onChange={(event) => update('cost', event.target.value)} /></FinanceField>
          <FinanceField label="Nilai Residu"><input type="number" min="0" className={inputClass} value={form.residual_value} onChange={(event) => update('residual_value', event.target.value)} /></FinanceField>
          <FinanceField label="Umur (bulan)"><input type="number" min="1" className={inputClass} value={form.useful_life_months} onChange={(event) => update('useful_life_months', event.target.value)} /></FinanceField>
          <FinanceField label="Metode">
            <select className={inputClass} value={form.depreciation_method} onChange={(event) => update('depreciation_method', event.target.value)}>
              <option value="straight_line">Garis Lurus</option><option value="declining_balance">Saldo Menurun</option>
            </select>
          </FinanceField>
          <FinanceField label="Sumber Dana">
            <select className={inputClass} value={form.account_id} onChange={(event) => update('account_id', event.target.value)}>
              <option value="">Tanpa jurnal pembelian</option>
              {bootstrap.cash_accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </FinanceField>
          <FinanceField label="Status">
            <select className={inputClass} value={form.status} onChange={(event) => update('status', event.target.value)}>
              <option value="active">Aktif</option><option value="disposed">Dihapus</option>
            </select>
          </FinanceField>
          <FinanceField label="Catatan" className="sm:col-span-2"><textarea rows="2" className={inputClass} value={form.notes || ''} onChange={(event) => update('notes', event.target.value)} /></FinanceField>
        </div>
      </FinanceModal>
    </FinanceLayout>
  );
};

export default FinanceAssets;
