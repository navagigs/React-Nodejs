import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard'; // Ini bertindak sebagai LAYOUT (Sidebar + Header)
import DashboardHome from './pages/DashboardHome'; // Ini ISI Dashboard (Grafik/Statistik)
import Portfolio from './pages/Portfolio'; // Ini ISI Portfolio
import Letter from './pages/Letter'; 
 import ProjectDocument from './pages/ProjectDocument'; //  
import Clients from './pages/Clients'; 
import Category from './pages/Category'; 
import News from './pages/News'; 
import MenuManagement from './pages/MenuManagement'; 
import RoleManagement from './pages/RoleManagement'; 
import UserManagement from './pages/UserManagement'; 
import ModuleAuthority from './pages/ModuleAuthority'; 
import LandingPageCrop from './LandingPageCrop';  

function App() {
  return (
    <Router>
      <Routes>
      <Route path="/" element={<LandingPageCrop />} />
      {/* <Route path="/" element={<Login />} /> */}

        {/* 1. Halaman Login */}
        <Route path="/login" element={<Login />} />

        {/* 2. BINGKAI UTAMA (Layout Dashboard) */}
        {/* Perhatikan: Tidak ada 'path' di Route pembungkus ini */}
        <Route element={<Dashboard />}>
            
            {/* Jika URL /dashboard -> Tampilkan Grafik */}
            <Route path="/dashboard" element={<DashboardHome />} />
            

            {/* Jika URL /clients -> Tampilkan Tabel clients */}
            <Route path="internal/clients" element={<Clients />} />

            {/* Jika URL /project-documents -> Tampilkan Tabel project documents */}
            <Route path="internal/project-documents" element={<ProjectDocument />} />
 
            {/* Jika URL /letter -> Tampilkan Tabel letter */}
            <Route path="internal/letter" element={<Letter />} />

            {/* Jika URL /portfolio -> Tampilkan Tabel Portfolio */}
            <Route path="internal/portfolio" element={<Portfolio />} />


            {/* Jika URL /category -> Tampilkan Tabel category */}
            <Route path="/category" element={<Category />} />

            {/* Jika URL /news -> Tampilkan Tabel news */}
            <Route path="/news" element={<News />} />


            <Route path="/hak-akses/menu" element={<MenuManagement />} />
            <Route path="/hak-akses/role" element={<RoleManagement />} />
            <Route path="/hak-akses/user" element={<UserManagement />} />
            <Route path="/hak-akses/module-authority" element={<ModuleAuthority />} />
 
            
        </Route>

        {/* Redirect jika halaman tidak ditemukan */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;