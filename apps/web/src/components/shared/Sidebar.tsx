'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Pill, Activity, Settings,
  LogOut, ChevronRight, User, MessageSquare, Calendar
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',       label: 'Home',         icon: LayoutDashboard },
  { href: '/dose-tracker',    label: 'Schedule',     icon: Calendar },
  { href: '/messages',        label: 'Messages',     icon: MessageSquare },
  { href: '/settings',        label: 'Account',      icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 gradient-primary flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center space-x-3 px-6 py-6">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
          <Pill size={20} className="text-white" />
        </div>
        <span className="text-xl font-bold text-white">MediSaathi</span>
      </div>

      {/* User card */}
      <div className="mx-4 mb-4 p-3 bg-white/10 rounded-xl border border-white/20">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.name || 'User'}</p>
            <p className="text-indigo-200 text-xs truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-white/20 text-white'
                  : 'text-indigo-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon size={18} />
                <span>{label}</span>
              </div>
              {active && <ChevronRight size={14} className="opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 space-y-1 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl text-indigo-200 hover:bg-white/10 hover:text-white transition-all text-sm font-medium"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
