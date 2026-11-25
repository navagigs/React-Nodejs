import React, { useState } from 'react';
import { X, Send, CheckCircle, Sparkles, Building, Mail, Phone, Clock, DollarSign, MessageSquare, Code2 } from 'lucide-react';
import { SERVICES } from '../data/mockData';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialService?: string;
  initialProjectRef?: string;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  initialService,
  initialProjectRef
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    companyName: '',
    phone: '',
    selectedService: initialService || SERVICES[0].title,
    projectScale: 'Medium Enterprise / Institusi',
    timeline: '1-3 Bulan Kedepan',
    message: initialProjectRef ? `Tertarik berkonsultasi mengenai implementasi sistem mirip dengan ${initialProjectRef}.` : ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  const handleReset = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-zinc-200 flex items-center justify-between bg-gradient-to-r from-orange-50 via-white to-white">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-orange-600 block mb-1 font-brand-tech">
              IT Consultant & Software Development
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight font-heading">
              Konsultasi Proyek & Sistem
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 sm:p-8 flex-1">
          {submitted ? (
            <div className="text-center py-10 space-y-6">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-orange-50">
                <CheckCircle size={36} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-zinc-950 uppercase tracking-tight font-heading">
                  Permintaan Konsultasi Diterima!
                </h3>
                <p className="text-sm text-zinc-600 max-w-md mx-auto mt-2 leading-relaxed font-medium">
                  Terima kasih, <strong className="text-zinc-950">{formData.fullName}</strong>. Tim Solution Consultant dari PT CROP INSPIRASI DIGITAL akan menghubungi <strong className="text-orange-600">{formData.workEmail}</strong> dalam waktu maksimal 1x24 jam kerja untuk penjadwalan sesi diskusi kebutuhan teknis.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-left max-w-md mx-auto text-xs space-y-1.5 text-zinc-600 font-brand-tech">
                <div><span className="text-zinc-400 font-medium">Layanan Dipilih:</span> <span className="text-zinc-900 font-bold">{formData.selectedService}</span></div>
                <div><span className="text-zinc-400 font-medium">Skala Instansi:</span> <span className="text-zinc-900 font-bold">{formData.projectScale}</span></div>
                <div><span className="text-zinc-400 font-medium">No Registrasi:</span> <span className="text-orange-600 font-mono font-bold">CROP-IT-{Math.floor(100000 + Math.random() * 900000)}</span></div>
              </div>

              <button
                onClick={handleReset}
                className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-orange-500/25 cursor-pointer font-brand-tech"
              >
                Kembali ke Beranda
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-1.5 font-brand-tech">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-1.5 font-brand-tech">
                    Email Perusahaan / Pribadi *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.workEmail}
                    onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                    placeholder="budi@perusahaan.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-1.5 font-brand-tech">
                    Perusahaan / Instansi / Lembaga *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Nama instansi atau bisnis"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-1.5 font-brand-tech">
                    No WhatsApp / Telepon *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0812..."
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-1.5 font-brand-tech">
                  Layanan / Solusi yang Dibutuhkan
                </label>
                <select
                  value={formData.selectedService}
                  onChange={(e) => setFormData({ ...formData, selectedService: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                >
                  {SERVICES.map((s) => (
                    <option key={s.id} value={s.title}>
                      {s.title}
                    </option>
                  ))}
                  <option value="Sistem Informasi Klinik & Medis">Sistem Informasi Klinik & Medis</option>
                  <option value="Aplikasi Android & iOS Enterprise">Aplikasi Android & iOS Enterprise</option>
                  <option value="Consulting & Tata Kelola IT (GRC)">Consulting & Tata Kelola IT (GRC)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-1.5 font-brand-tech">
                    Skala Kebutuhan
                  </label>
                  <select
                    value={formData.projectScale}
                    onChange={(e) => setFormData({ ...formData, projectScale: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                  >
                    <option value="UMKM / Startup">UMKM / Startup / Bisnis Berkembang</option>
                    <option value="Medium Enterprise / Institusi">Medium Enterprise / Institusi Pendidikan</option>
                    <option value="Korporasi Besar / BUMN">Korporasi Besar / BUMN / Bank</option>
                    <option value="Instansi Pemerintah / RS">Instansi Pemerintah / Rumah Sakit & Klinik</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-1.5 font-brand-tech">
                    Target Pelaksanaan
                  </label>
                  <select
                    value={formData.timeline}
                    onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                  >
                    <option value="Segera (Bulan Ini)">Segera (Bulan Ini)</option>
                    <option value="1-3 Bulan Kedepan">1-3 Bulan Kedepan</option>
                    <option value="Semester / Tahun Depan">Semester / Tahun Depan</option>
                    <option value="Tahap Perencanaan & Estimasi Anggaran">Tahap Perencanaan & Estimasi Anggaran</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-1.5 font-brand-tech">
                  Deskripsi Kebutuhan & Fitur Utama
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Ceritakan gambaran sistem yang ingin dibangun, modul spesifik, integrasi yang diinginkan, atau kendala bisnis saat ini..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                ></textarea>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-orange-500/25 disabled:opacity-50 cursor-pointer font-brand-tech"
                >
                  {isSubmitting ? (
                    <span>Memproses Permintaan Diskusi...</span>
                  ) : (
                    <>
                      <span>Kirim Permintaan Konsultasi</span>
                      <Send size={15} />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-zinc-500 text-center mt-3 font-medium font-brand-tech">
                  🔒 Data & proposal Anda dijamin kerahasiaannya dengan Non-Disclosure Agreement (NDA).
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
