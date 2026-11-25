import React, { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMenuPermission } from '../../permissions';
import {
  fiscalPeriodAction,
  getFinanceApprovals,
  getFinanceAudit,
  getFinanceSettings,
  getFiscalPeriods,
  ensureFiscalPeriods,
  markFinanceNotificationRead,
  getFinanceNotifications,
  saveFinanceSettings,
  transactionAction,
  payrollPeriodAction
} from '../../financeApi';
import { asList, dateLabel, dateTimeLabel, idr, periodOptions } from '../../financeUtils';
import FinanceLayout, { FinanceButton, FinanceCard, FinanceField, inputClass } from '../../components/finance/FinanceLayout';
import { FinancePagination, FinanceTable, StatusBadge } from '../../components/finance/FinanceTable';

const modeByPath = (path) => path.endsWith('/approvals') ? 'approvals' : path.endsWith('/audit') ? 'audit' : 'settings';

const asJsonText = (value, fallback) => {
  if (typeof value === 'string' && value.trim()) return value;
  return JSON.stringify(fallback, null, 2);
};

const FinanceSettings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = modeByPath(location.pathname);
  const access = useMenuPermission(`/finance/${mode}`);
  const [settings, setSettings] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [newPeriod, setNewPeriod] = useState(periodOptions()[0]?.value || '');
  const [approvals, setApprovals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const notify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadSettings = () => {
    getFinanceSettings().then((result) => setSettings(result?.data || null)).catch((error) => notify(error.message, 'error'));
    getFiscalPeriods().then((result) => setPeriods(asList(result))).catch((error) => notify(error.message, 'error'));
  };

  const loadApprovals = () => {
    getFinanceApprovals().then((result) => {
      setApprovals(asList(result));
      setNotifications(asList(result?.notifications || []));
    }).catch((error) => notify(error.message, 'error'));
    getFinanceNotifications().then((result) => setNotifications(asList(result))).catch(() => {});
  };

  const loadAudit = () => {
    getFinanceAudit({ page: auditPage, limit: 10 }).then((result) => {
      setAuditRows(asList(result));
      setAuditTotal(Number(result?.total || 0));
    }).catch((error) => notify(error.message, 'error'));
  };

  useEffect(() => {
    if (!access.canView) return;
    if (mode === 'settings') loadSettings();
    if (mode === 'approvals') loadApprovals();
    if (mode === 'audit') loadAudit();
  }, [access.canView, mode, auditPage]);

  const update = (key, value) => setSettings((previous) => ({ ...previous, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const parseJson = (value, fallback) => {
        try { return JSON.parse(value); } catch { return fallback; }
      };
      await saveFinanceSettings({
        company_name: settings.company_name,
        currency: settings.currency,
        approval_limit: settings.approval_limit,
        payroll_pay_day: settings.payroll_pay_day,
        reminder_days: settings.reminder_days,
        approver_roles: parseJson(settings.approver_roles, [1, 7, 8, 9]),
        income_coa_map: parseJson(settings.income_coa_map, {}),
        expense_coa_map: parseJson(settings.expense_coa_map, {})
      });
      notify('Pengaturan berhasil disimpan.');
      loadSettings();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const changePeriodStatus = async (row, action) => {
    try {
      const result = await fiscalPeriodAction(row.id, action);
      notify(result?.message || 'Status periode diperbarui.');
      loadSettings();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const approve = async (item) => {
    try {
      if (item.entity_type === 'payroll_period') {
        await payrollPeriodAction(item.id, 'approve');
      } else {
        const type = item.entity_type === 'income' ? 'incomes' : 'expenses';
        await transactionAction(type, item.id, 'approve');
      }
      notify('Persetujuan berhasil.');
      loadApprovals();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const markRead = async () => {
    try {
      await markFinanceNotificationRead();
      notify('Notifikasi ditandai dibaca.');
      loadApprovals();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const approvalColumns = [
    { key: 'number', label: 'Nomor / Periode' },
    { key: 'label', label: 'Keterangan' },
    { key: 'date', label: 'Tanggal', render: (row) => dateLabel(row.date) },
    { key: 'amount', label: 'Nominal', align: 'right', render: (row) => idr(row.amount) },
    { key: 'entity_type', label: 'Jenis', render: (row) => <span className="capitalize">{String(row.entity_type).replace(/_/g, ' ')}</span> },
    { key: 'actions', label: 'Aksi', align: 'right', render: (row) => access.canEdit ? <FinanceButton variant="success" onClick={() => approve(row)}><BadgeCheck className="h-3.5 w-3.5" /> Setujui</FinanceButton> : null }
  ];

  const auditColumns = [
    { key: 'created_at', label: 'Waktu', render: (row) => dateTimeLabel(row.created_at) },
    { key: 'user_name', label: 'Pengguna' },
    { key: 'entity_type', label: 'Entitas' },
    { key: 'action', label: 'Aksi', render: (row) => <span className="capitalize">{row.action}</span> },
    { key: 'old_values', label: 'Sebelum', render: (row) => <span className="line-clamp-1 text-xs text-slate-400">{row.old_values || '-'}</span> },
    { key: 'new_values', label: 'Sesudah', render: (row) => <span className="line-clamp-1 text-xs text-slate-400">{row.new_values || '-'}</span> }
  ];

  const periodColumns = [
    { key: 'period', label: 'Periode', render: (row) => <span className="font-bold text-slate-700">{row.period}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
    { key: 'closed_at', label: 'Ditutup', render: (row) => dateTimeLabel(row.closed_at) },
    { key: 'actions', label: 'Aksi', align: 'right', render: (row) => access.canEdit ? (
      row.status === 'closed'
        ? <FinanceButton onClick={() => changePeriodStatus(row, 'open')}>Buka Kembali</FinanceButton>
        : <FinanceButton variant="danger" onClick={() => changePeriodStatus(row, 'close')}>Tutup Periode</FinanceButton>
    ) : null }
  ];

  return (
    <FinanceLayout
      title={mode === 'settings' ? 'Pengaturan Keuangan' : mode === 'approvals' ? 'Persetujuan' : 'Audit Keuangan'}
      subtitle={mode === 'settings' ? 'Konfigurasi modul keuangan dan periode akuntansi' : mode === 'approvals' ? 'Antrian transaksi yang menunggu persetujuan' : 'Riwayat seluruh perubahan data keuangan'}
      notification={notification}
      onDismissNotification={() => setNotification(null)}
    >
      <div className="flex flex-wrap gap-2">
        {[
          ['settings', 'Pengaturan'],
          ['approvals', 'Persetujuan'],
          ['audit', 'Audit']
        ].map(([key, label]) => (
          <FinanceButton key={key} variant={mode === key ? 'primary' : 'secondary'} onClick={() => navigate(`/finance/${key}`)}>{label}</FinanceButton>
        ))}
      </div>

      {mode === 'settings' && settings ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <FinanceCard title="Pengaturan Umum">
            <form onSubmit={submit} className="space-y-4">
              <FinanceField label="Nama Perusahaan"><input className={inputClass} value={settings.company_name || ''} onChange={(event) => update('company_name', event.target.value)} /></FinanceField>
              <div className="grid gap-4 sm:grid-cols-3">
                <FinanceField label="Mata Uang"><input className={inputClass} value={settings.currency || ''} onChange={(event) => update('currency', event.target.value)} /></FinanceField>
                <FinanceField label="Batas Persetujuan"><input type="number" className={inputClass} value={settings.approval_limit || ''} onChange={(event) => update('approval_limit', event.target.value)} /></FinanceField>
                <FinanceField label="Tanggal Gaji"><input type="number" min="1" max="28" className={inputClass} value={settings.payroll_pay_day || ''} onChange={(event) => update('payroll_pay_day', event.target.value)} /></FinanceField>
              </div>
              <FinanceField label="Hari Peringatan Jatuh Tempo"><input type="number" className={inputClass} value={settings.reminder_days || ''} onChange={(event) => update('reminder_days', event.target.value)} /></FinanceField>
              <FinanceField label="Role Persetujuan (JSON array)"><textarea rows="2" className={inputClass} value={asJsonText(settings.approver_roles, [1, 7, 8, 9])} onChange={(event) => update('approver_roles', event.target.value)} /></FinanceField>
              <FinanceField label="Mapping COA Pemasukan (JSON)"><textarea rows="4" className={inputClass} value={asJsonText(settings.income_coa_map, {})} onChange={(event) => update('income_coa_map', event.target.value)} /></FinanceField>
              <FinanceField label="Mapping COA Pengeluaran (JSON)"><textarea rows="4" className={inputClass} value={asJsonText(settings.expense_coa_map, {})} onChange={(event) => update('expense_coa_map', event.target.value)} /></FinanceField>
              {access.canEdit ? <FinanceButton type="submit" variant="primary" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan Pengaturan'}</FinanceButton> : null}
            </form>
          </FinanceCard>

          <FinanceCard title="Periode Akuntansi" subtitle="Periode tertutup tidak dapat menerima transaksi baru">
            <div className="flex flex-wrap gap-3">
              <select className={inputClass} value={newPeriod} onChange={(event) => setNewPeriod(event.target.value)}>
                {periodOptions().map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {access.canEdit ? <FinanceButton onClick={() => ensureFiscalPeriods({ period: newPeriod }).then(() => { notify('Periode tersedia.'); loadSettings(); }).catch((error) => notify(error.message, 'error'))}>Tambah Periode</FinanceButton> : null}
            </div>
            <div className="mt-4"><FinanceTable columns={periodColumns} rows={periods} emptyText="Belum ada periode." page={1} limit={10} /></div>
          </FinanceCard>
        </div>
      ) : null}

      {mode === 'approvals' ? (
        <div className="space-y-5">
          <FinanceCard title="Notifikasi" subtitle="Pengingat jatuh tempo dan transaksi">
            <div className="flex justify-end"><FinanceButton onClick={markRead}>Tandai Dibaca</FinanceButton></div>
            <div className="mt-4 space-y-2">
              {notifications.length === 0 ? <p className="text-sm text-slate-400">Tidak ada notifikasi.</p> : notifications.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-700">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.message}</p>
                </div>
              ))}
            </div>
          </FinanceCard>
          <FinanceCard title="Antrian Persetujuan">
            <FinanceTable columns={approvalColumns} rows={approvals} emptyText="Tidak ada transaksi menunggu persetujuan." page={1} limit={10} />
          </FinanceCard>
        </div>
      ) : null}

      {mode === 'audit' ? (
        <div className="space-y-5">
          <FinanceCard title="Filter Audit">
            <p className="text-sm text-slate-500">Menampilkan {auditRows.length} dari {auditTotal} catatan perubahan.</p>
          </FinanceCard>
          <FinanceTable columns={auditColumns} rows={auditRows} emptyText="Belum ada aktivitas audit." page={auditPage} limit={10} />
          <FinancePagination page={auditPage} total={auditTotal} limit={20} onPageChange={setAuditPage} onPageSizeChange={(size) => setAuditPage(1)} />
        </div>
      ) : null}
    </FinanceLayout>
  );
};

export default FinanceSettings;
