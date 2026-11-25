import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMenuPermission } from '../../permissions';
import { getFinanceReport } from '../../financeApi';
import { asList, dateLabel, downloadExport, idr } from '../../financeUtils';
import FinanceLayout, { FinanceButton, FinanceCard, inputClass } from '../../components/finance/FinanceLayout';
import { FinancePagination, FinanceTable } from '../../components/finance/FinanceTable';

const reportTypes = [
  ['profit-loss', 'Laba Rugi', 316],
  ['balance-sheet', 'Neraca', 317],
  ['cash-flow', 'Arus Kas', 318],
  ['equity', 'Perubahan Ekuitas', 319],
  ['incomes', 'Pemasukan', 315],
  ['expenses', 'Pengeluaran', 315],
  ['payroll', 'Penggajian', 315],
  ['cash', 'Kas', 315],
  ['debts-receivables', 'Utang Piutang', 315],
  ['assets', 'Aset', 315],
  ['budgets', 'Anggaran', 315]
];

const columnLabels = {
  code: 'Kode', name: 'Nama Akun', account_group: 'Kelompok', amount: 'Nominal', balance: 'Saldo',
  transaction_no: 'No. Transaksi', invoice_no: 'No. Invoice', transaction_date: 'Tanggal', date: 'Tanggal',
  movement_date: 'Tanggal', invoice_date: 'Tanggal', debt_date: 'Tanggal', purchase_date: 'Tanggal',
  category: 'Kategori', party_name: 'Pihak', creditor_name: 'Kreditur', customer_name: 'Pelanggan',
  employee_name: 'Karyawan', department: 'Departemen', period: 'Periode', account_name: 'Rekening',
  description: 'Keterangan', movement_type: 'Jenis Transaksi', direction: 'Arah', total_income: 'Pendapatan',
  total_deduction: 'Potongan', net_pay: 'Gaji Bersih', status: 'Status', due_date: 'Jatuh Tempo',
  paid_amount: 'Dibayar', received_amount: 'Diterima', remaining: 'Sisa', cost: 'Harga Perolehan',
  accumulated_depreciation: 'Akumulasi', book_value: 'Nilai Buku', budget_year: 'Tahun',
  budget_month: 'Bulan', realization: 'Realisasi', difference: 'Selisih', usage_percentage: 'Penggunaan (%)'
};

const moneyKeys = new Set(['amount', 'balance', 'total_income', 'total_deduction', 'net_pay', 'paid_amount', 'received_amount', 'remaining', 'cost', 'accumulated_depreciation', 'book_value', 'realization', 'difference']);
const dateKeys = new Set(['transaction_date', 'date', 'movement_date', 'invoice_date', 'debt_date', 'purchase_date', 'due_date']);

const buildRows = (report) => {
  if (Array.isArray(report?.rows)) return report.rows;
  if (Array.isArray(report?.groups)) return report.groups.map((group) => ({ ...group, amount: group.amount_value || group.amount }));
  if (report?.accounts) {
    const rows = Object.entries(report.accounts).flatMap(([group, accounts]) =>
      accounts.map((account) => ({ ...account, account_group: group, balance: account.balance }))
    );
    if (report.current_earnings) rows.push({ code: '-', name: 'Laba tahun berjalan', account_group: 'equity', balance: report.current_earnings });
    return rows;
  }
  if (report?.debts || report?.receivables) {
    return [
      ...asList(report.debts).map((row) => ({ ...row, kind: 'Utang' })),
      ...asList(report.receivables).map((row) => ({ ...row, kind: 'Piutang' }))
    ];
  }
  return [];
};

