import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, Database, Landmark, Trash2, Wallet } from 'lucide-react';
import { useMenuPermission } from '../../permissions';
import { getFinanceDashboard, resetFinanceAll, seedFinanceDummy } from '../../financeApi';
import { asList, dateLabel, idr, idrCompact } from '../../financeUtils';
import FinanceLayout, { FinanceCard, FinanceButton } from '../../components/finance/FinanceLayout';
import { FinanceTable, StatusBadge } from '../../components/finance/FinanceTable';

const periodPresets = [
  { value: 'today', label: 'Hari ini' },
  { value: 'week', label: 'Minggu ini' },
  { value: 'month', label: 'Bulan ini' },
  { value: 'year', label: 'Tahun ini' }
];

const cardItems = (summary) => [
  { label: 'Saldo Kas & Bank', value: summary.cash_balance, icon: Landmark, color: 'bg-indigo-50 text-indigo-600' },
  { label: 'Pemasukan', value: summary.income, icon: ArrowDownLeft, color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Pengeluaran', value: summary.expense, icon: ArrowUpRight, color: 'bg-rose-50 text-rose-600' },
  { label: 'Laba / Rugi', value: summary.profit_loss, icon: Wallet, color: 'bg-amber-50 text-amber-600' }
];

const FinanceDashboard = () => {
  const access = useMenuPermission('/finance/dashboard');
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [notification, setNotification] = useState(null);

  const load = () => {
    if (!access.canView) return;
    getFinanceDashboard({ period })
      .then((result) => setData(result))
      .catch((error) => setNotification({ type: 'error', message: error.message }));
  };

  useEffect(() => { load(); }, [access.canView, period]);

const resetAll = async () => {
    if (!access.canDelete) return;
    if (!window.confirm('Reset semua data transaksi keuangan (semua tabel fin, kecuali master/setting)? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      await resetFinanceAll();
      setNotification({ type: 'success', message: 'Semua data transaksi keuangan berhasil direset.' });
      load();
    } catch (error) {
      setNotification({ type: 'error', message: error.message || 'Gagal mereset data.' });
    }
  };

  const seedDummy = async () => {
    try {
      await seedFinanceDummy();
      setNotification({ type: 'success', message: 'Data dummy keuangan berhasil dibuat.' });
      load();
    } catch (error) {
      setNotification({ type: 'error', message: error.message || 'Gagal membuat data dummy.' });
    }
  };
  const summary = data?.summary || {};
  const recentColumns = [
    { key: 'number', label: 'No. Transaksi', render: (row) => <span className="font-bold text-slate-700">{row.number}</span> },
    { key: 'date', label: 'Tanggal', render: (row) => dateLabel(row.date) },
    { key: 'description', label: 'Keterangan' },
    { key: 'type', label: 'Jenis', render: (row) => <span className="capitalize">{row.type}</span> },
    { key: 'amount', label: 'Nominal', align: 'right', render: (row) => idr(row.amount) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> }
  ];

  return (
    <FinanceLayout
      title="Dashboard Keuangan"
      subtitle={data?.period ? `Periode ${dateLabel(data.period.from)} - ${dateLabel(data.period.to)}` : 'Ringkasan kondisi keuangan perusahaan'}
      notification={notification}
      onDismissNotification={() => setNotification(null)}
      actions={[
        ...periodPresets.map((item) => (
          <FinanceButton key={item.value} variant={period === item.value ? 'primary' : 'secondary'} onClick={() => setPeriod(item.value)}>
            {item.label}
          </FinanceButton>
        )),
        <FinanceButton key="seed-dummy" onClick={seedDummy}><Database className="h-4 w-4" /> Data Dummy</FinanceButton>,
        access.canDelete ? <FinanceButton key="reset-all" variant="danger" onClick={resetAll}><Trash2 className="h-4 w-4" /> Reset All</FinanceButton> : null
      ].filter(Boolean)}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cardItems(summary).map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{item.label}</span>
                <span className={`rounded-xl p-2 ${item.color}`}><Icon className="h-4 w-4" /></span>
              </div>
              <p className="mt-4 text-2xl font-black text-slate-800">{idr(item.value)}</p>
              <p className="mt-1 text-[11px] text-slate-400">{idrCompact(item.value)}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <FinanceCard title="Tren Pemasukan & Pengeluaran" subtitle="6 bulan terakhir" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={asList(data?.monthly)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => idrCompact(value)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(value) => idr(value)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Pemasukan" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Pengeluaran" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FinanceCard>

        <FinanceCard title="Peringatan" subtitle="Jatuh tempo & pembayaran">
          <div className="space-y-3">
            {asList(data?.alerts).length === 0 ? <p className="py-8 text-center text-sm text-slate-400">Tidak ada peringatan.</p> : asList(data?.alerts).map((alert, index) => (
              <div key={`${alert.type}-${index}`} className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                <p className="text-xs font-bold text-amber-800">{alert.title}</p>
                <p className="mt-0.5 text-xs text-slate-600">{alert.description}</p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{dateLabel(alert.date)}</span>
                  {alert.amount ? <span className="font-bold text-slate-700">{idr(alert.amount)}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </FinanceCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <FinanceCard title="Posisi Utang Piutang" className="lg:col-span-1">
          <dl className="space-y-4 text-sm">
            {[
              ['Piutang usaha', summary.receivables],
              ['Utang usaha', summary.debts],
              ['Nilai aset', summary.assets],
              ['Liabilitas', summary.liabilities],
              ['Gaji dibayar', summary.payroll]
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-bold text-slate-800">{idr(value)}</dd>
              </div>
            ))}
          </dl>
        </FinanceCard>
        <FinanceCard title="Transaksi Terbaru" subtitle="10 transaksi terakhir" className="lg:col-span-2">
          <FinanceTable columns={recentColumns} rows={asList(data?.recent_transactions)} loading={!data} emptyText="Belum ada transaksi." />
        </FinanceCard>
      </div>
    </FinanceLayout>
  );
};

export default FinanceDashboard;
