import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ClientLogosTicker } from './components/ClientLogosTicker';
import { ProjectShowcase } from './components/ProjectShowcase';
import { AboutSection } from './components/AboutSection';
import { ServicesSection } from './components/ServicesSection';
import { SuccessStorySection } from './components/SuccessStorySection';
import { Footer } from './components/Footer';
import { FloatingActions } from './components/FloatingActions';
import { SearchModal } from './components/SearchModal';
import { CaseStudyModal } from './components/CaseStudyModal';
import { ContactModal } from './components/ContactModal';
import { ProjectItem } from './types';

export default function App() {
  const [lang, setLang] = useState<'EN' | 'ID'>('EN');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactInitialService, setContactInitialService] = useState<string | undefined>();
  const [contactInitialProjectRef, setContactInitialProjectRef] = useState<string | undefined>();
  const [selectedCaseStudy, setSelectedCaseStudy] = useState<ProjectItem | null>(null);

  // Global keyboard shortcut: Cmd+K / Ctrl+K opens search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenContact = (serviceOrProject?: string) => {
    if (serviceOrProject) {
      setContactInitialService(serviceOrProject);
      setContactInitialProjectRef(serviceOrProject);
    } else {
      setContactInitialService(undefined);
      setContactInitialProjectRef(undefined);
    }
    setIsContactOpen(true);
  };

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'EN' ? 'ID' : 'EN'));
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans overflow-x-hidden selection:bg-orange-500 selection:text-white">
      {/* 1. Global Fixed Navigation */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenContact={handleOpenContact}
        lang={lang}
        onToggleLang={handleToggleLang}
      />

      {/* 2. Hero Section */}
      <Hero onOpenContact={() => handleOpenContact()} />

      {/* 3. Premier Enterprise Client Logos Marquee */}
      <ClientLogosTicker />

      {/* 4. Agile 360° Software Implementation & Customization (Project Coverflow) */}
      <ProjectShowcase
        onSelectProject={(project) => setSelectedCaseStudy(project)}
        onOpenContact={handleOpenContact}
      />

      {/* 5. About Section: Empower Digital Transformation With AI */}
      <AboutSection onOpenContact={() => handleOpenContact()} />

      {/* 6. Agile 360° Digital Transformations Services Grid */}
      <ServicesSection onOpenContact={handleOpenContact} />

      {/* 7. Success Stories & Client Impact Testimonials */}
      <SuccessStorySection />

      {/* 8. Footer & Master Consultation CTA */}
      <Footer onOpenContact={handleOpenContact} />

      {/* 9. Floating Quick Contact & WhatsApp Widgets */}
      <FloatingActions onOpenContact={() => handleOpenContact()} />

      {/* 10. Global Search Spotlight Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProject={(project) => setSelectedCaseStudy(project)}
        onOpenContact={handleOpenContact}
      />

      {/* 11. Detailed Case Study Breakdown Modal */}
      <CaseStudyModal
        project={selectedCaseStudy}
        onClose={() => setSelectedCaseStudy(null)}
        onConsult={(projectName) => handleOpenContact(projectName)}
      />

      {/* 12. Consultation / RFP Request Modal */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        initialService={contactInitialService}
        initialProjectRef={contactInitialProjectRef}
      />
    </div>
  );
}
