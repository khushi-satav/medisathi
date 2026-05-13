import Link from 'next/link';
import { Home, Pill, Clock, Activity, Settings, User } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 glass-sidebar text-text flex flex-col h-screen hidden md:flex">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">MediSaathi</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <Link href="/dashboard" className="nav-link">
          <Home size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/medications" className="nav-link">
          <Pill size={20} />
          <span>Medications</span>
        </Link>
        <Link href="/history" className="nav-link">
          <Clock size={20} />
          <span>History</span>
        </Link>
        <Link href="/insights" className="nav-link">
          <Activity size={20} />
          <span>Insights</span>
        </Link>
        <Link href="/scan-rx" className="nav-link mt-4 !bg-primary !text-white hover:!bg-primary-dark !font-semibold">
          <User size={20} />
          <span>Scan Prescription</span>
        </Link>
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
