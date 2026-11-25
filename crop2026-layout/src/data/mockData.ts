import { ProjectItem, ServiceItem, TestimonialItem, OfficeLocation } from '../types';

export const COMPANY_PROFILE = {
  name: "PT CROP INSPIRASI DIGITAL",
  shortName: "CROP",
  tagline: "Together we can create digital transformation",
  subTagline: "Transformasikan Bisnis Anda",
  founded: "2016",
  email: "info@crop.co.id",
  website: "www.crop.co.id",
  introduction: "CROP adalah suatu perusahaan yang bergerak dibidang Teknologi Informasi yang memberikan layanan dibidang IT Consultant dan Software Development. Didirikan pada tahun 2016, pada awal didirikan CROP ini ditandai dengan disrupsi oleh Transformasi Digital dihampir semua sektor bisnis, organisasi maupun kehidupan.\n\nCROP memberikan layanan di bidang Jasa Pembuatan Website dan Aplikasi Mobile Android & iOS, serta IT Management Consultant yang diperlukan bagi kalangan bisnis, akademisi maupun kalangan profesional. Didukung oleh staff-staff yang menguasai konsep Teknologi Informasi terbaru untuk melakukan Transformasi Digital dan berpengalaman mengembangkan serta menerapkan teknologi di banyak organisasi. Transformasi Digital yang stabil dan mudah digunakan adalah kekuatan dan ciri utama dari produk PT CROP INSPIRASI DIGITAL.\n\nPT CROP INSPIRASI DIGITAL siap membantu transformasi digital pada perusahaan anda agar lebih berkembang, efisien dan efektif.",
  vision: "Menjadi perusahaan berbasis pengetahuan yang profesional, unggul, handal dan kompetitif dalam memberikan Solusi terbaik dan terpercaya dalam bidang teknologi informasi dan transformasi digital.",
  missions: [
    "Mengembangkan produk dan manajemen Perusahaan berbasis pengetahuan yang berkualitas dan bernilai tinggi yang tepat guna.",
    "Menyediakan layanan konsultansi transformasi digital yang handal dan professional.",
    "Meningkatkan kinerja melalui efisiensi dan profesionalisme dalam rangka menjaga komitmen kami sebagai perusahaan yang sehat dan dapat diandalkan secara berkesinambungan.",
    "Membangun dan mengembangkan kemitraan yang saling menguntungkan."
  ],
  stats: [
    { value: "25+", label: "Dedicated Teams", sub: "Engineers & IT Consultants" },
    { value: "45+", label: "Project Done", sub: "Enterprise Web & Apps" },
    { value: "17+", label: "Client Partnerships", sub: "BUMN, Swasta & Perbankan" },
    { value: "2016", label: "Established", sub: "Years of Proven Delivery" }
  ],
  segmentations: [
    {
      id: "private-banking",
      title: "Swasta, Industri, Perbankan & Reinsurance",
      desc: "Solusi enterprise digital untuk korporasi swasta, industri manufaktur, perbankan nasional, asuransi, serta reasuransi.",
      icon: "Building"
    },
    {
      id: "gov-bumn",
      title: "Pemerintahan, BUMN dan BUMD",
      desc: "Transformasi sistem pelayanan publik, administrasi terintegrasi, dan tata kelola digital untuk instansi pemerintah dan BUMN.",
      icon: "Landmark"
    },
    {
      id: "global-market",
      title: "Pasar Global atau Pasar Bebas",
      desc: "Pengembangan produk software dan aplikasi berstandar internasional yang siap bersaing di pasar global dan ekosistem digital terbuka.",
      icon: "Globe"
    }
  ]
};

