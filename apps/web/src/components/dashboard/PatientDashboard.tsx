'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { doseLogsService, insightsService, aiService } from '@/services/api';
import { CheckCircle2, Clock, AlertCircle, Flame, Pill, TrendingUp, ChevronRight, Activity, Users, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function AdherenceRing({ pct }: { pct: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const colorLight = pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171';
  
  return (
    <div className="relative flex items-center justify-center">
      <svg width={120} height={120} className="rotate-[-90deg] drop-shadow-lg">
        <circle cx={60} cy={60} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={8} />
        <circle cx={60} cy={60} r={r} fill="none" stroke="url(#ring-gradient)" strokeWidth={8}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={colorLight} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-2xl font-bold tracking-tighter">{pct}%</span>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  taken:    'bg-emerald-50/60 border-emerald-100',
  missed:   'bg-red-50/60 border-red-100',
  skipped:  'bg-amber-50/60 border-amber-100',
  pending:  'bg-blue-50/60 border-blue-100',
  overdue:  'bg-orange-50/60 border-orange-100',
  upcoming: 'bg-background/60 border-border',
};

const PILL_COLORS: Record<string, string> = {
  taken: 'bg-emerald-100 text-emerald-700', 
  missed: 'bg-red-100 text-red-700', 
  skipped: 'bg-amber-100 text-amber-700',
  pending: 'bg-blue-100 text-blue-700', 
  overdue: 'bg-orange-100 text-orange-700', 
  upcoming: 'bg-border text-muted',
};

const DOT_COLORS: Record<string, string> = {
  taken: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]', 
  missed: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]', 
  skipped: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
  pending: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]', 
  overdue: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]', 
  upcoming: 'bg-muted',
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function PatientDashboard() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: scheduleData, isLoading: schedLoading } = useQuery({
    queryKey: ['dose-today'],
    queryFn: () => doseLogsService.getToday(),
    refetchInterval: 60000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['insights-7'],
    queryFn: () => insightsService.getStats(7),
  });

  const logDose = useMutation({
    mutationFn: (payload: any) => doseLogsService.log(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dose-today'] });
      qc.invalidateQueries({ queryKey: ['insights-7'] });
      toast.success('✅ Dose recorded!');
    },
    onError: () => toast.error('Failed to log dose'),
  });

  const schedule = scheduleData?.data?.schedule ?? [];
  const todayStats = scheduleData?.data?.stats ?? { total: 0, taken: 0, missed: 0, adherencePct: 0 };
  const insights = statsData?.data ?? {};
  const streak = insights.currentStreak ?? 0;
  const weekAdh = insights.adherencePercentage ?? 0;

  const upcoming = schedule.filter((d: any) => ['pending', 'overdue', 'upcoming'].includes(d.status)).slice(0, 3);
  const taken    = schedule.filter((d: any) => d.status === 'taken').length;

  return (
    <div className="space-y-6 md:space-y-8 max-w-[1400px] mx-auto w-full">
      {/* ─── Header Hero ───────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2rem] gradient-primary shadow-elevated">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-white/20 to-transparent rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 mix-blend-screen" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-secondary/40 to-transparent rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4 mix-blend-screen" />
        </div>
        
        <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="z-10">
            <motion.p 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="text-white/80 text-sm font-semibold tracking-wide uppercase mb-2 flex items-center"
            >
              <Activity size={16} className="mr-2" />
              {greeting()}, {user?.name?.split(' ')[0] || 'Friend'}
            </motion.p>
            
            <div className="mt-2">
              {schedLoading ? (
                <div className="h-10 w-48 bg-white/20 animate-pulse rounded-xl mt-2" />
              ) : schedule.length === 0 ? (
                <Link href="/medications" className="block cursor-pointer group">
                  <p className="text-white/80 text-sm font-medium mb-1">Get started</p>
                  <h2 className="text-white text-3xl md:text-4xl font-extrabold tracking-tight flex items-center">
                    Add your first medication <ChevronRight size={28} className="ml-2 transition-transform group-hover:translate-x-1" />
                  </h2>
                  <p className="text-white/70 text-sm mt-2">Tap here to set up your schedule</p>
                </Link>
              ) : (
                <div>
                  <p className="text-white/80 text-sm font-medium mb-1">Today's progress</p>
                  <h2 className="text-white text-3xl md:text-4xl font-extrabold tracking-tight">
                    {taken} <span className="text-white/60 text-2xl font-semibold">/ {todayStats.total} doses taken</span>
                  </h2>
                  {upcoming.length > 0 ? (
                    <div className="mt-4 flex items-center bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2 w-fit border border-white/20">
                      <Clock size={16} className="text-white/90 mr-2" />
                      <p className="text-white text-sm font-medium">
                        Next: <span className="font-bold">{upcoming[0].medicationName}</span> at {upcoming[0].scheduledTime}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2 w-fit border border-white/20">
                      <CheckCircle2 size={16} className="text-emerald-300 mr-2" />
                      <p className="text-white text-sm font-medium">All doses taken today!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="hidden sm:block z-10 shrink-0">
            <AdherenceRing pct={todayStats.adherencePct ?? 0} />
          </div>
        </div>
      </motion.div>

      {/* ─── Stat cards ───────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: "Today's Doses", value: `${taken}/${todayStats.total}`, icon: <Pill size={22} />, color: 'bg-primary/10 text-primary', border: 'border-primary/20' },
          { label: 'Taken Today',   value: taken, icon: <CheckCircle2 size={22} />, color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
          { label: 'Missed Today',  value: todayStats.missed, icon: <AlertCircle size={22} />, color: 'bg-red-100 text-red-700', border: 'border-red-200' },
          { label: '7-Day Streak',  value: `${streak}d 🔥`, icon: <Flame size={22} />, color: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
        ].map((s, i) => (
          <div key={i} className={`bg-card rounded-2xl shadow-sm border border-border p-4 flex items-center space-x-4 border-b-4 hover:border-b-[4px] ${s.border} transition-all`}>
            <div className={`p-3.5 rounded-2xl ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-muted text-xs font-bold uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ─── Body ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        
        {/* Today's schedule */}
        <motion.div variants={itemVariants} className="xl:col-span-2 bg-card rounded-3xl shadow-card border border-border overflow-hidden flex flex-col h-full">
          <div className="p-6 md:p-8 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Today&apos;s Schedule</h2>
              <p className="text-sm text-muted mt-1">Stay on top of your regimen</p>
            </div>
            <Link href="/dose-tracker" className="text-sm text-primary font-bold hover:text-primary-dark transition-colors flex items-center bg-secondary/20 px-4 py-2 rounded-2xl">
              Full tracker <ChevronRight size={16} className="ml-1" />
            </Link>
          </div>

          <div className="p-6 md:p-8 flex-1 bg-background/50">
            {schedLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton h-20 rounded-2xl" />
                ))}
              </div>
            ) : schedule.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-muted">
                <div className="w-20 h-20 bg-border rounded-full flex items-center justify-center mb-4">
                  <Pill size={40} className="text-muted/50" />
                </div>
                <p className="font-bold text-foreground text-xl">No medications scheduled</p>
                <p className="text-base text-muted max-w-xs mt-2 mb-6">Your schedule for today is completely clear.</p>
                <Link href="/medications" className="btn-primary flex items-center py-2 px-6">
                  <Pill size={18} className="mr-2" /> Add Medication
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {schedule.slice(0, 6).map((dose: any, i: number) => (
                    <motion.div 
                      key={dose._id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className={`group flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all hover:shadow-md ${STATUS_COLORS[dose.status] || 'bg-card border-border hover:border-primary/30'}`}
                    >
                      <div className="flex items-start sm:items-center space-x-4 mb-4 sm:mb-0">
                        <div className={`mt-1 sm:mt-0 w-3.5 h-3.5 rounded-full shrink-0 ${DOT_COLORS[dose.status] || 'bg-muted'}`} />
                        <div>
                          <p className="font-bold text-foreground text-lg">{dose.medicationName}</p>
                          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-sm text-muted font-medium mt-1">
                            <span className="flex items-center text-foreground bg-background px-2.5 py-0.5 rounded-md border border-border shadow-sm"><Clock size={14} className="mr-1.5 text-primary" /> {dose.scheduledTime}</span>
                            <span>•</span>
                            <span>{dose.dosage}</span>
                            {dose.foodInstruction && (
                              <>
                                <span>•</span>
                                <span className="text-secondary-dark bg-secondary/20 px-2 py-0.5 rounded-md">{dose.foodInstruction}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-3 pl-7 sm:pl-0">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${PILL_COLORS[dose.status] || 'bg-border text-muted'}`}>
                          {dose.status}
                        </span>
                        {['pending', 'overdue', 'upcoming'].includes(dose.status) && (
                          <button
                            onClick={() => logDose.mutate({ medicationId: dose.medicationId, status: 'taken', scheduledTime: dose.scheduledTime })}
                            disabled={logDose.isPending}
                            className="bg-primary hover:bg-primary-dark text-white shadow-warm hover:shadow-elevated text-sm font-bold py-2.5 px-6 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                          >
                            Take Now
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* Right column */}
        <div className="space-y-6 md:space-y-8 flex flex-col h-full">
          {/* Weekly adherence */}
          <div className="bg-card rounded-3xl shadow-card border border-border p-6 md:p-8">
            <h3 className="font-bold text-foreground text-xl mb-6">Weekly Adherence</h3>
            <div className="flex items-end justify-between">
              <div className="text-5xl font-black text-foreground tracking-tight">{weekAdh}<span className="text-2xl text-muted font-bold ml-1">%</span></div>
            </div>
            <div className="pt-4">
              <div className="h-4 bg-border rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${weekAdh}%` }}
                  className={`h-full ${weekAdh >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
              </div>
            </div>
          </div>
          <AIRiskCard />
          <CaregiverLoginCard />
        </div>
      </div>
    </div>
  );
}

function CaregiverLoginCard() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleCaregiverLogin = () => {
    logout();
    router.push('/login?role=caregiver');
  };

  return (
    <motion.div 
      variants={itemVariants}
      className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-900/10 rounded-3xl shadow-sm border border-blue-100 dark:border-blue-900/30 p-6 md:p-8 relative overflow-hidden"
    >
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-200/20 rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 bg-blue-500/10 rounded-xl">
            <Users size={22} className="text-blue-600" />
          </div>
          <h3 className="font-bold text-foreground text-xl tracking-tight">Caregiver Access</h3>
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed font-medium">
          Are you monitoring this patient? Switch to the caregiver portal to track doses and receive alerts.
        </p>
        
        <button 
          onClick={handleCaregiverLogin}
          className="w-full group bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-blue-600 font-bold py-3.5 px-4 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
        >
          <LogIn size={18} className="transition-transform group-hover:translate-x-0.5" />
          <span>Caregiver Login</span>
        </button>
      </div>
    </motion.div>
  );
}

function AIRiskCard() {
  const { data: riskData, isLoading } = useQuery({
    queryKey: ['ai-predict'],
    queryFn: () => aiService.predict(),
  });

  const prediction = riskData?.data;
  const level = prediction?.riskLevel || 'LOW';
  
  return (
    <div className="bg-card rounded-3xl shadow-card border border-border p-6 md:p-8">
      <div className="flex items-center space-x-2 mb-6">
        <Activity size={20} className="text-primary" />
        <h3 className="font-bold text-foreground text-xl">AI Risk Analysis</h3>
      </div>
      {isLoading ? <div className="h-20 bg-border animate-pulse rounded-xl" /> : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-muted uppercase tracking-wider">Risk Level</span>
            <span className="text-xs font-black px-3 py-1 rounded-full border border-primary/20 text-primary">{level}</span>
          </div>
          <div className="bg-background/50 rounded-2xl p-4 border border-border">
            <p className="text-sm font-semibold">{prediction?.recommendation || "Everything looks good!"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
