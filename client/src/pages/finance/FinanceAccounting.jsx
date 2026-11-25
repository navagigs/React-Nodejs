import React, { useEffect, useState } from 'react';
import { Plus, RotateCcw, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMenuPermission } from '../../permissions';
import {
  cancelJournal,
  createManualJournal,
  getAccounts,
  getJournalDetail,
  getJournals,
  getLedger,
  getTrialBalance,
  saveAccount
} from '../../financeApi';
import { asList, dateLabel, idr, statusClass } from '../../financeUtils';
import FinanceLayout, { FinanceButton, FinanceCard, FinanceField, inputClass } from '../../components/finance/FinanceLayout';
import { FinancePagination, FinanceTable, StatusBadge } from '../../components/finance/FinanceTable';
import FinanceModal from '../../components/finance/FinanceModal';

const today = new Date().toISOString().slice(0, 10);
const emptyAccount = { code: '', name: '', account_group: 'asset', sub_group: '', normal_balance: 'debit', is_active: true };
const emptyJournal = { journal_date: today, description: '', debit_code: '', credit_code: '', amount: '', memo: '' };

const modeByPath = (path) => {
  if (path.endsWith('/accounts')) return 'accounts';
  if (path.endsWith('/journals')) return 'journals';
  if (path.endsWith('/ledger')) return 'ledger';
  return 'trial-balance';
};

