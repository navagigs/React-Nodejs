import React, { useState } from 'react';
import { 
  RefreshCw, Folder, Settings, PenTool, FileText, ShieldCheck, 
  ChevronRight, ArrowRight, Play, CheckCircle, Sparkles, Cpu, Layers, Brain, Award, Globe, Smartphone, Code2
} from 'lucide-react';
import { SERVICES } from '../data/mockData';
import { ServiceItem } from '../types';

interface ServicesSectionProps {
  onOpenContact: (serviceTitle?: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onOpenContact }) => {
  const [activeServiceId, setActiveServiceId] = useState<string>(SERVICES[0].id);

  const activeService = SERVICES.find(s => s.id === activeServiceId) || SERVICES[0];

  const getServiceIcon = (iconName: string, size = 26) => {
    switch (iconName) {
      case 'Globe': return <Globe size={size} />;
      case 'Smartphone': return <Smartphone size={size} />;
      case 'Code2': return <Code2 size={size} />;
      case 'ShieldCheck': return <ShieldCheck size={size} />;
      case 'Layers': return <Layers size={size} />;
      case 'Award': return <Award size={size} />;
      default: return <Code2 size={size} />;
    }
  };

  return (
    <section id="services" className="bg-white text-zinc-900 py-28 px-6 lg:px-12 border-t border-zinc-200 relative overflow-hidden">
      {/* Subtle Glow */}
      <div className="absolute top-10 right-10 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 lg:gap-20 items-start">
        {/* Left Column: Interactive Visual Showcase & Active Service Card */}
        <div className="w-full lg:w-1/2 space-y-6 lg:sticky lg:top-28">
          {/* Visual Showcase Card */}
          <div className="relative rounded-3xl overflow-hidden shadow-xl border border-zinc-200 bg-zinc-950 group h-[280px] sm:h-[340px]">
            <img
              src="https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1200&auto=format&fit=crop"
              alt="PT CROP Digital Solutions & Software Engineering"
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent"></div>

            {/* Video Watermark Tag */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 font-brand-tech">
              <span className="px-3 py-1 rounded-full bg-orange-500 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                <Sparkles size={12} className="fill-white" /> CROP Digital Suite
              </span>
              <span className="text-[10px] font-mono text-zinc-200 bg-zinc-950/70 px-2.5 py-1 rounded backdrop-blur-md border border-white/10">
                Production Ready
              </span>
            </div>
          </div>

          {/* Active Service Deep Dive Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-50 border border-zinc-200 backdrop-blur-md shadow-lg shadow-zinc-200/50 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/25">
                {getServiceIcon(activeService.iconName, 24)}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 font-brand-tech">
                  Layanan Unggulan
                </span>
                <h3 className="text-xl sm:text-2xl font-black uppercase text-zinc-950 font-heading">
                  {activeService.title}
                </h3>
              </div>
            </div>

            <p className="text-zinc-600 text-sm leading-relaxed mb-6 font-medium">
              {activeService.fullDesc}
            </p>

            {/* Deliverables Checklist */}
            <div className="space-y-2 mb-6">
              <div className="text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-2 flex items-center gap-1.5 font-brand-tech">
                <Layers size={13} className="text-orange-500" /> Deliverables & Ruang Lingkup:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeService.deliverables.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-zinc-700 font-medium font-brand-tech">
                    <CheckCircle size={14} className="text-orange-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech Stack Pills */}
            <div className="pt-4 border-t border-zinc-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1 font-brand-tech">
                <Cpu size={12} className="text-orange-500" /> Teknologi & Framework:
              </div>
              <div className="flex flex-wrap gap-1.5 font-brand-tech">
                {activeService.techStack.map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-white border border-zinc-200 text-[11px] font-semibold text-orange-600 shadow-2xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-200 flex items-center justify-between font-brand-tech">
              <span className="text-xs text-zinc-500 font-medium">Butuh solusi ini untuk bisnis Anda?</span>
              <button
                onClick={() => onOpenContact(activeService.title)}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-orange-500/25 cursor-pointer"
              >
                Konsultasikan Solusi →
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Service Selection Menu & Exploration */}
        <div className="w-full lg:w-1/2 flex flex-col justify-start">
          <span className="text-orange-600 font-black text-xs tracking-widest uppercase mb-3 border-b border-orange-500 w-fit pb-1 font-brand-tech">
            Our Core Services
          </span>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase mb-6 leading-tight font-heading text-zinc-950">
            Layanan IT &<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 font-display">
              Software Development
            </span>
          </h2>

          <p className="text-zinc-600 mb-8 text-base sm:text-lg leading-relaxed font-medium">
            Kami siap menjadi partner transformasi digital perusahaan Anda dengan beragam layanan teknologi terintegrasi, handal, dan berorientasi pada kepuasan klien:
          </p>

          {/* Interactive Services List */}
          <div className="space-y-3">
            {SERVICES.map((s) => {
              const isActive = s.id === activeServiceId;
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveServiceId(s.id)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isActive
                      ? 'bg-orange-50/80 border-orange-500 shadow-md shadow-orange-500/10'
                      : 'bg-zinc-50 border-zinc-200 hover:border-orange-300 hover:bg-orange-50/30'
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`p-3 rounded-xl transition-colors ${
                      isActive ? 'bg-orange-500 text-white' : 'bg-white text-orange-600 border border-zinc-200 group-hover:text-white group-hover:bg-orange-500 group-hover:border-transparent'
                    }`}>
                      {getServiceIcon(s.iconName, 22)}
                    </div>
                    <div>
                      <h4 className={`text-base sm:text-lg font-black uppercase transition-colors font-heading ${
                        isActive ? 'text-zinc-950' : 'text-zinc-800 group-hover:text-orange-600'
                      }`}>
                        {s.title}
                      </h4>
                      <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5 font-medium">
                        {s.shortDesc}
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={20}
                    className={`shrink-0 transition-transform ${
                      isActive ? 'text-orange-500 translate-x-1' : 'text-zinc-400 group-hover:text-zinc-700'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Footer CTAs */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 font-brand-tech">
            <button
              onClick={() => onOpenContact()}
              className="px-8 py-4 border border-zinc-300 hover:border-zinc-400 bg-white hover:bg-zinc-50 text-zinc-800 font-extrabold uppercase text-xs tracking-widest rounded-xl transition-all text-center cursor-pointer shadow-2xs"
            >
              Ajukan Permintaan Proposal
            </button>

            <a
              href="#projects"
              className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold uppercase text-xs tracking-widest rounded-xl shadow-xl shadow-orange-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <span>Lihat Portofolio</span>
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
