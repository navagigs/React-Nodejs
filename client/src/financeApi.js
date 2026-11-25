const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = `${BASE_URL}/api/finance`;

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, String(item)));
      return;
    }
    query.append(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
};

const pathWithQuery = (path, params) => `${path}${buildQuery(params)}`;

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export const financeFetch = async (path, options = {}) => {
  const { method = 'GET', headers = {}, body, ...rest } = options;
  const suffix = String(path || '');
  const url = `${API_BASE}${suffix.startsWith('/') || !suffix ? suffix : `/${suffix}`}`;
  const requestHeaders = { ...authHeaders(), ...headers };
  let requestBody = body;

  if (body instanceof FormData) {
    delete requestHeaders['Content-Type'];
  } else if (body !== undefined && body !== null && body !== '') {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, { ...rest, method, headers: requestHeaders, body: requestBody });
  const contentType = response.headers.get('content-type') || '';
  const result = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok || (result && typeof result === 'object' && result.success === false)) {
    const serverMessage = result && typeof result === 'object' ? result.message : null;
    throw new Error(serverMessage || (typeof result === 'string' && result.trim()) || `Gagal memproses permintaan (${response.status})`);
  }

  return result;
};

export const getFinanceBootstrap = () => financeFetch('/bootstrap');
export const getFinanceDashboard = (params = {}) => financeFetch(pathWithQuery('/dashboard', params));
export const getFinanceSettings = () => financeFetch('/settings');
export const saveFinanceSettings = (data) => financeFetch('/settings', { method: 'PUT', body: data });
export const getFinanceNotifications = () => financeFetch('/notifications');
export const markFinanceNotificationRead = (id) => financeFetch(`/notifications/${id || ''}`, { method: 'POST', body: {} });
export const getFinanceAudit = (params = {}) => financeFetch(pathWithQuery('/audit', params));
export const getFinanceApprovals = () => financeFetch('/approvals');

export const getTransactions = (type, params = {}) => financeFetch(pathWithQuery(`/${type}`, params));
export const saveTransaction = (type, data = {}, id = null) => {
  const resolvedId = id ?? data?.id;
  const payload = data instanceof FormData ? data : Object.fromEntries(Object.entries(data || {}).filter(([key]) => key !== 'id'));
  return financeFetch(resolvedId ? `/${type}/${resolvedId}` : `/${type}`, { method: resolvedId ? 'PUT' : 'POST', body: payload });
};
export const transactionAction = (type, id, action, payload = {}) => financeFetch(`/${type}/${id}/${action}`, { method: 'POST', body: payload });
export const deleteTransaction = (type, id) => financeFetch(`/${type}/${id}`, { method: 'DELETE' });

export const getCashAccounts = (params = {}) => financeFetch(pathWithQuery('/cash-accounts', params));
export const saveCashAccount = (data = {}) => {
  const { id, ...payload } = data || {};
  return financeFetch(id ? `/cash-accounts/${id}` : '/cash-accounts', { method: id ? 'PUT' : 'POST', body: payload });
};
export const deleteCashAccount = (id) => financeFetch(`/cash-accounts/${id}`, { method: 'DELETE' });
export const getCashMovements = (params = {}) => financeFetch(pathWithQuery('/cash-movements', params));
export const createCashMovement = (data) => financeFetch('/cash-movements', { method: 'POST', body: data });
export const getTransfers = (params = {}) => financeFetch(pathWithQuery('/transfers', params));
export const createTransfer = (data) => financeFetch('/transfers', { method: 'POST', body: data });
export const reconcileCash = (accountId, data) => financeFetch(`/cash/${accountId}/reconcile`, { method: 'POST', body: data });

export const getEmployees = () => financeFetch('/employees');
export const saveEmployee = (data = {}) => {
  const { id, ...payload } = data || {};
  return financeFetch(id ? `/employees/${id}` : '/employees', { method: id ? 'PUT' : 'POST', body: payload });
};
export const getPayrollComponents = () => financeFetch('/payroll/components');
export const savePayrollComponent = (data) => financeFetch('/payroll/components', { method: 'POST', body: data });
export const getPayrollPeriods = () => financeFetch('/payroll/periods');
export const generatePayroll = (data) => financeFetch('/payroll/generate', { method: 'POST', body: data });
export const getPayrollRecords = (params = {}) => financeFetch(pathWithQuery('/payroll/records', params));
export const updatePayrollRecord = (id, data) => financeFetch(`/payroll/records/${id}`, { method: 'PUT', body: data });
export const payrollPeriodAction = (id, action, data = {}) => financeFetch(`/payroll/periods/${id}/${action}`, { method: 'POST', body: data });
export const getPayrollSlip = (id) => financeFetch(`/payroll/slips/${id}`);
export const getPayrollReport = (params = {}) => financeFetch(pathWithQuery('/payroll/report', params));

