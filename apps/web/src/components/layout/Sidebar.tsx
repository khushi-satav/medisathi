import Link from 'next/link';
import { Home, Pill, Clock, Activity, Settings, User } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen hidden md:flex">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-blue-400">MediSaathi</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <Link href="/dashboard" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <Home size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/medications" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <Pill size={20} />
          <span>Medications</span>
        </Link>
        <Link href="/history" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <Clock size={20} />
          <span>History</span>
        </Link>
        <Link href="/insights" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <Activity size={20} />
          <span>Insights</span>
        </Link>
        <Link href="/scan-rx" className="flex items-center space-x-3 p-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors mt-4">
          <User size={20} />
          <span>Scan Prescription</span>
        </Link>
      </nav>
      <div className="p-4 border-t border-gray-800">
        <Link href="/settings" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
