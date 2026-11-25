import React from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useMenuTitle } from '../../permissions';

const FinanceLayout = ({ title, subtitle, actions = null, notification = null, onDismissNotification, children }) => {
  const location = useLocation();
  const menuTitle = useMenuTitle(location.pathname, title);

  return (
  <div className="app-page">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">{menuTitle}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>

    {notification?.message ? (
      <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
        notification.type === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}>
        {notification.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        <span className="flex-1">{notification.message}</span>
        {onDismissNotification ? (
          <button type="button" onClick={onDismissNotification} aria-label="Tutup notifikasi" className="rounded-lg p-1 hover:bg-white/60">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    ) : null}

    {children}
  </div>
  );
};

export const FinanceCard = ({ title, subtitle, actions, children, className = '' }) => (
  <section className={`app-card ${className}`}>
    {title || actions ? (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          {title ? <h2 className="text-sm font-bold text-slate-800">{title}</h2> : null}
          {subtitle ? <p className="app-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    ) : null}
    <div className="p-5">{children}</div>
  </section>
);

export const FinanceButton = ({ children, variant = 'secondary', className = '', ...props }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600 shadow-sm shadow-indigo-200',
    secondary: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200',
    danger: 'bg-white text-rose-600 hover:bg-rose-50 border-rose-200',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600'
  };
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.secondary} ${className}`}
    >
      {children}
    </button>
  );
};

export const FinanceField = ({ label, children, className = '' }) => (
  <label className={`block space-y-1.5 ${className}`}>
    <span className="text-xs font-bold text-slate-600">{label}</span>
    {children}
  </label>
);

export const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

export default FinanceLayout;
