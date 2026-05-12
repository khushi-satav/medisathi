'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Pill, Activity, Settings,
  LogOut, ChevronRight, User, MessageSquare, Calendar, Bell, LineChart, Users
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',       label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/medications',     label: 'Medications',  icon: Pill },
  { href: '/dose-tracker',    label: 'Tracker',      icon: Calendar },
  { href: '/insights',        label: 'AI Insights',  icon: LineChart },
  { href: '/caregiver',       label: 'Caregiver',    icon: Users },
  { href: '/messages',        label: 'Messages',     icon: MessageSquare, badge: 2 },
  { href: '/settings',        label: 'Settings',     icon: Settings },
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
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-slate-100 flex flex-col z-30 shadow-soft">
      {/* Logo */}
      <div className="flex items-center space-x-3 px-6 py-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
          <Pill size={22} className="text-white" />
        </div>
        <span className="text-2xl font-bold bg-gradient-to-r from-primary-dark to-secondary-dark bg-clip-text text-transparent">
          MediSaathi
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className="relative block group">
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-primary/10 rounded-2xl"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`relative flex items-center justify-between px-3 py-3 rounded-2xl transition-all duration-300 ${active ? 'text-primary' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl transition-colors duration-300 ${active ? 'bg-white shadow-sm text-primary' : 'bg-transparent text-slate-400 group-hover:bg-white group-hover:shadow-sm group-hover:text-primary'}`}>
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  </div>
                  <span className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                </div>
                {badge && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white shadow-sm shadow-danger/30">
                    {badge}
                  </span>
                )}
                {active && !badge && <ChevronRight size={14} className="opacity-70" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 mt-auto">
        {/* User card */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-3 group hover:border-primary/20 transition-colors cursor-pointer">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-primary font-bold text-sm border border-white shadow-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-800 text-sm font-bold truncate group-hover:text-primary transition-colors">{user?.name || 'User'}</p>
              <p className="text-slate-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-3 py-3 rounded-2xl text-slate-500 hover:bg-danger/10 hover:text-danger transition-all text-sm font-medium"
        >
          <div className="p-2 rounded-xl bg-transparent transition-colors">
            <LogOut size={18} />
          </div>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