export const getBudgets = (params = {}) => financeFetch(pathWithQuery('/budgets', params));
export const saveBudget = (data = {}) => {
  const { id, ...payload } = data || {};
  return financeFetch(id ? `/budgets/${id}` : '/budgets', { method: id ? 'PUT' : 'POST', body: payload });
};
export const deleteBudget = (id) => financeFetch(`/budgets/${id}`, { method: 'DELETE' });

export const getAssets = () => financeFetch('/assets');
export const saveAsset = (data = {}) => {
  const { id, ...payload } = data || {};
  return financeFetch(id ? `/assets/${id}` : '/assets', { method: id ? 'PUT' : 'POST', body: payload });
};
export const deleteAsset = (id) => financeFetch(`/assets/${id}`, { method: 'DELETE' });
export const depreciateAssets = (data) => financeFetch('/assets/depreciate', { method: 'POST', body: data });
export const getDepreciations = () => financeFetch('/assets/depreciations');

export const getDebts = (params = {}) => financeFetch(pathWithQuery('/debts', params));
export const saveDebt = (data = {}) => {
  const { id, ...payload } = data || {};
  return financeFetch(id ? `/debts/${id}` : '/debts', { method: id ? 'PUT' : 'POST', body: payload });
};
export const deleteDebt = (id) => financeFetch(`/debts/${id}`, { method: 'DELETE' });
export const getDebtPayments = (id) => financeFetch(`/debts/${id}/payments`);
export const payDebt = (id, data) => financeFetch(`/debts/${id}/payments`, { method: 'POST', body: data });

export const getReceivables = (params = {}) => financeFetch(pathWithQuery('/receivables', params));
export const saveReceivable = (data = {}) => {
  const { id, ...payload } = data || {};
  return financeFetch(id ? `/receivables/${id}` : '/receivables', { method: id ? 'PUT' : 'POST', body: payload });
};
export const deleteReceivable = (id) => financeFetch(`/receivables/${id}`, { method: 'DELETE' });
export const getReceivablePayments = (id) => financeFetch(`/receivables/${id}/payments`);
export const payReceivable = (id, data) => financeFetch(`/receivables/${id}/payments`, { method: 'POST', body: data });

export const getAccounts = () => financeFetch('/accounts');
export const saveAccount = (data = {}) => {
  const { id, ...payload } = data || {};
  return financeFetch(id ? `/accounts/${id}` : '/accounts', { method: id ? 'PUT' : 'POST', body: payload });
};
export const getJournals = (params = {}) => financeFetch(pathWithQuery('/journals', params));
export const getJournalDetail = (id) => financeFetch(`/journals/${id}`);
export const createManualJournal = (data) => financeFetch('/journals', { method: 'POST', body: data });
export const cancelJournal = (id, data) => financeFetch(`/journals/${id}/cancel`, { method: 'POST', body: data });
export const getLedger = (params = {}) => financeFetch(pathWithQuery('/ledger', params));
export const getTrialBalance = (params = {}) => financeFetch(pathWithQuery('/trial-balance', params));
export const getFiscalPeriods = () => financeFetch('/fiscal-periods');
export const ensureFiscalPeriods = (data) => financeFetch('/fiscal-periods', { method: 'POST', body: data });
export const fiscalPeriodAction = (id, action) => financeFetch(`/fiscal-periods/${id}/${action}`, { method: 'POST', body: {} });

export const getFinanceReport = (type, params = {}) => financeFetch(pathWithQuery(`/reports/${type}`, params));

export const resetFinanceAll = () => financeFetch('/reset-all', { method: 'POST' });
export const seedFinanceDummy = () => financeFetch('/seed-dummy', { method: 'POST' });
