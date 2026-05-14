import Link from 'next/link';
import { Home, Pill, Clock, Activity, Settings, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function Sidebar() {
  const { user } = useAuthStore();
  const isCaregiver = user?.role === 'caregiver';

  return (
    <aside className="w-64 glass-sidebar text-text flex flex-col h-screen hidden md:flex border-r border-border/50">
      <div className="p-8">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shadow-sm">
            <Pill size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">MediSaathi</h1>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1.5">
        <Link href="/dashboard" className="nav-link flex items-center space-x-3 px-4 py-3 rounded-2xl hover:bg-secondary/20 transition-all font-medium text-muted hover:text-primary">
          <Home size={20} />
          <span>Dashboard</span>
        </Link>
        
        {isCaregiver ? (
          <>
            <Link href="/caregiver/patients" className="nav-link flex items-center space-x-3 px-4 py-3 rounded-2xl hover:bg-secondary/20 transition-all font-medium text-muted hover:text-primary">
              <User size={20} />
              <span>My Patients</span>
            </Link>
            <Link href="/caregiver/alerts" className="nav-link flex items-center space-x-3 px-4 py-3 rounded-2xl hover:bg-secondary/20 transition-all font-medium text-muted hover:text-primary">
              <Activity size={20} />
              <span>Safety Alerts</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/medications" className="nav-link flex items-center space-x-3 px-4 py-3 rounded-2xl hover:bg-secondary/20 transition-all font-medium text-muted hover:text-primary">
              <Pill size={20} />
              <span>Medications</span>
            </Link>
            <Link href="/history" className="nav-link flex items-center space-x-3 px-4 py-3 rounded-2xl hover:bg-secondary/20 transition-all font-medium text-muted hover:text-primary">
              <Clock size={20} />
              <span>Dose History</span>
            </Link>
            <Link href="/insights" className="nav-link flex items-center space-x-3 px-4 py-3 rounded-2xl hover:bg-secondary/20 transition-all font-medium text-muted hover:text-primary">
              <Activity size={20} />
              <span>Health Insights</span>
            </Link>
            <Link href="/scan-rx" className="flex items-center space-x-3 px-4 py-3.5 mt-4 rounded-2xl bg-primary text-white shadow-warm hover:shadow-elevated transition-all font-bold">
              <Activity size={20} />
              <span>Scan Prescription</span>
            </Link>
          </>
        )}
      </nav>
      <div className="p-4 border-t border-border">
        <Link href="/settings" className="nav-link">
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
