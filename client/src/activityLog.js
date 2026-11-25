import axios from 'axios';
import { ACTIVITY_LOG_URL } from './Api';

const ACTION_RULES = [
  { pattern: /login|masuk|sign in/i, action: 'login', label: 'Login' },
  { pattern: /tambah|add|baru|create/i, action: 'create', label: 'Tambah' },
  { pattern: /edit|ubah|update|perbarui/i, action: 'edit', label: 'Edit' },
  { pattern: /hapus|delete|remove/i, action: 'delete', label: 'Hapus' },
  { pattern: /restore|pulihkan/i, action: 'restore', label: 'Restore' },
  { pattern: /simpan|save|submit/i, action: 'save', label: 'Simpan' },
  { pattern: /backup|cadangkan/i, action: 'backup', label: 'Backup' },
  { pattern: /unduh|download|export|ekspor/i, action: 'export', label: 'Ekspor' }
];

const IGNORED_LABELS = /^(muat ulang|refresh|previous|next|batal|cancel|tutup|close|pilih semua|kosongkan|tampilkan kata sandi|sembunyikan kata sandi)$/i;

export const getCurrentLogUser = () => {
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}') || {};
  } catch {
    user = {};
  }
  return {
    user_id: user.id || null,
    user_name: user.name || user.email || 'Unknown',
    role_id: user.role_id || localStorage.getItem('role_id') || null
  };
};

export const logActivity = async ({ action, module, description }) => {
  const token = localStorage.getItem('token');
  if (!token || !action || !module) return;
  try {
    await axios.post(ACTIVITY_LOG_URL, {
      ...getCurrentLogUser(),
      action,
      module,
      description: description || '-'
    }, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    return undefined;
  }
};

export const logNavigation = (path, label) => {
  logActivity({
    action: 'view',
    module: label || path || 'Navigasi',
    description: `Klik menu ${label || path}`
  });
};

export const logButtonClick = (button, module) => {
  if (!button || button.closest('[data-no-activity-log]')) return;
  const label = (button.innerText || button.getAttribute('aria-label') || button.title || '').trim();
  if (!label || IGNORED_LABELS.test(label)) return;
  const rule = ACTION_RULES.find((item) => item.pattern.test(label));
  logActivity({
    action: rule ? rule.action : 'click',
    module,
    description: `${rule ? rule.label : 'Klik'} — ${label}`
  });
};
