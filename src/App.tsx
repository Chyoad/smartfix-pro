import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Menu, Smartphone } from 'lucide-react';
import { UserProfile } from './types';

import Dashboard from './components/Dashboard';
import ServiceTracking from './components/ServiceTracking';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Login from './components/Login';
import Navigation from './components/Navigation';
import EmployeeManagement from './components/EmployeeManagement';
import Reports from './components/Reports';
import Assets from './components/Assets';
import Payments from './components/Payments';
import DetailedReports from './components/DetailedReports';
import WarrantyManagement from './components/WarrantyManagement';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('erp_session');
    if (savedUser) {
      setProfile(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (username: string) => {
    const mockProfile: UserProfile = {
      uid: 'admin-1',
      email: 'admin@smartphone.com',
      displayName: 'System Administrator',
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    sessionStorage.setItem('erp_session', JSON.stringify(mockProfile));
    setProfile(mockProfile);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('erp_session');
    setProfile(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Memuat Sistem Servis Handphone...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
        <Navigation 
          profile={profile} 
          onLogout={handleLogout} 
          isMobileOpen={isMobileNavOpen} 
          onCloseMobile={() => setIsMobileNavOpen(false)} 
        />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-bold text-white text-sm">SMARTPHONE</h2>
            </div>
            <button 
              onClick={() => setIsMobileNavOpen(true)}
              className="p-2 text-slate-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/services" element={<ServiceTracking profile={profile} />} />
            <Route path="/payments" element={<Payments profile={profile} />} />
            <Route path="/pos" element={<POS profile={profile} />} />
            <Route path="/inventory" element={<Inventory profile={profile} />} />
            <Route path="/employees" element={<EmployeeManagement />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/detailed-reports" element={<DetailedReports />} />
            <Route path="/warranty" element={<WarrantyManagement profile={profile} />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  </BrowserRouter>
  );
}
