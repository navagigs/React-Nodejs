import React from 'react';
import { CLIENT_LOGOS } from '../data/mockData';

export const ClientLogosTicker: React.FC = () => {
  return (
    <section className="relative z-20 bg-white border-b border-zinc-200 py-8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 font-brand-tech">
            Our Client Partnerships • BUMN, Perbankan, Swasta & Akademisi
          </span>
        </div>
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-brand-tech">
          45+ Projects Delivered Across 17+ Enterprise Clients
        </span>
      </div>

      {/* Marquee Container */}
      <div className="relative w-full overflow-hidden flex items-center">
        {/* Gradient fade on edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

        <div className="animate-marquee flex items-center gap-8 py-2">
          {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((client, index) => (
            <div
              key={`${client.ticker}-${index}`}
              className="flex items-center gap-3 px-6 py-3 rounded-xl bg-zinc-50 border border-zinc-200/80 hover:border-orange-500 hover:bg-white transition-all cursor-default shrink-0 group shadow-xs"
            >
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: client.color }}
              ></div>
              <span className="text-sm font-black tracking-wider uppercase text-zinc-800 group-hover:text-zinc-950 transition-colors font-heading">
                {client.logoText}
              </span>
              <span className="text-[10px] font-bold text-zinc-500 group-hover:text-orange-600 transition-colors uppercase font-brand-tech">
                {client.name.split('(')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
