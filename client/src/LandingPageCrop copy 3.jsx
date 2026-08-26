import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, ChevronLeft, ChevronRight, MessageSquare, Mail, 
  RefreshCw, Folder, Settings, PenTool, FileText, ShieldCheck,
  Instagram, Linkedin, Twitter, Quote, Menu, X, Zap, ArrowRight,
  Cpu, Terminal, Code, Bug, Database, BarChart3, LineChart,
  Award, Sparkles, Send, AlertTriangle, Calculator, DollarSign, MonitorPlay, Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper component for interactive backgrounds
const MouseTrackedSection = ({ children, className, bgClass = 'bg-[#080808]', id }) => {
    const ref = useRef(null);
    const [mouseX, setMouseX] = useState(0);
    const [mouseY, setMouseY] = useState(0);

    const handleMouseMove = (e) => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setMouseX(e.clientX - rect.left);
            setMouseY(e.clientY - rect.top);
        }
    };

    return (
        <section
            id={id}
            ref={ref}
            onMouseMove={handleMouseMove}
            className={`relative overflow-hidden ${className}`}
        >
            <div
                className="pointer-events-none absolute -inset-px transition duration-300"
                style={{
                    background: `radial-gradient(500px at ${mouseX}px ${mouseY}px, rgba(249, 115, 22, 0.1), transparent 80%)`,
                }}
            />
            <div className={`absolute inset-0 -z-10 ${bgClass}`}></div>
            {children}
        </section>
    );
};

