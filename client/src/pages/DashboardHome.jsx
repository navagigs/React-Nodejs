import React from 'react';
import * as Icons from 'lucide-react'; 

const DashboardHome = () => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {/* --- BAGIAN ATAS: 2 KARTU UTAMA --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. KARTU DAILY OVERVIEW (PERBAIKAN WARNA TEKS) */}
        <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 overflow-hidden flex flex-col justify-between h-64 group cursor-default transition-transform hover:scale-[1.02]">
            
            {/* Dekorasi Background */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 opacity-20 rounded-full blur-xl"></div>

            <div className="relative z-10 flex justify-between items-start">
                <div>
                    {/* SAYA UBAH JADI text-white/90 AGAR LEBIH JELAS */}
                    <h3 className="font-medium text-white/90 mb-1">Total Users</h3>
                    <span className="text-4xl font-bold tracking-tight text-white">5,461</span>
                </div>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Icons.Users className="w-6 h-6 text-white" />
                </div>
            </div>

            <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-2">
                    <span className="bg-emerald-400/20 text-emerald-100 border border-emerald-400/30 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                        <Icons.TrendingUp className="w-3 h-3" /> +25%
                    </span>
                    <span className="text-xs text-white/80">vs yesterday</span>
                 </div>
                
                {/* Progress Bar */}
                <div className="flex justify-between text-xs text-white/90 mb-1 mt-4">
                    <span>Target</span>
                    <span>70%</span>
                </div>
                <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                    <div className="bg-white h-full rounded-full w-[70%] shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                </div>
            </div>
        </div>

        {/* 2. GRAFIK PERFORMANCE (Sama seperti sebelumnya) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-64">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">Website Performance</h3>
                    <p className="text-sm text-gray-400">Traffic statistics over the last year</p>
                </div>
                <select className="text-sm border-gray-200 border rounded-lg px-3 py-1 text-gray-500 focus:outline-none focus:border-indigo-500 cursor-pointer hover:bg-gray-50">
                    <option>Last 12 Months</option>
                    <option>Last 30 Days</option>
                    <option>Last 7 Days</option>
                </select>
            </div>

            <div className="flex-1 w-full relative overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 900 300">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <line x1="0" y1="75" x2="900" y2="75" stroke="#f3f4f6" strokeWidth="2" strokeDasharray="5,5" />
                    <line x1="0" y1="150" x2="900" y2="150" stroke="#f3f4f6" strokeWidth="2" strokeDasharray="5,5" />
                    <line x1="0" y1="225" x2="900" y2="225" stroke="#f3f4f6" strokeWidth="2" strokeDasharray="5,5" />
                    <path d="M0,200 C100,180 200,100 300,120 C400,140 500,60 600,90 C700,120 800,40 900,60 V300 H0 Z" fill="url(#chartGradient)" />
                    <path d="M0,200 C100,180 200,100 300,120 C400,140 500,60 600,90 C700,120 800,40 900,60" stroke="#6366f1" strokeWidth="4" fill="none" strokeLinecap="round"/>
                    <circle cx="300" cy="120" r="6" fill="white" stroke="#6366f1" strokeWidth="3" />
                    <circle cx="600" cy="90" r="6" fill="white" stroke="#6366f1" strokeWidth="3" />
                    <circle cx="900" cy="60" r="6" fill="white" stroke="#6366f1" strokeWidth="3" />
                </svg>
                <div className="absolute bottom-0 w-full flex justify-between text-xs text-gray-400 px-2">
                    <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
                </div>
            </div>
        </div>
      </div>

      {/* --- BAGIAN BAWAH: QUICK STATS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Revenue" value="$12,426" trend="+12%" isPositive={true} icon={Icons.DollarSign} color="bg-emerald-50 text-emerald-600" />
          <StatCard title="Bounce Rate" value="42.3%" trend="-5%" isPositive={false} icon={Icons.Activity} color="bg-orange-50 text-orange-600" />
           <StatCard title="Active Sessions" value="1,203" trend="+8%" isPositive={true} icon={Icons.Monitor} color="bg-blue-50 text-blue-600" />
      </div>

    </div>
  );
};

const StatCard = ({ title, value, trend, isPositive, icon: Icon, color }) => {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <h4 className="text-2xl font-bold text-gray-800">{value}</h4>
                </div>
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {trend}
                </span>
                <span className="text-xs text-gray-400">Since last month</span>
            </div>
        </div>
    );
}

export default DashboardHome;