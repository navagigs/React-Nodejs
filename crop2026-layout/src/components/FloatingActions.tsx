import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, ArrowUp, X, Send, Code2 } from 'lucide-react';
import { COMPANY_PROFILE } from '../data/mockData';

interface FloatingActionsProps {
  onOpenContact: () => void;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({ onOpenContact }) => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showWaPopup, setShowWaPopup] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenWhatsApp = () => {
    const waNumber = '6281222223842';
    const text = encodeURIComponent('Halo PT CROP INSPIRASI DIGITAL, saya tertarik untuk berkonsultasi mengenai solusi IT / Software Development.');
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
  };

  return (
    <>
      {/* WhatsApp Chat Quick Popup if triggered */}
      {showWaPopup && (
        <div className="fixed bottom-24 right-6 z-[120] w-80 bg-white border border-zinc-200 rounded-2xl shadow-2xl p-4 text-zinc-900 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                <MessageSquare size={16} />
              </div>
              <div>
                <h5 className="text-xs font-bold text-zinc-900 font-heading">PT CROP INSPIRASI DIGITAL</h5>
                <p className="text-[10px] text-green-600 font-medium font-brand-tech">● Online / Siap Membantu</p>
              </div>
            </div>
            <button 
              onClick={() => setShowWaPopup(false)}
              className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-zinc-600 mb-4 bg-zinc-50 border border-zinc-100 p-3 rounded-xl leading-relaxed font-medium">
            👋 Halo! Ingin berkonsultasi seputar pembuatan Website, Aplikasi Mobile, Custom Software, Clinic System, atau IT Governance? Chat langsung dengan tim IT Consultant kami.
          </p>

          <button
            onClick={handleOpenWhatsApp}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-green-600/20 font-brand-tech"
          >
            <span>Hubungi via WhatsApp</span>
            <Send size={13} />
          </button>
        </div>
      )}

      {/* Floating Action Strip on Right */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 flex flex-col z-[100] items-end shadow-2xl">
        {/* Contact Us Vertical Tab */}
        <button
          onClick={onOpenContact}
          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-9 cursor-pointer border-b border-orange-400 group transition-all rounded-l-xl shadow-2xl flex items-center justify-center"
          title="Hubungi CROP"
        >
          <div className="flex items-center gap-2 [writing-mode:vertical-lr] rotate-180">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] font-brand-tech">Hubungi Kami</span>
            <Mail size={15} className="rotate-180 group-hover:scale-110 transition-transform" />
          </div>
        </button>

        {/* WhatsApp Floating Trigger */}
        <button
          onClick={() => setShowWaPopup(!showWaPopup)}
          className="bg-green-500 hover:bg-green-600 p-3.5 cursor-pointer shadow-2xl rounded-bl-xl transition-all hover:scale-105 active:scale-95 group"
          title="Chat on WhatsApp"
        >
          <MessageSquare size={24} className="text-white fill-white group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Back to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 left-6 z-[100] w-11 h-11 bg-white hover:bg-orange-500 border border-zinc-200 hover:border-orange-500 text-zinc-700 hover:text-white rounded-full flex items-center justify-center shadow-xl backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer"
          title="Back to Top"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </>
  );
};
