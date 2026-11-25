import React from 'react';
import { X, CheckCircle2, Cpu, BarChart3, Users, Sparkles, ArrowRight, ShieldCheck, Code2 } from 'lucide-react';
import { ProjectItem } from '../types';

interface CaseStudyModalProps {
  project: ProjectItem | null;
  onClose: () => void;
  onConsult: (projectName: string) => void;
}

export const CaseStudyModal: React.FC<CaseStudyModalProps> = ({
  project,
  onClose,
  onConsult
}) => {
  if (!project) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative p-6 sm:p-8 border-b border-zinc-200 overflow-hidden bg-gradient-to-r from-orange-50 via-white to-white">
          <div className="absolute top-0 right-0 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-orange-500 text-white rounded-full shadow-xs font-brand-tech">
                  {project.logo}
                </span>
                <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider font-brand-tech">
                  {project.client}
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-zinc-950 uppercase tracking-tight font-heading">
                {project.name}
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 mt-2 max-w-2xl font-medium">
                {project.tagline}
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-700 p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 transition-colors shrink-0 cursor-pointer"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-8 flex-1">
          {/* Key Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center gap-4 shadow-2xs">
              <div className="p-3 rounded-xl bg-orange-100 text-orange-600">
                <Users size={24} />
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase font-semibold font-brand-tech">Skala Pengguna</span>
                <p className="text-lg font-black text-zinc-950 font-heading">{project.detailedCaseStudy?.usersCount || "Enterprise"}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center gap-4 shadow-2xs">
              <div className="p-3 rounded-xl bg-green-100 text-green-700">
                <ShieldCheck size={24} />
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase font-semibold font-brand-tech">Keandalan Sistem</span>
                <p className="text-lg font-black text-zinc-950 font-heading">99.98% High Uptime</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center gap-4 shadow-2xs">
              <div className="p-3 rounded-xl bg-amber-100 text-amber-700">
                <BarChart3 size={24} />
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase font-semibold font-brand-tech">Kategori Solusi</span>
                <p className="text-lg font-black text-zinc-950 uppercase font-heading">{project.category}</p>
              </div>
            </div>
          </div>

          {/* Detailed Challenge & Solution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200">
              <h4 className="text-xs font-black tracking-widest uppercase text-red-600 mb-3 flex items-center gap-2 font-brand-tech">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Tantangan & Kebutuhan Klien
              </h4>
              <p className="text-zinc-700 text-sm leading-relaxed font-medium">
                {project.detailedCaseStudy?.challenge || project.desc}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200">
              <h4 className="text-xs font-black tracking-widest uppercase text-orange-600 mb-3 flex items-center gap-2 font-brand-tech">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span> Implementasi & Arsitektur CROP
              </h4>
              <p className="text-zinc-700 text-sm leading-relaxed font-medium">
                {project.detailedCaseStudy?.solution || "Pengembangan arsitektur scalable, API gateway, optimasi database, dan antarmuka responsif."}
              </p>
            </div>
          </div>

          {/* Key Deliverable Impacts */}
          {project.detailedCaseStudy?.impact && (
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-zinc-950 mb-4 flex items-center gap-2 font-brand-tech">
                <Sparkles className="text-orange-500" size={16} /> Dampak & Hasil Nyata
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {project.detailedCaseStudy.impact.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-orange-50/80 border border-orange-200 flex items-start gap-3">
                    <CheckCircle2 className="text-orange-600 shrink-0 mt-0.5" size={18} />
                    <span className="text-xs font-semibold text-zinc-800">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tech Stack Chips */}
          {project.detailedCaseStudy?.techStack && (
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-zinc-600 mb-3 flex items-center gap-2 font-brand-tech">
                <Cpu size={16} className="text-orange-500" /> Teknologi & Framework yang Digunakan
              </h4>
              <div className="flex flex-wrap gap-2">
                {project.detailedCaseStudy.techStack.map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-800 font-brand-tech"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer CTA */}
        <div className="p-6 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4 font-brand-tech">
          <p className="text-xs text-zinc-600 text-center sm:text-left font-medium">
            Ingin membangun sistem sejenis untuk perusahaan atau instansi Anda?
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-300 text-xs font-bold uppercase tracking-wider text-zinc-700 hover:bg-zinc-100 transition-colors w-1/2 sm:w-auto cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={() => {
                onClose();
                onConsult(project.name);
              }}
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 w-1/2 sm:w-auto cursor-pointer"
            >
              Konsultasi Serupa <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
