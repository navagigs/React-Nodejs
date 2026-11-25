import React from 'react';
import { Sparkles, Code2, Smartphone, ShieldCheck, ArrowRight, CheckCircle2, Laptop, Award } from 'lucide-react';
import { STATS, COMPANY_PROFILE } from '../data/mockData';

interface AboutSectionProps {
  onOpenContact: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onOpenContact }) => {
  return (
    <section id="about" className="relative bg-white text-black py-24 lg:py-32 px-6 lg:px-12 overflow-hidden border-t border-zinc-200">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
        {/* Left Column: Visual Showcase */}
        <div className="w-full lg:w-1/2 relative">
          <div className="relative h-[480px] sm:h-[580px] w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-zinc-950">
            {/* Modern Technology & Software Engineering Imagery */}
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop"
              alt="PT CROP Inspirasi Digital Engineering Team Collaboration"
              className="w-full h-full object-cover"
            />
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

            {/* Floating Innovation Pill */}
            <div className="absolute top-6 left-6 p-4 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center gap-3 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0">
                <Code2 size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-orange-400 font-brand-tech">Established 2016 • Bandung</div>
                <div className="text-sm font-black uppercase font-heading">Software Development House</div>
              </div>
            </div>

            {/* Floating Bottom Milestone Card */}
            <div className="absolute bottom-6 left-6 right-6 p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-zinc-200 text-black shadow-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h5 className="text-xs font-black uppercase tracking-wider text-zinc-900 font-heading">Legalitas Terverifikasi</h5>
                  <p className="text-[11px] text-zinc-500 font-medium font-brand-tech">AHU-0062409.AH.01.01.TAHUN 2016</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-orange-50 text-orange-700 text-xs font-black rounded-lg border border-orange-200 font-brand-tech">
                Verified PT
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Narrative & Stats Grid */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-orange-600 font-black text-xs tracking-widest uppercase border-b-2 border-orange-500 pb-1 font-brand-tech">
              About PT CROP INSPIRASI DIGITAL
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight uppercase font-heading mb-6 text-zinc-950">
            Mewujudkan Solusi<br />
            <span className="text-orange-500 font-display">Digital Transformation</span>
          </h2>

          <p className="text-zinc-600 text-base sm:text-lg mb-8 leading-relaxed font-normal">
            PT CROP INSPIRASI DIGITAL adalah perusahaan konsultan teknologi informasi dan pengembang perangkat lunak yang berpusat di Bandung, Indonesia. Berdiri sejak tahun 2016, kami berkomitmen memberikan layanan pembuatan Website, Mobile Apps, Custom Enterprise Software, hingga IT Management Consultant untuk perusahaan swasta, industri, perbankan, BUMN, dan institusi pendidikan.
          </p>

          {/* Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 font-brand-tech">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <CheckCircle2 className="text-orange-500 shrink-0 mt-0.5" size={18} />
              <span className="text-xs font-bold text-zinc-800">Jasa Pembuatan Website & Web App</span>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <CheckCircle2 className="text-orange-500 shrink-0 mt-0.5" size={18} />
              <span className="text-xs font-bold text-zinc-800">Mobile Apps (Android & iOS)</span>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <CheckCircle2 className="text-orange-500 shrink-0 mt-0.5" size={18} />
              <span className="text-xs font-bold text-zinc-800">Custom Software & Clinic Management</span>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <CheckCircle2 className="text-orange-500 shrink-0 mt-0.5" size={18} />
              <span className="text-xs font-bold text-zinc-800">IT Management & GRC Consultant</span>
            </div>
          </div>

          <div className="mb-12">
            <button
              onClick={onOpenContact}
              className="bg-orange-500 hover:bg-orange-600 text-white px-9 py-4 font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-xl shadow-orange-500/25 flex items-center gap-3 hover:scale-105 active:scale-95 cursor-pointer font-brand-tech"
            >
              <span>Hubungi Tim Konsultan Kami</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Core Verified Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-10 border-t border-zinc-200">
            {STATS.map((stat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-4xl sm:text-5xl font-black text-orange-500 font-heading">
                  {stat.value}
                </div>
                <div className="text-[11px] font-black uppercase text-zinc-800 font-heading">
                  {stat.label}
                </div>
                <div className="text-[10px] text-zinc-400 font-medium leading-tight font-brand-tech">
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
