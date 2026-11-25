import React from 'react';
import { X } from 'lucide-react';
import { FinanceButton } from './FinanceLayout';

const FinanceModal = ({ open, title, subtitle, onClose, onSubmit, submitLabel = 'Simpan', submitting = false, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 px-6 py-5">{children}</div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <FinanceButton onClick={onClose}>Batal</FinanceButton>
            <FinanceButton type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Menyimpan...' : submitLabel}
            </FinanceButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinanceModal;
