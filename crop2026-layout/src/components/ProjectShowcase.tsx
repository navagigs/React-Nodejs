import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, ExternalLink, ArrowRight, Sparkles, Sprout, Satellite, Cpu, Shield, Users, Layers } from 'lucide-react';
import { PROJECTS } from '../data/mockData';
import { ProjectItem } from '../types';

interface ProjectShowcaseProps {
  onSelectProject: (project: ProjectItem) => void;
  onOpenContact: (projectRef?: string) => void;
}

export const ProjectShowcase: React.FC<ProjectShowcaseProps> = ({
  onSelectProject,
  onOpenContact
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAutoplay, setIsAutoplay] = useState(true);

  // Filter projects by category if selected
  const filteredProjects = selectedCategory === 'all' 
    ? PROJECTS 
    : PROJECTS.filter(p => p.category === selectedCategory);

  const total = filteredProjects.length;

  const handleNext = useCallback(() => {
    setCurrentSlide((prev) => (prev < total - 1 ? prev + 1 : 0));
  }, [total]);

  const handlePrev = useCallback(() => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : total - 1));
  }, [total]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  // Autoplay timer
  useEffect(() => {
    if (!isAutoplay) return;
    const interval = setInterval(handleNext, 5000);
    return () => clearInterval(interval);
  }, [isAutoplay, handleNext]);

  // Reset slide index if filtered projects change
  useEffect(() => {
    setCurrentSlide(0);
  }, [selectedCategory]);

  const activeProject = filteredProjects[currentSlide] || filteredProjects[0];

  return (
    <section id="projects" className="bg-zinc-50/70 py-28 px-6 lg:px-12 text-center relative z-10 overflow-hidden border-t border-zinc-200">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-orange-500/5 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-[10px] font-black tracking-[0.3em] uppercase text-orange-600 mb-4 shadow-2xs font-brand-tech">
            <Sparkles size={13} className="text-orange-500" />
            <span>PORTFOLIO & IMPLEMENTASI NYATA</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 tracking-tight uppercase font-heading text-zinc-950">
            Project Experience<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 font-display">
              PT CROP Inspirasi Digital
            </span>
          </h2>
          <p className="text-zinc-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-medium">
            Pengalaman mengembangkan dan menerapkan solusi teknologi informasi, web application, mobile app, clinic management, reseller system, GRC, dan HR system untuk berbagai organisasi.
          </p>

          {/* Category Filter Pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 font-brand-tech">
            {[
              { id: 'all', label: 'All Projects (8)' },
              { id: 'web', label: 'Website Profile' },
              { id: 'custom', label: 'Custom Software & HR' },
              { id: 'enterprise', label: 'Reseller & POS' },
              { id: 'bumn', label: 'BUMN & Dapen Telkom' },
              { id: 'consultant', label: 'GRC & Governance' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 border border-zinc-200 shadow-2xs'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3D Coverflow Stage */}
        <div className="relative flex items-center justify-center h-[420px] sm:h-[480px] my-6 select-none">
          {filteredProjects.map((p, index) => {
            const isCenter = index === currentSlide;
            const isLeft = index === (currentSlide - 1 + total) % total;
            const isRight = index === (currentSlide + 1) % total;

            if (!isCenter && !isLeft && !isRight) return null;

            return (
              <div
                key={p.id}
                onClick={() => {
                  if (isCenter) onSelectProject(p);
                  else if (isLeft) handlePrev();
                  else if (isRight) handleNext();
                }}
                className={`transition-all duration-700 ease-out transform flex-shrink-0 relative overflow-hidden rounded-3xl border cursor-pointer ${
                  isCenter
                    ? 'w-[320px] sm:w-[500px] h-[380px] sm:h-[460px] z-30 scale-100 opacity-100 border-orange-500/80 shadow-[0_20px_60px_-15px_rgba(249,115,22,0.3)] ring-4 ring-orange-500/10'
                    : 'w-[260px] sm:w-[380px] h-[300px] sm:h-[380px] z-10 scale-[0.85] opacity-40 grayscale border-zinc-300 hover:opacity-75 hover:grayscale-0 shadow-md'
                } ${isLeft ? '-mr-20 sm:-mr-36 translate-x-[-10%]' : ''} ${isRight ? '-ml-20 sm:-ml-36 translate-x-[10%]' : ''}`}
                style={{ backgroundColor: '#ffffff' }}
              >
                {/* Background Image Container */}
                <div className="relative w-full h-full overflow-hidden group">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"></div>

                  {/* Top Client Brand Badge */}
                  <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-20">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-white shadow-md font-brand-tech"
                      style={{ backgroundColor: p.accentColor }}
                    >
                      {p.logo}
                    </span>
                    <span className="text-[10px] font-bold text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 uppercase tracking-widest font-brand-tech">
                      {p.category}
                    </span>
                  </div>

                  {/* Bottom Content Preview */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-left text-white z-20">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-300 block mb-1 font-brand-tech">
                      {p.client}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-heading">
                      {p.name}
                    </h3>
                    <p className="text-xs text-zinc-300 line-clamp-2 mt-1 font-medium">
                      {p.tagline}
                    </p>

                    {isCenter && (
                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/20 text-xs">
                        <span className="text-orange-400 font-bold flex items-center gap-1.5 font-brand-tech">
                          <Users size={14} /> {p.detailedCaseStudy?.usersCount || "Enterprise"}
                        </span>
                        <span className="flex items-center gap-1 text-white font-extrabold uppercase text-[11px] group-hover:translate-x-1 transition-transform font-brand-tech">
                          Lihat Detail Kasus <ArrowRight size={13} />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Navigation Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-2xl mx-auto mt-8 px-4 gap-4">
          {/* Arrow Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              className="p-3 rounded-full bg-white hover:bg-orange-500 text-zinc-800 hover:text-white border border-zinc-200 hover:border-orange-500 transition-all shadow-md active:scale-95 cursor-pointer"
              title="Previous Project"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              className="p-3 rounded-full bg-white hover:bg-orange-500 text-zinc-800 hover:text-white border border-zinc-200 hover:border-orange-500 transition-all shadow-md active:scale-95 cursor-pointer"
              title="Next Project"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Progress Indicators */}
          <div className="flex items-center gap-2">
            {filteredProjects.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentSlide ? 'w-8 bg-orange-500' : 'w-2 bg-zinc-300 hover:bg-zinc-400'
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Autoplay Pause/Play toggle */}
          <button
            onClick={() => setIsAutoplay(!isAutoplay)}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-950 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 shadow-2xs cursor-pointer font-brand-tech"
          >
            {isAutoplay ? (
              <>
                <Pause size={13} className="text-orange-500" />
                <span>Auto-Slide Aktif</span>
              </>
            ) : (
              <>
                <Play size={13} className="text-zinc-400" />
                <span>Paused</span>
              </>
            )}
          </button>
        </div>

        {/* Selected Project Full Summary Card */}
        {activeProject && (
          <div className="mt-14 max-w-4xl mx-auto bg-white border border-zinc-200 rounded-3xl p-6 sm:p-10 shadow-lg text-left transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-6 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-black rounded-lg border border-orange-200 font-brand-tech">
                    {activeProject.logo}
                  </span>
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-brand-tech">
                    {activeProject.client}
                  </span>
                </div>
                <h4 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase font-heading">
                  {activeProject.name}
                </h4>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onSelectProject(activeProject)}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 shadow-md shadow-orange-500/20 cursor-pointer font-brand-tech"
                >
                  <span>Lihat Detail Implementasi</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>

            <p className="text-zinc-600 text-sm sm:text-base leading-relaxed mb-6 font-medium">
              {activeProject.desc}
            </p>

            {/* Impact Highlights Grid */}
            {activeProject.detailedCaseStudy?.impact && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-zinc-100">
                {activeProject.detailedCaseStudy.impact.map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-orange-50/70 border border-orange-200/80 text-xs font-semibold text-zinc-800 flex items-start gap-2">
                    <span className="text-orange-600 font-bold">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
