import React, { useState, useEffect } from 'react';
import { 
  Search, ChevronLeft, ChevronRight, MessageSquare, Mail, 
  RefreshCw, Folder, Settings, PenTool, FileText, ShieldCheck,
  Instagram, Linkedin, Twitter, Quote
} from 'lucide-react';


const LandingPageCrop = () => {
  const [currentSlide, setCurrentSlide] = useState(2);

  // 1. Data Proyek Lengkap (Ditambah Livin' dari screenshot baru)
  const projects = [
    { id: 0, name: "Movic", logo: "MOVIC", image: "https://www.wgs.co.id/assets/web/slider-boga-loyalty.jpg", color: "bg-[#45C4A0]" },
    { id: 1, name: "Kreditplus", logo: "kreditplus", image: "https://www.wgs.co.id/assets/web/slider-boga-loyalty.jpg", color: "bg-[#E2E8F0]" },
    { id: 2, name: "Halo BCA Mobile App", logo: "BCA", image: "https://www.wgs.co.id/assets/web/slider-boga-loyalty.jpg", color: "bg-[#005696]", desc: "Halo BCA is a mobile application that can be used to contact various channels owned by Halo BCA." },
    { id: 3, name: "Renjani DJP", logo: "Renjani / DJP", image: "https://www.wgs.co.id/assets/web/slider-boga-loyalty.jpg", color: "bg-white" },
    { id: 4, name: "Alfagift / Retail", logo: "Retail", image: "https://www.wgs.co.id/assets/web/slider-boga-loyalty.jpg", color: "bg-[#ED1C24]" },
    { id: 5, name: "Meratus Website", logo: "MERATUS", image: "https://www.wgs.co.id/assets/web/slider-boga-loyalty.jpg", color: "bg-[#004A99]" },
    { id: 6, name: "Jenius", logo: "jenius", image: "https://www.wgs.co.id/assets/web/slider-boga-loyalty.jpg", color: "bg-[#00AEEF]" },
    { id: 7, name: "Livin' by Mandiri", logo: "livin'", image: "https://www.wgs.co.id/assets/web/slider-boga-loyalty.jpg", color: "bg-[#0072C6]" }
  ];

  // 2. Data Services (Sesuai Screenshot 4)
  const services = [
    { title: "Agile Development", icon: <RefreshCw size={28} /> },
    { title: "Project Based", icon: <Folder size={28} /> },
    { title: "Managed Services", icon: <Settings size={28} /> },
    { title: "Design Services", icon: <PenTool size={28} /> },
    { title: "Technical Writer", icon: <FileText size={28} /> },
    { title: "Quality Assurance", icon: <ShieldCheck size={28} /> }
  ];

  const handleNext = () => setCurrentSlide((prev) => (prev < projects.length - 1 ? prev + 1 : 0));
  const handlePrev = () => setCurrentSlide((prev) => (prev > 0 ? prev - 1 : projects.length - 1));


  const [currentStory, setCurrentStory] = useState(0);

const testimonials = [
  {
    quote: "I've been impressed with the work you are doing: 1. Speed and quality of code produced. 2. Knowledge of rails and working to standard patterns. 3. Use of initiative when spec hasn't covered an area properly. 4. You ask questions when you're unsure and get on with it when you know what you're doing.",
    name: "George Palmer",
    title: "Rails Speaker & Expert, Founder of SendOwl",
    image: "https://www.wgs.co.id/assets/web/success-story-illustration.png" // Sesuaikan path gambar
  },
  {
    quote: "Working with WGS has been a game-changer for our digital presence. Their agile approach and deep technical expertise allowed us to launch our platform ahead of schedule with zero major bugs. Their communication is top-notch.",
    name: "Sarah Chen",
    title: "CTO, Fintech Solutions Global",
    image: "https://www.wgs.co.id/assets/web/success-story-illustration.png"
  },
  // Anda bisa menambah hingga 26 data di sini
];

const nextStory = () => setCurrentStory((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
const prevStory = () => setCurrentStory((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));

  useEffect(() => {
    const slideInterval = setInterval(handleNext, 4000);
    return () => clearInterval(slideInterval);
  }, [currentSlide]);

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      
      {/* --- NAVIGATION --- */}
      <nav className="flex items-center justify-between px-10 py-8 absolute w-full z-50">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="text-3xl font-black tracking-tighter">WGS</span>
            <div className="text-[9px] font-bold uppercase border-l border-white pl-2 leading-tight">Walden<br />Global<br />Services</div>
          </div>
          <div className="hidden lg:flex items-center gap-8 text-[11px] font-bold tracking-widest uppercase">
            <a href="#" className="hover:text-blue-500">Solutions</a>
            <a href="#" className="hover:text-blue-500">Works</a>
            <a href="#" className="hover:text-blue-500">Explore More</a>
            <a href="#" className="hover:text-blue-500">Contact Us</a>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative hidden md:block">
            <input type="text" placeholder="Search" className="bg-white text-black px-4 py-1.5 rounded-sm text-sm w-60 focus:outline-none" />
            <Search className="absolute right-2 top-2 text-gray-400" size={18} />
          </div>
          <div className="text-[11px] font-bold italic">🇬🇧 EN</div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative h-screen flex items-start px-10 overflow-hidden">
        <div className="absolute inset-0 opacity-10"><div className="h-full w-full bg-[radial-gradient(circle_at_2px_2px,_rgba(255,255,255,0.15)_1px,_transparent_0)] bg-[size:35px_35px]"></div></div>
        <div className="relative z-10 w-full flex flex-col lg:flex-row justify-between pt-20">
          <div className="max-w-4xl pt-32 lg:pt-14"><h1 className="text-6xl md:text-[115px] font-black leading-[0.85] tracking-tighter uppercase">YOUR PROGRESS<br />IS OUR BUSINESS</h1></div>
          <div className="relative -mt-20 lg:-mt-24">
            <div className="bg-blue-600 p-10 lg:p-24 pt-48 lg:pt-[290px] min-w-[350px] lg:min-w-[850px] transform -skew-x-[15deg] translate-x-24 lg:translate-x-44 shadow-2xl">
              <div className="transform skew-x-[15deg] max-w-sm lg:max-w-md">
                <h3 className="text-xl lg:text-3xl font-bold mb-5 leading-tight">We are your trusted technology partner</h3>
                <p className="text-sm lg:text-lg opacity-90 mb-10 leading-relaxed">Walden Global Services delivers software and IT services for businesses in Asia and beyond.</p>
                <button className="border-2 border-white px-8 py-4 text-[11px] font-black tracking-[0.2em] uppercase flex items-center gap-4 hover:bg-white hover:text-blue-600 transition-all">Find out more about WGS <ChevronRight size={20} /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PROJECT SLIDER (Screenshot 1 & 2) --- */}
      <section className="bg-black py-24 px-10 text-center relative z-10">
        <h4 className="text-[11px] font-black tracking-[0.5em] uppercase mb-4 opacity-60">AGILE 360°</h4>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 tracking-tighter uppercase">Software Implementation<br />& Customization</h2>
        <p className="text-gray-400 max-w-3xl mx-auto mb-16 text-sm">WGS offers a combination of tech consulting, software implementation, custom development, and team augmentation to large enterprises for their digital transformation journey.</p>
        
        <div className="relative flex items-center justify-center h-[520px] gap-2">
          {projects.map((p, index) => {
            const isCenter = index === currentSlide;
            const isLeft = index === (currentSlide - 1 + projects.length) % projects.length;
            const isRight = index === (currentSlide + 1) % projects.length;
            if (!isCenter && !isLeft && !isRight) return null;
            return (
              <div key={p.id} className={`transition-all duration-1000 transform flex-shrink-0 relative overflow-hidden rounded-xl ${isCenter ? 'w-[500px] h-[500px] z-30 scale-100 opacity-100' : 'w-[420px] h-[420px] z-10 scale-[0.85] opacity-40 grayscale'} ${isLeft ? '-mr-28' : ''} ${isRight ? '-ml-28' : ''} `}>
                <img src={p.image} alt={p.name} className="w-full h-full object-cover p-8" />
                <div className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity ${isCenter ? 'opacity-100' : 'opacity-0'}`}><h4 className="text-4xl font-black text-white uppercase">{p.logo}</h4></div>
              </div>
            );
          })}
        </div>
        
        {/* Info & Nav */}
        <div className="mt-12 max-w-2xl mx-auto">
          <div className="flex justify-center gap-4 mb-6">
            <button onClick={handlePrev} className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center"><ChevronLeft /></button>
            <button onClick={handleNext} className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center"><ChevronRight /></button>
          </div>
          <h3 className="text-2xl font-black uppercase text-blue-500 mb-2">{projects[currentSlide].name}</h3>
          <p className="text-gray-400 text-sm mb-8 h-12">{projects[currentSlide].desc || "Providing digital transformation and custom software solutions."}</p>
          <div className="flex justify-center gap-4">
            <button className="bg-blue-600 px-8 py-3 text-[10px] font-bold uppercase tracking-widest">Explore more projects ↗</button>
            <button className="border border-white/40 px-8 py-3 text-[10px] font-bold uppercase tracking-widest">See our case studies</button>
          </div>
        </div>
      </section>

      {/* --- ABOUT SECTION (Screenshot 3 - Tanpa Cite) --- */}
      <section className="relative bg-white text-black min-h-screen flex flex-col lg:flex-row overflow-hidden">
        <div className="lg:w-1/2 h-[600px] lg:h-auto overflow-hidden relative">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('https://www.wgs.co.id/assets/wgs_banner--summary.webp')`, clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)' }}></div>
        </div>
        <div className="lg:w-1/2 p-10 lg:p-24 flex flex-col justify-center">
          <span className="text-blue-600 font-bold text-xs tracking-widest uppercase mb-4 block border-b-2 border-blue-600 w-fit pb-1">About</span>
          <h2 className="text-5xl lg:text-6xl font-black leading-tight uppercase mb-8">Empower Digital<br />Transformation With AI</h2>
          <p className="text-gray-600 text-lg mb-10 leading-relaxed">
            At WGS, we empower digital transformation by continually raising the bar. Our global experience in various industries and multiple solutions, including AI, has enabled us to deliver successful results to clients like you. We are a software development company at the core, so we can deliver tailored solutions, because we understand every business has unique needs.
          </p>
          <button className="bg-blue-600 text-white px-10 py-4 font-bold uppercase text-[11px] w-fit mb-16">Find out more about WGS</button>
          
          <div className="grid grid-cols-3 gap-8 border-t pt-12">
            <div><div className="text-5xl font-black text-blue-600">600+</div><div className="text-[10px] font-bold uppercase text-gray-400 mt-2">Talents</div></div>
            <div><div className="text-5xl font-black text-blue-600">750+</div><div className="text-[10px] font-bold uppercase text-gray-400 mt-2">Projects</div></div>
            <div><div className="text-5xl font-black text-blue-600">250+</div><div className="text-[10px] font-bold uppercase text-gray-400 mt-2">Clients</div></div>
          </div>
        </div>
      </section>

      {/* --- DIGITAL TRANSFORMATIONS (Screenshot 4) --- */}
      <section className="bg-white text-black py-24 px-10 flex flex-col lg:flex-row gap-20 border-t">
        <div className="lg:w-1/2">
          <video src="https://www.wgs.co.id/assets/works_video_compress.mp4" autoPlay loop muted playsInline className="w-full rounded-3xl shadow-2xl" />
        </div>
        <div className="lg:w-1/2">
          <h4 className="text-blue-600 font-black text-xs tracking-widest uppercase mb-4 border-b border-blue-600 w-fit pb-1">Future-Proof Agile 360°</h4>
          <h2 className="text-6xl font-black uppercase mb-8 leading-tight">Digital<br />Transformations</h2>
          <p className="text-gray-500 mb-12 text-lg">We work with our Clients by providing ini services:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
            {services.map((s, i) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer border-b border-gray-100 pb-4 hover:border-blue-600 transition-all">
                <div className="flex items-center gap-6">
                  <div className="text-blue-600">{s.icon}</div>
                  <span className="font-bold text-xl">{s.title}</span>
                </div>
                <ChevronRight className="text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            ))}
          </div>
          <div className="mt-12 flex gap-4">
            <button className="px-8 py-4 border border-blue-600 text-blue-600 font-bold uppercase text-[10px] hover:bg-blue-600 hover:text-white transition-all">See how we do it</button>
            <button className="px-8 py-4 bg-blue-600 text-white font-bold uppercase text-[10px] hover:bg-blue-700 shadow-xl transition-all">Explore Our Works ↗</button>
          </div>
        </div>
      </section>

     {/* --- SUCCESS STORY SECTION --- */}
<section className="relative bg-white text-black py-32 px-10 overflow-hidden">
  {/* Latar belakang biru miring */}
  <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-600 transform skew-x-[-15deg] translate-x-32 hidden lg:block"></div>
  
  <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20 relative z-10">
    <div className="lg:w-3/5">
      <span className="text-[10px] font-black tracking-widest uppercase text-gray-400 border-b border-gray-400 pb-1">Our Impact</span>
      <h2 className="text-5xl font-black uppercase mt-6 mb-12">Success Story</h2>
      
      {/* Container Slide dengan transisi sederhana */}
      <div key={currentStory} className="relative pl-12 animate-in fade-in slide-in-from-right-4 duration-500">
         <Quote className="absolute top-0 left-0 text-blue-100 w-16 h-16 -z-10" fill="currentColor" />
         
         <p className="text-xl md:text-2xl font-medium leading-relaxed mb-10 italic min-h-[180px]">
           "{testimonials[currentStory].quote}"
         </p>
         
         <div className="mt-8">
           <h4 className="text-blue-600 font-black text-lg uppercase">{testimonials[currentStory].name}</h4>
           <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-1">
             {testimonials[currentStory].title}
           </p>
         </div>
      </div>

      <div className="flex items-center gap-6 mt-16">
         <div className="flex gap-4">
            <button 
              onClick={prevStory}
              className="text-blue-600 hover:scale-110 transition-transform active:scale-95"
            >
              <ChevronLeft size={32} />
            </button>
            <button 
              onClick={nextStory}
              className="text-blue-600 hover:scale-110 transition-transform active:scale-95"
            >
              <ChevronRight size={32} />
            </button>
         </div>
         <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
           {currentStory + 1} OF {testimonials.length}
         </span>
      </div>
    </div>

    {/* Visual Mockup (Bisa juga dibuat berubah gambarnya) */}
    <div className="lg:w-2/5 flex justify-center">
       <div className="relative group">
          <div className="bg-gray-100 w-80 h-96 rounded-2xl shadow-2xl overflow-hidden border-8 border-white transform group-hover:rotate-2 transition-transform duration-500">
             <div className="bg-blue-500 h-2/3 w-full flex items-center justify-center">
                {/* Anda bisa mengganti ini dengan <img src={testimonials[currentStory].image} /> */}
                <div className="w-20 h-20 bg-white/20 rounded-full animate-pulse"></div>
             </div>
             <div className="p-6 space-y-4">
                <div className="h-4 bg-gray-200 w-3/4 rounded"></div>
                <div className="h-4 bg-gray-200 w-1/2 rounded"></div>
             </div>
          </div>
          {/* Elemen melayang */}
          <div className="absolute -bottom-6 -right-6 bg-white p-6 shadow-xl rounded-xl border border-gray-100 transform group-hover:-translate-y-2 transition-transform duration-500">
             <div className="flex gap-2 text-yellow-400">
                <Folder fill="currentColor" size={20} /> 
                <Folder fill="currentColor" size={20} /> 
                <Folder fill="currentColor" size={20} />
             </div>
          </div>
       </div>
    </div>
  </div>
</section>

   {/* --- CTA & FOOTER SECTION --- */}
<footer className="bg-white text-black pt-20 pb-10 px-10 border-t border-gray-100">
  
  {/* 1. Get In Touch Section */}
  <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
    <div className="max-w-xl">
      <span className="text-blue-600 font-black text-xs tracking-widest uppercase block mb-4">
        Get In Touch With Us
      </span>
      <h2 className="text-5xl md:text-6xl font-black leading-tight tracking-tighter">
        What can we do to help you?
      </h2>
    </div>
    <div className="flex flex-col items-start md:items-end text-left md:text-right max-w-sm">
      <p className="text-gray-500 text-lg mb-8 leading-snug">
        Digital Transformation is essential in todays era of volatility. Are you ready to Future-Proof your business?
      </p>
      <button className="bg-[#0033FF] text-white px-10 py-4 font-bold text-sm rounded-md hover:bg-black transition-colors">
        Contact Us
      </button>
    </div>
  </div>

  <hr className="border-gray-200 mb-16" />

  {/* 2. Main Footer Links */}
  <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
    
    {/* Column 01: Logo & Socials */}
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-2">
        <span className="text-4xl font-black tracking-tighter text-black">WGS</span>
        <div className="text-[9px] font-bold uppercase border-l border-black pl-2 leading-tight text-gray-500">
          Walden<br />Global<br />Services
        </div>
      </div>
    </div>

    {/* Column 02: Headquarters & Tech Center */}
    <div className="space-y-8">
      <div>
        <h5 className="font-black text-sm mb-4 flex gap-3">
          <span className="text-gray-400">01</span> HEADQUARTER
        </h5>
        <p className="text-gray-500 text-sm leading-relaxed">
          20 Cecil St, #05-03 PLUS, Singapore 049705
        </p>
      </div>
      <div>
        <h5 className="font-black text-sm mb-4">TECH CENTER</h5>
        <p className="text-gray-500 text-sm leading-relaxed">
          Jln. Soekarno Hatta No.104, Babakan Ciparay, Bandung, West Java, 40223, Indonesia
        </p>
        <div className="mt-4 text-xs font-bold text-gray-400 space-y-1">
          <p>P : +62226034882</p>
          <p>WA : +628112234357</p>
        </div>
      </div>
    </div>

    {/* Column 03: Solutions & Social Icons */}
    <div>
      <h5 className="font-black text-sm mb-6 flex gap-3">
        <span className="text-gray-400">02</span> SOLUTIONS
      </h5>
      <ul className="text-black font-bold text-xs tracking-widest uppercase space-y-4 mb-8">
        <li className="hover:text-blue-600 cursor-pointer transition-colors">Services</li>
        <li className="hover:text-blue-600 cursor-pointer transition-colors">Works</li>
        <li className="hover:text-blue-600 cursor-pointer transition-colors">Contact Us</li>
        <li className="hover:text-blue-600 cursor-pointer transition-colors">Blog</li>
        <li className="hover:text-blue-600 cursor-pointer transition-colors">About</li>
        <li className="hover:text-blue-600 cursor-pointer transition-colors">Career</li>
      </ul>
      <div className="flex gap-4">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white cursor-pointer hover:bg-black transition-colors">
          <span className="font-bold text-xs">f</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white cursor-pointer hover:bg-black transition-colors">
          <Instagram size={14} />
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white cursor-pointer hover:bg-black transition-colors">
          <Linkedin size={14} />
        </div>
      </div>
    </div>

    {/* Column 04: articleletter */}
    <div>
      <h5 className="font-black text-sm mb-6 flex gap-3">
        <span className="text-gray-400">03</span> Subscribe to our articleletter.
      </h5>
      <div className="flex flex-col gap-4">
        <input 
          type="email" 
          placeholder="Email" 
          className="border-b border-gray-300 py-2 focus:outline-none focus:border-blue-600 transition-colors"
        />
        {/* Placeholder for reCAPTCHA badge */}
        <div className="bg-gray-50 border border-gray-200 p-2 text-[10px] text-gray-400 flex items-center gap-2 max-w-[180px]">
           <ShieldCheck size={14} className="text-blue-600" />
           protected by reCAPTCHA
        </div>
        <button className="border border-blue-600 text-blue-600 px-6 py-2 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all w-fit">
          Submit <ChevronRight size={14} className="rotate-[-45deg]" />
        </button>
      </div>
    </div>
  </div>

  {/* 3. Bottom Copyright */}
  <div className="text-center pt-10 border-t border-gray-100">
    <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">
      Copyright ©2025 WGS. All Rights Reserved
    </p>
  </div>
</footer>

      {/* FLOATING SIDEBAR */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 flex flex-col z-[100] items-end">
        <div className="bg-blue-700 text-white px-3 py-10 cursor-pointer border-b border-white/10 group hover:bg-blue-800">
          <div className="flex items-center gap-2 [writing-mode:vertical-lr] rotate-180">
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Contact Us</span>
            <Mail size={16} className="rotate-180" />
          </div>
        </div>
        <div className="bg-green-500 p-4 cursor-pointer shadow-xl"><MessageSquare size={28} className="text-white fill-white" /></div>
      </div>
    </div>
  );
};

export default LandingPageCrop;