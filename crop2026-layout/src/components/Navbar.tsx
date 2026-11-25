import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Menu, X, Globe, Sparkles, ArrowRight, Sprout } from 'lucide-react';
import { SERVICES } from '../data/mockData';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenContact: (service?: string) => void;
  lang: 'EN' | 'ID';
  onToggleLang: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  onOpenContact,
  lang,
  onToggleLang
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionsDropdown, setSolutionsDropdown] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 ${
          scrolled 
            ? 'bg-white/95 backdrop-blur-lg border-b border-zinc-200 py-3.5 shadow-md shadow-zinc-900/5' 
            : 'bg-white/85 backdrop-blur-md border-b border-zinc-100 py-5 lg:py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-10">
            <a 
              href="#" 
              className="flex items-center gap-3.5 cursor-pointer group select-none"
              title="PT CROP INSPIRASI DIGITAL - IT Consultant & Software Development"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform font-brand-tech font-black text-xl">
                C
              </div>
              <div className="flex flex-col">
                <span className="text-2xl lg:text-3xl font-black tracking-tight text-zinc-950 group-hover:text-orange-500 transition-colors font-heading leading-none">
                  CROP<span className="text-orange-500">.</span>
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500 mt-0.5 font-brand-tech">
                  PT CROP INSPIRASI DIGITAL
                </span>
              </div>
            </a>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-8 text-[11px] font-extrabold tracking-widest uppercase">
              {/* Solutions with Dropdown */}
              <div 
                className="relative group py-2"
                onMouseEnter={() => setSolutionsDropdown(true)}
                onMouseLeave={() => setSolutionsDropdown(false)}
              >
                <button 
                  className="flex items-center gap-1 hover:text-orange-500 transition-colors text-zinc-700 font-bold cursor-pointer"
                  onClick={() => {
                    const el = document.getElementById('services');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <span>Our Services</span>
                  <ChevronDown size={14} className={`transform transition-transform ${solutionsDropdown ? 'rotate-180 text-orange-500' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {solutionsDropdown && (
                  <div className="absolute top-full left-0 w-80 bg-white border border-zinc-200 rounded-2xl shadow-xl p-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 text-[9px] font-black uppercase text-orange-600 tracking-widest border-b border-zinc-100 mb-1 font-brand-tech">
                      Layanan IT & Software CROP
                    </div>
                    {SERVICES.map((s) => (
                      <a
                        key={s.id}
                        href="#services"
                        onClick={() => setSolutionsDropdown(false)}
                        className="block px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:text-orange-600 hover:bg-orange-50 transition-all border border-transparent"
                      >
                        <div className="text-zinc-900 text-xs font-bold font-heading">{s.title}</div>
                        <div className="text-[10px] text-zinc-500 font-normal truncate">{s.shortDesc}</div>
                      </a>
                    ))}
                    <div className="pt-2 border-t border-zinc-100 mt-1">
                      <button
                        onClick={() => {
                          setSolutionsDropdown(false);
                          onOpenContact();
                        }}
                        className="w-full py-2 px-3 bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider text-center transition-colors cursor-pointer font-brand-tech"
                      >
                        Konsultasi Solusi Digital →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <a 
                href="#projects" 
                className="text-zinc-700 hover:text-orange-500 transition-colors"
              >
                Project 
              </a>

              <a 
                href="#about" 
                className="text-zinc-700 hover:text-orange-500 transition-colors"
              >
                About
              </a>

              <a 
                href="#testimonials" 
                className="text-zinc-700 hover:text-orange-500 transition-colors"
              >
              Testimoni
              </a>

              <button 
                onClick={() => onOpenContact()}
                className="text-zinc-700 hover:text-orange-500 transition-colors uppercase font-bold cursor-pointer"
              >
                Kontak 
              </button>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-4 lg:gap-6">
            {/* Search Button with Cmd+K hint */}
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-3 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-200 transition-all hover:border-zinc-300 group cursor-pointer"
              title="Search CROP Solutions & Agritech Case Studies"
            >
              <Search className="text-zinc-500 group-hover:text-orange-500 transition-colors" size={15} />
              <span className="hidden sm:inline text-zinc-600">Search agritech...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-white text-zinc-500 text-[10px] font-mono rounded border border-zinc-200 shadow-2xs">
                ⌘K
              </kbd>
            </button>

            {/* Language Switcher */}
            <button
              onClick={onToggleLang}
              className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200 transition-colors text-zinc-700 cursor-pointer"
              title="Switch Language"
            >
              <Globe size={13} className="text-orange-500" />
              <span>{lang === 'EN' ? '🇬🇧 EN' : '🇮🇩 ID'}</span>
            </button>

            {/* CTA Button */}
            <button
              onClick={() => onOpenContact()}
              className="hidden sm:flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-full text-[11px] font-black tracking-wider uppercase transition-all shadow-lg shadow-orange-500/25 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Get in Touch</span>
              <ArrowRight size={13} />
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-zinc-800 hover:text-zinc-950 rounded-lg bg-zinc-100 cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[90] bg-white/98 backdrop-blur-xl lg:hidden flex flex-col pt-28 px-8 pb-10 justify-between animate-in fade-in duration-200">
          <div className="space-y-6 text-lg font-bold uppercase tracking-wider">
            <a 
              href="#services" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-zinc-900 hover:text-orange-500 py-2 border-b border-zinc-100 font-heading"
            >
              Our Services
            </a>
            <a 
              href="#projects" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-zinc-900 hover:text-orange-500 py-2 border-b border-zinc-100 font-heading"
            >
              Project Experience
            </a>
            <a 
              href="#about" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-zinc-900 hover:text-orange-500 py-2 border-b border-zinc-100 font-heading"
            >
              About CROP
            </a>
            <a 
              href="#testimonials" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-zinc-900 hover:text-orange-500 py-2 border-b border-zinc-100 font-heading"
            >
              Clients & Testimoni
            </a>
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenContact();
              }}
              className="block text-left w-full text-orange-600 hover:text-orange-700 py-2 font-bold font-heading cursor-pointer"
            >
              Konsultasi Transformasi Digital
            </button>
          </div>

          <div className="space-y-4 pt-6 border-t border-zinc-100">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenContact();
              }}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 cursor-pointer font-brand-tech"
            >
              <span>Hubungi Kami</span>
              <ArrowRight size={16} />
            </button>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Bandung • Jakarta</span>
              <span className="font-brand-tech font-bold text-orange-600">PT CROP INSPIRASI DIGITAL</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
