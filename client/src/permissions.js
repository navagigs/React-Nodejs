import { useEffect, useMemo, useState } from 'react';
import { MENU_URL_ACCESS_BY_ROLE } from './Api';

export const MENU_PERMISSION_IDS = {
  dashboard: 1,
  setting: 11,
  'hak-akses/menu': 12,
  'hak-akses/module-authority': 14,
  'hak-akses/user': 15,
  'hak-akses/role': 16,
  'backup/log': 122,
  'backup/housekeeping': 123,
  backup: 123,
  'internal/clients': 147,
  'internal/letter': 148,
  'internal/project-documents': 149,
  'internal/portfolio': 150,
  articles: 154,
  category: 155,
  'qr-code': 156,
  'marketing-center': 200,
  'marketing-center/dashboard': 201,
  'marketing-center/contacts': 202,
  'marketing-center/groups': 203,
  'marketing-center/email': 204,
  'marketing-center/whatsapp': 205,
  'marketing-center/campaigns': 206,
  'marketing-center/templates': 207,
  'marketing-center/analytics': 208,
  'marketing-center/settings': 209,
  finance: 300,
  'finance/dashboard': 301,
  'finance/incomes': 302,
  'finance/expenses': 303,
  'finance/payroll': 304,
  'finance/cash': 305,
  'finance/budgets': 306,
  'finance/assets': 307,
  'finance/debts': 308,
  'finance/receivables': 309,
  'finance/accounting': 310,
  'finance/accounts': 311,
  'finance/journals': 312,
  'finance/ledger': 313,
  'finance/trial-balance': 314,
  'finance/reports': 315,
  'finance/reports/profit-loss': 316,
  'finance/reports/balance-sheet': 317,
  'finance/reports/cash-flow': 318,
  'finance/reports/equity': 319,
  'finance/settings': 320,
  'finance/approvals': 321,
  'finance/audit': 322
};

const normalizePath = (value) => String(value || '').replace(/^\/+|\/+$/g, '');

const flagOn = (value) => value === 1 || value === '1' || value === true;

const readStoredPermissions = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('permissions') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const resolveMenuId = (menuUrl, menuId) => {
  if (menuId !== undefined && menuId !== null && menuId !== '') return Number(menuId);
  const target = normalizePath(menuUrl);
  if (!target) return null;
  const match = Object.entries(MENU_PERMISSION_IDS).find(([path]) => normalizePath(path) === target);
  return match ? match[1] : null;
};

export const getMenuPermission = (menuUrl, menuId) => {
  const resolvedMenuId = resolveMenuId(menuUrl, menuId);
  const auth = readStoredPermissions().find((item) => Number(item.menu_id) === Number(resolvedMenuId));
  const isView = !!auth && flagOn(auth.is_view);
  const allowed = (key) => isView && !!auth && flagOn(auth[key]);

  return {
    menuId: resolvedMenuId,
    isView,
    isCreate: allowed('is_create'),
    isEdit: allowed('is_edit'),
    isDelete: allowed('is_delete'),
    isExport: allowed('is_export'),
    isDuplicate: allowed('is_duplicate'),
    isUnlock: allowed('is_unlock'),
    canView: isView,
    canCreate: allowed('is_create'),
    canPreview: allowed('is_create'),
    canEdit: allowed('is_edit'),
    canCopy: allowed('is_edit'),
    canDelete: allowed('is_delete'),
    canExport: allowed('is_export'),
    canDownload: allowed('is_export'),
    canDuplicate: allowed('is_duplicate'),
    canUnlock: allowed('is_unlock')
  };
};

export const useMenuPermission = (menuUrl, menuId) => useMemo(
  () => getMenuPermission(menuUrl, menuId),
  [menuUrl, menuId]
);

export const useCanExport = (menuUrl) => useMenuPermission(menuUrl).canExport;

let menuCache = null;
let menuPromise = null;

const loadMenus = () => {
  const roleId = localStorage.getItem('role_id');
  if (!roleId) return Promise.resolve([]);
  if (menuCache) return Promise.resolve(menuCache);
  if (!menuPromise) {
    menuPromise = fetch(`${MENU_URL_ACCESS_BY_ROLE}/${roleId}`)
      .then((res) => res.json())
      .then((data) => {
        menuCache = Array.isArray(data) ? data : [];
        return menuCache;
      })
      .catch(() => []);
  }
  return menuPromise;
};

const flattenMenus = (menus) => menus.flatMap((menu) => [menu, ...flattenMenus(menu.subs || [])]);

const normalize = (value) => String(value || '').replace(/^\/+|\/+$/g, '');

export const useMenuTitle = (menuUrl, fallback = '') => {
  const [title, setTitle] = useState(fallback);

  useEffect(() => {
    if (!menuUrl) return;
    const target = normalize(menuUrl);
    loadMenus().then((menus) => {
      const found = flattenMenus(menus).find((item) => normalize(item.url || item.menu_url) === target);
      if (found) setTitle(found.title || found.menu_name || fallback);
    });
  }, [menuUrl, fallback]);

  return title;
};
