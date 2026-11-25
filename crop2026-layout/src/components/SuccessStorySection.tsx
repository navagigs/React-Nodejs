import React, { useState } from 'react';
import { Quote, ChevronLeft, ChevronRight, Star, ShieldCheck, CheckCircle2, Award, Folder, Sparkles, Code2, Smartphone } from 'lucide-react';
import { TESTIMONIALS } from '../data/mockData';

export const SuccessStorySection: React.FC = () => {
  const [currentStory, setCurrentStory] = useState(0);

  const nextStory = () => setCurrentStory((prev) => (prev === TESTIMONIALS.length - 1 ? 0 : prev + 1));
  const prevStory = () => setCurrentStory((prev) => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1));

  const activeTestimonial = TESTIMONIALS[currentStory];

  return (
    <section id="testimonials" className="relative bg-white text-black py-32 px-6 lg:px-12 overflow-hidden border-t border-zinc-200">
      {/* Signature Right Skewed Orange Wedge */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-orange-500 transform -skew-x-[15deg] translate-x-28 hidden lg:block opacity-95 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-20 relative z-10">
        {/* Left Column: Narrative & Active Testimonial Quote */}
        <div className="w-full lg:w-3/5">
          <div className="inline-flex items-center gap-2 text-xs font-black tracking-widest uppercase text-zinc-500 border-b border-zinc-300 pb-1 mb-6 font-brand-tech">
            <Award size={14} className="text-orange-500" />
            <span>Kemitraan & Kepuasan Klien</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase mb-10 font-heading tracking-tight text-zinc-950">
            Clients & Testimoni
          </h2>

          {/* Testimonial Quote Container */}
          <div key={currentStory} className="relative pl-6 sm:pl-12 animate-in fade-in slide-in-from-right-4 duration-300">
            <Quote className="absolute -top-4 -left-2 text-orange-100 w-16 h-16 -z-10" fill="currentColor" />

            <p className="text-lg sm:text-2xl font-medium leading-relaxed mb-8 italic text-zinc-800 min-h-[140px] font-sans">
              "{activeTestimonial.quote}"
            </p>

            {/* Stars Rating */}
            <div className="flex items-center gap-1 text-yellow-500 mb-4">
              {[...Array(activeTestimonial.rating)].map((_, i) => (
                <Star key={i} size={18} fill="currentColor" />
              ))}
              <span className="ml-2 text-xs font-bold text-zinc-500 uppercase tracking-wider font-brand-tech">
                Verified Client Rating
              </span>
            </div>

            {/* Author Profile Details */}
            <div className="flex items-center gap-4">
              {activeTestimonial.avatarUrl && (
                <img
                  src={activeTestimonial.avatarUrl}
                  alt={activeTestimonial.name}
                  className="w-14 h-14 rounded-full object-cover ring-4 ring-orange-100 shadow-md"
                />
              )}
              <div>
                <h4 className="text-orange-600 font-black text-lg uppercase tracking-tight font-heading">
                  {activeTestimonial.name}
                </h4>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider font-brand-tech">
                  {activeTestimonial.title} — <strong className="text-zinc-800">{activeTestimonial.company}</strong>
                </p>
                {activeTestimonial.metrics && (
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-wider border border-orange-200 font-brand-tech">
                    ⭐ {activeTestimonial.metrics}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Carousel Controls & Pagination */}
          <div className="flex items-center gap-8 mt-12 pl-6 sm:pl-12">
            <div className="flex gap-3">
              <button
                onClick={prevStory}
                className="w-12 h-12 rounded-full border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-md cursor-pointer"
                title="Previous Story"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={nextStory}
                className="w-12 h-12 rounded-full border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-md cursor-pointer"
                title="Next Story"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <div className="flex items-center gap-3 font-brand-tech">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
                {currentStory + 1} OF {TESTIMONIALS.length}
              </span>
              <div className="flex gap-1.5">
                {TESTIMONIALS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStory(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === currentStory ? 'w-6 bg-orange-500' : 'w-2 bg-zinc-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual 3D Mockup with Interactive Floating Badges */}
        <div className="w-full lg:w-2/5 flex justify-center">
          <div className="relative group">
            {/* Main Device Mockup Card */}
            <div className="bg-zinc-950 text-white w-72 sm:w-84 h-[440px] rounded-3xl shadow-2xl overflow-hidden border-8 border-white transform group-hover:rotate-1 transition-transform duration-500 flex flex-col justify-between p-6">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-[10px] font-mono font-bold text-orange-400 uppercase font-brand-tech">
                  CROP CLOUD SYSTEM
                </span>
              </div>

              {/* Card Mid Body */}
              <div className="space-y-4 my-auto">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-zinc-400 uppercase font-bold font-brand-tech">Enterprise Client</div>
                  <div className="text-sm font-black text-white mt-1 font-heading">{activeTestimonial.company}</div>
                  <div className="text-xs text-orange-400 font-semibold mt-0.5 font-brand-tech">{activeTestimonial.projectTag}</div>
                </div>

                <div className="space-y-2 font-brand-tech">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>System Stability & Uptime</span>
                    <span className="text-green-400 font-bold">99.98% High</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="w-[99%] h-full bg-gradient-to-r from-orange-500 to-green-500 rounded-full"></div>
                  </div>
                </div>

                <div className="space-y-2 font-brand-tech">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>Performance & Responsiveness</span>
                    <span className="text-orange-400 font-bold">Optimal</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="w-[95%] h-full bg-orange-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400 font-brand-tech">
                <span className="flex items-center gap-1 text-green-400 font-bold">
                  <ShieldCheck size={14} /> Certified Delivery
                </span>
                <span className="font-mono text-zinc-300 font-bold">Production</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
