import React, { useState, useEffect } from 'react';
import { 
  Search, ChevronLeft, ChevronRight, MessageSquare, Mail, 
  RefreshCw, Folder, Settings, PenTool, FileText, ShieldCheck,
  Instagram, Linkedin, Twitter, Quote, Menu, X, Zap, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LandingPageCrop = () => {
  const [currentSlide, setCurrentSlide] = useState(2);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentNews, setCurrentNews] = useState(0);
  const [currentStory, setCurrentStory] = useState(0);

  // --- ANIMATION VARIANTS ---
  const fadeInDown = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const fadeInUpScroll = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // --- LOGIC ---
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const projects = [
    { id: 0, name: "Movic", image: "https://www.wgs.co.id/assets/web/porto-darya-varya.webp", desc: "Digital automotive ecosystem for mobility." },
    { id: 1, name: "Kreditplus", image: "https://www.wgs.co.id/assets/web/porto-darya-varya.webp", desc: "Financial technology solutions." },
    { id: 2, name: "Halo BCA Mobile App", image: "https://www.wgs.co.id/assets/web/porto-darya-varya.webp", desc: "Mobile banking support system." },
    { id: 3, name: "Renjani DJP", image: "https://www.wgs.co.id/assets/web/porto-darya-varya.webp", desc: "Taxation digital management." },
  ];

  const services = [
    { title: "Agile Development", icon: <RefreshCw size={28} /> },
    { title: "Project Based", icon: <Folder size={28} /> },
    { title: "Managed Services", icon: <Settings size={28} /> },
    { title: "Design Services", icon: <PenTool size={28} /> },
    { title: "Technical Writer", icon: <FileText size={28} /> },
    { title: "Quality Assurance", icon: <ShieldCheck size={28} /> }
  ];

  const news = [
    { id: 1, date: "24 DEC 2025", cat: "TECH", title: "Implementasi AI dalam Sistem GRC Modern", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800" },
    { id: 2, date: "18 DEC 2025", cat: "BUSINESS", title: "CROP Memperluas Layanan ke Asia Tenggara", img: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&w=800" },
    { id: 3, date: "10 DEC 2025", cat: "UPDATE", title: "Optimasi UI/UX Aplikasi Mobile Perbankan", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800" },
  ];

  const testimonials = [
    { quote: "Kecepatan dan kualitas kode yang dihasilkan sangat luar biasa.", name: "George Palmer", title: "Founder of SendOwl" },
    { quote: "CROP adalah mitra strategis terbaik untuk transformasi digital kami.", name: "Sarah Chen", title: "CTO, Fintech Solutions" }
  ];

  const handleNext = () => setCurrentSlide((prev) => (prev < projects.length - 1 ? prev + 1 : 0));
  const handlePrev = () => setCurrentSlide((prev) => (prev > 0 ? prev - 1 : projects.length - 1));

  useEffect(() => {
    const timer = setInterval(() => setCurrentNews((prev) => (prev + 1) % news.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      
      {/* --- 1. CENTERED NAVIGATION --- */}
      <motion.nav 
        initial="hidden" animate="visible" variants={fadeInDown}
        className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 px-6 md:px-10 
        ${isScrolled ? 'bg-white py-4 shadow-xl text-black' : 'bg-transparent py-8 text-white'}`}
      >
        <div className="flex items-center max-w-[1600px] mx-auto">
          {/* Left: Logo */}
          <div className="flex-1 flex items-center">
            <div className="flex items-center gap-2 cursor-pointer">
              <span className="text-2xl md:text-3xl font-black tracking-tighter">CROP</span>
              <div className={`text-[8px] md:text-[9px] font-bold uppercase border-l pl-2 leading-tight ${isScrolled ? 'border-black' : 'border-white'}`}>
                Inspirasi<br />Digital
              </div>
            </div>
          </div>

          {/* Center: Menu */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="flex items-center gap-8 text-[11px] font-bold tracking-[0.2em] uppercase">
              {['Solutions', 'Works', 'Explore More', 'Contact Us'].map((item) => (
                <a key={item} href="#" className="hover:text-orange-500 transition-colors">{item}</a>
              ))}
            </div>
          </div>

          {/* Right: Search & Language */}
          <div className="flex-1 flex items-center justify-end gap-6">
            <div className="relative hidden xl:block">
              <input 
                type="text" placeholder="Search" 
                className={`px-4 py-1.5 rounded-sm text-sm w-40 focus:w-56 focus:outline-none transition-all
                  ${isScrolled ? 'bg-gray-100 text-black border border-gray-200' : 'bg-white/10 text-white border border-white/20'}`} 
              />
              <Search className="absolute right-2 top-2 text-gray-400" size={16} />
            </div>
            <div className="text-[11px] font-bold italic hidden sm:block">🇬🇧 EN</div>
            <button className="lg:hidden p-2 text-orange-500" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* --- 2. HERO SECTION (GRADIENT & MOTION) --- */}
      <motion.section 
        initial="hidden" animate="visible" variants={staggerContainer}
        className="relative min-h-screen flex items-center px-6 md:px-10 overflow-hidden pt-20"
      >
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="h-full w-full bg-[radial-gradient(circle_at_2px_2px,_rgba(255,255,255,0.15)_1px,_transparent_0)] bg-[size:40px_40px]"></div>
        </div>
        
        <div className="relative z-10 w-full flex flex-col lg:flex-row items-center justify-between max-w-7xl mx-auto">
          <div className="w-full lg:max-w-4xl text-center lg:text-left pt-10">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-3 mb-6 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <Zap size={14} className="text-orange-500 fill-orange-500" />
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-orange-500">Transformasi Digital Masa Depan</span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl lg:text-[110px] font-black md:leading-[0.85] tracking-tighter uppercase mb-6">
              YOUR PROGRESS<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">IS OUR BUSINESS</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed font-medium">
              CROP membantu bisnis Anda bertransformasi ke ekosistem digital agar lebih berkembang, efisien, dan efektif.
            </motion.p>
          </div>
          
          {/* Orange Box with Gradient */}
          <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} className="relative mt-12 lg:mt-0 w-full lg:w-auto">
            <div className="bg-gradient-to-br from-orange-600 to-orange-400 p-8 md:p-16 lg:p-20 lg:pt-[260px] min-w-full lg:min-w-[650px] transform lg:-skew-x-[12deg] lg:translate-x-28 shadow-2xl border-l-8 border-white relative">
              <div className="lg:transform lg:skew-x-[12deg] max-w-sm mx-auto lg:mx-0">
                <h3 className="text-2xl lg:text-3xl font-black mb-5 italic text-white uppercase leading-tight">Trust Your <br />Technology Partner</h3>
                <button className="group flex items-center justify-between bg-white text-orange-600 px-8 py-4 text-[11px] font-black tracking-[0.2em] uppercase hover:bg-black hover:text-white transition-all w-full lg:w-auto">
                  Find out more <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* --- 3. PROJECT SLIDER --- */}
      <motion.section 
        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUpScroll}
        className="bg-[#0a0a0a] py-20 px-4 text-center relative overflow-hidden"
      >
        <h4 className="text-[10px] font-black tracking-[0.4em] uppercase mb-4 text-orange-500">Portfolio</h4>
        <h2 className="text-3xl md:text-4xl font-black mb-16 tracking-tighter uppercase">Selected Works</h2>

        <div className="relative flex items-center justify-center h-[350px] md:h-[500px] w-full max-w-6xl mx-auto">
          {projects.map((p, index) => {
            const isCenter = index === currentSlide;
            const isLeft = index === (currentSlide - 1 + projects.length) % projects.length;
            const isRight = index === (currentSlide + 1) % projects.length;
            let posClass = "opacity-0 scale-50 z-0";
            if (isCenter) posClass = "opacity-100 scale-100 z-30 translate-x-0";
            if (isLeft) posClass = "opacity-40 scale-90 z-10 -translate-x-16 md:-translate-x-32 grayscale";
            if (isRight) posClass = "opacity-40 scale-90 z-10 translate-x-16 md:translate-x-32 grayscale";

            return (
              <div key={p.id} className={`absolute transition-all duration-700 ease-out transform w-[280px] md:w-[650px] h-[350px] md:h-[420px] rounded-xl overflow-hidden shadow-2xl ${posClass}`}>
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col items-center">
          <div className="flex gap-4 mb-8">
            <button onClick={handlePrev} className="w-12 h-12 rounded-full border border-orange-600 text-orange-600 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all"><ChevronLeft /></button>
            <button onClick={handleNext} className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-600 to-orange-400 text-white flex items-center justify-center hover:opacity-90 transition-all"><ChevronRight /></button>
          </div>
          <h3 className="text-xl md:text-2xl font-black uppercase text-orange-500 mb-2">{projects[currentSlide].name}</h3>
          <p className="text-gray-400 max-w-lg mx-auto">{projects[currentSlide].desc}</p>
        </div>
      </motion.section>

      {/* --- 4. ABOUT SECTION (GRADIENT DETAILED) --- */}
      <section className="bg-white text-black py-24 overflow-hidden relative">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center">
          <motion.div initial={{ x: -100, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="lg:w-1/2 px-10">
            <div className="relative aspect-square max-w-[500px] mx-auto group">
              <div className="absolute inset-0 z-10 overflow-hidden shadow-2xl" style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}>
                <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-10 -left-6 z-20 bg-white/80 backdrop-blur-xl p-8 shadow-2xl rounded-2xl border-l-4 border-orange-600">
                <div className="text-5xl font-black text-orange-600">08</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-black">Years of<br/>Inspiration</div>
              </div>
            </div>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="lg:w-1/2 p-10 lg:p-24">
            <motion.div variants={itemVariants} className="h-[2px] w-12 bg-gradient-to-r from-orange-600 to-orange-400 mb-6" />
            <motion.h2 variants={itemVariants} className="text-5xl font-black uppercase mb-8 leading-[0.9] tracking-tighter">Empower <br /><span className="text-transparent" style={{ WebkitTextStroke: '1.5px black' }}>Digital</span> transformation</motion.h2>
            <motion.p variants={itemVariants} className="text-gray-600 text-lg mb-12 border-l-4 border-orange-600 pl-8 italic">Kami bukan sekadar vendor, tapi mitra strategis yang mengubah tantangan teknologi menjadi peluang pertumbuhan bisnis.</motion.p>
            
            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-10">
                {[{ n: "600+", l: "Talents" }, { n: "750+", l: "Projects" }, { n: "250+", l: "Clients" }].map((stat, i) => (
                    <div key={i}>
                      <div className="text-4xl font-black">{stat.n}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.l}</div>
                    </div>
                ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* --- 5. SERVICES SECTION --- */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="bg-white text-black py-20 px-6 md:px-10 flex flex-col lg:flex-row gap-12 border-t">
        <motion.div variants={itemVariants} className="lg:w-1/2">
          <video src="https://www.wgs.co.id/assets/works_video_compress.mp4" autoPlay loop muted playsInline className="w-full rounded-2xl shadow-xl" />
        </motion.div>
        <div className="lg:w-1/2">
          <motion.h4 variants={itemVariants} className="text-orange-600 font-black text-xs tracking-widest uppercase mb-4">Agile 360° Solution</motion.h4>
          <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-black uppercase mb-8 leading-tight">Digital<br />Transformations</motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((s, i) => (
              <motion.div key={i} variants={itemVariants} className="flex items-center gap-4 border-b border-gray-100 pb-4 group cursor-pointer hover:border-orange-500 transition-all">
                <div className="text-orange-600">{s.icon}</div>
                <span className="font-bold text-lg">{s.title}</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 flex gap-4">
            <button className="px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-400 text-white font-bold uppercase text-[10px] hover:opacity-90 shadow-xl transition-all">Explore Works ↗</button>
          </div>
        </div>
      </motion.section>

      {/* --- 6. NEWS SECTION (PROGRESS GRADIENT) --- */}
      <section className="bg-black py-24 overflow-hidden border-t border-white/5">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-16">Latest <span className="text-transparent" style={{ WebkitTextStroke: '1px white' }}>Stories</span></h2>
          
          <div className="relative">
            <div className="flex transition-transform duration-1000 ease-in-out gap-6" style={{ transform: `translateX(-${currentNews * (100 / (window.innerWidth < 768 ? 1 : 3))}%)` }}>
              {news.map((item) => (
                <div key={item.id} className="min-w-full md:min-w-[calc(33.333%-16px)] group cursor-pointer">
                  <div className="relative h-[300px] overflow-hidden rounded-sm mb-6">
                    <img src={item.img} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" />
                    <div className="absolute top-4 left-4 bg-gradient-to-r from-orange-600 to-orange-400 px-3 py-1 text-[9px] font-black text-white uppercase">{item.cat}</div>
                  </div>
                  <h3 className="text-xl font-bold uppercase italic group-hover:text-orange-500 transition-colors">{item.title}</h3>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full h-[2px] bg-white/10 mt-20 relative">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-1000" style={{ width: `${((currentNews + 1) / news.length) * 100}%` }}></div>
          </div>
        </div>
      </section>

      {/* --- 7. SUCCESS STORY SECTION --- */}
      <section className="relative bg-white text-black py-32 px-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-bl from-orange-600 to-orange-400 transform skew-x-[-15deg] translate-x-32 hidden lg:block"></div>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20 relative z-10">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="lg:w-3/5">
            <span className="text-[10px] font-black tracking-widest uppercase text-gray-400">Our Impact</span>
            <h2 className="text-5xl font-black uppercase mt-6 mb-12">Success Story</h2>
            <div key={currentStory} className="animate-in fade-in slide-in-from-right duration-500">
               <Quote className="text-orange-100 w-16 h-16 mb-4" fill="currentColor" />
               <p className="text-xl md:text-2xl font-medium leading-relaxed italic mb-10">"{testimonials[currentStory].quote}"</p>
               <h4 className="text-orange-600 font-black text-lg uppercase">{testimonials[currentStory].name}</h4>
               <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">{testimonials[currentStory].title}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- 8. FOOTER --- */}
      <footer className="bg-white text-black pt-20 pb-10 px-6 md:px-10 border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-10 mb-16">
          <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tighter max-w-xl">What can we do to help you?</h2>
          <button className="bg-gradient-to-r from-orange-600 to-orange-400 text-white px-10 py-4 font-bold rounded-md hover:from-black hover:to-black transition-all h-fit self-center">Contact Us</button>
        </div>
        <div className="flex justify-between items-center border-t pt-10 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-black text-black">CROP</span>
              <span>© 2025 Digital Inspiration</span>
            </div>
            <div className="flex gap-6">
              <Instagram size={16} /> <Linkedin size={16} /> <Twitter size={16} />
            </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPageCrop;