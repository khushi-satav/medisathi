'use client';

import { useState, useEffect } from 'react';
import { Search, Bell, Sparkles, User, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function TopNavbar({ onOpenAIChat }: { onOpenAIChat: () => void }) {
  const [time, setTime] = useState(new Date());
  const { user, logout } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();

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
    <header className="sticky top-0 z-20 hidden md:flex items-center justify-between px-8 py-4 bg-white/70 backdrop-blur-md border-b border-slate-100/50">
      {/* Left side: Clock and greeting */}
      <div className="flex items-center space-x-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Hello, {user?.name?.split(' ')[0] || 'Friend'} 👋</h2>
          <p className="text-sm font-medium text-slate-500">{format(time, "EEEE, MMMM do yyyy | h:mm a")}</p>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center space-x-5">
        {/* Search */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search medications..."
            className="w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* AI Assistant Button */}
        <button 
          onClick={onOpenAIChat}
          className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 text-primary hover:from-indigo-100 hover:to-purple-100 transition-all shadow-sm shadow-primary/5 border border-primary/10"
        >
          <Sparkles size={16} className="text-secondary" />
          <span className="text-sm font-semibold">Ask AI</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger ring-2 ring-white" />
        </button>

        {/* User Profile */}
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-2 p-1 rounded-full hover:bg-slate-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm shadow-sm">
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
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-sm font-bold text-slate-800 truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                </div>
                <div className="p-2">
                  <button onClick={() => router.push('/settings')} className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary rounded-xl transition-colors">
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-xl transition-colors mt-1">
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