const FinanceReports = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const typeFromPath = location.pathname.split('/').pop();
  const activeType = reportTypes.some(([key]) => key === typeFromPath) ? typeFromPath : 'profit-loss';
  const access = useMenuPermission(`/finance/reports/${activeType}`);
  const [period, setPeriod] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState(null);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });

  const notify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const load = () => {
    if (!access.canView) return;
    const params = { type: activeType, period };
    if (period === 'custom') { params.from = from; params.to = to; }
    setLoading(true);
    getFinanceReport(activeType, params)
      .then((result) => {
        setReport(result);
        if (result?.total !== undefined) setMeta({ total: Number(result.total || 0), page: Number(result.page || 1), limit: Number(result.limit || 20) });
      })
      .catch((error) => notify(error.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { Promise.resolve().then(load); }, [access.canView, activeType, period, from, to]);

  const rows = useMemo(() => buildRows(report), [report]);
  const keys = rows.length ? Object.keys(rows[0]).filter((key) => !key.endsWith('_value') && !['id', 'created_at', 'updated_at', 'deleted_at', 'notes'].includes(key)) : [];
  const columns = keys.map((key) => ({
    key,
    label: columnLabels[key] || key.replace(/_/g, ' '),
    align: moneyKeys.has(key) ? 'right' : undefined,
    render: (row) => {
      if (dateKeys.has(key)) return dateLabel(row[key]);
      if (moneyKeys.has(key)) return idr(row[key]);
      if (key === 'direction') return Number(row[key]) > 0 ? 'Masuk' : 'Keluar';
      if (key === 'usage_percentage') return `${Number(row[key]).toFixed(1)}%`;
      return row[key] ?? '-';
    }
  }));

  const exportRows = rows.map((row) => Object.fromEntries(columns.map((column) => [
    column.label,
    dateKeys.has(column.key) ? dateLabel(row[column.key]) : moneyKeys.has(column.key) ? idr(row[column.key], false) : row[column.key] ?? '-'
  ])));

  const summary = [
    report?.revenue ? ['Total Pendapatan', report.revenue] : null,
    report?.expense ? ['Total Beban', report.expense] : null,
    report?.profit_loss ? ['Laba / Rugi', report.profit_loss] : null,
    report?.total ? ['Total', report.total] : null,
    report?.total_in ? ['Kas Masuk', report.total_in] : null,
    report?.total_out ? ['Kas Keluar', report.total_out] : null,
    report?.net ? ['Arus Kas Bersih', report.net] : null,
    report?.current_earnings ? ['Laba Tahun Berjalan', report.current_earnings] : null,
    report?.totals?.assets ? ['Total Aset', report.totals.assets] : null,
    report?.totals?.liabilities ? ['Total Liabilitas', report.totals.liabilities] : null,
    report?.totals?.equity ? ['Total Ekuitas', report.totals.equity] : null
  ].filter(Boolean);

  const title = reportTypes.find(([key]) => key === activeType)?.[1] || 'Laporan Keuangan';

  const doExport = (format) => {
    downloadExport(format, title, exportRows, columns, `laporan-${activeType}`);
    notify(`Ekspor ${format.toUpperCase()} berhasil.`);
  };

  return (
    <FinanceLayout
      title={title}
      subtitle={report ? `Periode ${dateLabel(report.from)} - ${dateLabel(report.to)} · ${report.company}` : 'Laporan keuangan perusahaan'}
      notification={notification}
      onDismissNotification={() => setNotification(null)}
      actions={[
        access.canExport ? <FinanceButton key="xlsx" onClick={() => doExport('xlsx')}><FileSpreadsheet className="h-4 w-4" /> Excel</FinanceButton> : null,
        access.canExport ? <FinanceButton key="pdf" onClick={() => doExport('pdf')}><FileText className="h-4 w-4" /> PDF</FinanceButton> : null,
        <FinanceButton key="print" onClick={() => window.print()}><Printer className="h-4 w-4" /> Cetak</FinanceButton>
      ].filter(Boolean)}
    >
      <FinanceCard title="Filter Laporan" subtitle="Pilih jenis laporan dan rentang periode data">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="flex flex-wrap items-center gap-2 md:col-span-3 xl:col-span-4">
            {reportTypes.slice(0, 4).map(([key, label]) => (
              <FinanceButton key={key} variant={activeType === key ? 'primary' : 'secondary'} onClick={() => navigate(`/finance/reports/${key}`)}>{label}</FinanceButton>
            ))}
          </div>
          <select className={inputClass} value={activeType} onChange={(event) => navigate(`/finance/reports/${event.target.value}`)}>
            {reportTypes.slice(4).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <div className="flex flex-wrap items-center gap-2 md:col-span-3 xl:col-span-4">
            {[
              ['today', 'Hari ini'], ['week', 'Minggu ini'], ['month', 'Bulan ini'], ['year', 'Tahun ini'], ['custom', 'Custom']
            ].map(([value, label]) => (
              <FinanceButton key={value} variant={period === value ? 'primary' : 'secondary'} onClick={() => setPeriod(value)}>{label}</FinanceButton>
            ))}
          </div>
          {period === 'custom' ? (
            <>
              <input type="date" className={inputClass} value={from} onChange={(event) => setFrom(event.target.value)} />
              <input type="date" className={inputClass} value={to} onChange={(event) => setTo(event.target.value)} />
            </>
          ) : null}
        </div>
      </FinanceCard>

      {summary.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
              <p className={`mt-2 text-lg font-black ${String(value).startsWith('-') ? 'text-rose-600' : 'text-slate-800'}`}>{idr(value)}</p>
            </div>
          ))}
        </div>
      ) : null}

      <FinanceCard title={`${title} · ${report?.company || 'Perusahaan'}`} subtitle={report ? `Periode ${dateLabel(report.from)} - ${dateLabel(report.to)}` : 'Menyiapkan data laporan'}>
        <FinanceTable columns={columns} rows={rows} loading={loading} emptyText="Tidak ada data pada periode ini." page={meta.page} limit={meta.limit} />
        <FinancePagination page={meta.page} total={meta.total} limit={meta.limit} onPageChange={(page) => setMeta({ ...meta, page })} onPageSizeChange={(size) => setMeta({ ...meta, page: 1, limit: Number(size) })} />
      </FinanceCard>
    </FinanceLayout>
  );
};

export default FinanceReports;