const LandingPageCrop = () => {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentarticle, setCurrentarticle] = useState(0);
  const [currentStory, setCurrentStory] = useState(0);

  // State untuk detail layanan Agile 360° yang terpilih secara interaktif
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(0);

  // --- PT CROP INSPIRASI DIGITAL IT DEVOPS SIMULATOR STATE ---
  const [devMetrics, setDevMetrics] = useState({
    codeLines: 125000, // LoC
    ticketsResolved: 850, // Tickets
    deployments: 32 // Production deploys
  });
  const [totalRevenue, setTotalRevenue] = useState(1580000000); // IDR - Project value
  const [itProjects, setItProjects] = useState([
    { id: 1, name: 'Project A (GRC Cloud Platform)', status: 'Fase QA', bugCount: 14, serverLoad: 42, progress: 85, image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=400' },
    { id: 2, name: 'Project B (Core ERP Integration)', status: 'Siap Rilis', bugCount: 0, serverLoad: 15, progress: 100, image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400' },
    { id: 3, name: 'Project C (AI Mobile Commerce)', status: 'Fase Sandbox', bugCount: 45, serverLoad: 80, progress: 30, image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400' }
  ]);
  const [simulationAlert, setSimulationAlert] = useState('');
  
  // Terminal virtual logs state untuk interaktivitas konsol DevOps
  const [terminalLogs, setTerminalLogs] = useState([
    "[SYSTEM 21:42:01] CROP DevOps Engine v3.0.4 siap digunakan.",
    "[SYSTEM 21:42:01] Mengkoneksikan server Sandbox dengan API HashMicro Cloud...",
    "[SUCCESS 21:42:02] Koneksi terjalin dengan latency 12ms. Semua sistem hijau."
  ]);

  // --- ROI CALCULATOR STATE FOR IT PROJECTS ---
  const [teamSize, setTeamSize] = useState(12); // Jumlah Software Engineers
  const [selectedTech, setSelectedTech] = useState('Enterprise Cloud ERP');
  const [ciCdAutomation, setCiCdAutomation] = useState(true);
  const [calculatedHoursSaved, setCalculatedHoursSaved] = useState(0);
  const [estimatedProfit, setEstimatedProfit] = useState(0); 

  // --- FLOATING CHATBOT STATE ---
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: 'Halo! Saya asisten AI HashMicro khusus untuk sistem integrasi IT PT Crop Inspirasi Digital. Ada yang bisa saya bantu mengenai optimasi arsitektur DevOps dan sistem Cloud ERP Anda hari ini?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- GEMINI AI CONTEXT STATES ---
  const [bizProblem, setBizProblem] = useState('');
  const [consultationResult, setConsultationResult] = useState(null);
  const [isConsulting, setIsConsulting] = useState(false);
  const [consultError, setConsultError] = useState('');

  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [answerError, setAnswerError] = useState('');

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
    { id: 0, name: "SaaS GRC Architecture", image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800", desc: "Integrasi tata kelola teknologi informasi berbasis risiko untuk enterprise." },
    { id: 1, name: "Omnichannel Microservices", image: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&q=80&w=800", desc: "Arsitektur cloud terdistribusi dengan load balancer performa tinggi." },
    { id: 2, name: "HashMicro ERP Connector", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800", desc: "Otomatisasi jembatan data keuangan, SDM, dan logistik secara real-time." },
    { id: 3, name: "Corporate Mobile Security", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800", desc: "Penyempurnaan enkripsi end-to-end aplikasi mobile perbankan." },
  ];

  const services = [
    { title: "Agile Development", icon: <RefreshCw size={28} />, detail: "Metodologi development iteratif yang mengutamakan kecepatan rilis fitur, adaptabilitas tinggi terhadap perubahan requirement, serta kolaborasi erat antara tim engineering CROP dan stakeholder bisnis Anda." },
    { title: "DevSecOps Integration", icon: <Server size={28} />, detail: "Menyuntikkan sistem keamanan otomatisasi di setiap tahap pipeline CI/CD. Memastikan kode yang dideploy ke cluster Kubernetes Cloud HashMicro telah terscan dari potensi kerentanan keamanan." },
    { title: "Enterprise Architecture", icon: <Settings size={28} />, detail: "Merancang fondasi sistem IT kustom berskala besar yang redundan, menggunakan load balancer performa tinggi, caching layer pintar Redis, serta skema arsitektur microservices modern." },
    { title: "UI/UX Engineering", icon: <PenTool size={28} />, detail: "Riset pengguna yang mendalam dipadukan dengan desain antarmuka interaktif kelas dunia. Memberikan tingkat retensi pengguna yang tinggi dan kemudahan pengoperasian aplikasi." },
    { title: "Technical Documentation", icon: <FileText size={28} />, detail: "Penyusunan kamus API Swagger/OpenAPI yang lengkap, manual instalasi server sandbox, dan dokumentasi arsitektur GRC yang mempermudah audit teknologi tahunan." },
    { title: "Quality Assurance", icon: <ShieldCheck size={28} />, detail: "Pengujian otomatisasi unit testing, integration testing, hingga load-testing dengan skenario poulasi pengguna tinggi tanpa adanya celah sistem." }
  ];

  const article = [
    { id: 1, date: "24 DEC 2025", cat: "AI-TECH", title: "Penerapan Generative AI untuk Otomatisasi Debugging Kode", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800" },
    { id: 2, date: "18 DEC 2025", cat: "ENTERPRISE", title: "CROP Membuka Hub Integrasi Cloud Baru untuk Asia Tenggara", img: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&w=800" },
    { id: 3, date: "10 DEC 2025", cat: "CYBERSEC", title: "Meningkatkan Standardisasi ISO 27001 pada API HashMicro", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800" },
  ];

  const testimonials = [
    { quote: "Integrasi sistem ERP HashMicro dengan kapabilitas pengembangan dari CROP berhasil mempercepat delivery timeline proyek kami hingga 40% secara aman.", name: "Dharmawan Putra", title: "VP Engineering PT Crop Inspirasi Digital" },
    { quote: "Transisi arsitektur kami menuju microservices cloud terkelola berjalan mulus tanpa adanya downtime.", name: "Siti Rahmawati", title: "Kepala Arsitek Solusi Digital" }
  ];

  // Simulator Handlers
  const handleFixBugs = (id) => {
    setItProjects(itProjects.map(p => {
      if (p.id === id) {
        const nextBugs = Math.max(p.bugCount - 5, 0);
        return { ...p, bugCount: nextBugs };
      }
      return p;
    }));
    triggerToast('🔧 Hotfix berhasil diterapkan! Jumlah bugs dalam sistem berkurang.');
  };

  const handleTuneServer = (id) => {
    setItProjects(itProjects.map(p => {
      if (p.id === id) {
        const nextLoad = Math.max(p.serverLoad - 15, 5);
        return { ...p, serverLoad: nextLoad };
      }
      return p;
    }));
    triggerToast('⚡ Alokasi RAM & CPU dioptimalkan! Beban container server menurun.');
  };

  const handleDeployProject = (id, name) => {
    let locGenerated = 0;
    let revenueGain = 0;
    let ticketsResolvedVal = 0;

    if (name.includes('GRC')) {
      locGenerated = 15000;
      revenueGain = 120000000; // 120JT
      ticketsResolvedVal = 140;
    } else if (name.includes('ERP')) {
      locGenerated = 28000;
      revenueGain = 350000000; // 350JT
      ticketsResolvedVal = 250;
    } else {
      locGenerated = 18000;
      revenueGain = 180000000; // 180JT
      ticketsResolvedVal = 95;
    }

    setDevMetrics(prev => ({
      codeLines: prev.codeLines + locGenerated,
      ticketsResolved: prev.ticketsResolved + ticketsResolvedVal,
      deployments: prev.deployments + 1
    }));
    setTotalRevenue(prev => prev + revenueGain);

    setItProjects(itProjects.map(p => {
      if (p.id === id) {
        return { ...p, status: 'Fase Sandbox', bugCount: 30, serverLoad: 60, progress: 10 };
      }
      return p;
    }));

    triggerToast(`🚀 Deployment Sukses! Proyek ${name} ter-deploy ke Production. Nilai Kontrak Bertambah Rp ${revenueGain.toLocaleString('id-ID')}!`);
  };

  const triggerToast = (msg) => {
    setSimulationAlert(msg);
    setTimeout(() => setSimulationAlert(''), 5000);
  };

  // ROI IT-Calculator logic
  useEffect(() => {
    let baseDevHoursSaved = 45; // Jam per engineer/bulan dengan integrasi ERP otomatis
    let averageRatePerHour = 185000; // IDR per jam

    if (selectedTech === 'Microservices API Gateway') {
      baseDevHoursSaved = 60;
      averageRatePerHour = 210000;
    } else if (selectedTech === 'AI GRC Core Platform') {
      baseDevHoursSaved = 80;
      averageRatePerHour = 250000;
    }

    const automationMultiplier = ciCdAutomation ? 1.35 : 1.0; 
    const totalHoursSaved = Math.round(teamSize * baseDevHoursSaved * automationMultiplier);
    const grossSavings = totalHoursSaved * averageRatePerHour;
    const toolingCosts = teamSize * 1250000; // Lisensi software per engineer
    const netSavings = Math.round(grossSavings - toolingCosts);

    setCalculatedHoursSaved(totalHoursSaved);
    setEstimatedProfit(netSavings);
  }, [teamSize, selectedTech, ciCdAutomation]);

  // --- GEMINI API CALL ---
  const callGemini = async (prompt, systemInstruction = "") => {
    const apiKey = ""; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };
    
    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, tidak ada respon yang dihasilkan.";
        }
      } catch (error) {
        // Silent retry
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
    throw new Error("Gagal menghubungi asisten AI. Mohon coba beberapa saat lagi.");
  };

  // --- HANDLERS FOR AI FEATURES ---
  const handleConsultancySubmit = async (e) => {
    e.preventDefault();
    if (!bizProblem.trim()) {
      setConsultError('Harap jelaskan tantangan integrasi teknologi informasi PT Crop Inspirasi Digital.');
      return;
    }

    setIsConsulting(true);
    setConsultError('');
    setConsultationResult(null);

    const systemPrompt = `Anda adalah Spesialis Integrasi Sistem ERP & Cloud DevOps dari HashMicro. Anda ditugaskan membantu PT Crop Inspirasi Digital (perusahaan software development & digital agency) untuk menyelesaikan masalah infrastruktur, deployment pipeline, skalabilitas container, atau keterlambatan deliverable proyek mereka menggunakan sistem modul IT ERP terpadu kami. Berikan rencana aksi taktis, terstruktur dengan sub-judul tebal, dan bersahabat dalam Bahasa Indonesia yang persuasif.`;

    const userPrompt = `PT Crop Inspirasi Digital memiliki tantangan IT/software berikut: "${bizProblem}". 
Tolong analisis masalah ini, usulkan otomatisasi pipeline CI/CD, deployment container kubernetes, serta pengelolaan manajemen beban resource dengan modul Enterprise ERP HashMicro IT Management.`;

    try {
      const result = await callGemini(userPrompt, systemPrompt);
      setConsultationResult(result);
    } catch (err) {
      setConsultError(err.message || 'Terjadi kesalahan sistem saat menghubungi AI.');
    } finally {
      setIsConsulting(false);
    }
  };

  const handleAiQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!aiQuestion.trim()) {
      setAnswerError('Harap ketikkan pertanyaan Anda tentang HashMicro IT & Cloud Solutions.');
      return;
    }

    setIsAnswering(true);
    setAnswerError('');
    setAiAnswer('');

    const systemPrompt = `Anda adalah asisten virtual ahli untuk HashMicro IT Solutions & Cloud ERP, khusus mengawal portofolio klien agensi teknologi besar seperti PT Crop Inspirasi Digital. Jawab pertanyaan seputar otomatisasi manajemen deployment, sistem penagihan tagihan langganan cloud, tracking waktu kerja pengembang, serta laporan keuangan biaya riset perangkat lunak dalam format ringkas (maksimal 3 paragraf). Tulis dengan bahasa Indonesia yang ramah, profesional, dan lugas.`;

    try {
      const answer = await callGemini(aiQuestion, systemPrompt);
      setAiAnswer(answer);
    } catch (err) {
      setAnswerError(err.message || 'Terjadi kesalahan sistem saat menghubungi AI.');
    } finally {
      setIsAnswering(false);
    }
  };

  const handleFloatingChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    const systemPrompt = `Anda adalah chatbot asisten cerdas khusus penasehat arsitektur sistem IT PT Crop Inspirasi Digital bersama HashMicro ERP. Jawab pertanyaan mengenai CI/CD, manajemen bugs tracker, monitoring server load balancer, serta estimasi kapasitas storage container secara ringkas dan lugas (maksimal 2 kalimat). Ramah, cerdas, dan informatif.`;

    try {
      const reply = await callGemini(userMsg, systemPrompt);
      setChatHistory(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', text: 'Koneksi AI terputus. Silakan coba sesaat lagi.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleNext = () => setCurrentSlide((prev) => (prev < projects.length - 1 ? prev + 1 : 0));
  const handlePrev = () => setCurrentSlide((prev) => (prev > 0 ? prev - 1 : projects.length - 1));

  useEffect(() => {
    const timer = setInterval(() => setCurrentarticle((prev) => (prev + 1) % article.length), 5000);
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
              <Cpu className={`w-8 h-8 ${isScrolled ? 'text-orange-600' : 'text-orange-400'} animate-pulse`} />
              <span className="text-xl md:text-2xl font-black tracking-tighter">CROP</span>
              <div className={`text-[8px] md:text-[9px] font-bold uppercase border-l pl-2 leading-tight ${isScrolled ? 'border-black' : 'border-white'}`}>
                Inspirasi<br />Digital
              </div>
            </div>
          </div>

          {/* Center: Menu */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="flex items-center gap-8 text-[11px] font-bold tracking-[0.2em] uppercase">
              {['Simulator', 'Kalkulator', 'AI Advisor', 'Testimoni'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className={`${isScrolled ? 'hover:text-orange-600' : 'hover:text-orange-400'} transition-colors`}>{item}</a>
              ))}
            </div>
          </div>

          {/* Right: Search & Language */}
          <div className="flex-1 flex items-center justify-end gap-6">
            <div className="relative hidden xl:block">
              <input 
                type="text" placeholder="Cari Solusi IT & ERP" 
                className={`px-4 py-1.5 rounded-sm text-sm w-44 focus:w-56 focus:outline-none transition-all
                  ${isScrolled ? 'bg-gray-100 text-black border border-gray-200' : 'bg-white/10 text-white border border-white/20'}`} 
              />
              <Search className="absolute right-2 top-2 text-gray-400" size={16} />
            </div>
            <div className="text-[11px] font-bold italic hidden sm:block">🇮🇩 ID</div>
            <button className="lg:hidden p-2 text-orange-500" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* --- MOBILE DROPDOWN --- */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-20 left-0 w-full bg-slate-950 border-b border-slate-800 z-50 py-6 px-8 flex flex-col gap-4 text-white lg:hidden"
          >
            <a href="#simulator" className="font-bold text-lg hover:text-orange-400" onClick={() => setIsMenuOpen(false)}>DevOps Simulator</a>
            <a href="#kalkulator" className="font-bold text-lg hover:text-orange-400" onClick={() => setIsMenuOpen(false)}>Kalkulator ROI</a>
            <a href="#ai-consultant" className="font-bold text-lg hover:text-orange-400" onClick={() => setIsMenuOpen(false)}>AI Advisor</a>
            <a href="#testimoni" className="font-bold text-lg hover:text-orange-400" onClick={() => setIsMenuOpen(false)}>Testimoni</a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- 2. HERO SECTION --- */}
      <motion.section 
        initial="hidden" animate="visible" variants={staggerContainer}
        className="relative min-h-screen flex items-center px-6 md:px-10 overflow-hidden pt-20"
      >
        {/* New Animated Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-black" />
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 1.5, delay: 0.5 }}
          >
            <motion.div
              className="absolute w-[800px] h-[800px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                background:
                  'conic-gradient(from 90deg at 50% 50%, #f97316 0%, #fb923c 50%, #f97316 100%)',
              }}
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 40,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </motion.div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0,_#000_70%)]" />
          <div className="absolute inset-0 h-full w-full bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        </div>
        
        <div className="relative z-10 w-full flex flex-col lg:flex-row items-center justify-between max-w-7xl mx-auto">
          <div className="w-full lg:max-w-4xl text-center lg:text-left pt-10">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-3 mb-6 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <Zap size={14} className="text-orange-400 fill-orange-400" />
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-orange-400">IT SYSTEM INTEGRATOR PARTNER: PT CROP INSPIRASI DIGITAL</span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl lg:text-[95px] font-black md:leading-[0.9] tracking-tighter uppercase mb-6">
              YOUR PROGRESS<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400">IS OUR BUSINESS</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed font-medium">
              Kolaborasi strategis HashMicro ERP dan arsitektur IT kustom PT Crop Inspirasi Digital guna mendigitalisasi workflow pengembang, pipeline CI/CD, serta sinkronisasi data antar platform.
            </motion.p>
          </div>
          
          {/* Orange-To-Amber Diagonal Gradient Hero Card */}
          <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} className="relative mt-12 lg:mt-0 w-full lg:w-auto">
            <div className="bg-gradient-to-br from-orange-600 to-amber-400 p-8 md:p-16 lg:p-20 lg:pt-[260px] min-w-full lg:min-w-[650px] transform lg:-skew-x-[12deg] lg:translate-x-28 shadow-2xl border-l-8 border-white relative">
              <div className="lg:transform lg:skew-x-[12deg] max-w-sm mx-auto lg:mx-0">
                <h3 className="text-2xl lg:text-3xl font-black mb-5 italic text-white uppercase leading-tight">Trust Your <br />Enterprise Software Partner</h3>
                <a href="#simulator" className="group flex items-center justify-between bg-orange-600 hover:bg-orange-700 text-white border border-white px-8 py-4 text-[11px] font-black tracking-[0.2em] uppercase transition-all w-full lg:w-auto rounded-md shadow-lg shadow-orange-600/30">
                  Uji Coba Simulator <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* --- 3. DYNAMIC INTERACTIVE IT SIMULATOR --- */}
      <section id="simulator" className="py-24 bg-[#080808] border-t border-slate-900 relative overflow-hidden">
        {/* Animated grid particle backgrounds to make it interactive and aesthetic */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="h-full w-full bg-[radial-gradient(circle_at_2px_2px,_rgba(249,115,22,_0.2)_1px,_transparent_0)] bg-[size:30px_30px]"></div>
        </div>

        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 rounded-full text-orange-400 text-sm font-semibold mb-4 border border-orange-500/30">
              <Database size={16} /> IT & DevOps Simulator Dashboard
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-4">
              Uji Coba Sistem DevOps ERP Terintegrasi
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-base">
              Kelola container sistem kustom Anda di bawah ini untuk melihat sensor beban server & bugs tracker memperbarui status gudang kode & laba finansial ERP!
            </p>
          </div>

          {/* IT ERP Metrics Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Lines of Code (LoC)</span>
                <span className="text-2xl font-black text-orange-400 mt-1">{devMetrics.codeLines.toLocaleString('id-ID')} Baris</span>
              </div>
              <Code className="text-orange-500" size={32} />
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Tickets Resolved</span>
                <span className="text-2xl font-black text-yellow-400 mt-1">{devMetrics.ticketsResolved} Selesai</span>
              </div>
              <Award className="text-yellow-500" size={32} />
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Prod Deployments</span>
                <span className="text-2xl font-black text-red-400 mt-1">{devMetrics.deployments} Rilis</span>
              </div>
              <ShieldCheck className="text-red-500" size={32} />
            </div>

            <div className="bg-orange-600 text-white p-6 rounded-3xl shadow-lg shadow-orange-600/15 flex items-center justify-between">
              <div>
                <span className="text-xs text-orange-100 block font-bold uppercase tracking-wider">Kontrak IT ERP</span>
                <span className="text-2xl font-black mt-1">Rp {(totalRevenue / 1000000).toLocaleString('id-ID')} JT</span>
              </div>
              <BarChart3 size={32} />
            </div>
          </div>

          {/* Interactive Project/Container Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            {itProjects.map((project) => (
              <div key={project.id} className="bg-slate-950 rounded-3xl overflow-hidden border border-slate-855 hover:border-orange-500/50 transition-all duration-300 flex flex-col justify-between group">
                <div className="relative h-48 overflow-hidden bg-slate-900">
                  <img src={project.image} alt={project.name} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${
                      project.status === 'Siap Rilis' ? 'bg-orange-600 animate-pulse' :
                      project.status === 'Fase QA' ? 'bg-blue-600' : 'bg-amber-600'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <h3 className="font-extrabold text-white text-lg">{project.name}</h3>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Bugs Tracker */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1"><Bug className="text-red-400" size={14} /> Total Bug Sistem</span>
                      <span className={project.bugCount > 20 ? 'text-red-400 font-black' : 'text-slate-300'}>{project.bugCount} Bugs</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${project.bugCount > 20 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${Math.min((project.bugCount / 50) * 100, 100)}%` }}></div>
                    </div>
                  </div>

                  {/* Server Resource Load */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1"><Server className="text-orange-400" size={14} /> Beban Container RAM/CPU</span>
                      <span>{project.serverLoad}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${project.serverLoad}%` }}></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-medium text-slate-400 border-t border-slate-900 pt-4">
                    <span>Progres Sprint:</span>
                    <span className="font-bold text-white">{project.progress === 100 ? 'RILIS PROD!' : `${project.progress}% Complete`}</span>
                  </div>
                </div>

                {/* Plot Quick Action Panel */}
                <div className="p-6 bg-slate-900/50 border-t border-slate-900 grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleFixBugs(project.id)}
                    className="bg-slate-950 hover:bg-orange-600 text-slate-300 border border-slate-800 hover:border-orange-500/50 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Bug size={14} /> Debug / Fix
                  </button>
                  <button 
                    onClick={() => handleTuneServer(project.id)}
                    className="bg-slate-950 hover:bg-orange-600 text-slate-300 border border-slate-800 hover:border-orange-500/50 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Server size={14} /> Tune Server
                  </button>
                  {project.bugCount === 0 && project.status === 'Siap Rilis' && (
                    <button 
                      onClick={() => handleDeployProject(project.id, project.name)}
                      className="col-span-2 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/15 transition-all animate-pulse"
                    >
                      <Sparkles size={14} /> Deploy to Production
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* VIRTUAL DEVOPS TERMINAL */}
          <div className="max-w-7xl mx-auto bg-black border border-slate-800 rounded-3xl p-6 font-mono text-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-850 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-slate-400 text-xs ml-2 flex items-center gap-1.5"><Terminal size={14} /> Virtual DevOps Console</span>
              </div>
              <span className="text-[10px] text-orange-500/80 font-bold uppercase tracking-wider animate-pulse">● System Live Logs</span>
            </div>
            <div className="space-y-2 h-44 overflow-y-auto pr-2 text-slate-300">
              {terminalLogs.map((log, index) => (
                <div key={index} className="leading-relaxed border-l-2 border-orange-500/50 pl-3">
                  {log.includes("[SYSTEM") && <span className="text-blue-400 font-bold">{log}</span>}
                  {log.includes("[SUCCESS") && <span className="text-green-400 font-bold">{log}</span>}
                  {log.includes("[DEBUGGER") && <span className="text-yellow-400 font-bold">{log}</span>}
                  {log.includes("[KUBE-CTL") && <span className="text-purple-400 font-bold">{log}</span>}
                  {log.includes("[CI-CD") && <span className="text-orange-400 font-bold">{log}</span>}
                  {log.includes("[DEPLOYS") && <span className="text-green-500 font-bold animate-pulse">{log}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- 4. PROJECT SLIDER --- */}
      <motion.section 
        id="works"
        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUpScroll}
        className="bg-[#020202] py-20 px-4 text-center relative overflow-hidden border-t border-slate-900"
      >
        {/* Animated lightweight background vector circuit */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-10">
          <motion.svg 
            animate={{ 
              strokeDashoffset: [0, -100],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full text-orange-500" 
            viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.1"
            strokeDasharray="5, 5"
          >
            <path d="M0,50 L30,50 L40,20 L60,80 L70,50 L100,50" />
            <path d="M0,10 L45,10 L50,30 L100,30" />
          </motion.svg>
        </div>

        <h4 className="text-[10px] font-black tracking-[0.4em] uppercase mb-4 text-orange-500">Portofolio</h4>
        <h2 className="text-3xl md:text-4xl font-black mb-16 tracking-tighter uppercase">Selected Enterprise Works</h2>

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
              <div key={p.id} className={`absolute transition-all duration-700 ease-out transform w-[280px] md:w-[650px] h-[350px] md:h-[420px] rounded-2xl overflow-hidden shadow-2xl ${posClass}`}>
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col items-center">
          <div className="flex gap-4 mb-8">
            <button onClick={handlePrev} className="w-12 h-12 rounded-full border border-orange-600 text-orange-500 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all"><ChevronLeft /></button>
            <button onClick={handleNext} className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-600 to-amber-400 text-white flex items-center justify-center hover:opacity-90 transition-all"><ChevronRight /></button>
          </div>
          <h3 className="text-xl md:text-2xl font-black uppercase text-orange-500 mb-2">{projects[currentSlide].name}</h3>
          <p className="text-gray-400 max-w-lg mx-auto">{projects[currentSlide].desc}</p>
        </div>
      </motion.section>

      {/* --- 5. ABOUT SECTION --- */}
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
            <motion.div variants={itemVariants} className="h-[2px] w-12 bg-gradient-to-r from-orange-600 to-amber-400 mb-6" />
            <motion.h2 variants={itemVariants} className="text-5xl font-black uppercase mb-8 leading-[0.9] tracking-tighter">Empower <br /><span className="text-transparent" style={{ WebkitTextStroke: '1.5px black' }}>Digital</span> Engineering</motion.h2>
            <motion.p variants={itemVariants} className="text-gray-600 text-lg mb-12 border-l-4 border-orange-600 pl-8 italic">Kami bukan sekadar vendor teknologi standar, kami merombak manajemen pengembangan software konvensional PT Crop Inspirasi Digital menuju otomatisasi ekosistem modern yang agile dan aman.</motion.p>
            
            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-10">
                {[{ n: "600+", l: "Dev Squad Talents" }, { n: "750+", l: "Deployments Selesai" }, { n: "99.99%", l: "Service SLA Uptime" }].map((stat, i) => (
                    <div key={i}>
                      <div className="text-3xl md:text-4xl font-black">{stat.n}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{stat.l}</div>
                    </div>
                ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* --- 6. ROI CALCULATOR --- */}
      <section id="kalkulator" className="py-24 bg-slate-950 text-white relative overflow-hidden border-t border-slate-900">
        {/* Soft glowing ambient backgrounds */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 rounded-full border border-orange-500/30 text-orange-400 text-sm font-semibold mb-4">
              <Calculator size={16} /> Kalkulator Optimalisasi Project & Penghematan Finansial
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">Simulasi Efisiensi Sprint & Budget</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-base">
              Gunakan parameter di bawah untuk melihat dampak otomatisasi penanganan deployment terhadap kapasitas pengembang dan margin budget.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            {/* Controls */}
            <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 p-8 rounded-3xl shadow-xl space-y-8 flex flex-col justify-between">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3">Pilih Core Technology Stack</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Enterprise Cloud ERP', 'Microservices API Gateway', 'AI GRC Core Platform'].map((tech) => (
                    <button
                      key={tech}
                      onClick={() => setSelectedTech(tech)}
                      className={`py-3 px-4 rounded-xl font-bold border transition-all text-xs ${
                        selectedTech === tech 
                          ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-600/15' 
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                      }`}
                    >
                      {tech}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-slate-300">Total Software Engineers (Squad Size)</label>
                  <span className="bg-orange-500/20 text-orange-400 font-bold px-3 py-1 rounded-lg text-sm">{teamSize} Talenta</span>
                </div>
                <input 
                  type="range" 
                  min="3" 
                  max="100" 
                  value={teamSize} 
                  onChange={(e) => setTeamSize(parseInt(e.target.value))}
                  className="w-full accent-orange-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-855 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">CI/CD Pipeline & Sandbox Automation</h4>
                  <p className="text-xs text-slate-500 mt-1">Menggunakan pipeline CI/CD otomatis berbasis Cloud HashMicro (+35% jam produktif)</p>
                </div>
                <button
                  onClick={() => setCiCdAutomation(!ciCdAutomation)}
                  className={`w-14 h-8 rounded-full transition-all relative ${
                    ciCdAutomation ? 'bg-orange-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-all ${
                    ciCdAutomation ? 'left-7' : 'left-1'
                  }`}></div>
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-5 bg-gradient-to-br from-orange-950/40 to-slate-950 border border-orange-500/20 rounded-3xl p-8 flex flex-col justify-between shadow-xl">
              <div>
                <span className="text-xs font-bold text-orange-400 tracking-wider uppercase block mb-2">Simulasi Hasil Efisiensi</span>
                <h3 className="text-2xl font-bold mb-6">Manfaat Finansial IT</h3>

                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <span className="text-xs text-slate-400 block mb-1">Estimasi Jam Kerja Terhemat (Per Bulan)</span>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-orange-400">{calculatedHoursSaved}</span>
                      <span className="text-slate-400 text-sm mb-1">Jam Kerja</span>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <span className="text-xs text-slate-400 block mb-1">Estimasi Cost Savings (IDR)</span>
                    <div className="text-2xl font-black text-white">
                      Rp {estimatedProfit.toLocaleString('id-ID')}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                      *Telah dikurangi biaya infrastruktur testing, lisensi platform, dan maintenance cloud server.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <a href="#ai-consultant" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 rounded-lg text-center">
                  <Sparkles size={16} /> Konsultasikan AI Project Anda
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- 7. SERVICES SECTION (INTERACTIVE SERVICE SWITCHER) --- */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="bg-white text-black py-24 px-6 md:px-10 flex flex-col lg:flex-row gap-12 border-t">
        <motion.div variants={itemVariants} className="lg:w-1/2 flex flex-col justify-between">
          <div>
            <motion.h4 variants={itemVariants} className="text-orange-600 font-black text-xs tracking-widest uppercase mb-4">Agile 360° Software Solution</motion.h4>
            <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-black uppercase mb-8 leading-tight">Digital<br />Transformation</motion.h2>
            <p className="text-slate-600 text-sm mb-6">Pilih salah satu kapabilitas utama di bawah untuk melihat rincian integrasi fungsional kustom:</p>
          </div>
          
          {/* List of services as an interactive selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((s, i) => (
              <motion.div 
                key={i} 
                onClick={() => setSelectedServiceIndex(i)}
                variants={itemVariants} 
                className={`flex items-center gap-4 border-b pb-4 p-3 rounded-xl cursor-pointer transition-all ${
                  selectedServiceIndex === i 
                    ? 'border-orange-500 bg-orange-50/50 shadow-sm' 
                    : 'border-gray-100 hover:border-orange-200'
                }`}
              >
                <div className={selectedServiceIndex === i ? "text-orange-600 animate-pulse" : "text-slate-400"}>
                  {s.icon}
                </div>
                <span className={`font-bold text-base ${selectedServiceIndex === i ? "text-orange-600 font-extrabold" : "text-slate-800"}`}>
                  {s.title}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Dynamic Detail Card Box with motion animation */}
        <div className="lg:w-1/2 bg-slate-950 text-white rounded-3xl p-8 border border-slate-850 flex flex-col justify-between shadow-2xl min-h-[350px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedServiceIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <span className="p-3 bg-orange-600/10 border border-orange-500/20 text-orange-500 rounded-2xl">
                  {services[selectedServiceIndex].icon}
                </span>
                <div>
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">KAPABILITAS TERPILIH</span>
                  <h3 className="text-2xl font-black uppercase text-white">{services[selectedServiceIndex].title}</h3>
                </div>
              </div>
              
              <p className="text-slate-400 text-sm leading-relaxed">
                {services[selectedServiceIndex].detail}
              </p>

              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-850 flex items-center justify-between text-xs">
                <span className="text-slate-400">Efisiensi Deployment :</span>
                <span className="font-extrabold text-orange-500 animate-pulse">UP TO +40% SPEEDUP</span>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8">
            <a href="#simulator" className="group flex items-center justify-between bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 text-xs font-black tracking-widest uppercase transition-all rounded-xl shadow-md shadow-orange-600/20">
              Coba Simulator Sandbox <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
            </a>
          </div>
        </div>
      </motion.section>

      {/* --- 8. GEMINI AI IT ADVISOR --- */}
      <section id="ai-consultant" className="py-24 bg-[#050505] text-white relative border-t border-slate-900 overflow-hidden">
        {/* Soft rotating SVG matrix background to enhance interactivity without heavy assets */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
          <motion.svg 
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] text-orange-500/5" 
            viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="0.1"
          >
            <circle cx="100" cy="100" r="90" strokeDasharray="2, 8" />
            <circle cx="100" cy="100" r="60" strokeDasharray="4, 12" />
            <line x1="100" y1="10" x2="100" y2="190" />
            <line x1="10" y1="100" x2="190" y2="100" />
          </motion.svg>
        </div>

        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 rounded-full border border-orange-500/30 text-orange-400 text-sm font-semibold mb-4">
              <Sparkles size={16} className="animate-spin" /> IT Enterprise AI Advisor
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-4">Konsultan Rekayasa Perangkat Lunak AI</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-base">
              Ketik kendala utama dari manajemen backlog pengembang, integrasi platform legacy, atau beban load server Anda di bawah ini.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Form */}
            <div className="lg:col-span-5 bg-slate-950/40 border border-slate-850 p-8 rounded-3xl shadow-2xl flex flex-col justify-between">
              <form onSubmit={handleConsultancySubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Pilih Sektor Fokus</label>
                  <select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-sm">
                    <option>Sistem Integrasi ERP & CRM Cloud</option>
                    <option>Arsitektur Microservices & DevOps</option>
                    <option>Tata Kelola IT Risiko & GRC Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Jelaskan Permasalahan Sistem Perangkat Lunak Anda</label>
                  <textarea 
                    value={bizProblem}
                    onChange={(e) => setBizProblem(e.target.value)}
                    placeholder="Contoh: Tim pengembang kami sering mengalami error saat merge deployment ke server sandbox, penanganan pengujian bugs masih dilakukan manual sehingga menghambat rilis..."
                    rows={4}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-xs md:text-sm resize-none"
                  ></textarea>
                </div>

                {consultError && (
                  <div className="bg-red-950/40 border border-red-900/50 text-red-400 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
                    <span className="text-sm">{consultError}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isConsulting}
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-600/20 flex items-center justify-center gap-3 disabled:opacity-50 text-sm"
                >
                  {isConsulting ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      Menganalisis Kebutuhan Sistem...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Dapatkan Solusi Arsitektur ✨
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* AI Advisor Response */}
            <div className="lg:col-span-7 bg-slate-950/60 border border-slate-850 rounded-3xl shadow-2xl p-8 flex flex-col min-h-[450px]">
              <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-orange-500 animate-ping"></div>
                  <h3 className="font-bold text-lg text-white">Analisis Ahli Rekayasa Perangkat Lunak HashMicro</h3>
                </div>
              </div>

              {isConsulting ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-850 border-t-orange-500 animate-spin"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-500" size={24} />
                  </div>
                  <p className="text-slate-300 font-medium">Gemini AI sedang menyusun kerangka otomatisasi DevOps...</p>
                </div>
              ) : consultationResult ? (
                <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 space-y-4 text-slate-300 leading-relaxed text-sm">
                  <div className="prose prose-invert max-w-none text-slate-300">
                    {consultationResult.split('\n').map((line, i) => {
                      if (line.startsWith('###')) {
                        return <h4 key={i} className="text-lg font-bold text-orange-400 mt-6 mb-2">{line.replace('###', '').trim()}</h4>;
                      } else if (line.startsWith('##') || line.startsWith('#')) {
                        return <h3 key={i} className="text-xl font-extrabold text-white mt-6 mb-3">{line.replace(/#+/g, '').trim()}</h3>;
                      } else if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={i} className="font-bold text-white text-base my-2">{line.replace(/\*\*/g, '').trim()}</p>;
                      } else if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                        return (
                          <div key={i} className="flex items-start gap-2.5 my-1.5 pl-2">
                            <span className="text-orange-500 mt-1.5 font-bold">•</span>
                            <span>{line.replace(/^[-*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')}</span>
                          </div>
                        );
                      }
                      return <p key={i} className="my-2 leading-relaxed">{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 py-10">
                  <Cpu size={48} className="text-slate-700 mb-4 animate-pulse" />
                  <p className="text-slate-400 font-medium text-base">Belum ada analisis yang dijalankan.</p>
                  <p className="text-sm max-w-sm mt-1 text-slate-600">Lengkapi deskripsi kendala deployment di samping untuk memperoleh strategi penataan sistem server kustom dari Gemini AI.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- 9. article SECTION (PROGRESS GRADIENT) --- */}
      <MouseTrackedSection id="article" className="py-24 overflow-hidden border-t border-slate-900" bgClass="bg-black">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 relative z-10">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-16">Latest <span className="text-transparent" style={{ WebkitTextStroke: '1px white' }}>Stories</span></h2>
          
          <div className="relative">
            <div className="flex transition-transform duration-1000 ease-in-out gap-6" style={{ transform: `translateX(-${currentarticle * (100 / (window.innerWidth < 768 ? 1 : 3))}%)` }}>
              {article.map((item) => (
                <div key={item.id} className="min-w-full md:min-w-[calc(33.333%-16px)] group cursor-pointer">
                  <div className="relative h-[300px] overflow-hidden rounded-sm mb-6">
                    <img src={item.img} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" />
                    <div className="absolute top-4 left-4 bg-gradient-to-r from-orange-600 to-amber-400 px-3 py-1 text-[9px] font-black text-white uppercase">{item.cat}</div>
                  </div>
                  <h3 className="text-xl font-bold uppercase italic group-hover:text-orange-400 transition-colors">{item.title}</h3>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full h-[2px] bg-white/10 mt-20 relative">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-1000" style={{ width: `${((currentarticle + 1) / article.length) * 100}%` }}></div>
          </div>
        </div>
      </MouseTrackedSection>

      {/* --- 10. SUCCESS STORY SECTION --- */}
      <section id="testimoni" className="relative bg-white text-black py-32 px-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-bl from-orange-600 to-amber-400 transform skew-x-[-15deg] translate-x-32 hidden lg:block"></div>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20 relative z-10">
          <div className="lg:w-3/5">
            <span className="text-[10px] font-black tracking-widest uppercase text-gray-400">Our Impact</span>
            <h2 className="text-5xl font-black uppercase mt-6 mb-12">Success Story</h2>
            <div key={currentStory} className="animate-in fade-in slide-in-from-right duration-500">
               <Quote className="text-orange-100 w-16 h-16 mb-4" fill="currentColor" />
               <p className="text-xl md:text-2xl font-medium leading-relaxed italic mb-10">"{testimonials[currentStory].quote}"</p>
               <h4 className="text-orange-600 font-black text-lg uppercase">{testimonials[currentStory].name}</h4>
               <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">{testimonials[currentStory].title}</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- 11. FAQ SECTION & GEMINI QUESTION BOX --- */}
      <section id="faq" className="py-24 bg-[#080808] border-t border-slate-900 relative overflow-hidden">
        {/* Animated lightweight code block elements floating behind the FAQ */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-5 select-none font-mono text-[10px] text-orange-500">
          <motion.div 
            animate={{ y: [0, -30, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 left-10 space-y-1"
          >
            <p>import {'{ useState, useEffect }'} from 'react';</p>
            <p>const App = () =&gt; {'{'}</p>
            <p className="pl-4">const [data, setData] = useState(null);</p>
            <p className="pl-4">useEffect(() =&gt; {'{'} ... {'}'}, []);</p>
            <p>{'}'}</p>
          </motion.div>
          <motion.div 
            animate={{ y: [0, 30, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-10 right-10 space-y-1 text-right"
          >
            <p>docker build -t crop-it-erp .</p>
            <p>kubernetes apply -f deployment.yaml</p>
            <p>status: RUNNING [100% OK]</p>
          </motion.div>
        </div>

        <div className="container mx-auto px-4 max-w-4xl relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase mb-4">FAQ & Pusat Informasi</h2>
            <p className="text-gray-400">Dapatkan jawaban instan tentang integrasi sistem teknologi cerdas PT Crop Inspirasi Digital.</p>
          </div>

          {/* DYNAMIC FAQ ACCORDION BOX */}
          <div className="bg-slate-950 border border-slate-850 rounded-3xl p-8 shadow-xl mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-orange-400 animate-pulse" size={20} />
              <h3 className="font-bold text-lg text-white">Tanyakan Spesifik Rekayasa IT ke AI</h3>
            </div>
            <p className="text-slate-400 text-sm mb-6">
              Mulai dari sensor server load, optimasi pipeline, deployment sandbox kustom, hingga modul integrasi laporan keuangan HashMicro.
            </p>

            <form onSubmit={handleAiQuestionSubmit} className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Contoh: Bagaimana arsitektur Cloud ERP mengkonversi laporan backlog tim dev secara real-time?"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-12 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-sm"
                />
                <button 
                  type="submit" 
                  disabled={isAnswering}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {isAnswering ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                </button>
              </div>

              {answerError && (
                <p className="text-red-500 text-xs flex items-center gap-1.5 pl-1">
                  <AlertTriangle size={14} /> {answerError}
                </p>
              )}

              {aiAnswer && (
                <div className="bg-orange-95/20 border border-orange-900/30 rounded-xl p-5 mt-4 text-sm text-slate-300 leading-relaxed animate-fadeIn">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-orange-400 bg-orange-900/30 px-2.5 py-0.5 rounded-full uppercase">Asisten AI HashMicro IT</span>
                  </div>
                  <div className="prose max-w-none text-slate-300 whitespace-pre-wrap">
                    {aiAnswer}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* --- 12. FOOTER --- */}
      <footer className="bg-white text-black pt-20 pb-10 px-6 md:px-10 border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-10 mb-16">
          <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tighter max-w-xl">Butuh Solusi Integrasi IT Khusus?</h2>
          <a href="#ai-consultant" className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-4 font-bold rounded-lg transition-all h-fit self-center shadow-lg shadow-orange-600/30 text-center">Konsultasi Sistem Sekarang</a>
        </div>
        <div className="flex justify-between items-center border-t pt-10 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-black text-black">CROP</span>
              <span>© 2026 PT Crop Inspirasi Digital. Seluruh hak cipta dilindungi.</span>
            </div>
            <div className="flex gap-6">
              <Instagram size={16} /> <Linkedin size={16} /> <Twitter size={16} />
            </div>
        </div>
      </footer>

      {/* --- 13. FLOATING AI CHAT WIDGET --- */}
      <div className="fixed bottom-6 right-6 z-50">
        {floatingChatOpen ? (
          <div className="w-80 md:w-96 bg-slate-950 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col h-[450px] animate-fadeIn">
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></div>
                <div>
                  <h4 className="font-extrabold text-sm flex items-center gap-1">AI Crop Inspirasi <Sparkles size={12} className="text-orange-400 animate-spin" /></h4>
                  <p className="text-[10px] text-slate-400">Online • Konsultan Cerdas Cloud & DevOps</p>
                </div>
              </div>
              <button onClick={() => setFloatingChatOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40 text-xs">
              {chatHistory.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-3.5 leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-orange-600 text-white rounded-tr-none' 
                      : 'bg-slate-900 text-slate-300 rounded-tl-none border border-slate-800'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 text-slate-400 rounded-2xl p-3 border border-slate-800 flex items-center gap-1.5">
                    <RefreshCw className="animate-spin" size={12} />
                    <span>Mengevaluasi deployment sandbox...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleFloatingChatSubmit} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tanyakan status pipeline kustom..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-white"
              />
              <button 
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-xl transition-colors disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        ) : (
          <button 
            onClick={() => setFloatingChatOpen(true)}
            className="bg-slate-900 hover:bg-orange-600 text-white p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center gap-2 border border-white/10 group"
          >
            <MessageSquare size={22} className="group-hover:rotate-12 transition-transform" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-36 transition-all duration-500 ease-out text-sm font-bold whitespace-nowrap">Asisten Cerdas Crop ✨</span>
          </button>
        )}
      </div>

    </div>
  );
};

export default LandingPageCrop;