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
import MenuManagement from './pages/MenuManagement'; 
import RoleManagement from './pages/RoleManagement'; 
import UserManagement from './pages/UserManagement'; 
import ModuleAuthority from './pages/ModuleAuthority'; 
import Articles from './pages/Article'; // Import halaman Articles
import AppConfiguration from './pages/AppConfiguration';
import QrCodeGenerator from './pages/QrCodeGenerator';
import PdfTools from './pages/PdfTools';
import AiPhotoFilter from './pages/AiPhotoFilter';
import BackupData from './pages/BackupData';
import ActivityLog from './pages/ActivityLog';
import VerifyLetter from './pages/VerifyLetter';
import MarketingDashboard from './pages/MarketingDashboard';
import MarketingContacts from './pages/MarketingContacts';
import MarketingGroups from './pages/MarketingGroups';
import MarketingEmail from './pages/MarketingEmail';
import MarketingWhatsApp from './pages/MarketingWhatsApp';
import MarketingCampaigns from './pages/MarketingCampaigns';
import MarketingTemplates from './pages/MarketingTemplates';
import MarketingAnalytics from './pages/MarketingAnalytics';
import MarketingSettings from './pages/MarketingSettings';
import FinanceDashboard from './pages/finance/FinanceDashboard';
import FinanceTransactions from './pages/finance/FinanceTransactions';
import FinancePayroll from './pages/finance/FinancePayroll';
import FinanceCash from './pages/finance/FinanceCash';
import FinanceBudgets from './pages/finance/FinanceBudgets';
import FinanceAssets from './pages/finance/FinanceAssets';
import FinanceDebts from './pages/finance/FinanceDebts';
import FinanceAccounting from './pages/finance/FinanceAccounting';
import FinanceReports from './pages/finance/FinanceReports';
import FinanceSettings from './pages/finance/FinanceSettings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/verify-letter" element={<VerifyLetter />} />
        {/* <Route path="/" element={<Login />} /> */}

 

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

            {/* Jika URL /article -> Tampilkan Tabel article */}
            <Route path="/articles" element={<Articles />} />


            <Route path="/hak-akses/menu" element={<MenuManagement />} />
            <Route path="/hak-akses/role" element={<RoleManagement />} />
            <Route path="/hak-akses/user" element={<UserManagement />} />
            <Route path="/hak-akses/module-authority" element={<ModuleAuthority />} />

            <Route path="setting" element={<AppConfiguration />} />

            <Route path="qr-code" element={<QrCodeGenerator />} />
            <Route path="pdf-tools" element={<PdfTools />} />
            <Route path="ai-photo-filter" element={<AiPhotoFilter />} />
            <Route path="backup" element={<BackupData />} />
            <Route path="backup/housekeeping" element={<BackupData />} />
            <Route path="backup/log" element={<ActivityLog />} />

            <Route path="marketing-center/dashboard" element={<MarketingDashboard />} />
            <Route path="marketing-center/contacts" element={<MarketingContacts />} />
            <Route path="marketing-center/groups" element={<MarketingGroups />} />
            <Route path="marketing-center/email" element={<MarketingEmail />} />
            <Route path="marketing-center/whatsapp" element={<MarketingWhatsApp />} />
            <Route path="marketing-center/campaigns" element={<MarketingCampaigns />} />
            <Route path="marketing-center/templates" element={<MarketingTemplates />} />
            <Route path="marketing-center/analytics" element={<MarketingAnalytics />} />
            <Route path="marketing-center/settings" element={<MarketingSettings />} />

            <Route path="finance" element={<Navigate to="/finance/dashboard" replace />} />
            <Route path="finance/dashboard" element={<FinanceDashboard />} />
            <Route path="finance/incomes" element={<FinanceTransactions />} />
            <Route path="finance/expenses" element={<FinanceTransactions />} />
            <Route path="finance/payroll" element={<FinancePayroll />} />
            <Route path="finance/cash" element={<FinanceCash />} />
            <Route path="finance/budgets" element={<FinanceBudgets />} />
            <Route path="finance/assets" element={<FinanceAssets />} />
            <Route path="finance/debts" element={<FinanceDebts />} />
            <Route path="finance/receivables" element={<FinanceDebts />} />
            <Route path="finance/accounting" element={<Navigate to="/finance/accounts" replace />} />
            <Route path="finance/accounts" element={<FinanceAccounting />} />
            <Route path="finance/journals" element={<FinanceAccounting />} />
            <Route path="finance/ledger" element={<FinanceAccounting />} />
            <Route path="finance/trial-balance" element={<FinanceAccounting />} />
            <Route path="finance/reports" element={<FinanceReports />} />
            <Route path="finance/reports/profit-loss" element={<FinanceReports />} />
            <Route path="finance/reports/balance-sheet" element={<FinanceReports />} />
            <Route path="finance/reports/cash-flow" element={<FinanceReports />} />
            <Route path="finance/reports/equity" element={<FinanceReports />} />
            <Route path="finance/settings" element={<FinanceSettings />} />
            <Route path="finance/approvals" element={<FinanceSettings />} />
            <Route path="finance/audit" element={<FinanceSettings />} />

            
        </Route>

        {/* Redirect jika halaman tidak ditemukan */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;