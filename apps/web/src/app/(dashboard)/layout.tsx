'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/shared/Sidebar';
import MobileTabBar from '@/components/layout/MobileTabBar';
import AIChatAssistant from '@/components/shared/AIChatAssistant';
import { Menu, MessageSquare, X } from 'lucide-react';
import TopNavbar from '@/components/layout/TopNavbar';
import { useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-64 shrink-0 shadow-soft z-30">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 z-50">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
              <Menu size={22} />
            </button>
            <span className="ml-3 text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">MediSaathi</span>
          </div>
          <button onClick={() => setChatOpen(true)} className="p-2 rounded-full bg-primary/10 text-primary">
            <MessageSquare size={20} />
          </button>
        </div>

        {/* Desktop Top Navbar */}
        <TopNavbar onOpenAIChat={() => setChatOpen(!chatOpen)} />

        <div className="flex-1 overflow-y-auto page-enter pb-24 md:pb-8 p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <MobileTabBar />

      {/* AI Chat Floating Action */}
      <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 flex flex-col items-end">
        {chatOpen && (
          <div className="mb-4 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 w-[350px] md:w-[400px]">
            <div className="relative">
              <button 
                onClick={() => setChatOpen(false)}
                className="absolute top-4 right-4 z-20 p-1 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
              >
                <X size={16} />
              </button>
              <AIChatAssistant />
            </div>
          </div>
        )}
        <button 
          onClick={() => setChatOpen(!chatOpen)}
          className={`md:hidden p-4 rounded-full shadow-xl text-white transition-all duration-300 ${chatOpen ? 'bg-slate-800 hover:bg-slate-700 hover:rotate-90' : 'bg-gradient-to-r from-primary to-secondary hover:shadow-primary/50 hover:scale-105'}`}
        >
          {chatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>
    </div>
  );
}
