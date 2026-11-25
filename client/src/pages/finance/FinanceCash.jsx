import React, { useEffect, useState } from 'react';
import { Landmark, Plus, Repeat2, RefreshCcw, Search, Trash2, Wallet } from 'lucide-react';
import { useMenuPermission } from '../../permissions';
import {
  createCashMovement,
  createTransfer,
  deleteCashAccount,
  getCashAccounts,
  getCashMovements,
  getTransfers,
  reconcileCash,
  saveCashAccount
} from '../../financeApi';
import { asList, dateLabel, idr } from '../../financeUtils';
import FinanceLayout, { FinanceButton, FinanceCard, FinanceField, inputClass } from '../../components/finance/FinanceLayout';
import { FinancePagination, FinanceTable, StatusBadge } from '../../components/finance/FinanceTable';
import FinanceModal from '../../components/finance/FinanceModal';

const emptyAccount = { code: '', name: '', bank_name: '', account_number: '', owner_name: '', account_type: 'bank', coa_code: '101', opening_balance: '', currency: 'IDR', is_active: true };
const emptyMovement = { account_id: '', direction: 1, amount: '', movement_date: new Date().toISOString().slice(0, 10), description: '' };
const emptyTransfer = { from_account_id: '', to_account_id: '', amount: '', transfer_date: new Date().toISOString().slice(0, 10), description: '' };
const emptyReconcile = { account_id: '', actual_balance: '', reconciliation_date: new Date().toISOString().slice(0, 10) };