export const PROJECTS: ProjectItem[] = [
  {
    id: 0,
    name: "Website Company Profile - Benings Clinic",
    client: "Benings Clinic",
    logo: "BENING'S",
    category: "web",
    tagline: "Situs Web Kredibel & Akselerasi Penjualan Online Skincare",
    desc: "Benings Clinic memanfaatkan web untuk meningkatkan penjualan secara online. Agar terlihat kredibel, situs web yang berisi informasi lengkap tentang perusahaan, produk, atau layanan untuk menarik calon pelanggan yang sesuai dengan target.",
    detailedCaseStudy: {
      challenge: "Kebutuhan platform digital resmi yang elegan, kredibel, dan cepat untuk memamerkan rangkaian produk perawatan kulit premium serta memfasilitasi konversi reservasi dan pembelian daring secara masif.",
      solution: "Merancang dan membangun website company profile interaktif berperforma tinggi dengan navigasi katalog produk terstruktur, integrasi informasi klinik estetika, dan optimasi konversi pengguna.",
      impact: [
        "Peningkatan kredibilitas brand kecantikan di ranah digital nasional",
        "Akses informasi katalog produk dan promo real-time untuk calon pelanggan",
        "Dukungan penuh integrasi kanal media sosial dan customer service online"
      ],
      techStack: ["Next.js / React", "TypeScript", "Tailwind CSS", "RESTful API", "Cloud CDN", "SEO Engine"],
      usersCount: "100K+ Pengunjung Bulanan"
    },
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1200&auto=format&fit=crop",
    deviceType: "web",
    accentColor: "#F97316"
  },
  {
    id: 1,
    name: "Clinic Management System - Benings Clinic",
    client: "Benings Clinic",
    logo: "CMS-CLINIC",
    category: "custom",
    tagline: "Sistem Operasional Harian Klinik Efisien, Terpadu & Terintegrasi",
    desc: "Untuk mengelola operasional harian klinik dengan efisien dan terintegrasi. Sistem ini dirancang khusus untuk memenuhi kebutuhan Bening's Clinic dalam mengoptimalkan layanan kepada pasien, meningkatkan produktivitas staf, dan memastikan kualitas perawatan yang konsisten.",
    detailedCaseStudy: {
      challenge: "Manajemen operasional cabang klinik yang kompleks meliputi antrean pasien, rekam medis tindakan estetika, jadwal dokter, serta pencatatan kasir dan pembayaran EDC harian.",
      solution: "Membangun Clinic Management System terpusat dengan modul kasir multi-payment (Tunai, EDC Mandiri, EDC BRI), monitoring dokter & paramedis pendamping, antrian pasien, serta status pengerjaan treatment.",
      impact: [
        "Efisiensi pencatatan transaksi kasir harian dan rekonsiliasi EDC otomatis",
        "Peningkatan waktu tunggu layanan pasien dan visibilitas jadwal dokter",
        "Standarisasi kualitas perawatan dan pengawasan stok produk klinik"
      ],
      techStack: ["React.js", "Node.js Express", "PostgreSQL", "Role-Based Access Control", "Reporting Engine", "Docker"],
      usersCount: "Multi-Branch Clinics"
    },
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1200&auto=format&fit=crop",
    deviceType: "dashboard",
    accentColor: "#EA580C"
  },
  {
    id: 2,
    name: "Reseller System - Benings Indonesia",
    client: "Benings Indonesia",
    logo: "RESELLER-HUB",
    category: "enterprise",
    tagline: "Platform Kemitraan Penjualan Resmi, Materi Promosi & Pemesanan",
    desc: "Untuk memberikan kesempatan kepada individu atau bisnis untuk menjadi mitra penjualan resmi dari produk-produk Bening's Skincare. Sistem ini memberikan akses kepada reseller untuk menjual produk berkualitas tinggi dengan dukungan penuh dari Bening's Skincare, termasuk pelatihan, materi promosi, dan sistem pemesanan yang efisien.",
    detailedCaseStudy: {
      challenge: "Mengelola ribuan mitra agen dan reseller di seluruh Indonesia yang memerlukan proses pendaftaran cepat, validasi level keagenan, tracking pemesanan produk, dan distribusi materi promosi terpusat.",
      solution: "Mengembangkan portal Reseller Management System dengan dashboard monitoring penjualan, sistem jatuh tempo PO, manajemen stok master data, dan verifikasi otomatis akun mitra baru.",
      impact: [
        "Ribuan mitra agen dan reseller aktif terkoordinasi dalam satu ekosistem",
        "Proses pemesanan dan pengiriman produk skincare menjadi jauh lebih cepat",
        "Transparansi data komisi dan kepastian materi edukasi pemasaran resmi"
      ],
      techStack: ["Vue.js / React", "Laravel API", "MySQL", "Push Notifications", "Payment Gateway", "AWS Cloud"],
      usersCount: "10,000+ Mitra Reseller"
    },
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop",
    deviceType: "dashboard",
    accentColor: "#C2410C"
  },
  {
    id: 3,
    name: "Website Profile - Akademi Komunitas Toyota",
    client: "Akademi Komunitas Toyota Indonesia (AKTI)",
    logo: "AKTI-TOYOTA",
    category: "web",
    tagline: "Platform Informasi Institusi Pendidikan & Pelatihan Industri Otomotif",
    desc: "Website Profil Akademi Komunitas Toyota adalah platform digital yang dirancang untuk memberikan informasi lengkap mengenai institusi pendidikan ini. Website ini berfungsi sebagai sumber informasi utama bagi calon mahasiswa, orang tua, dan mitra industri yang tertarik dengan program pendidikan dan pelatihan yang ditawarkan oleh akademi.",
    detailedCaseStudy: {
      challenge: "Menyajikan reputasi keunggulan kurikulum vokasi otomotif berstandar manufaktur kelas dunia kepada calon mahasiswa, orang tua, dan mitra industri nasional secara informatif dan profesional.",
      solution: "Merancang portal profil digital modern yang menampilkan fasilitas kampus, galeri foto & video beresolusi tinggi, unit bisnis, informasi alumni, serta modul pengumuman dan berita terupdate.",
      impact: [
        "Pusat rujukan resmi informasi program beasiswa dan kurikulum industri otomotif",
        "Meningkatkan interaksi antara calon peserta didik dan manajemen akademi",
        "Desain responsif dan loading cepat untuk akses di berbagai perangkat mobile"
      ],
      techStack: ["Next.js", "Tailwind CSS", "CMS Headless", "Interactive Gallery", "Vercel / Cloudflare"],
      usersCount: "Pusat Edukasi Nasional"
    },
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200&auto=format&fit=crop",
    deviceType: "web",
    accentColor: "#D97706"
  },
  {
    id: 4,
    name: "System Point of Sales (POS)",
    client: "Enterprise Retail & Merchants",
    logo: "CROP-POS",
    category: "custom",
    tagline: "Pemrosesan Transaksi Penjualan Toko Fisik & Online yang Cepat & Akurat",
    desc: "Sistem yang digunakan oleh bisnis untuk memproses transaksi penjualan, baik itu di toko fisik maupun online. Sistem POS memudahkan kasir atau penjual untuk menyelesaikan penjualan, menghitung total pembelian, memproses pembayaran, dan mencetak tanda terima.",
    detailedCaseStudy: {
      challenge: "Toko dan merchant retail memerlukan sistem kasir yang tangguh untuk memproses transaksi dengan cepat saat jam sibuk, sinkronisasi inventaris stok multi-lokasi, dan pencatatan variasi metode pembayaran.",
      solution: "Membangun aplikasi POS multi-platform dengan antarmuka kasir intuitif, penghitungan diskon/pajak otomatis, cetak struk via thermal printer bluetooth/USB, dan laporan penjualan harian real-time.",
      impact: [
        "Kecepatan transaksi kasir meningkat hingga 3x lipat",
        "Pencatatan uang masuk, diskon, kembalian, dan piutang tercatat akurat tanpa selisih",
        "Dukungan pembayaran multi-metode (Cash, Debit, QRIS, Transfer Bank)"
      ],
      techStack: ["React.js", "Electron / Web POS", "Node.js", "SQLite / PostgreSQL", "Thermal ESC/POS Driver", "Cloud Sync"],
      usersCount: "Multi-Store Retailers"
    },
    image: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?q=80&w=1200&auto=format&fit=crop",
    deviceType: "dashboard",
    accentColor: "#F59E0B"
  },
  {
    id: 5,
    name: "Service Center Information System - Dana Pensiun Telkom",
    client: "Dana Pensiun Telkom",
    logo: "DAPEN-TELKOM",
    category: "bumn",
    tagline: "Pengelolaan, Pemantauan & Pelayanan Dana Pensiun Efisien & Transparan",
    desc: "Sistem yang digunakan oleh Dana Pensiun Telkom untuk mengelola, memantau, dan memberikan pelayanan terkait dana pensiun bagi para pensiunan dan karyawan Telkom yang masih aktif. Sistem ini membantu dalam mempermudah administrasi dan pengelolaan dana pensiun, sehingga prosesnya menjadi lebih efisien dan transparan.",
    detailedCaseStudy: {
      challenge: "Pengelolaan data ribuan peserta pensiun dan karyawan aktif Telkom yang tersebar di berbagai wilayah cabang di seluruh Indonesia, termasuk autentikasi data ulang (Datul Mandiri & Non-Mandiri) dan upload bukti pembayaran.",
      solution: "Membangun sistem informasi Service Center Dana Pensiun Telkom dengan Dashboard Datul Nasional, pemantauan status konfirmasi cabang, form verifikasi dokumen, dan sistem arsip digital transparan.",
      impact: [
        "Efisiensi verifikasi ribuan data pensiunan aktif secara aman dan transparan",
        "Pengurangan waktu proses administrasi pelayanan dana pensiun",
        "Akurasi pelaporan data kepesertaan secara real-time untuk audit korporasi"
      ],
      techStack: ["Java Enterprise / Spring", "React Frontend", "Oracle DB / PostgreSQL", "High-Security Auth", "Enterprise Cloud"],
      usersCount: "18,000+ Peserta Terdaftar"
    },
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200&auto=format&fit=crop",
    deviceType: "dashboard",
    accentColor: "#B45309"
  },
  {
    id: 6,
    name: "GRC Apps (Governance, Risk, and Compliance)",
    client: "Corporate & Financial Institutions",
    logo: "GRC-CORP",
    category: "consultant",
    tagline: "Tata Kelola Perusahaan, Manajemen Risiko & Kepatuhan Regulasi",
    desc: "Governance, Risk, and Compliance (GRC) dalam suatu organisasi. GRC adalah pendekatan terpadu untuk mengelola tata kelola perusahaan, risiko, dan kepatuhan terhadap peraturan.\n1. Governance: Memastikan keputusan & kebijakan sesuai tujuan strategis.\n2. Risk Management: Identifikasi, evaluasi, & kelola risiko pencapaian tujuan.\n3. Compliance: Kepatuhan pada peraturan, standar, & kebijakan internal/eksternal.",
    detailedCaseStudy: {
      challenge: "Institusi perbankan dan korporasi skala besar menghadapi kompleksitas audit risiko (RCSA/LED), regulasi OJK/BI yang dinamis, serta perlunya pelaporan kepatuhan terintegrasi bagi jajaran direksi.",
      solution: "Merancang GRC Apps terintegrasi dengan modul Executive View, Dashboard LED & RCSA, charting distribusi potensi risiko, input indikator KRI, dan manajemen akses audit trail yang ketat.",
      impact: [
        "Pengawasan tata kelola perusahaan (GCG) terpantau langsung melalui executive dashboard",
        "Pencegahan dini risiko finansial dan operasional berkat peringatan indikator risiko",
        "Kesiapan audit regulasi eksternal mencapai skor kepatuhan tertinggi"
      ],
      techStack: ["React.js", "TypeScript", "Node.js Microservices", "PostgreSQL", "D3.js Charts", "Audit Log Engine"],
      usersCount: "Enterprise Level"
    },
    image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1200&auto=format&fit=crop",
    deviceType: "dashboard",
    accentColor: "#F97316"
  },
  {
    id: 7,
    name: "Human Resources System (HR System)",
    client: "Multi-Industry Enterprises",
    logo: "HR-SYSTEM",
    category: "custom",
    tagline: "Pengelolaan Karyawan, Payroll, Kehadiran, Rekrutmen & Manajemen Kinerja",
    desc: "Sistem yang digunakan oleh perusahaan untuk mengelola berbagai aspek yang terkait dengan sumber daya manusia. Fungsinya meliputi: 1. Pengelolaan Data Karyawan, 2. Penggajian (Payroll), 3. Keuangan, 4. Manajemen Waktu dan Kehadiran, 5. Rekrutmen, 6. Manajemen Kinerja (PMS), 7. Kontrol Inventaris, dll.",
    detailedCaseStudy: {
      challenge: "Proses administrasi HR manual memakan waktu berharga: kalkulasi gaji/PPH21 rumit, pengajuan cuti & lembur tidak terintegrasi, dan pemantauan kinerja KPI karyawan yang kurang objektif.",
      solution: "Mengembangkan CROP HR System komprehensif yang mencakup modul data karyawan, payroll otomatis dengan slip gaji digital, approval pinjaman/kasbon, manajemen absensi, modul rekrutmen pelamar, tracking proyek, dan evaluasi PMS (Performance Management System).",
      impact: [
        "Otomatisasi siklus penggajian payroll hemat waktu hingga 85%",
        "Transparansi kehadiran, cuti, dan evaluasi kinerja karyawan secara real-time",
        "Integrasi utuh dari rekrutmen hingga pengelolaan inventaris aset kantor"
      ],
      techStack: ["React.js", "Node.js / Express", "PostgreSQL", "Redis", "Payroll Calculation Engine", "PDF Generator"],
      usersCount: "All-in-One HR Hub"
    },
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200&auto=format&fit=crop",
    deviceType: "dashboard",
    accentColor: "#9A3412"
  }
];

