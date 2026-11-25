import React from 'react';
import { ChevronRight, ArrowDown, Sparkles, Code2, Smartphone, Cpu, ShieldCheck, BarChart3, Layers } from 'lucide-react';
import { COMPANY_PROFILE } from '../data/mockData';

interface HeroProps {
  onOpenContact: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenContact }) => {
  return (
    <section className="relative min-h-[92vh] flex flex-col justify-between px-6 lg:px-12 pt-28 lg:pt-36 pb-12 overflow-hidden bg-gradient-to-b from-white via-zinc-50/50 to-white text-zinc-900 border-b border-zinc-200">
      {/* Background Matrix Grid */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="h-full w-full bg-[radial-gradient(circle_at_2px_2px,_rgba(0,0,0,0.06)_1.5px,_transparent_0)] bg-[size:36px_36px]"></div>
      </div>

      {/* Subtle Orange Glow Orbs */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-orange-400/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Main Content Layout */}
      <div className="relative z-10 w-full flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12 max-w-7xl mx-auto">
        {/* Left Column: Bold Headline & Badges */}
        <div className="max-w-3xl flex-1">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black uppercase tracking-widest mb-6 shadow-xs font-brand-tech">
            <Sparkles size={14} className="text-orange-500" />
            <span>IT Consultant & Software Development • Est. 2016</span>
          </div>

          {/* Master Headline - Attractive Google Font */}
          <h1 className="text-5xl sm:text-7xl lg:text-[88px] font-black leading-[0.94] tracking-tight uppercase font-heading text-zinc-950">
            DIGITAL<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-zinc-900 font-display font-black">
              TRANSFORMATION
            </span>
          </h1>

          <p className="mt-6 text-xl sm:text-2xl font-bold text-orange-600 font-brand-tech">
            “Together we can create digital transformation”
          </p>

          <p className="mt-4 text-base sm:text-lg text-zinc-600 max-w-xl leading-relaxed font-medium">
            PT CROP INSPIRASI DIGITAL memberikan layanan IT Consultant, Jasa Pembuatan Website, Aplikasi Mobile (Android & iOS), Custom Software, dan IT Management Consultant untuk perusahaan swasta, industri, perbankan, BUMN, hingga pasar global.
          </p>

          {/* Quick Action Buttons */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              onClick={onOpenContact}
              className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-orange-500/25 flex items-center gap-3 hover:scale-105 active:scale-95 cursor-pointer font-brand-tech"
            >
              <span>Transformasikan Bisnis Anda</span>
              <ChevronRight size={16} />
            </button>

            <a
              href="#projects"
              className="px-8 py-4 bg-white hover:bg-zinc-50 text-zinc-800 hover:text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-xl border border-zinc-300 hover:border-zinc-400 transition-all flex items-center gap-2 shadow-xs cursor-pointer font-brand-tech"
            >
              <span>Lihat Project Experience</span>
            </a>
          </div>

          {/* Capability Badges */}
          <div className="mt-12 pt-8 border-t border-zinc-200 grid grid-cols-3 gap-6 max-w-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-200">
                <Code2 size={18} />
              </div>
              <div className="text-[11px]">
                <div className="font-extrabold text-zinc-900 font-heading">Web & Cloud</div>
                <div className="text-zinc-500 uppercase text-[10px]">App Development</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-200">
                <Smartphone size={18} />
              </div>
              <div className="text-[11px]">
                <div className="font-extrabold text-zinc-900 font-heading">Mobile Apps</div>
                <div className="text-zinc-500 uppercase text-[10px]">Android & iOS</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-200">
                <ShieldCheck size={18} />
              </div>
              <div className="text-[11px]">
                <div className="font-extrabold text-zinc-900 font-heading">IT Consultant</div>
                <div className="text-zinc-500 uppercase text-[10px]">GRC & Management</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Signature Skewed Orange Card */}
        <div className="w-full lg:w-auto relative flex justify-end">
          <div className="relative transform lg:-skew-x-[14deg] bg-gradient-to-br from-orange-500 to-orange-600 p-8 sm:p-12 lg:p-16 rounded-3xl shadow-[0_25px_60px_-15px_rgba(249,115,22,0.35)] border border-orange-400 max-w-xl overflow-hidden group">
            {/* Ambient geometric light */}
            <div className="absolute -right-20 -top-20 w-60 h-60 bg-white/15 rounded-full blur-2xl"></div>
            
            <div className="transform lg:skew-x-[14deg] relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span className="text-[10px] font-black tracking-[0.25em] uppercase text-orange-100 font-brand-tech">
                  PT CROP INSPIRASI DIGITAL
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-4 leading-tight text-white uppercase font-heading">
                Transformasikan Bisnis Anda Bersama CROP
              </h3>

              <p className="text-sm lg:text-base text-orange-100/95 mb-8 leading-relaxed font-medium">
                Transformasi Digital yang stabil dan mudah digunakan adalah kekuatan dan ciri utama dari produk PT CROP INSPIRASI DIGITAL. Kami siap membantu perusahaan anda agar lebih berkembang, efisien dan efektif.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <a
                  href="#about"
                  className="bg-white text-orange-600 hover:bg-zinc-50 px-6 py-3.5 text-[11px] font-black tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-all rounded-xl shadow-lg shadow-orange-700/20 cursor-pointer font-brand-tech"
                >
                  <span>Tentang CROP</span>
                  <ChevronRight size={16} />
                </a>

                <button
                  onClick={onOpenContact}
                  className="border border-white/60 hover:bg-white/10 px-5 py-3.5 text-[11px] font-black tracking-[0.15em] uppercase text-white rounded-xl text-center transition-colors cursor-pointer font-brand-tech"
                >
                  Konsultasi Gratis
                </button>
              </div>

              {/* Verified Trust Strip */}
              <div className="mt-8 pt-6 border-t border-white/20 flex items-center justify-between text-xs text-orange-100 font-semibold font-brand-tech">
                <span>45+ Project Done</span>
                <span>•</span>
                <span>25+ Teams</span>
                <span>•</span>
                <span>17+ Clients</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Scroll Indicator */}
      <div className="relative z-10 max-w-7xl mx-auto w-full pt-8 flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-2 font-brand-tech">
          <span className="font-mono text-zinc-700 font-bold">01 / 05</span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Digital Transformation & Software Engineering</span>
        </div>

        <a 
          href="#projects" 
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors group cursor-pointer font-brand-tech"
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest">Scroll to Explore Projects</span>
          <ArrowDown size={14} className="transform group-hover:translate-y-1 transition-transform text-orange-500" />
        </a>
      </div>
    </section>
  );
};
