'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useLanguage } from '@/contexts/LanguageContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Pill, Settings, LogOut, ChevronRight, Calendar, LineChart, Users, ScanLine
} from 'lucide-react';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  badge?: number | string;
}

const patientNavItems: NavItem[] = [
  { href: '/dashboard',    labelKey: 'sidebar.dashboard',   icon: LayoutDashboard },
  { href: '/medications',  labelKey: 'sidebar.medications', icon: Pill },
  { href: '/dose-tracker', labelKey: 'sidebar.doseTracker', icon: Calendar },
  { href: '/scan-rx',      labelKey: 'sidebar.scanRx',      icon: ScanLine },
  { href: '/insights',     labelKey: 'sidebar.insights',    icon: LineChart },
  { href: '/settings',     labelKey: 'sidebar.settings',    icon: Settings },
];

const caregiverNavItems: NavItem[] = [
  { href: '/dashboard',  labelKey: 'sidebar.dashboard', icon: LayoutDashboard },
  { href: '/caregiver',  labelKey: 'sidebar.caregiver', icon: Users },
  { href: '/settings',   labelKey: 'sidebar.settings',  icon: Settings },
];

const doctorNavItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard },
  { href: '/doctor',    labelKey: 'sidebar.caregiver', icon: Users },
  { href: '/settings',  labelKey: 'sidebar.settings',  icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { t } = useLanguage();

  const navItems = user?.role === 'caregiver'
    ? caregiverNavItems
    : user?.role === 'doctor'
    ? doctorNavItems
    : patientNavItems;

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    router.push('/login');
  };

  return (
    <aside className="h-full w-64 bg-sidebar border-r border-border flex flex-col shadow-soft overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center space-x-3 px-6 py-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-warm">
          <Pill size={22} className="text-white" />
        </div>
        <span className="text-2xl font-bold text-gradient-dark">
          MediSaathi
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
        {navItems.map(({ href, labelKey, icon: Icon, badge }) => {
          const currentPath = pathname ?? '';
          const active = currentPath === href || (href !== '/dashboard' && currentPath.startsWith(href));
          return (
            <Link key={href} href={href} className="relative block group">
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-primary/10 rounded-2xl border border-primary/20 pointer-events-none"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`relative flex items-center justify-between px-3 py-3 rounded-2xl transition-all duration-300 ${active ? 'text-primary-dark' : 'text-muted hover:text-foreground hover:bg-card/50'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl transition-colors duration-300 ${active ? 'bg-card shadow-sm text-primary' : 'bg-transparent text-muted group-hover:bg-card group-hover:shadow-sm group-hover:text-primary'}`}>
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  </div>
                  <span className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>{t(labelKey)}</span>
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
        <div className="p-3 bg-card rounded-2xl border border-border mb-3 group hover:border-primary/30 transition-colors cursor-pointer shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-bold text-sm border-2 border-card shadow-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-bold truncate group-hover:text-primary transition-colors">{user?.name || 'User'}</p>
              <p className="text-muted text-xs truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-3 py-3 rounded-2xl text-muted hover:bg-danger/10 hover:text-danger transition-all text-sm font-medium"
        >
          <div className="p-2 rounded-xl bg-transparent transition-colors">
            <LogOut size={18} />
          </div>
          <span>{t('sidebar.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