export const SERVICES: ServiceItem[] = [
  {
    id: "web-app",
    title: "Web Application Development Services",
    shortDesc: "Jasa pembuatan Web Aplikasi untuk kebutuhan bisnis anda menjadi lebih efektif dan efisien.",
    fullDesc: "Kami merancang dan mengembangkan Web Application berperforma tinggi, responsif, dan aman untuk mengoptimalkan operasional bisnis, meningkatkan keterlibatan pelanggan, dan mempercepat alur kerja perusahaan anda.",
    iconName: "Globe",
    deliverables: [
      "Custom Enterprise Web Applications",
      "Interactive Dashboard & Admin Portals",
      "Cloud Architecture & High-Availability Hosting",
      "API Integration & Database Optimization"
    ],
    techStack: ["React.js", "Next.js", "TypeScript", "Node.js", "PostgreSQL", "Tailwind CSS"]
  },
  {
    id: "mobile-app",
    title: "Mobile Application Development Services",
    shortDesc: "Jasa pembuatan Aplikasi Mobile Android dan iOS.",
    fullDesc: "Pengembangan aplikasi mobile native dan cross-platform untuk Android dan iOS dengan antarmuka UI/UX yang mulus, performa kencang, dan integrasi backend yang andal untuk kebutuhan bisnis maupun publik.",
    iconName: "Smartphone",
    deliverables: [
      "Android & iOS Mobile Application",
      "Cross-Platform Flutter & React Native",
      "Offline-First Data Synchronization",
      "Push Notifications & In-App Payment Integration"
    ],
    techStack: ["React Native", "Flutter", "Kotlin", "Swift", "Firebase", "REST APIs"]
  },
  {
    id: "custom-software",
    title: "Custom Software Development Services",
    shortDesc: "Jasa pembuatan Software Custom yang bisa disesuaikan dengan kebutuhan bisnis anda.",
    fullDesc: "Setiap perusahaan memiliki alur bisnis unik. Kami membangun software khusus yang dirancang presisi sesuai dengan SOP, arsitektur data, dan target produktivitas organisasi anda tanpa batasan solusi template standar.",
    iconName: "Cpu",
    deliverables: [
      "Bespoke Business Process Software",
      "Clinic & POS Management Systems",
      "Automated Workflow & Approval Engines",
      "Legacy System Migration & Modernization"
    ],
    techStack: ["Node.js", "Python", "Go", "PostgreSQL", "Docker", "Microservices"]
  },
  {
    id: "software-product",
    title: "Software Product Development Services",
    shortDesc: "Bekerjasama dengan perusahaan dan berbagai organisasi untuk mengembangkan ide-ide mereka menjadi Aplikasi yang siap dipasarkan.",
    fullDesc: "Mulai dari tahap conceptualization, MVP (Minimum Viable Product), hingga scaling skala penuh. Kami bermitra strategis untuk merealisasikan visi produk digital inovatif anda menjadi aplikasi komersial yang siap bersaing di pasar.",
    iconName: "Package",
    deliverables: [
      "End-to-End Product Roadmap & Prototyping",
      "SaaS Multi-Tenant Architecture",
      "Go-to-Market Ready Digital Products",
      "Scalability & Continuous Feature Iteration"
    ],
    techStack: ["Next.js", "GraphQL", "AWS / Google Cloud", "Stripe / Midtrans", "Redis", "Kafka"]
  },
  {
    id: "application-dev",
    title: "Application Development Services",
    shortDesc: "Buat proses bisnis menjadi lebih sederhana dan efisien dengan bantuan aplikasi dibuat khusus untuk perusahaan anda.",
    fullDesc: "Sederhanakan rantai birokrasi, pemantauan tim, dan pencatatan transaksi manual dengan aplikasi digital yang dirancang khusus untuk memacu efisiensi serta meminimalkan human error di lingkungan kerja anda.",
    iconName: "Layers",
    deliverables: [
      "Enterprise Resource & Inventory Systems",
      "HRMS & Performance Management Hubs",
      "Field Operation & Ticketing Systems",
      "Real-time Data Reporting & Analytics"
    ],
    techStack: ["TypeScript", "Express.js", "MySQL / PostgreSQL", "Tailwind CSS", "Docker"]
  },
  {
    id: "it-consultant",
    title: "IT Management Consultant",
    shortDesc: "Layanan konsultasi untuk mengoptimalkan penggunaan teknologi yang mendukung tujuan bisnis, meningkatkan efisiensi operasional, dan mengatasi tantangan teknologi yang kompleks.",
    fullDesc: "Pendampingan strategis dari konsultan IT berpengalaman untuk audit sistem, perumusan blueprint arsitektur TI, mitigasi risiko (GRC), implementasi keamanan data, dan tata kelola transformasi digital yang berkelanjutan.",
    iconName: "Briefcase",
    deliverables: [
      "IT Strategic Planning & Blueprint",
      "Governance, Risk, and Compliance (GRC)",
      "Cybersecurity & Architecture Audit",
      "Digital Transformation Roadmap & Advisory"
    ],
    techStack: ["Enterprise Architecture", "GRC Frameworks", "ISO/IEC 27001 Advisory", "Cloud Migration Strategy"]
  }
];

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: 0,
    quote: "Pengembangan sistem manajemen dan portal Benings Clinic oleh tim PT CROP Inspirasi Digital memberikan dampak signifikan terhadap efisiensi operasional harian kami. Sistem kasir, rekam layanan, dan pemesanan reseller berjalan sangat stabil, cepat, dan mudah digunakan oleh seluruh staf kami.",
    name: "dr. Oky Pratama, Dipl. AAAM",
    title: "Founder & CEO",
    company: "Bening's Indonesia & Benings Clinic",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
    rating: 5,
    projectTag: "Clinic & Reseller System",
    metrics: "Multi-Branch & 10K+ Reseller"
  },
  {
    id: 1,
    quote: "Kerja sama dengan CROP dalam membangun sistem informasi layanan Dana Pensiun Telkom sangat profesional. Pendekatan berbasis pengetahuan dan dedikasi tim dalam memahami regulasi BUMN membuat proses administrasi kepesertaan pensiunan kami menjadi jauh lebih transparan dan efisien.",
    name: "Ir. Bambang Sugiarto",
    title: "VP of Information Technology",
    company: "Dana Pensiun Telkom",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
    rating: 5,
    projectTag: "Service Center System",
    metrics: "18,000+ Peserta Aktif & Pensiunan"
  },
  {
    id: 2,
    quote: "Website profil dan platform informasi Akademi Komunitas Toyota berhasil mempresentasikan standar vokasi otomotif kelas industri kami dengan sangat apik. Desainnya modern, navigasinya jelas untuk calon mahasiswa, dan tim CROP selalu responsif memberikan solusi terbaik.",
    name: "Wahyudi Prabowo",
    title: "Head of Academic Operations",
    company: "Akademi Komunitas Toyota Indonesia (AKTI)",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
    rating: 5,
    projectTag: "Education Portal",
    metrics: "Official Industrial Campus Hub"
  }
];

