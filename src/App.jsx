import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Pill, 
  Upload, 
  Users, 
  Settings, 
  Bell, 
  Menu, 
  X, 
  Mic, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  History,
  LogOut 
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Medications from './pages/Medications';
import PrescriptionUpload from './pages/PrescriptionUpload';
import CaregiverView from './pages/CaregiverView';
import SettingsPage from './pages/Settings';
import HistoryPage from './pages/History';
import Login from './pages/Login';


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState({ name: 'Patient User', email: '' });

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };
  const logout = () => {
    setIsAuthenticated(false);
    setUser({ name: 'Patient User', email: '' });
  };

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
        {/* Mobile Navbar */}
        <div className="md:hidden glass fixed top-0 w-full z-50 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Pill className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-primary">MediSathi</span>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar Navigation (Desktop) */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 sticky top-0 h-screen p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Pill className="text-white w-6 h-6" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-gray-900">MediSathi</span>
          </div>

          <nav className="flex-1 space-y-2">
            <NavItem to="/" icon={<LayoutDashboard />} label="Dashboard" />
            <NavItem to="/medications" icon={<Pill />} label="Medications" />
            <NavItem to="/history" icon={<History />} label="History" />
            <NavItem to="/upload" icon={<Upload />} label="OCR Scan" />
            <NavItem to="/caregiver" icon={<Users />} label="Caregiver" />
          </nav>

          <div className="mt-auto pt-6 border-t border-gray-100">
            <NavItem to="/settings" icon={<Settings />} label="Settings" />
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-red-500 hover:bg-red-50 font-medium"
            >
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
            <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Daily Goal</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">85% Adherence</span>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
          <header className="hidden md:flex h-20 items-center justify-end px-8 bg-white/50 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <button className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <div className="h-8 w-px bg-gray-200 mx-2"></div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">ID: #MS-2026</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-teal-400 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs">
                   {user.name.split(' ').map(n => n[0]).join('')}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto pt-20 md:pt-0">
            <div className="max-w-6xl mx-auto p-4 md:p-8">
              <Routes>
                <Route path="/" element={<Dashboard userName={user.name} />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/medications" element={<Medications />} />
                <Route path="/upload" element={<PrescriptionUpload />} />
                <Route path="/caregiver" element={<CaregiverView />} />
                <Route path="/settings" element={<SettingsPage user={user} onLogout={logout} />} />
              </Routes>
            </div>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 w-full glass z-50 px-6 py-3 flex justify-between items-center border-t border-gray-100">
          <MobileNavItem to="/" icon={<LayoutDashboard />} />
          <MobileNavItem to="/history" icon={<History />} />
          <MobileNavItem to="/medications" icon={<Pill />} />
          <div className="relative -top-8">
             <Link to="/upload" className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-white active:scale-90 transition-all">
                <Mic className="w-6 h-6" />
             </Link>
          </div>
          <MobileNavItem to="/caregiver" icon={<Users />} />
          <button onClick={logout} className="p-2 text-red-400">
             <LogOut size={24} />
          </button>
        </nav>
      </div>
    </Router>
  );
}

function NavItem({ to, icon, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        isActive 
          ? 'bg-primary text-white shadow-lg shadow-primary/20' 
          : 'text-gray-500 hover:bg-primary/5 hover:text-primary'
      }`}
    >
      <span className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`}>
        {React.cloneElement(icon, { size: 20 })}
      </span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function MobileNavItem({ to, icon }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link to={to} className={`p-2 transition-all ${isActive ? 'text-primary' : 'text-gray-400'}`}>
      {React.cloneElement(icon, { size: 24, strokeWidth: isActive ? 2.5 : 2 })}
    </Link>
  );
}

export default App;
