import React, { useState } from 'react';
import { 
  ChevronRight, ShieldCheck, Instagram, Linkedin, Twitter, 
  MapPin, Phone, Mail, MessageSquare, ExternalLink, Check, Sparkles, Code2, Globe, Smartphone
} from 'lucide-react';
import { OFFICE_LOCATIONS, COMPANY_PROFILE } from '../data/mockData';

interface FooterProps {
  onOpenContact: (service?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenContact }) => {
  const [selectedOffice, setSelectedOffice] = useState<string>('bandung');
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const activeOffice = OFFICE_LOCATIONS.find(o => o.id === selectedOffice) || OFFICE_LOCATIONS[0];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setSubscribed(true);
  };

  return (
    <footer className="bg-white text-black pt-24 pb-12 px-6 lg:px-12 border-t border-zinc-200">
      <div className="max-w-7xl mx-auto">
        {/* 1. Master CTA Banner */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-20 gap-10 bg-zinc-50 p-8 sm:p-12 lg:p-16 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="max-w-2xl">
            <span className="text-orange-500 font-black text-xs tracking-widest uppercase block mb-3 font-brand-tech">
              Siap Bertransformasi Digital?
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight uppercase font-heading text-zinc-950">
              Konsultasikan Kebutuhan<br />
              <span className="text-orange-500 font-display">Teknologi Anda</span>
            </h2>
          </div>

          <div className="flex flex-col items-start lg:items-end text-left lg:text-right max-w-md">
            <p className="text-zinc-600 text-base sm:text-lg mb-8 leading-relaxed font-medium">
              Transformasi digital yang tepat, handal, dan scalable untuk membawa bisnis dan organisasi Anda mencapai efisiensi dan pertumbuhan maksimal.
            </p>
            <button
              onClick={() => onOpenContact()}
              className="bg-orange-500 hover:bg-black text-white px-10 py-4 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 cursor-pointer font-brand-tech"
            >
              Hubungi Tim Konsultan
            </button>
          </div>
        </div>

        <hr className="border-zinc-200 mb-16" />

        {/* 2. Main Multi-Column Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          {/* Column 01: Logo & Company Persona */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md font-brand-tech font-black text-lg">
                C
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight text-black font-heading">
                  PT CROP
                </span>
                <div className="text-[10px] font-bold uppercase tracking-wider text-orange-600 font-brand-tech">
                  INSPIRASI DIGITAL
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed max-w-xs font-medium">
              IT Consultant & Software Development House yang berkomitmen membantu perusahaan, BUMN, perbankan, dan institusi berkembang melalui solusi teknologi berkualitas.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://crop.co.id"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-orange-500 text-zinc-700 hover:text-white flex items-center justify-center transition-all shadow-xs"
                title="Website CROP"
              >
                <Globe size={16} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-orange-500 text-zinc-700 hover:text-white flex items-center justify-center transition-all shadow-xs"
                title="LinkedIn"
              >
                <Linkedin size={16} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-orange-500 text-zinc-700 hover:text-white flex items-center justify-center transition-all shadow-xs"
                title="Instagram"
              >
                <Instagram size={16} />
              </a>
            </div>
          </div>

          {/* Column 02: Interactive Global Offices & Hubs */}
          <div className="space-y-6">
            <h5 className="font-black text-xs uppercase tracking-widest text-zinc-900 flex items-center gap-2 font-brand-tech">
              <span className="text-orange-500 font-bold">01</span> Kantor & Workshop
            </h5>

            {/* Office location toggle tabs */}
            <div className="flex rounded-lg bg-zinc-100 p-1 gap-1">
              {OFFICE_LOCATIONS.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedOffice(loc.id)}
                  className={`flex-1 py-1 text-[10px] font-black uppercase rounded-md transition-all cursor-pointer ${
                    selectedOffice === loc.id
                      ? 'bg-white text-orange-500 shadow-2xs font-brand-tech'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {loc.city}
                </button>
              ))}
            </div>

            {/* Selected Office Details Card */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs space-y-3 shadow-2xs">
              <div className="text-[10px] font-black uppercase text-orange-600 font-brand-tech">
                {activeOffice.type}
              </div>
              <div className="flex items-start gap-2 text-zinc-700">
                <MapPin size={15} className="text-orange-500 shrink-0 mt-0.5" />
                <p className="line-clamp-2 leading-relaxed">{activeOffice.address}</p>
              </div>
              <div className="flex items-center gap-2 text-zinc-700">
                <Phone size={14} className="text-orange-500 shrink-0" />
                <a href={`tel:${activeOffice.phone}`} className="hover:text-orange-500 font-mono font-bold">
                  {activeOffice.phone}
                </a>
              </div>
              <div className="flex items-center gap-2 text-zinc-700">
                <Mail size={14} className="text-orange-500 shrink-0" />
                <a href={`mailto:${activeOffice.email}`} className="hover:text-orange-500 truncate font-semibold">
                  {activeOffice.email}
                </a>
              </div>
            </div>
          </div>

          {/* Column 03: Fast Navigation Links */}
          <div className="space-y-6">
            <h5 className="font-black text-xs uppercase tracking-widest text-zinc-900 flex items-center gap-2 font-brand-tech">
              <span className="text-orange-500 font-bold">02</span> Layanan Solusi
            </h5>
            <ul className="space-y-3 text-xs font-semibold text-zinc-600">
              <li>
                <a href="#services" className="hover:text-orange-500 transition-colors flex items-center gap-2">
                  <ChevronRight size={14} className="text-orange-500" /> Jasa Pembuatan Website & Web App
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-orange-500 transition-colors flex items-center gap-2">
                  <ChevronRight size={14} className="text-orange-500" /> Mobile Apps (Android & iOS)
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-orange-500 transition-colors flex items-center gap-2">
                  <ChevronRight size={14} className="text-orange-500" /> Custom Software & Clinic System
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-orange-500 transition-colors flex items-center gap-2">
                  <ChevronRight size={14} className="text-orange-500" /> Reseller System & Point of Sales
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-orange-500 transition-colors flex items-center gap-2">
                  <ChevronRight size={14} className="text-orange-500" /> GRC & IT Governance Consultant
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-orange-500 transition-colors flex items-center gap-2">
                  <ChevronRight size={14} className="text-orange-500" /> HR & Performance Management
                </a>
              </li>
            </ul>
          </div>

          {/* Column 04: Newsletter */}
          <div className="space-y-6">
            <h5 className="font-black text-xs uppercase tracking-widest text-zinc-900 flex items-center gap-2 font-brand-tech">
              <span className="text-orange-500 font-bold">03</span> Digital Insights
            </h5>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Dapatkan info berkala mengenai tren transformasi digital, arsitektur software modern, dan inovasi teknologi terkini.
            </p>

            {subscribed ? (
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-semibold flex items-center gap-2 font-brand-tech">
                <Check size={16} className="text-orange-600" />
                <span>Terima kasih! Anda telah terdaftar dalam newsletter kami.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2 font-brand-tech">
                <div className="relative">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Masukkan email perusahaan..."
                    required
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-4 py-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-orange-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  Berlangganan Insight
                </button>
              </form>
            )}

            <div className="pt-2 flex items-center gap-2 text-[11px] text-zinc-500 font-medium font-brand-tech">
              <ShieldCheck size={14} className="text-green-600" />
              <span>Privasi data terjaga. Kami menghargai kerahasiaan Anda.</span>
            </div>
          </div>
        </div>

        {/* 3. Bottom Legal & Copyright Bar */}
        <div className="pt-8 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-medium font-brand-tech">
          <div>
            © {new Date().getFullYear()} PT CROP INSPIRASI DIGITAL (crop.co.id). All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-zinc-900 transition-colors">Kebijakan Privasi</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Syarat & Ketentuan</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Legalitas AHU</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Kontak</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