export const CLIENT_LOGOS = [
  { name: "Telkom Indonesia", ticker: "TELKOM", logoText: "Telkom Indonesia", color: "#DC2626" },
  { name: "Dapen Telkom", ticker: "DAPEN", logoText: "dapen Telkom", color: "#B91C1C" },
  { name: "Bank BTN", ticker: "BBTN", logoText: "Bank BTN", color: "#0284C7" },
  { name: "Bank Jateng", ticker: "BJTG", logoText: "Bank Jateng", color: "#EA580C" },
  { name: "Indonesia Re", ticker: "REIN", logoText: "Indonesia Re", color: "#047857" },
  { name: "Bening's Jakarta", ticker: "BNGJ", logoText: "BENING'S JAKARTA", color: "#18181B" },
  { name: "Bening's Indonesia", ticker: "BNGI", logoText: "BENING'S INDONESIA", color: "#18181B" },
  { name: "Akademi Komunitas Toyota", ticker: "AKTI", logoText: "AKTI TOYOTA", color: "#7F1D1D" },
  { name: "Universitas Garut (UNIGA)", ticker: "UNIGA", logoText: "Fakultas Ekonomi UNIGA", color: "#CA8A04" },
  { name: "Universitas Bangka Belitung", ticker: "UBB", logoText: "Universitas Bangka Belitung", color: "#1D4ED8" },
  { name: "Bandung Digital Valley", ticker: "BDV", logoText: "bandung digital valley", color: "#0284C7" },
  { name: "Wisata Beasiswa Indonesia", ticker: "WBI", logoText: "WISATA BEASISWA", color: "#EA580C" },
  { name: "Pemerintah Daerah Jawa Barat", ticker: "PEMDA", logoText: "Gemah Ripah Wibawa Mukti", color: "#15803D" }
];

