import React from 'react';

const STATUS_LABELS = {
  draft: 'Draf',
  scheduled: 'Dijadwalkan',
  queued: 'Antrean',
  running: 'Berjalan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  paused: 'Dijeda',
  pending: 'Menunggu',
  sent: 'Terkirim',
  delivered: 'Terdeliver',
  opened: 'Dibuka',
  clicked: 'Diklik',
  bounced: 'Mental',
  failed: 'Gagal',
  read: 'Dibaca',
  invalid: 'Tidak valid',
  skipped: 'Dilewati',
  active: 'Aktif',
  nonaktif: 'Nonaktif'
};

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-700 ring-gray-200',
  scheduled: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  queued: 'bg-sky-50 text-sky-700 ring-sky-200',
  running: 'bg-blue-50 text-blue-700 ring-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
  paused: 'bg-amber-50 text-amber-700 ring-amber-200',
  pending: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  sent: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  delivered: 'bg-teal-50 text-teal-700 ring-teal-200',
  opened: 'bg-violet-50 text-violet-700 ring-violet-200',
  clicked: 'bg-purple-50 text-purple-700 ring-purple-200',
  bounced: 'bg-orange-50 text-orange-700 ring-orange-200',
  failed: 'bg-red-50 text-red-700 ring-red-200',
  read: 'bg-blue-50 text-blue-700 ring-blue-200',
  invalid: 'bg-rose-50 text-rose-700 ring-rose-200',
  skipped: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
  active: 'bg-green-50 text-green-700 ring-green-200',
  nonaktif: 'bg-gray-100 text-gray-600 ring-gray-200'
};

const StatusBadge = ({ status, showDot = true }) => {
  const key = String(status || '').toLowerCase();
  const label = STATUS_LABELS[key] || (status ? String(status) : '-');
  const style = STATUS_STYLES[key] || 'bg-gray-100 text-gray-600 ring-gray-200';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}>
      {showDot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {label}
    </span>
  );
};

export default StatusBadge;
