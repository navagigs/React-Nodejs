import React, { useState, useMemo } from 'react';
import { Search, X, ChevronRight, ExternalLink, Sparkles, Folder, RefreshCw, FileText, ShieldCheck, Code2 } from 'lucide-react';
import { PROJECTS, SERVICES, TESTIMONIALS } from '../data/mockData';
import { ProjectItem } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: ProjectItem) => void;
  onOpenContact: (serviceTitle?: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProject,
  onOpenContact
}) => {
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return {
        projects: PROJECTS.slice(0, 4),
        services: SERVICES.slice(0, 3),
        total: 7
      };
    }

    const q = query.toLowerCase();
    const matchedProjects = PROJECTS.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q) ||
      p.detailedCaseStudy?.techStack.some(t => t.toLowerCase().includes(q))
    );

    const matchedServices = SERVICES.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.shortDesc.toLowerCase().includes(q) ||
      s.techStack.some(t => t.toLowerCase().includes(q))
    );

    return {
      projects: matchedProjects,
      services: matchedServices,
      total: matchedProjects.length + matchedServices.length
    };
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20 px-4 sm:px-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="flex items-center px-6 py-4 border-b border-zinc-200 gap-3 bg-zinc-50 font-brand-tech">
          <Search className="text-orange-500 shrink-0" size={22} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari solusi, sistem (Klinik, BUMN, Reseller, React, Flutter, GRC)..."
            autoFocus
            className="w-full bg-transparent text-zinc-900 placeholder-zinc-400 text-lg focus:outline-none"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="text-zinc-500 hover:text-zinc-900 text-xs px-2 py-1 bg-zinc-200 rounded cursor-pointer font-brand-tech"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Body Results */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 divide-y divide-zinc-100">
          {/* Projects Results */}
          {searchResults.projects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-500 font-brand-tech">
                <span className="flex items-center gap-1.5 text-orange-600">
                  <Code2 size={14} /> Portofolio & Sistem ({searchResults.projects.length})
                </span>
                <span className="text-[11px] text-zinc-400">Klik untuk melihat detail</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchResults.projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => {
                      onSelectProject(proj);
                      onClose();
                    }}
                    className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 hover:border-orange-500 hover:bg-orange-50/50 transition-all cursor-pointer group flex flex-col justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-orange-600 px-2 py-0.5 rounded bg-orange-100 uppercase font-brand-tech">
                          {proj.logo}
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase font-semibold font-brand-tech">{proj.category}</span>
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900 group-hover:text-orange-600 transition-colors line-clamp-1 font-heading">
                        {proj.name}
                      </h4>
                      <p className="text-xs text-zinc-600 line-clamp-2 mt-1">
                        {proj.tagline}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-200 text-[11px] text-orange-600 font-semibold font-brand-tech">
                      <span>{proj.detailedCaseStudy?.usersCount || "Enterprise"}</span>
                      <ChevronRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services Results */}
          {searchResults.services.length > 0 && (
            <div className="pt-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 text-orange-600 font-brand-tech">
                <RefreshCw size={14} /> Layanan CROP ({searchResults.services.length})
              </div>
              <div className="space-y-2">
                {searchResults.services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => {
                      onOpenContact(service.title);
                      onClose();
                    }}
                    className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 hover:border-orange-500 hover:bg-orange-50/40 transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 group-hover:text-orange-600 transition-colors font-heading">
                        {service.title}
                      </h4>
                      <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                        {service.shortDesc}
                      </p>
                    </div>
                    <button className="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1.5 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0 ml-4 cursor-pointer font-brand-tech">
                      Konsultasi
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.total === 0 && (
            <div className="text-center py-12">
              <Sparkles className="mx-auto text-zinc-400 mb-3" size={32} />
              <p className="text-zinc-900 font-bold">Tidak ditemukan hasil pencarian untuk "{query}"</p>
              <p className="text-xs text-zinc-500 mt-1">Coba cari kata kunci "Website", "Mobile", "Klinik", "POS", "GRC", "React", atau "Flutter".</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500 font-brand-tech">
          <span>Tekan <kbd className="px-1.5 py-0.5 bg-zinc-200 text-zinc-700 rounded text-[10px]">ESC</kbd> untuk menutup</span>
          <span className="text-orange-600 font-semibold font-brand-tech">PT CROP INSPIRASI DIGITAL</span>
        </div>
      </div>
    </div>
  );
};