const FinanceCash = () => {
  const access = useMenuPermission('/finance/cash');
  const [tab, setTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyAccount);
  const [modal, setModal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const notify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadAccounts = () => getCashAccounts().then((result) => setAccounts(asList(result))).catch((error) => notify(error.message, 'error'));

  const loadRows = () => {
    setLoading(true);
    const request = tab === 'accounts' ? getCashAccounts() : tab === 'movements' ? getCashMovements({ search, page, limit: meta.limit || 10 }) : getTransfers();
    request
      .then((result) => {
        setRows(asList(result));
        setMeta({ total: Number(result?.total || asList(result).length), page: Number(result?.page || 1), limit: 10 });
      })
      .catch((error) => notify(error.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!access.canView) return;
    loadAccounts();
    loadRows();
  }, [access.canView, tab, search, page, meta.limit]);

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const openModal = (type, row = null) => {
    const defaults = { accounts: emptyAccount, movements: emptyMovement, transfers: emptyTransfer, reconcile: emptyReconcile }[type];
    setForm(row ? { ...defaults, ...row, is_active: !!row.is_active } : { ...defaults, account_id: accounts[0]?.id ? String(accounts[0].id) : '', from_account_id: accounts[0]?.id ? String(accounts[0].id) : '', to_account_id: accounts[1]?.id ? String(accounts[1].id) : '' });
    setModal(type);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (modal === 'accounts') {
        const { id, ...rest } = payload;
        await saveCashAccount(id ? { id, ...rest } : rest);
      } else if (modal === 'movements') {
        await createCashMovement(payload);
      } else if (modal === 'transfers') {
        await createTransfer(payload);
      } else {
        await reconcileCash(payload.account_id, { actual_balance: payload.actual_balance, reconciliation_date: payload.reconciliation_date });
      }
      notify('Data berhasil disimpan.');
      setModal('');
      loadAccounts();
      loadRows();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Hapus rekening ${row.name}?`)) return;
    try {
      await deleteCashAccount(row.id);
      notify('Rekening dihapus.');
      loadAccounts();
      loadRows();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const accountColumns = [
    { key: 'code', label: 'Kode', render: (row) => <span className="font-bold text-slate-700">{row.code}</span> },
    { key: 'name', label: 'Nama Rekening' },
    { key: 'account_type', label: 'Jenis', render: (row) => <span className="capitalize">{row.account_type}</span> },
    { key: 'account_number', label: 'No. Rekening' },
    { key: 'current_balance', label: 'Saldo', align: 'right', render: (row) => idr(row.current_balance) },
    { key: 'is_active', label: 'Status', render: (row) => <StatusBadge value={row.is_active ? 'active' : 'inactive'} /> },
    { key: 'actions', label: 'Aksi', align: 'right', render: (row) => (
      <div className="flex items-center justify-end gap-1">
        <FinanceButton onClick={() => openModal('accounts', row)}>Ubah</FinanceButton>
        <FinanceButton onClick={() => openModal('reconcile', { account_id: row.id })}><RefreshCcw className="h-3.5 w-3.5" /> Rekonsiliasi</FinanceButton>
        {access.canDelete ? <FinanceButton variant="danger" onClick={() => remove(row)}><Trash2 className="h-3.5 w-3.5" /></FinanceButton> : null}
      </div>
    ) }
  ];

  const movementColumns = [
    { key: 'movement_date', label: 'Tanggal', render: (row) => dateLabel(row.movement_date) },
    { key: 'account_name', label: 'Rekening' },
    { key: 'movement_type', label: 'Jenis', render: (row) => <span className="capitalize">{String(row.movement_type).replace(/_/g, ' ')}</span> },
    { key: 'description', label: 'Keterangan' },
    { key: 'direction', label: 'Arah', render: (row) => <StatusBadge value={Number(row.direction) > 0 ? 'posted' : 'rejected'} /> },
    { key: 'amount', label: 'Nominal', align: 'right', render: (row) => idr(row.amount) },
    { key: 'balance_after', label: 'Saldo Setelah', align: 'right', render: (row) => idr(row.balance_after) }
  ];

  const transferColumns = [
    { key: 'transfer_no', label: 'No. Transfer' },
    { key: 'transfer_date', label: 'Tanggal', render: (row) => dateLabel(row.transfer_date) },
    { key: 'from_account', label: 'Dari' },
    { key: 'to_account', label: 'Ke' },
    { key: 'description', label: 'Keterangan' },
    { key: 'amount', label: 'Nominal', align: 'right', render: (row) => idr(row.amount) }
  ];

  const columns = tab === 'accounts' ? accountColumns : tab === 'movements' ? movementColumns : transferColumns;
  const modalTitle = { accounts: editingTitle(), movements: 'Mutasi Kas Baru', transfers: 'Transfer Antar Rekening', reconcile: 'Rekonsiliasi Rekening' }[modal];

  function editingTitle() {
    return form.id ? 'Ubah Rekening' : 'Rekening Baru';
  }

  const accountOptions = accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>);

  return (
    <FinanceLayout
      title="Kas dan Rekening"
      subtitle="Kelola kas, rekening bank, mutasi, dan rekonsiliasi"
      notification={notification}
      onDismissNotification={() => setNotification(null)}
      actions={[
        access.canCreate ? <FinanceButton key="add" variant="primary" onClick={() => openModal(tab)}><Plus className="h-4 w-4" /> Tambah</FinanceButton> : null
      ].filter(Boolean)}
    >
      <div className="flex flex-wrap gap-2">
        {[
          ['accounts', 'Rekening / Kas', Landmark],
          ['movements', 'Mutasi Kas', Repeat2],
          ['transfers', 'Transfer', Wallet]
        ].map(([key, label, Icon]) => (
          <FinanceButton key={key} variant={tab === key ? 'primary' : 'secondary'} onClick={() => { setTab(key); setPage(1); }}>
            {Icon ? <Icon className="h-4 w-4" /> : null} {label}
          </FinanceButton>
        ))}
      </div>

      {tab === 'movements' ? (
        <FinanceCard title="Filter Mutasi" subtitle="Cari mutasi kas berdasarkan keterangan atau rekening">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className={`${inputClass} pl-9`} placeholder="Cari mutasi..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
            </div>
          </div>
        </FinanceCard>
      ) : null}

      <FinanceTable columns={columns} rows={rows} loading={loading} emptyText="Belum ada data." page={meta.page} limit={meta.limit} />
      <FinancePagination page={meta.page} total={meta.total} limit={meta.limit} onPageChange={setPage} onPageSizeChange={(size) => setMeta({ ...meta, page: 1, limit: Number(size) })} />

      <FinanceModal open={!!modal} title={modalTitle || ''} onClose={() => setModal('')} onSubmit={submit} submitting={submitting}>
        {modal === 'accounts' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FinanceField label="Kode"><input required className={inputClass} value={form.code} onChange={(event) => update('code', event.target.value)} /></FinanceField>
            <FinanceField label="Nama"><input required className={inputClass} value={form.name} onChange={(event) => update('name', event.target.value)} /></FinanceField>
            <FinanceField label="Jenis">
              <select className={inputClass} value={form.account_type} onChange={(event) => update('account_type', event.target.value)}>
                <option value="cash">Kas</option><option value="bank">Bank</option><option value="other">Lainnya</option>
              </select>
            </FinanceField>
            <FinanceField label="Kode Akun">
              <select className={inputClass} value={form.coa_code} onChange={(event) => update('coa_code', event.target.value)}>
                <option value="101">101 - Kas</option><option value="102">102 - Bank</option>
              </select>
            </FinanceField>
            <FinanceField label="Nama Bank"><input className={inputClass} value={form.bank_name} onChange={(event) => update('bank_name', event.target.value)} /></FinanceField>
            <FinanceField label="No. Rekening"><input className={inputClass} value={form.account_number} onChange={(event) => update('account_number', event.target.value)} /></FinanceField>
            <FinanceField label="Atas Nama"><input className={inputClass} value={form.owner_name} onChange={(event) => update('owner_name', event.target.value)} /></FinanceField>
            <FinanceField label="Saldo Awal"><input type="number" className={inputClass} value={form.opening_balance} onChange={(event) => update('opening_balance', event.target.value)} /></FinanceField>
            <FinanceField label="Aktif">
              <select className={inputClass} value={form.is_active ? '1' : '0'} onChange={(event) => update('is_active', event.target.value === '1')}>
                <option value="1">Aktif</option><option value="0">Nonaktif</option>
              </select>
            </FinanceField>
          </div>
        ) : null}
        {modal === 'movements' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FinanceField label="Rekening"><select required className={inputClass} value={form.account_id} onChange={(event) => update('account_id', event.target.value)}>{accountOptions}</select></FinanceField>
            <FinanceField label="Arah"><select className={inputClass} value={form.direction} onChange={(event) => update('direction', Number(event.target.value))}><option value="1">Kas Masuk</option><option value="-1">Kas Keluar</option></select></FinanceField>
            <FinanceField label="Tanggal"><input type="date" required className={inputClass} value={form.movement_date} onChange={(event) => update('movement_date', event.target.value)} /></FinanceField>
            <FinanceField label="Nominal"><input type="number" min="1" required className={inputClass} value={form.amount} onChange={(event) => update('amount', event.target.value)} /></FinanceField>
            <FinanceField label="Keterangan" className="sm:col-span-2"><textarea rows="2" className={inputClass} value={form.description} onChange={(event) => update('description', event.target.value)} /></FinanceField>
          </div>
        ) : null}
        {modal === 'transfers' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FinanceField label="Dari Rekening"><select required className={inputClass} value={form.from_account_id} onChange={(event) => update('from_account_id', event.target.value)}>{accountOptions}</select></FinanceField>
            <FinanceField label="Ke Rekening"><select required className={inputClass} value={form.to_account_id} onChange={(event) => update('to_account_id', event.target.value)}>{accountOptions}</select></FinanceField>
            <FinanceField label="Tanggal"><input type="date" required className={inputClass} value={form.transfer_date} onChange={(event) => update('transfer_date', event.target.value)} /></FinanceField>
            <FinanceField label="Nominal"><input type="number" min="1" required className={inputClass} value={form.amount} onChange={(event) => update('amount', event.target.value)} /></FinanceField>
            <FinanceField label="Keterangan" className="sm:col-span-2"><input className={inputClass} value={form.description} onChange={(event) => update('description', event.target.value)} /></FinanceField>
          </div>
        ) : null}
        {modal === 'reconcile' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FinanceField label="Rekening">
              <select required className={inputClass} value={form.account_id} onChange={(event) => update('account_id', event.target.value)}>
                <option value="">Pilih rekening</option>{accountOptions}
              </select>
            </FinanceField>
            <FinanceField label="Tanggal"><input type="date" required className={inputClass} value={form.reconciliation_date} onChange={(event) => update('reconciliation_date', event.target.value)} /></FinanceField>
            <FinanceField label="Saldo Aktual"><input type="number" required className={inputClass} value={form.actual_balance} onChange={(event) => update('actual_balance', event.target.value)} /></FinanceField>
          </div>
        ) : null}
      </FinanceModal>
    </FinanceLayout>
  );
};

export default FinanceCash;