export const OFFICE_LOCATIONS: OfficeLocation[] = [
  {
    id: "headquarters",
    city: "Bandung",
    country: "Indonesia",
    type: "HEAD OFFICE & SOFTWARE DEVELOPMENT CENTER",
    address: "PT CROP INSPIRASI DIGITAL, Bandung, Jawa Barat, Indonesia",
    phone: "+62 22 720 8900",
    whatsapp: "+62 812 2345 6789",
    email: "info@crop.co.id",
    gmapsUrl: "https://maps.google.com/?q=Bandung+Jawa+Barat+Indonesia",
    hours: "Senin - Jumat, 08:30 - 17:30 WIB"
  },
  {
    id: "jakarta",
    city: "Jakarta",
    country: "Indonesia",
    type: "BUSINESS & ENTERPRISE CONSULTING OFFICE",
    address: "Jakarta Business Center, DKI Jakarta, Indonesia",
    phone: "+62 21 5289 8800",
    whatsapp: "+62 812 2345 6789",
    email: "info@crop.co.id",
    gmapsUrl: "https://maps.google.com/?q=Jakarta+Indonesia",
    hours: "Senin - Jumat, 09:00 - 18:00 WIB"
  }
];

export const STATS = [
  { value: "25+", label: "Dedicated Teams", sub: "Engineers & IT Consultants" },
  { value: "45+", label: "Project Done", sub: "Enterprise Web & Apps" },
  { value: "17+", label: "Client Partnerships", sub: "BUMN, Swasta & Perbankan" },
  { value: "2016", label: "Established", sub: "Years of Proven Experience" }
];
