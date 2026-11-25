import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Mail,
  MessageCircle,
  Save,
  Send,
  Webhook
} from 'lucide-react';
import { useMenuPermission } from '../permissions';
import {
  getMarketingSettings,
  getSmtpStatus,
  getWebhookInfo,
  saveMarketingSettings,
  testEmail,
  testSmtp,
  testWhatsapp
} from '../marketingApi';
import MarketingLayout from '../components/marketing/MarketingLayout';

const inputStyle = 'app-input';
const labelStyle = 'block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5';

const normalizeSettings = (result = {}) => {
  const email = result.email || result.email_settings || result.smtp || {};
  const whatsapp = result.whatsapp || result.whatsapp_settings || result.waba || {};
  const authValue = email.auth !== undefined ? email.auth : email.smtp_auth;
  return {
    email: {
      provider: email.provider || 'smtp',
      smtp_host: email.smtp_host || email.host || 'smtp.gmail.com',
      smtp_port: email.smtp_port || email.port || '465',
      smtp_user: email.smtp_user || email.username || 'crop.indonesia@gmail.com',
      encryption: email.encryption || email.secure || 'ssl',
      auth: authValue === undefined ? true : !!authValue,
      from_name: email.from_name || 'CROP Marketing',
      from_email: email.from_email || 'crop.indonesia@gmail.com',
      smtp_password: '',
      gmail_client_id: email.gmail_client_id || '',
      gmail_user: email.gmail_user || email.from_email || 'crop.indonesia@gmail.com',
      gmail_client_secret: '',
      gmail_refresh_token: ''
    },
    whatsapp: {
      waba_id: whatsapp.waba_id || '',
      phone_id: whatsapp.phone_id || whatsapp.phone_number_id || '',
      api_version: whatsapp.api_version || 'v21.0',
      token: '',
      app_secret: '',
      verify_token: ''
    },
    saved: {
      emailPassword: !!(email.smtp_password || email.smtp_password_saved || email.password_saved),
      gmailClientSecret: !!(email.gmail_client_secret || email.gmail_client_secret_saved),
      gmailRefreshToken: !!(email.gmail_refresh_token || email.gmail_refresh_token_saved),
      whatsappToken: !!(whatsapp.token || whatsapp.access_token || whatsapp.token_saved),
      appSecret: !!(whatsapp.app_secret || whatsapp.app_secret_saved),
      verifyToken: !!(whatsapp.verify_token || whatsapp.verify_token_saved)
    },
    smtpStatus: email.smtp_status || null
  };
};

const SecretField = ({ id, label, value, onChange, saved }) => (
  <div>
    <label className={labelStyle} htmlFor={id}>{label}</label>
    <div className="relative">
      <input id={id} type="password" value={value} onChange={onChange} placeholder={saved ? 'Tersimpan' : ''} className={`${inputStyle} pr-10`} autoComplete="new-password" />
      <KeyRound className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
    </div>
    {saved ? <p className="mt-1 text-xs text-gray-500">Kosongkan untuk menyimpan nilai lama. Isi untuk mengganti.</p> : null}
  </div>
);

