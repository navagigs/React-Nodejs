import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard'; // Ini bertindak sebagai LAYOUT (Sidebar + Header)
import DashboardHome from './pages/DashboardHome'; // Ini ISI Dashboard (Grafik/Statistik)
import Portfolio from './pages/Portfolio'; // Ini ISI Portfolio
import Letter from './pages/Letter'; 
 import ProjectDocument from './pages/ProjectDocument'; // -> Diimport dengan huruf kapital 'L'
import OrderDetail from './OrderDetail';
import Clients from './pages/Clients'; 
import Category from './pages/Category'; 
import News from './pages/News'; 
import MenuManagement from './pages/MenuManagement'; 
import LandingPageCrop from './LandingPageCrop copy';  

function App() {
  return (
    <Router>
      <Routes>
      <Route path="/" element={<LandingPageCrop />} />

        {/* 1. Halaman Login */}
        <Route path="/login" element={<Login />} />

        {/* 2. BINGKAI UTAMA (Layout Dashboard) */}
        {/* Perhatikan: Tidak ada 'path' di Route pembungkus ini */}
        <Route element={<Dashboard />}>
            
            {/* Jika URL /dashboard -> Tampilkan Grafik */}
            <Route path="/dashboard" element={<DashboardHome />} />
            

            {/* Jika URL /clients -> Tampilkan Tabel clients */}
            <Route path="/clients" element={<Clients />} />

            {/* Jika URL /project-documents -> Tampilkan Tabel project documents */}
            <Route path="/project-documents" element={<ProjectDocument />} />
 
            {/* Jika URL /letter -> Tampilkan Tabel letter */}
            <Route path="/letter" element={<Letter />} />

            {/* Jika URL /portfolio -> Tampilkan Tabel Portfolio */}
            <Route path="/portfolio" element={<Portfolio />} />


            {/* Jika URL /category -> Tampilkan Tabel category */}
            <Route path="/category" element={<Category />} />

            {/* Jika URL /news -> Tampilkan Tabel news */}
            <Route path="/news" element={<News />} />


            <Route path="/menu" element={<MenuManagement />} />

            {/* Jika URL /OrderDetail -> Tampilkan Tabel OrderDetail */} 
            <Route path="/orders/detail" element={<OrderDetail />} />
            
        </Route>

        {/* Redirect jika halaman tidak ditemukan */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;