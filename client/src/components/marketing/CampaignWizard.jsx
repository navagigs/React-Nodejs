import React, { useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import {
  AlertCircle,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  MessageCircle,
  Monitor,
  Save,
  Search,
  Smartphone,
  Users,
  X
} from 'lucide-react';
import * as marketingApi from '../../marketingApi';

const STEPS = [
  { title: 'Kanal', description: 'Pilih kanal kampanye' },
  { title: 'Penerima', description: 'Tentukan penerima' },
  { title: 'Konten', description: 'Susun pesan' },
  { title: 'Pratinjau', description: 'Periksa tampilan' },
  { title: 'Jadwal', description: 'Atur waktu kirim' },
  { title: 'Monitor', description: 'Ringkasan kampanye' }
];

const CHANNEL_OPTIONS = [
  { key: 'email', label: 'Email', description: 'Kirim melalui email', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp', description: 'Kirim melalui WhatsApp', icon: MessageCircle },
  { key: 'both', label: 'Keduanya', description: 'Email dan WhatsApp', icon: Users }
];

const RECIPIENT_MODES = [
  { key: 'all', label: 'Semua kontak' },
  { key: 'segment', label: 'Berdasarkan segmen' },
  { key: 'category', label: 'Berdasarkan kategori' },
  { key: 'group', label: 'Grup kontak' },
  { key: 'manual', label: 'Pilih manual' }
];

const emptyForm = {
  name: '',
  channel: 'email',
  recipient_mode: 'all',
  segment: '',
  category: '',
  group_id: '',
  contact_ids: [],
  email_template_id: '',
  email_subject: '',
  email_from_name: '',
  email_from_email: '',
  email_html: '',
  whatsapp_template_id: '',
  whatsapp_text: '',
  schedule_mode: 'now',
  scheduled_at_email: '',
  scheduled_at_whatsapp: ''
};

const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const buildForm = (campaign) => {
  if (!campaign) return { ...emptyForm };
  const recipients = campaign.recipients || {};
  const schedule = campaign.schedule || {};
  const channel = campaign.channel || campaign.type || 'email';
  const scheduled = campaign.scheduled_at || schedule.email || schedule.whatsapp;
  return {
    ...emptyForm,
    name: campaign.name || '',
    channel,
    recipient_mode: recipients.mode || campaign.recipient_mode || 'all',
    segment: recipients.segment || campaign.segment || '',
    category: recipients.category || campaign.category || '',
    group_id: recipients.group_id || campaign.group_id || '',
    contact_ids: (recipients.contact_ids || campaign.contact_ids || []).map(String),
    email_template_id: campaign.email_template_id || '',
    email_subject: campaign.email_subject || campaign.subject || '',
    email_from_name: campaign.email_from_name || campaign.from_name || '',
    email_from_email: campaign.email_from_email || campaign.from_email || '',
    email_html: campaign.email_html || campaign.html || campaign.content || '',
    whatsapp_template_id: campaign.whatsapp_template_id || '',
    whatsapp_text: campaign.whatsapp_text || campaign.message || '',
    schedule_mode: campaign.schedule_mode || (scheduled ? 'scheduled' : 'now'),
    scheduled_at_email: toLocalInput(schedule.email || campaign.scheduled_at_email || (channel !== 'whatsapp' ? scheduled : '')),
    scheduled_at_whatsapp: toLocalInput(schedule.whatsapp || campaign.scheduled_at_whatsapp || (channel !== 'email' ? scheduled : ''))
  };
};

const CampaignWizard = ({ open, onClose, onSaved, initialCampaign = null }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [autoStart, setAutoStart] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const useEmail = form.channel === 'email' || form.channel === 'both';
  const useWhatsapp = form.channel === 'whatsapp' || form.channel === 'both';

  const filteredContacts = useMemo(() => {
    const term = contactSearch.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((contact) => [contact.name, contact.email, contact.whatsapp, contact.company]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [contacts, contactSearch]);

  const segmentOptions = useMemo(() => [...new Set(contacts.map((contact) => contact.segment).filter(Boolean))], [contacts]);
  const categoryOptions = useMemo(() => [...new Set(contacts.map((contact) => contact.category).filter(Boolean))], [contacts]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    const load = async () => {
      try {
        const [emailResult, whatsappResult, groupResult, contactResult] = await Promise.all([
          marketingApi.getEmailTemplates(),
          marketingApi.getWhatsappTemplates(),
          marketingApi.getGroups(),
          marketingApi.getContacts({ limit: 'all' })
        ]);
        if (!active) return;
        setEmailTemplates(asList(emailResult));
        setWhatsappTemplates(asList(whatsappResult));
        setGroups(asList(groupResult));
        setContacts(asList(contactResult));
      } catch (loadError) {
        if (active) setError(loadError.message || 'Gagal memuat data pendukung kampanye.');
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setForm(buildForm(initialCampaign));
    setAutoStart(false);
    setContactSearch('');
    setPreviewDevice('desktop');
    setError('');
  }, [open, initialCampaign]);

  if (!open) return null;

  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const toggleContact = (id) => {
    const contactId = String(id);
    setForm((previous) => ({
      ...previous,
      contact_ids: previous.contact_ids.includes(contactId)
        ? previous.contact_ids.filter((item) => item !== contactId)
        : [...previous.contact_ids, contactId]
    }));
  };

  const applyEmailTemplate = (id) => {
    const template = emailTemplates.find((item) => String(item.id) === String(id));
    setField('email_template_id', id);
    if (!template) return;
    setForm((previous) => ({
      ...previous,
      email_template_id: id,
      email_subject: template.subject || previous.email_subject,
      email_from_name: template.from_name || previous.email_from_name,
      email_from_email: template.from_email || previous.email_from_email,
      email_html: template.html || template.body_html || template.content || previous.email_html
    }));
  };

  const applyWhatsappTemplate = (id) => {
    const template = whatsappTemplates.find((item) => String(item.id) === String(id));
    setField('whatsapp_template_id', id);
    if (!template) return;
    setForm((previous) => ({
      ...previous,
      whatsapp_template_id: id,
      whatsapp_text: template.text || template.body || template.message || previous.whatsapp_text
    }));
  };

  const personalize = (text) => {
    const sample = {
      nama: 'Nama Kontak',
      email: 'email@kontak',
      perusahaan: 'Nama Perusahaan',
      whatsapp: 'Nomor WhatsApp'
    };
    return String(text || '').replace(/{{\s*(\w+)\s*}}/g, (match, key) => sample[key] || match);
  };

  const validateStep = (index) => {
    if (index === 0) {
      if (!form.name.trim()) return 'Nama kampanye wajib diisi.';
      if (!form.channel) return 'Pilih minimal satu kanal kampanye.';
      return '';
    }
    if (index === 1) {
      if (form.recipient_mode === 'group' && !form.group_id) return 'Pilih grup kontak terlebih dahulu.';
      if (form.recipient_mode === 'segment' && !form.segment) return 'Pilih segmen terlebih dahulu.';
      if (form.recipient_mode === 'category' && !form.category) return 'Pilih kategori terlebih dahulu.';
      if (form.recipient_mode === 'manual' && form.contact_ids.length === 0) return 'Pilih minimal satu kontak.';
      return '';
    }
    if (index === 2) {
      if (useEmail && !form.email_subject.trim()) return 'Subjek email wajib diisi.';
      if (useEmail && !form.email_html.trim()) return 'Konten email wajib diisi.';
      if (useWhatsapp && !form.whatsapp_text.trim()) return 'Pesan WhatsApp wajib diisi.';
      return '';
    }
    if (index === 4 && form.schedule_mode === 'scheduled') {
      if (useEmail && !form.scheduled_at_email) return 'Waktu jadwal email wajib diisi.';
      if (useWhatsapp && !form.scheduled_at_whatsapp) return 'Waktu jadwal WhatsApp wajib diisi.';
      return '';
    }
    return '';
  };

  const handleNext = () => {
    const message = validateStep(step);
    setError(message);
    if (message) return;
    setStep((previous) => Math.min(previous + 1, STEPS.length - 1));
  };

  const handleSave = async () => {
    for (let index = 0; index < STEPS.length; index += 1) {
      if (index === 3 || index === 5) continue;
      const message = validateStep(index);
      if (message) {
        setStep(index);
        setError(message);
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...(initialCampaign?.id ? { id: initialCampaign.id } : {}),
        name: form.name.trim(),
        channel: form.channel,
        type: form.channel,
        recipient_mode: form.recipient_mode,
        segment: form.recipient_mode === 'segment' ? form.segment : '',
        category: form.recipient_mode === 'category' ? form.category : '',
        group_id: form.recipient_mode === 'group' ? form.group_id : '',
        contact_ids: form.recipient_mode === 'manual' ? form.contact_ids : [],
        recipients: {
          mode: form.recipient_mode,
          segment: form.recipient_mode === 'segment' ? form.segment : '',
          category: form.recipient_mode === 'category' ? form.category : '',
          group_id: form.recipient_mode === 'group' ? form.group_id : '',
          contact_ids: form.recipient_mode === 'manual' ? form.contact_ids : []
        },
        email_template_id: useEmail ? form.email_template_id : '',
        email_subject: useEmail ? form.email_subject.trim() : '',
        email_from_name: useEmail ? form.email_from_name.trim() : '',
        email_from_email: useEmail ? form.email_from_email.trim() : '',
        email_html: useEmail ? form.email_html : '',
        whatsapp_template_id: useWhatsapp ? form.whatsapp_template_id : '',
        whatsapp_text: useWhatsapp ? form.whatsapp_text.trim() : '',
        schedule_mode: form.schedule_mode,
        scheduled_at_email: form.schedule_mode === 'scheduled' && useEmail ? form.scheduled_at_email : '',
        scheduled_at_whatsapp: form.schedule_mode === 'scheduled' && useWhatsapp ? form.scheduled_at_whatsapp : ''
      };

      const saved = await marketingApi.saveCampaign(payload);
      const savedId = saved?.data?.id || saved?.id || initialCampaign?.id;
      if (form.schedule_mode === 'scheduled' && savedId) {
        await marketingApi.scheduleCampaign(savedId, {
          scheduled_at_email: payload.scheduled_at_email,
          scheduled_at_whatsapp: payload.scheduled_at_whatsapp
        });
      } else if (autoStart && savedId) {
        await marketingApi.startCampaign(savedId);
      }
      if (onSaved) onSaved(saved);
      if (onClose) onClose();
    } catch (saveError) {
      setError(saveError.message || 'Gagal menyimpan kampanye.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = 'app-input';
  const labelStyle = 'block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{initialCampaign ? 'Ubah Kampanye' : 'Buat Kampanye Baru'}</h2>
            <p className="mt-1 text-sm text-gray-500">Lengkapi enam langkah berikut untuk menyiapkan kampanye.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700" aria-label="Tutup wizard">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {STEPS.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => {
                  if (index < step) {
                    setStep(index);
                    setError('');
                  }
                }}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${index === step ? 'bg-indigo-50 text-indigo-700' : index < step ? 'text-indigo-500 hover:bg-indigo-50' : 'text-gray-400'}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index < step ? 'bg-indigo-600 text-white' : index === step ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'}`}>
                  {index < step ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className="hidden text-xs font-semibold lg:block">{item.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error ? (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          {step === 0 ? (
            <div className="space-y-6">
              <div>
                <label className={labelStyle} htmlFor="campaign-name">Nama Kampanye *</label>
                <input id="campaign-name" value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="Contoh: Promosi bulanan" className={inputStyle} />
              </div>
              <div>
                <span className={labelStyle}>Kanal Kampanye *</span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {CHANNEL_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const active = form.channel === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setField('channel', option.key)}
                        className={`rounded-xl border p-4 text-left transition ${active ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100' : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50'}`}
                      >
                        <Icon className={`mb-2 h-5 w-5 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
                        <div className="text-sm font-semibold text-gray-800">{option.label}</div>
                        <div className="mt-1 text-xs text-gray-500">{option.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <span className={labelStyle}>Mode Penerima *</span>
                <div className="flex flex-wrap gap-2">
                  {RECIPIENT_MODES.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setField('recipient_mode', option.key)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${form.recipient_mode === option.key ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-600'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.recipient_mode === 'all' ? (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700">
                  Kampanye akan dikirim kepada seluruh kontak yang tersedia.
                </div>
              ) : null}

              {form.recipient_mode === 'segment' ? (
                <div>
                  <label className={labelStyle} htmlFor="campaign-segment">Segmen</label>
                  <select id="campaign-segment" value={form.segment} onChange={(event) => setField('segment', event.target.value)} className={inputStyle}>
                    <option value="">Pilih segmen</option>
                    {segmentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  {segmentOptions.length === 0 ? <p className="mt-2 text-xs text-gray-500">Belum ada segmen pada data kontak.</p> : null}
                </div>
              ) : null}

              {form.recipient_mode === 'category' ? (
                <div>
                  <label className={labelStyle} htmlFor="campaign-category">Kategori</label>
                  <select id="campaign-category" value={form.category} onChange={(event) => setField('category', event.target.value)} className={inputStyle}>
                    <option value="">Pilih kategori</option>
                    {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  {categoryOptions.length === 0 ? <p className="mt-2 text-xs text-gray-500">Belum ada kategori pada data kontak.</p> : null}
                </div>
              ) : null}

              {form.recipient_mode === 'group' ? (
                <div className="space-y-2">
                  <span className={labelStyle}>Grup Kontak</span>
                  {groups.length === 0 ? <p className="text-sm text-gray-500">Belum ada grup kontak.</p> : null}
                  {groups.map((group) => (
                    <label key={group.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${String(form.group_id) === String(group.id) ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" name="campaign-group" checked={String(form.group_id) === String(group.id)} onChange={() => setField('group_id', group.id)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-gray-800">{group.name}</span>
                        {group.description ? <span className="block text-xs text-gray-500">{group.description}</span> : null}
                      </span>
                      {group.member_count !== undefined ? <span className="text-xs text-gray-500">{group.member_count} anggota</span> : null}
                    </label>
                  ))}
                </div>
              ) : null}

              {form.recipient_mode === 'manual' ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} placeholder="Cari kontak..." className={`${inputStyle} pl-9`} />
                  </div>
                  <p className="text-xs text-gray-500">{form.contact_ids.length} kontak dipilih</p>
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-3">
                    {filteredContacts.length === 0 ? <p className="py-4 text-center text-sm text-gray-400">Kontak tidak ditemukan.</p> : null}
                    {filteredContacts.map((contact) => (
                      <label key={contact.id} className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition ${form.contact_ids.includes(String(contact.id)) ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                        <input type="checkbox" checked={form.contact_ids.includes(String(contact.id))} onChange={() => toggleContact(contact.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-800">{contact.name || contact.email}</span>
                          <span className="block truncate text-xs text-gray-500">{contact.email || contact.whatsapp || '-'}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-8">
              {useEmail ? (
                <div className="space-y-5 rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-800"><Mail className="h-4 w-4 text-indigo-600" /> Konten Email</div>
                  <div>
                    <label className={labelStyle} htmlFor="email-template">Template Email</label>
                    <select id="email-template" value={form.email_template_id} onChange={(event) => applyEmailTemplate(event.target.value)} className={inputStyle}>
                      <option value="">Tanpa template</option>
                      {emailTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle} htmlFor="email-subject">Subjek Email *</label>
                    <input id="email-subject" value={form.email_subject} onChange={(event) => setField('email_subject', event.target.value)} placeholder="Contoh: Penawaran khusus untuk {{nama}}" className={inputStyle} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelStyle} htmlFor="email-from-name">Nama Pengirim</label>
                      <input id="email-from-name" value={form.email_from_name} onChange={(event) => setField('email_from_name', event.target.value)} className={inputStyle} />
                    </div>
                    <div>
                      <label className={labelStyle} htmlFor="email-from-email">Email Pengirim</label>
                      <input id="email-from-email" type="email" value={form.email_from_email} onChange={(event) => setField('email_from_email', event.target.value)} className={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <span className={labelStyle}>Isi Email (HTML) *</span>
                    <ReactQuill theme="snow" value={form.email_html} onChange={(value) => setField('email_html', value)} className="bg-white" />
                  </div>
                </div>
              ) : null}

              {useWhatsapp ? (
                <div className="space-y-5 rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-800"><MessageCircle className="h-4 w-4 text-green-600" /> Pesan WhatsApp</div>
                  <div>
                    <label className={labelStyle} htmlFor="whatsapp-template">Template WhatsApp</label>
                    <select id="whatsapp-template" value={form.whatsapp_template_id} onChange={(event) => applyWhatsappTemplate(event.target.value)} className={inputStyle}>
                      <option value="">Tanpa template</option>
                      {whatsappTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle} htmlFor="whatsapp-text">Teks Pesan *</label>
                    <textarea id="whatsapp-text" rows={6} value={form.whatsapp_text} onChange={(event) => setField('whatsapp_text', event.target.value)} placeholder="Halo {{nama}, ini pesan dari {{perusahaan}}." className={inputStyle} />
                  </div>
                  <p className="text-xs text-gray-500">Variabel yang tersedia: {'{{nama}}'}, {'{{email}}'}, {'{{perusahaan}}'}, {'{{whatsapp}}'}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800"><Eye className="h-4 w-4 text-indigo-600" /> Pratinjau Kampanye</div>
              {useEmail ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pratinjau Email</span>
                    <div className="inline-flex rounded-lg border border-gray-200 p-1">
                      <button type="button" onClick={() => setPreviewDevice('desktop')} className={`rounded-md p-1.5 ${previewDevice === 'desktop' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`} aria-label="Pratinjau desktop"><Monitor className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setPreviewDevice('mobile')} className={`rounded-md p-1.5 ${previewDevice === 'mobile' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`} aria-label="Pratinjau seluler"><Smartphone className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div className={`mx-auto overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all ${previewDevice === 'mobile' ? 'max-w-sm' : 'w-full'}`}>
                    <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                      <p><span className="font-semibold text-gray-700">Dari:</span> {form.email_from_name || 'Nama Pengirim'} {form.email_from_email ? `<${form.email_from_email}>` : ''}</p>
                      <p className="mt-1"><span className="font-semibold text-gray-700">Subjek:</span> {personalize(form.email_subject)}</p>
                    </div>
                    <div className="prose prose-sm max-w-none px-4 py-5" dangerouslySetInnerHTML={{ __html: personalize(form.email_html) }} />
                  </div>
                </div>
              ) : null}

              {useWhatsapp ? (
                <div className="space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pratinjau WhatsApp</span>
                  <div className="mx-auto max-w-sm rounded-2xl bg-[#e5ddd5] p-4">
                    <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-none bg-[#dcf8c6] px-3 py-2 text-sm whitespace-pre-wrap text-gray-800 shadow">
                      {personalize(form.whatsapp_text)}
                      <span className="mt-1 block text-right text-[10px] text-gray-500">10:00</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800"><CalendarClock className="h-4 w-4 text-indigo-600" /> Waktu Pengiriman</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => setField('schedule_mode', 'now')} className={`rounded-xl border p-4 text-left transition ${form.schedule_mode === 'now' ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <span className="block text-sm font-semibold text-gray-800">Kirim sekarang</span>
                  <span className="mt-1 block text-xs text-gray-500">Kampanye langsung diproses setelah disimpan.</span>
                </button>
                <button type="button" onClick={() => setField('schedule_mode', 'scheduled')} className={`rounded-xl border p-4 text-left transition ${form.schedule_mode === 'scheduled' ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <span className="block text-sm font-semibold text-gray-800">Jadwalkan</span>
                  <span className="mt-1 block text-xs text-gray-500">Tentukan waktu kirim untuk tiap kanal.</span>
                </button>
              </div>
              {form.schedule_mode === 'scheduled' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {useEmail ? (
                    <div>
                      <label className={labelStyle} htmlFor="schedule-email">Waktu Email</label>
                      <input id="schedule-email" type="datetime-local" value={form.scheduled_at_email} onChange={(event) => setField('scheduled_at_email', event.target.value)} className={inputStyle} />
                    </div>
                  ) : null}
                  {useWhatsapp ? (
                    <div>
                      <label className={labelStyle} htmlFor="schedule-whatsapp">Waktu WhatsApp</label>
                      <input id="schedule-whatsapp" type="datetime-local" value={form.scheduled_at_whatsapp} onChange={(event) => setField('scheduled_at_whatsapp', event.target.value)} className={inputStyle} />
                    </div>
                  ) : null}
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
                  <input type="checkbox" checked={autoStart} onChange={(event) => setAutoStart(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  Mulai kampanye setelah disimpan
                </label>
              )}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800"><Check className="h-4 w-4 text-indigo-600" /> Ringkasan Kampanye</div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase text-gray-500">Nama</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{form.name || '-'}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase text-gray-500">Kanal</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{CHANNEL_OPTIONS.find((option) => option.key === form.channel)?.label || '-'}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase text-gray-500">Penerima</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{RECIPIENT_MODES.find((option) => option.key === form.recipient_mode)?.label || '-'}</p>
                  {form.recipient_mode === 'manual' ? <p className="mt-1 text-xs text-gray-500">{form.contact_ids.length} kontak dipilih</p> : null}
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase text-gray-500">Waktu Kirim</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{form.schedule_mode === 'now' ? 'Kirim sekarang' : 'Dijadwalkan'}</p>
                  {form.schedule_mode === 'scheduled' ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {[useEmail ? form.scheduled_at_email : '', useWhatsapp ? form.scheduled_at_whatsapp : ''].filter(Boolean).join(' • ')}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700">
                Setelah kampanye disimpan, status pengiriman dapat dipantau melalui halaman Kampanye pada menu Marketing Center.
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <p className="hidden text-xs text-gray-500 sm:block">{STEPS[step].title} — {STEPS[step].description}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="app-button">Batal</button>
            {step > 0 ? (
              <button type="button" onClick={() => { setStep(step - 1); setError(''); }} className="app-button">
                <ChevronLeft className="h-4 w-4" /> Sebelumnya
              </button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={handleNext} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700">
                Berikutnya <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Kampanye'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignWizard;