const FinanceAccounting = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = modeByPath(location.pathname);
  const access = useMenuPermission(`/finance/${mode === 'trial-balance' ? 'trial-balance' : mode}`);
  const [accounts, setAccounts] = useState([]);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [trial, setTrial] = useState(null);
  const [ledgerMeta, setLedgerMeta] = useState(null);
  const [filters, setFilters] = useState({ search: '', from: '', to: '', page: 1, account_id: '', as_of: today });
  const [form, setForm] = useState(emptyAccount);
  const [journalForm, setJournalForm] = useState(emptyJournal);
  const [modal, setModal] = useState('');
  const [detail, setDetail] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  const notify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadAccounts = () => getAccounts().then((result) => {
    const list = asList(result);
    setAccounts(list);
    if (!filters.account_id && list.length) setFilters((previous) => ({ ...previous, account_id: String(list[0].id) }));
  }).catch((error) => notify(error.message, 'error'));

  const load = () => {
    if (!access.canView) return;
    if (mode === 'accounts') return;
    setLoading(true);
    if (mode === 'journals') {
      getJournals({ search: filters.search, from: filters.from, to: filters.to, page: filters.page, limit: 10 })
        .then((result) => {
          setRows(asList(result));
          setMeta({ total: Number(result?.total || 0), page: Number(result?.page || 1), limit: 10 });
        })
        .catch((error) => notify(error.message, 'error'))
        .finally(() => setLoading(false));
    } else if (mode === 'ledger') {
      if (!filters.account_id) { setLoading(false); return; }
      getLedger({ account_id: filters.account_id, from: filters.from, to: filters.to })
        .then((result) => {
          setRows(asList(result));
          setLedgerMeta(result);
          if (result?.total !== undefined) setMeta({ total: Number(result.total || 0), page: Number(result.page || 1), limit: 10 });
        })
        .catch((error) => { notify(error.message, 'error'); setRows([]); })
        .finally(() => setLoading(false));
    } else {
      getTrialBalance({ as_of: filters.as_of })
        .then((result) => {
          setTrial(result);
          setRows(asList(result));
          if (result?.total !== undefined) setMeta({ total: Number(result.total || 0), page: Number(result.page || 1), limit: 10 });
        })
        .catch((error) => notify(error.message, 'error'))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => { loadAccounts(); }, [access.canView]);
  useEffect(() => { load(); }, [access.canView, mode, filters.search, filters.from, filters.to, filters.page, filters.account_id, filters.as_of]);

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const updateJournal = (key, value) => setJournalForm((previous) => ({ ...previous, [key]: value }));

  const openAccount = (row = null) => {
    setForm(row ? { ...emptyAccount, ...row } : emptyAccount);
    setModal('account');
  };

  const submitAccount = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await saveAccount(form);
      notify('Akun berhasil disimpan.');
      setModal('');
      loadAccounts();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitJournal = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await createManualJournal({
        journal_date: journalForm.journal_date,
        description: journalForm.description || 'Jurnal manual',
        lines: [
          { code: journalForm.debit_code, debit: journalForm.amount, credit: 0, description: journalForm.memo },
          { code: journalForm.credit_code, debit: 0, credit: journalForm.amount, description: journalForm.memo }
        ]
      });
      notify('Jurnal berhasil diposting.');
      setJournalForm(emptyJournal);
      setModal('');
      load();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (row) => {
    if (!window.confirm(`Batalkan jurnal ${row.journal_no}? Jurnal koreksi akan dibuat otomatis.`)) return;
    try {
      const reason = window.prompt('Alasan pembatalan', 'Pembatalan jurnal');
      const result = await cancelJournal(row.id, { reason });
      notify(result?.message || 'Jurnal dibatalkan.');
      load();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const openDetail = async (row) => {
    try {
      const result = await getJournalDetail(row.id);
      setDetail(result?.data || null);
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const accountOptions = accounts.map((account) => <option key={account.id} value={account.account_group === 'asset' ? account.code : account.code}>{account.code} - {account.name}</option>);

  const accountColumns = [
    { key: 'code', label: 'Kode', render: (row) => <span className="font-bold text-slate-700">{row.code}</span> },
    { key: 'name', label: 'Nama Akun' },
    { key: 'account_group', label: 'Kelompok', render: (row) => <span className="capitalize">{row.account_group}</span> },
    { key: 'sub_group', label: 'Sub Kelompok' },
    { key: 'normal_balance', label: 'Saldo Normal', render: (row) => <span className="capitalize">{row.normal_balance}</span> },
    { key: 'is_active', label: 'Status', render: (row) => <StatusBadge value={row.is_active ? 'active' : 'inactive'} /> },
    { key: 'actions', label: 'Aksi', align: 'right', render: (row) => (
      <div className="flex items-center justify-end gap-1">
        {access.canEdit ? <FinanceButton onClick={() => openAccount(row)}>Ubah</FinanceButton> : null}
      </div>
    ) }
  ];

  const journalColumns = [
    { key: 'journal_no', label: 'No. Jurnal', render: (row) => <span className="font-bold text-slate-700">{row.journal_no}</span> },
    { key: 'journal_date', label: 'Tanggal', render: (row) => dateLabel(row.journal_date) },
    { key: 'description', label: 'Keterangan' },
    { key: 'reference_type', label: 'Sumber', render: (row) => <span className="capitalize">{String(row.reference_type || 'manual').replace(/_/g, ' ')}</span> },
    { key: 'total_debit', label: 'Debit', align: 'right', render: (row) => idr(row.total_debit) },
    { key: 'status', label: 'Status', render: (row) => <span className={`rounded-full border px-2 py-1 text-[11px] font-bold capitalize ${statusClass(row.status)}`}>{row.status}</span> },
    { key: 'actions', label: 'Aksi', align: 'right', render: (row) => (
      <div className="flex items-center justify-end gap-1">
        <FinanceButton onClick={() => openDetail(row)}>Detail</FinanceButton>
        {row.status === 'posted' && !row.cancelled_at && access.canEdit ? <FinanceButton variant="danger" onClick={() => cancel(row)}><RotateCcw className="h-3.5 w-3.5" /> Batal</FinanceButton> : null}
      </div>
    ) }
  ];

  const ledgerColumns = [
    { key: 'journal_date', label: 'Tanggal', render: (row) => dateLabel(row.journal_date) },
    { key: 'journal_no', label: 'No. Jurnal' },
    { key: 'description', label: 'Keterangan' },
    { key: 'debit', label: 'Debit', align: 'right', render: (row) => idr(row.debit) },
    { key: 'credit', label: 'Kredit', align: 'right', render: (row) => idr(row.credit) },
    { key: 'balance', label: 'Saldo', align: 'right', render: (row) => <span className="font-bold text-slate-800">{idr(row.balance)}</span> }
  ];

  const trialColumns = [
    { key: 'code', label: 'Kode' },
    { key: 'name', label: 'Nama Akun' },
    { key: 'debit', label: 'Debit', align: 'right', render: (row) => Number(row.debit_value) ? idr(row.debit) : '-' },
    { key: 'credit', label: 'Kredit', align: 'right', render: (row) => Number(row.credit_value) ? idr(row.credit) : '-' }
  ];

  const titles = { accounts: ['Chart of Accounts', 'Daftar akun pembukuan perusahaan'], journals: ['Jurnal Umum', 'Semua jurnal transaksi yang telah diposting'], ledger: ['Buku Besar', 'Mutasi detail per akun'], 'trial-balance': ['Neraca Saldo', 'Saldo seluruh akun pada tanggal tertentu'] };

  return (
    <FinanceLayout
      title={titles[mode][0]}
      subtitle={titles[mode][1]}
      notification={notification}
      onDismissNotification={() => setNotification(null)}
      actions={[
        mode === 'accounts' && access.canCreate ? <FinanceButton key="account" variant="primary" onClick={() => openAccount()}><Plus className="h-4 w-4" /> Tambah</FinanceButton> : null,
        mode === 'journals' && access.canCreate ? <FinanceButton key="journal" variant="primary" onClick={() => setModal('journal')}><Plus className="h-4 w-4" /> Tambah</FinanceButton> : null
      ].filter(Boolean)}
    >
      <div className="flex flex-wrap gap-2">
        {[
          ['accounts', 'COA'], ['journals', 'Jurnal'], ['ledger', 'Buku Besar'], ['trial-balance', 'Neraca Saldo']
        ].map(([key, label]) => (
          <FinanceButton key={key} variant={mode === key ? 'primary' : 'secondary'} onClick={() => navigate(`/finance/${key}`)}>
            {label}
          </FinanceButton>
        ))}
      </div>

      {mode === 'journals' ? (
        <FinanceCard title="Filter Jurnal" subtitle="Cari berdasarkan nomor, tanggal, atau keterangan jurnal">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="relative xl:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={`${inputClass} pl-9`} placeholder="Cari jurnal..." value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })} /></div>
            <input type="date" className={inputClass} value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value, page: 1 })} />
            <input type="date" className={inputClass} value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value, page: 1 })} />
          </div>
        </FinanceCard>
      ) : null}

      {mode === 'ledger' ? (
        <FinanceCard title="Filter Buku Besar" subtitle="Pilih akun dan rentang tanggal mutasi yang ingin dilihat">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <select className={`${inputClass} xl:col-span-2`} value={filters.account_id} onChange={(event) => setFilters({ ...filters, account_id: event.target.value })}>
              <option value="">Pilih akun</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}
            </select>
            <input type="date" className={inputClass} value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
            <input type="date" className={inputClass} value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
          </div>
          {ledgerMeta?.account ? <p className="mt-3 text-sm text-slate-500">Akun <strong>{ledgerMeta.account.code} - {ledgerMeta.account.name}</strong> · Saldo akhir <strong>{idr(ledgerMeta.ending_balance)}</strong></p> : null}
        </FinanceCard>
      ) : null}

      {mode === 'trial-balance' ? (
        <FinanceCard title="Filter Neraca Saldo" subtitle="Tampilkan saldo seluruh akun pada tanggal tertentu">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <input type="date" className={inputClass} value={filters.as_of} onChange={(event) => setFilters({ ...filters, as_of: event.target.value })} />
          </div>
          {trial ? <p className={`mt-3 text-sm font-bold ${trial.balanced ? 'text-emerald-600' : 'text-rose-600'}`}>{trial.balanced ? 'Neraca seimbang' : 'Neraca tidak seimbang'} · Debit {idr(trial.total_debit)} · Kredit {idr(trial.total_credit)}</p> : null}
        </FinanceCard>
      ) : null}

      <FinanceTable columns={mode === 'accounts' ? accountColumns : mode === 'journals' ? journalColumns : mode === 'ledger' ? ledgerColumns : trialColumns} rows={rows} loading={loading} emptyText="Belum ada data." page={meta.page} limit={meta.limit} />
      <FinancePagination page={meta.page} total={meta.total} limit={meta.limit} onPageChange={(page) => setFilters({ ...filters, page })} />

      <FinanceModal open={modal === 'account'} title={form.id ? 'Ubah Akun' : 'Akun Baru'} onClose={() => setModal('')} onSubmit={submitAccount} submitting={submitting}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FinanceField label="Kode"><input required className={inputClass} value={form.code} onChange={(event) => update('code', event.target.value)} /></FinanceField>
          <FinanceField label="Nama Akun"><input required className={inputClass} value={form.name} onChange={(event) => update('name', event.target.value)} /></FinanceField>
          <FinanceField label="Kelompok">
            <select className={inputClass} value={form.account_group} onChange={(event) => update('account_group', event.target.value)}>
              {['asset', 'liability', 'equity', 'revenue', 'expense'].map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
          </FinanceField>
          <FinanceField label="Sub Kelompok"><input className={inputClass} value={form.sub_group || ''} onChange={(event) => update('sub_group', event.target.value)} /></FinanceField>
          <FinanceField label="Saldo Normal">
            <select className={inputClass} value={form.normal_balance} onChange={(event) => update('normal_balance', event.target.value)}>
              <option value="debit">Debit</option><option value="credit">Kredit</option>
            </select>
          </FinanceField>
        </div>
      </FinanceModal>

      <FinanceModal open={modal === 'journal'} title="Jurnal Manual" onClose={() => setModal('')} onSubmit={submitJournal} submitting={submitting}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FinanceField label="Tanggal"><input type="date" required className={inputClass} value={journalForm.journal_date} onChange={(event) => updateJournal('journal_date', event.target.value)} /></FinanceField>
          <FinanceField label="Nominal"><input type="number" min="1" required className={inputClass} value={journalForm.amount} onChange={(event) => updateJournal('amount', event.target.value)} /></FinanceField>
          <FinanceField label="Akun Debit"><select required className={inputClass} value={journalForm.debit_code} onChange={(event) => updateJournal('debit_code', event.target.value)}><option value="">Pilih akun</option>{accountOptions}</select></FinanceField>
          <FinanceField label="Akun Kredit"><select required className={inputClass} value={journalForm.credit_code} onChange={(event) => updateJournal('credit_code', event.target.value)}><option value="">Pilih akun</option>{accountOptions}</select></FinanceField>
          <FinanceField label="Keterangan" className="sm:col-span-2"><input className={inputClass} value={journalForm.description} onChange={(event) => updateJournal('description', event.target.value)} /></FinanceField>
          <FinanceField label="Memo Baris" className="sm:col-span-2"><input className={inputClass} value={journalForm.memo} onChange={(event) => updateJournal('memo', event.target.value)} /></FinanceField>
        </div>
      </FinanceModal>

      <FinanceModal open={!!detail} title={detail?.journal_no || 'Detail Jurnal'} onClose={() => setDetail(null)} onSubmit={(event) => event.preventDefault()} submitLabel="Tutup">
        {detail ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-wrap justify-between gap-2 text-sm text-slate-500 sm:col-span-2">
              <span>{dateLabel(detail.journal_date)} · {detail.description}</span>
              <span className="font-bold">{idr(detail.total_debit)}</span>
            </div>
            <div className="sm:col-span-2">
              <FinanceTable columns={[
                { key: 'code', label: 'Kode', render: (row) => <span className="font-bold">{row.code}</span> },
                { key: 'account_name', label: 'Akun' },
                { key: 'debit', label: 'Debit', align: 'right', render: (row) => idr(row.debit) },
                { key: 'credit', label: 'Kredit', align: 'right', render: (row) => idr(row.credit) },
                { key: 'description', label: 'Keterangan' }
              ]} rows={detail.lines || []} loading={loading} />
            </div>
          </div>
        ) : null}
      </FinanceModal>
    </FinanceLayout>
  );
};

export default FinanceAccounting;