const MarketingSettings = () => {
  const access = useMenuPermission('/marketing-center/settings');
  const [form, setForm] = useState(normalizeSettings());
  const [saved, setSaved] = useState(normalizeSettings().saved);
  const [webhook, setWebhook] = useState(null);
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((previous) => ({ ...previous, show: false })), 3500);
  }, []);

  const refreshSmtpStatus = useCallback(async () => {
    try {
      const status = await getSmtpStatus();
      setSmtpStatus(status || null);
    } catch {
      setSmtpStatus((previous) => previous);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMarketingSettings();
      const normalized = normalizeSettings(result || {});
      setForm(normalized);
      setSaved(normalized.saved);
      setSmtpStatus(normalized.smtpStatus);
    } catch (error) {
      showNotification(error.message || 'Gagal memuat pengaturan marketing.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    if (!access.canView) return;
    loadSettings();
    getWebhookInfo()
      .then((result) => setWebhook(result || {}))
      .catch(() => setWebhook({}));
  }, [access.canView, loadSettings]);

  const updateEmail = (key, value) => setForm((previous) => ({ ...previous, email: { ...previous.email, [key]: value } }));
  const updateWhatsapp = (key, value) => setForm((previous) => ({ ...previous, whatsapp: { ...previous.whatsapp, [key]: value } }));

  const handleSave = async (event) => {
    event.preventDefault();
    if (!access.canEdit) return;
    setSaving(true);
    try {
      const emailPayload = { ...form.email };
      const whatsappPayload = { ...form.whatsapp };
      if (!emailPayload.smtp_password) delete emailPayload.smtp_password;
      if (!emailPayload.gmail_client_secret) delete emailPayload.gmail_client_secret;
      if (!emailPayload.gmail_refresh_token) delete emailPayload.gmail_refresh_token;
      if (!whatsappPayload.token) delete whatsappPayload.token;
      if (!whatsappPayload.app_secret) delete whatsappPayload.app_secret;
      if (!whatsappPayload.verify_token) delete whatsappPayload.verify_token;
      await saveMarketingSettings({ email: emailPayload, whatsapp: whatsappPayload });
      showNotification('Pengaturan marketing berhasil disimpan.');
      await loadSettings();
    } catch (error) {
      showNotification(error.message || 'Gagal menyimpan pengaturan marketing.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!access.canEdit) return;
    setTestingSmtp(true);
    try {
      const result = await testSmtp();
      setSmtpStatus(result?.status || null);
      showNotification(result?.message || 'Koneksi email berhasil.');
    } catch (error) {
      showNotification(error.message || 'Gagal menguji koneksi email.', 'error');
      await refreshSmtpStatus();
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleTestEmail = async () => {
    if (!access.canEdit) return;
    if (!testEmailTo.trim()) {
      showNotification('Alamat email tujuan wajib diisi.', 'error');
      return;
    }
    setTesting(true);
    try {
      const result = await testEmail({ to: testEmailTo.trim() });
      if (result?.status) setSmtpStatus(result.status);
      showNotification(result?.message || 'Email uji berhasil dikirim.');
    } catch (error) {
      showNotification(error.message || 'Gagal mengirim email uji.', 'error');
      await refreshSmtpStatus();
    } finally {
      setTesting(false);
    }
  };

  const handleTestWhatsapp = async () => {
    if (!access.canEdit) return;
    setTesting(true);
    try {
      const result = await testWhatsapp();
      showNotification(result?.message || 'Tes koneksi WhatsApp berhasil dikirim.');
    } catch (error) {
      showNotification(error.message || 'Gagal menguji koneksi WhatsApp.', 'error');
    } finally {
      setTesting(false);
    }
  };

  if (!access.canView) {
    return (
      <div className="app-card app-card-padded">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Akses Ditolak</h3>
        <p className="text-gray-500 text-sm mt-2">Anda tidak memiliki hak akses untuk melihat data ini.</p>
      </div>
    );
  }

  const webhookUrl = webhook?.url || webhook?.callback_url || webhook?.webhook_url || '';
  const webhookVerifySaved = !!(webhook?.verify_token || webhook?.verify_token_saved);
  const isGmailProvider = form.email.provider === 'gmail';
  const isSmtpProvider = form.email.provider === 'smtp';
  const smtpTone = smtpStatus?.state === 'connected'
    ? 'border-green-200 bg-green-50 text-green-800'
    : smtpStatus?.state === 'failed'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-gray-200 bg-gray-50 text-gray-700';
  const smtpStateIcon = smtpStatus?.state === 'connected' ? CheckCircle2 : AlertCircle;
  const SmtpStateIcon = smtpStateIcon;

  return (
    <MarketingLayout
      title="Pengaturan Marketing"
      subtitle="Konfigurasi gateway email dan WhatsApp untuk pengiriman kampanye."
      actions={
        access.canEdit ? (
          <button type="submit" form="marketing-settings-form" disabled={saving || loading} className="inline-flex items-center gap-2 app-button app-button-primary disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        ) : null
      }
    >
      {notification.show ? (
        <div className={`fixed top-6 right-6 z-[60] max-w-sm rounded-xl border-l-4 px-6 py-4 shadow-2xl ${notification.type === 'success' ? 'border-green-500 bg-white' : 'border-red-500 bg-white'}`}>
          <p className={`text-sm font-semibold ${notification.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{notification.message}</p>
        </div>
      ) : null}

      <form id="marketing-settings-form" onSubmit={handleSave} className="space-y-8">
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-gray-800">Gateway Email</h2>
          </div>
          {smtpStatus ? (
            <div className={`mb-5 rounded-xl border px-4 py-3 ${smtpTone}`}>
              <div className="flex items-start gap-3">
                <SmtpStateIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Status koneksi email: {smtpStatus.label}</p>
                  <p className="mt-1 break-all text-xs opacity-90">
                    {smtpStatus.host
                      ? `${smtpStatus.host}:${smtpStatus.port} • ${smtpStatus.encryption} • Autentikasi ${smtpStatus.auth ? 'aktif' : 'nonaktif'}`
                      : 'Host SMTP belum dikonfigurasi.'}
                  </p>
                  <p className="mt-1 text-xs opacity-90">Kredensial: {smtpStatus.password_saved ? 'tersimpan' : 'belum disimpan'}</p>
                  {smtpStatus.message ? <p className="mt-1 text-xs opacity-90">{smtpStatus.message}</p> : null}
                  {smtpStatus.last_tested_at ? <p className="mt-1 text-xs opacity-75">Diuji terakhir: {smtpStatus.last_tested_at}</p> : null}
                </div>
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelStyle} htmlFor="email-provider">Provider</label>
              <select id="email-provider" value={form.email.provider} onChange={(event) => updateEmail('provider', event.target.value)} className={inputStyle}>
                <option value="gmail">Gmail API (HTTPS)</option>
                <option value="smtp">SMTP</option>
                <option value="sendgrid">SendGrid</option>
                <option value="brevo">Brevo</option>
                <option value="ses">Amazon SES</option>
              </select>
            </div>
            {isSmtpProvider ? (
              <>
                <div>
                  <label className={labelStyle} htmlFor="email-encryption">Enkripsi</label>
                  <select id="email-encryption" value={form.email.encryption} onChange={(event) => updateEmail('encryption', event.target.value)} className={inputStyle}>
                    <option value="ssl">SSL/TLS (465)</option>
                    <option value="tls">STARTTLS (587)</option>
                    <option value="none">Tanpa enkripsi</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyle} htmlFor="smtp-host">Host SMTP</label>
                  <input id="smtp-host" value={form.email.smtp_host} onChange={(event) => updateEmail('smtp_host', event.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle} htmlFor="smtp-port">Port SMTP</label>
                  <input id="smtp-port" value={form.email.smtp_port} onChange={(event) => updateEmail('smtp_port', event.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle} htmlFor="smtp-user">Username SMTP</label>
                  <input id="smtp-user" value={form.email.smtp_user} onChange={(event) => updateEmail('smtp_user', event.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle} htmlFor="smtp-auth">Autentikasi SMTP</label>
                  <select id="smtp-auth" value={form.email.auth ? '1' : '0'} onChange={(event) => updateEmail('auth', event.target.value === '1')} className={inputStyle}>
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif</option>
                  </select>
                </div>
                <SecretField id="smtp-password" label="Kata Sandi SMTP" value={form.email.smtp_password} onChange={(event) => updateEmail('smtp_password', event.target.value)} saved={saved.emailPassword} />
              </>
            ) : null}
            {isGmailProvider ? (
              <>
                <div>
                  <label className={labelStyle} htmlFor="gmail-client-id">Gmail Client ID</label>
                  <input id="gmail-client-id" value={form.email.gmail_client_id} onChange={(event) => updateEmail('gmail_client_id', event.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle} htmlFor="gmail-user">Akun Gmail</label>
                  <input id="gmail-user" type="email" value={form.email.gmail_user} onChange={(event) => updateEmail('gmail_user', event.target.value)} className={inputStyle} />
                </div>
                <SecretField id="gmail-client-secret" label="Gmail Client Secret" value={form.email.gmail_client_secret} onChange={(event) => updateEmail('gmail_client_secret', event.target.value)} saved={saved.gmailClientSecret} />
                <SecretField id="gmail-refresh-token" label="Gmail Refresh Token" value={form.email.gmail_refresh_token} onChange={(event) => updateEmail('gmail_refresh_token', event.target.value)} saved={saved.gmailRefreshToken} />
              </>
            ) : null}
            <div>
              <label className={labelStyle} htmlFor="email-from-name">Nama Pengirim</label>
              <input id="email-from-name" value={form.email.from_name} onChange={(event) => updateEmail('from_name', event.target.value)} className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle} htmlFor="email-from-email">Email Pengirim</label>
              <input id="email-from-email" type="email" value={form.email.from_email} onChange={(event) => updateEmail('from_email', event.target.value)} className={inputStyle} />
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Uji Koneksi Email</p>
              <p className="mt-1 text-xs text-gray-600">Periksa koneksi ke {isGmailProvider ? 'gmail.googleapis.com' : (form.email.smtp_host || '-')} tanpa mengirim email.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={handleTestSmtp} disabled={testingSmtp || !access.canEdit} className="app-button">
                <CheckCircle2 className="h-4 w-4" /> {testingSmtp ? 'Menguji...' : 'Tes Koneksi Email'}
              </button>
              <input value={testEmailTo} onChange={(event) => setTestEmailTo(event.target.value)} type="email" placeholder="Alamat email uji" className={`${inputStyle} sm:max-w-xs`} />
              <button type="button" onClick={handleTestEmail} disabled={testing || !access.canEdit} className="app-button">
                <Send className="h-4 w-4" /> Kirim Email Uji
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-base font-bold text-gray-800">Gateway WhatsApp</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelStyle} htmlFor="waba-id">WABA ID</label>
              <input id="waba-id" value={form.whatsapp.waba_id} onChange={(event) => updateWhatsapp('waba_id', event.target.value)} className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle} htmlFor="phone-id">Phone ID</label>
              <input id="phone-id" value={form.whatsapp.phone_id} onChange={(event) => updateWhatsapp('phone_id', event.target.value)} className={inputStyle} />
            </div>
            <SecretField id="whatsapp-token" label="Access Token" value={form.whatsapp.token} onChange={(event) => updateWhatsapp('token', event.target.value)} saved={saved.whatsappToken} />
            <SecretField id="whatsapp-app-secret" label="App Secret" value={form.whatsapp.app_secret} onChange={(event) => updateWhatsapp('app_secret', event.target.value)} saved={saved.appSecret} />
            <SecretField id="whatsapp-verify-token" label="Verify Token" value={form.whatsapp.verify_token} onChange={(event) => updateWhatsapp('verify_token', event.target.value)} saved={saved.verifyToken} />
            <div>
              <label className={labelStyle} htmlFor="api-version">Versi API</label>
              <input id="api-version" value={form.whatsapp.api_version} onChange={(event) => updateWhatsapp('api_version', event.target.value)} className={inputStyle} />
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              <p className="font-semibold text-gray-800">Tes Koneksi WhatsApp</p>
              <p className="mt-1 text-xs">Gunakan kredensial yang tersimpan untuk memeriksa koneksi gateway.</p>
            </div>
            <button type="button" onClick={handleTestWhatsapp} disabled={testing || !access.canEdit} className="app-button">
              <CheckCircle2 className="h-4 w-4" /> Tes Koneksi
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Webhook className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-800">Informasi Webhook</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Callback URL</p>
              <p className="mt-2 break-all text-sm font-semibold text-gray-800">{webhookUrl || 'Belum tersedia'}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Verify Token</p>
              <p className="mt-2 text-sm font-semibold text-gray-800">{webhookVerifySaved ? 'Tersimpan' : 'Belum tersedia'}</p>
            </div>
          </div>
          {webhook?.status ? <p className="mt-4 text-xs text-gray-500">Status webhook: {String(webhook.status)}</p> : null}
        </section>
      </form>
    </MarketingLayout>
  );
};

export default MarketingSettings;
