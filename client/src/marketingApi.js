const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = `${BASE_URL}/api/marketing`;

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

export const marketingFetch = async (path, options = {}) => {
  const { method = 'GET', headers = {}, body, ...rest } = options;
  const suffix = String(path || '');
  const url = `${API_BASE}${suffix.startsWith('/') || !suffix ? suffix : `/${suffix}`}`;
  const requestHeaders = { ...authHeaders(), ...headers };
  let requestBody = body;

  if (body !== undefined && body !== null && !(body instanceof FormData) && !(body instanceof Blob) && typeof body !== 'string') {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  } else if (body !== undefined && body !== null && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, { ...rest, method, headers: requestHeaders, body: requestBody });
  const contentType = response.headers.get('content-type') || '';
  const result = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const serverMessage = result && typeof result === 'object' ? result.message : null;
    throw new Error(serverMessage || (typeof result === 'string' && result.trim()) || `Gagal memproses permintaan (${response.status})`);
  }

  return result;
};

export const getMarketingDashboard = (params = {}) => marketingFetch(pathWithQuery('/dashboard', params));

export const getContacts = (params = {}) => marketingFetch(pathWithQuery('/contacts', params));
export const getContact = (id) => marketingFetch(`/contacts/${encodeURIComponent(id)}`);
export const createContact = (data) => marketingFetch('/contacts', { method: 'POST', body: data });
export const updateContact = (id, data) => marketingFetch(`/contacts/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
export const deleteContact = (id) => marketingFetch(`/contacts/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const bulkDeleteContacts = (ids) => marketingFetch('/contacts/bulk-delete', { method: 'POST', body: { ids } });
export const importContacts = (rows) => marketingFetch('/contacts/import', { method: 'POST', body: { rows } });
export const exportContactsUrl = (params = {}, format = 'xlsx') => `${API_BASE}${pathWithQuery('/contacts/export', { ...params, format, token: localStorage.getItem('token') })}`;

export const getGroups = () => marketingFetch('/groups');
export const saveGroup = (data = {}) => {
  const { id, ...payload } = data || {};
  return marketingFetch(id ? `/groups/${encodeURIComponent(id)}` : '/groups', { method: id ? 'PUT' : 'POST', body: payload });
};
export const deleteGroup = (id) => marketingFetch(`/groups/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const getGroupMembers = (id) => marketingFetch(`/groups/${encodeURIComponent(id)}/members`);
export const setGroupMembers = (id, contactIds) => marketingFetch(`/groups/${encodeURIComponent(id)}/members`, { method: 'PUT', body: { contact_ids: contactIds } });

export const getCampaigns = (params = {}) => marketingFetch(pathWithQuery('/campaigns', params));
export const getCampaign = (id) => marketingFetch(`/campaigns/${encodeURIComponent(id)}`);
export const saveCampaign = (data = {}) => {
  const { id, ...payload } = data || {};
  return marketingFetch(id ? `/campaigns/${encodeURIComponent(id)}` : '/campaigns', { method: id ? 'PUT' : 'POST', body: payload });
};
export const duplicateCampaign = (id) => marketingFetch(`/campaigns/${encodeURIComponent(id)}/duplicate`, { method: 'POST' });
export const deleteCampaign = (id) => marketingFetch(`/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const startCampaign = (id) => marketingFetch(`/campaigns/${encodeURIComponent(id)}/start`, { method: 'POST' });
export const scheduleCampaign = (id, payload) => marketingFetch(`/campaigns/${encodeURIComponent(id)}/schedule`, { method: 'POST', body: payload });
export const cancelCampaign = (id) => marketingFetch(`/campaigns/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
export const pauseCampaign = (id) => marketingFetch(`/campaigns/${encodeURIComponent(id)}/pause`, { method: 'POST' });
export const getCampaignRecipients = (id, params = {}) => marketingFetch(pathWithQuery(`/campaigns/${encodeURIComponent(id)}/recipients`, params));

export const getEmailTemplates = () => marketingFetch('/email-templates');
export const saveEmailTemplate = (data = {}) => {
  const { id, ...payload } = data || {};
  return marketingFetch(id ? `/email-templates/${encodeURIComponent(id)}` : '/email-templates', { method: id ? 'PUT' : 'POST', body: payload });
};
export const deleteEmailTemplate = (id) => marketingFetch(`/email-templates/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const getWhatsappTemplates = () => marketingFetch('/whatsapp-templates');
export const saveWhatsappTemplate = (data = {}) => {
  const { id, ...payload } = data || {};
  return marketingFetch(id ? `/whatsapp-templates/${encodeURIComponent(id)}` : '/whatsapp-templates', { method: id ? 'PUT' : 'POST', body: payload });
};
export const deleteWhatsappTemplate = (id) => marketingFetch(`/whatsapp-templates/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const getAnalytics = (params = {}) => marketingFetch(pathWithQuery('/analytics', params));
export const getAnalyticsExportUrl = (params = {}, format = 'xlsx') => `${API_BASE}${pathWithQuery('/analytics/export', { ...params, format, token: localStorage.getItem('token') })}`;

export const getMarketingSettings = () => marketingFetch('/settings');
export const saveMarketingSettings = (data) => marketingFetch('/settings', { method: 'PUT', body: data });
export const getSmtpStatus = () => marketingFetch('/smtp-status');
export const testSmtp = () => marketingFetch('/test-smtp', { method: 'POST', body: {} });
export const testEmail = (data) => marketingFetch('/test-email', { method: 'POST', body: data });
export const testWhatsapp = () => marketingFetch('/test-whatsapp', { method: 'POST', body: {} });
export const getWebhookInfo = () => marketingFetch('/webhook');
