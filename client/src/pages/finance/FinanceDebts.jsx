import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Wallet } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useMenuPermission } from '../../permissions';
import {
  deleteDebt,
  deleteReceivable,
  getDebtPayments,
  getDebts,
  getReceivablePayments,
  getReceivables,
  payDebt,
  payReceivable,
  saveDebt,
  saveReceivable
} from '../../financeApi';
import useFinanceBootstrap from '../../useFinanceBootstrap';
import { asList, dateLabel, idr, statusClass } from '../../financeUtils';
import FinanceLayout, { FinanceButton, FinanceCard, FinanceField, inputClass } from '../../components/finance/FinanceLayout';
import { FinancePagination, FinanceTable, StatusBadge } from '../../components/finance/FinanceTable';
import FinanceModal from '../../components/finance/FinanceModal';

const today = new Date().toISOString().slice(0, 10);

const emptyDebt = { creditor_name: '', debt_date: today, due_date: today, amount: '', description: '', account_id: '', notes: '' };
const emptyReceivable = { invoice_no: '', customer_name: '', invoice_date: today, due_date: today, amount: '', description: '', account_id: '', notes: '' };
const emptyPayment = { amount: '', account_id: '', payment_date: today, description: '' };

const FinanceDebts = () => {
  const location = useLocation();
  const isDebt = location.pathname.endsWith('/debts');
  const menuPath = isDebt ? '/finance/debts' : '/finance/receivables';
  const access = useMenuPermission(menuPath);
  const { bootstrap } = useFinanceBootstrap();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState(isDebt ? emptyDebt : emptyReceivable);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const notify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const load = () => {
    if (!access.canView) return;
    setLoading(true);
    const request = isDebt ? getDebts() : getReceivables();
    request
      .then((result) => {
        setRows(asList(result));
        setMeta({ total: Number(result?.total || 0), page: Number(result?.page || 1), limit: 10 });
      })
      .catch((error) => notify(error.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [access.canView, isDebt]);

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const updatePayment = (key, value) => setPaymentForm((previous) => ({ ...previous, [key]: value }));

  const open = (row = null) => {
    const base = isDebt ? emptyDebt : emptyReceivable;
    setForm(row ? { ...base, ...row } : { ...base, account_id: bootstrap.cash_accounts[0]?.id ? String(bootstrap.cash_accounts[0].id) : '' });
    setSelected(row);
    setModal('form');
  };

  const openPayment = async (row) => {
    setSelected(row);
    setPaymentForm({ ...emptyPayment, account_id: row.account_id ? String(row.account_id) : bootstrap.cash_accounts[0]?.id ? String(bootstrap.cash_accounts[0].id) : '', amount: String(row.remaining || '') });
    setModal('payment');
    try {
      const result = isDebt ? await getDebtPayments(row.id) : await getReceivablePayments(row.id);
      setPayments(asList(result));
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.account_id) delete payload.account_id;
      const saver = isDebt ? saveDebt : saveReceivable;
      await saver(payload);
      notify('Data berhasil disimpan.');
      setModal('');
      load();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...paymentForm };
      if (!payload.account_id) delete payload.account_id;
      if (isDebt) await payDebt(selected.id, payload);
      else await payReceivable(selected.id, payload);
      notify('Pembayaran berhasil dicatat.');
      setModal('');
      load();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm('Hapus data ini?')) return;
    try {
      if (isDebt) await deleteDebt(row.id);
      else await deleteReceivable(row.id);
      notify('Data dihapus.');
      load();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const columns = [
    { key: 'number', label: isDebt ? 'No. Utang' : 'No. Invoice', render: (row) => <span className="font-bold text-slate-700">{isDebt ? row.transaction_no : row.invoice_no}</span> },
    { key: 'party', label: isDebt ? 'Kreditur' : 'Pelanggan', render: (row) => isDebt ? row.creditor_name : row.customer_name },
    { key: 'date', label: 'Tanggal', render: (row) => dateLabel(isDebt ? row.debt_date : row.invoice_date) },
    { key: 'due_date', label: 'Jatuh Tempo', render: (row) => dateLabel(row.due_date) },
    { key: 'amount', label: 'Nominal', align: 'right', render: (row) => idr(row.amount) },
    { key: 'paid_amount', label: 'Sudah Dibayar', align: 'right', render: (row) => idr(row.paid_amount) },
    { key: 'remaining', label: 'Sisa', align: 'right', render: (row) => <span className="font-bold text-slate-800">{idr(row.remaining)}</span> },
    { key: 'status', label: 'Status', render: (row) => <span className={`rounded-full border px-2 py-1 text-[11px] font-bold capitalize ${statusClass(row.status)}`}>{row.status}</span> },
    { key: 'actions', label: 'Aksi', align: 'right', render: (row) => (
      <div className="flex items-center justify-end gap-1">
        {Number(row.remaining) > 0 && access.canEdit ? <FinanceButton variant="success" onClick={() => openPayment(row)}><Wallet className="h-3.5 w-3.5" /> Bayar</FinanceButton> : null}
        {access.canEdit ? <FinanceButton onClick={() => open(row)}>Ubah</FinanceButton> : null}
        {access.canDelete ? <FinanceButton variant="danger" onClick={() => remove(row)}><Trash2 className="h-3.5 w-3.5" /></FinanceButton> : null}
      </div>
    ) }
  ];

  return (
    <FinanceLayout
      title={isDebt ? 'Utang Perusahaan' : 'Piutang Perusahaan'}
      subtitle={isDebt ? 'Pantau utang dan pembayaran kepada kreditur' : 'Pantau invoice dan penerimaan dari pelanggan'}
      notification={notification}
      onDismissNotification={() => setNotification(null)}
      actions={[
        access.canCreate ? <FinanceButton key="add" variant="primary" onClick={() => open()}><Plus className="h-4 w-4" /> Tambah</FinanceButton> : null
      ].filter(Boolean)}
    >
      <FinanceTable columns={columns} rows={rows} loading={loading} emptyText={`Belum ada data ${isDebt ? 'utang' : 'piutang'}.`} page={meta.page} limit={meta.limit} />
      <FinancePagination page={meta.page} total={meta.total} limit={meta.limit} onPageChange={(page) => setMeta({ ...meta, page })} onPageSizeChange={(size) => setMeta({ ...meta, page: 1, limit: Number(size) })} />

      <FinanceModal open={modal === 'form'} title={form.id ? 'Ubah Data' : `Tambah ${isDebt ? 'Utang' : 'Piutang'}`} onClose={() => setModal('')} onSubmit={submit} submitting={submitting}>
        <div className="grid gap-4 sm:grid-cols-2">
          {isDebt ? (
            <FinanceField label="Kreditur"><input required className={inputClass} value={form.creditor_name || ''} onChange={(event) => update('creditor_name', event.target.value)} /></FinanceField>
          ) : (
            <>
              <FinanceField label="No. Invoice"><input required className={inputClass} value={form.invoice_no || ''} onChange={(event) => update('invoice_no', event.target.value)} /></FinanceField>
              <FinanceField label="Pelanggan"><input required className={inputClass} value={form.customer_name || ''} onChange={(event) => update('customer_name', event.target.value)} /></FinanceField>
            </>
          )}
          <FinanceField label={isDebt ? 'Tanggal Utang' : 'Tanggal Invoice'}><input type="date" required className={inputClass} value={isDebt ? form.debt_date : form.invoice_date} onChange={(event) => update(isDebt ? 'debt_date' : 'invoice_date', event.target.value)} /></FinanceField>
          <FinanceField label="Jatuh Tempo"><input type="date" required className={inputClass} value={form.due_date} onChange={(event) => update('due_date', event.target.value)} /></FinanceField>
          <FinanceField label="Nominal"><input type="number" min="1" required className={inputClass} value={form.amount || ''} onChange={(event) => update('amount', event.target.value)} /></FinanceField>
          <FinanceField label="Rekening Terkait">
            <select className={inputClass} value={form.account_id || ''} onChange={(event) => update('account_id', event.target.value)}>
              <option value="">Pilih rekening</option>
              {bootstrap.cash_accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </FinanceField>
          <FinanceField label="Keterangan" className="sm:col-span-2"><textarea rows="2" className={inputClass} value={form.description || ''} onChange={(event) => update('description', event.target.value)} /></FinanceField>
        </div>
      </FinanceModal>

      <FinanceModal open={modal === 'payment'} title={isDebt ? 'Pembayaran Utang' : 'Penerimaan Piutang'} onClose={() => setModal('')} onSubmit={submitPayment} submitting={submitting}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FinanceField label="Nominal"><input type="number" min="1" required className={inputClass} value={paymentForm.amount} onChange={(event) => updatePayment('amount', event.target.value)} /></FinanceField>
          <FinanceField label="Tanggal"><input type="date" required className={inputClass} value={paymentForm.payment_date} onChange={(event) => updatePayment('payment_date', event.target.value)} /></FinanceField>
          <FinanceField label="Rekening">
            <select required className={inputClass} value={paymentForm.account_id} onChange={(event) => updatePayment('account_id', event.target.value)}>
              <option value="">Pilih rekening</option>
              {bootstrap.cash_accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </FinanceField>
          <FinanceField label="Keterangan" className="sm:col-span-2"><input className={inputClass} value={paymentForm.description} onChange={(event) => updatePayment('description', event.target.value)} /></FinanceField>
          <div className="sm:col-span-2">
            <FinanceCard title="Riwayat Pembayaran">
              <FinanceTable columns={[
                { key: 'payment_date', label: 'Tanggal', render: (row) => dateLabel(row.payment_date) },
                { key: 'amount', label: 'Nominal', align: 'right', render: (row) => idr(row.amount) },
                { key: 'description', label: 'Keterangan' }
              ]} rows={payments} loading={loading} emptyText="Belum ada pembayaran." />
              <FinancePagination page={meta.page} total={meta.total} limit={meta.limit} onPageChange={(page) => setMeta({ ...meta, page })} onPageSizeChange={(size) => setMeta({ ...meta, page: 1, limit: Number(size) })} />
            </FinanceCard>
          </div>
        </div>
      </FinanceModal>
    </FinanceLayout>
  );
};

export default FinanceDebts;
