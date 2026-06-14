'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/shared/Sidebar';
import MobileTabBar from '@/components/layout/MobileTabBar';
import AIChatAssistant from '@/components/shared/AIChatAssistant';
import { Menu, MessageSquare, X, Bell } from 'lucide-react';
import TopNavbar from '@/components/layout/TopNavbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
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
      {/* ── Desktop Sidebar ─────────────────────────── */}
      <div className="hidden md:block w-64 shrink-0 shadow-soft z-30">
        <Sidebar />
      </div>

      {/* ── Mobile Sidebar Overlay ───────────────────── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* drawer */}
          <div className="relative w-72 max-w-[80vw] z-50 animate-in slide-in-from-left duration-300">
            <Sidebar />
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* Mobile top header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-30 shadow-sm"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors active:scale-95"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C96B3B] to-[#E8B08A] flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-bold">M</span>
              </div>
              <span className="text-base font-bold text-[#4B2E2B]">MediSaathi</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.role !== 'caregiver' && (
              <button
                onClick={() => setChatOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#C96B3B]/10 text-[#C96B3B] active:scale-95 transition-all"
              >
                <MessageSquare size={18} />
              </button>
            )}
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Bell size={18} />
            </div>
          </div>
        </div>

        {/* Desktop Top Navbar */}
        <TopNavbar onOpenAIChat={() => setChatOpen(!chatOpen)} />

        {/* Page content — extra bottom padding for mobile tab bar */}
        <div className="flex-1 overflow-y-auto page-enter p-4 pb-24 md:p-8 md:pb-8">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Tab Bar ────────────────────── */}
      <MobileTabBar />

      {/* ── AI Chat FAB (Patient only) ───────────────── */}
      {user?.role !== 'caregiver' && (
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 flex flex-col items-end">
          {chatOpen && (
            <div className="mb-4 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 w-[calc(100vw-2rem)] max-w-[400px]">
              <div className="relative">
                <button
                  onClick={() => setChatOpen(false)}
                  className="absolute top-4 right-4 z-20 p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                >
                  <X size={16} />
                </button>
                <AIChatAssistant />
              </div>
            </div>
          )}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`p-4 rounded-full shadow-xl text-white transition-all duration-300 active:scale-95 ${
              chatOpen
                ? 'bg-slate-800 hover:bg-slate-700 rotate-0 hover:rotate-90'
                : 'bg-gradient-to-r from-[#C96B3B] to-[#E8B08A] hover:shadow-[0_8px_24px_rgba(201,107,59,0.45)] hover:scale-105'
            }`}
          >
            {chatOpen ? <X size={22} /> : <MessageSquare size={22} />}
          </button>
        </div>
      )}
    </div>
  );
}
