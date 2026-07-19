'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import GlobalSearch from '@/components/layout/GlobalSearch';
import NotificationBell from '@/components/layout/NotificationBell';
import { useLanguage } from '@/contexts/LanguageContext';
import { DATE_FNS_LOCALE_MAP } from '@/lib/i18n';

export default function TopNavbar({ onOpenAIChat }: { onOpenAIChat: () => void }) {
  const [time, setTime] = useState(new Date());
  const { user, logout } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();
  const { lang, t } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-20 hidden md:flex items-center justify-between px-8 py-4 bg-background/80 backdrop-blur-md border-b border-border/60">
      {/* Left side: Clock and greeting */}
      <div className="flex items-center space-x-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Hello, {user?.name?.split(' ')[0] || 'Friend'} 👋
          </h2>
          <p className="text-sm font-medium text-muted">
            {format(time, lang === 'en' ? 'EEEE, MMMM do yyyy | h:mm a' : 'EEEE, d MMMM yyyy | h:mm a', { locale: DATE_FNS_LOCALE_MAP[lang] })}
          </p>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center space-x-4">
        {/* Patient-specific features */}
        {user?.role !== 'caregiver' && (
          <>
            {/* Global Search */}
            <GlobalSearch />

            {/* AI Assistant Button */}
            <button
              onClick={onOpenAIChat}
              className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-secondary/20 to-primary/20 text-primary-dark hover:from-secondary/30 hover:to-primary/30 transition-all shadow-sm shadow-primary/5 border border-primary/15"
            >
              <Sparkles size={16} className="text-primary" />
              <span className="text-sm font-semibold">{t('common.askAI')}</span>
            </button>
          </>
        )}

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-2 p-1 rounded-full hover:bg-card transition-colors border border-transparent hover:border-border"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm shadow-warm">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-56 bg-card rounded-2xl shadow-elevated border border-border overflow-hidden"
              >
                <div className="p-4 border-b border-border bg-sidebar/50">
                  <p className="text-sm font-bold text-foreground truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted truncate mt-0.5">{user?.email}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 bg-primary/10 text-primary-dark text-[10px] font-black uppercase tracking-widest rounded-md">
                    {user?.role || 'Patient'}
                  </span>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => { router.push('/settings'); setIsProfileOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-muted hover:bg-sidebar hover:text-primary-dark rounded-xl transition-colors"
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-xl transition-colors mt-1"
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
