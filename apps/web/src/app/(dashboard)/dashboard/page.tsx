'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { doseLogsService, insightsService } from '@/services/api';
import { CheckCircle2, Clock, AlertCircle, Flame, Pill, TrendingUp, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

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
  return (
    <svg width={110} height={110} className="rotate-[-90deg]">
      <circle cx={55} cy={55} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10} />
      <circle cx={55} cy={55} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={55} y={59} textAnchor="middle" fontSize={18} fontWeight="700"
        fill={color} className="rotate-90 origin-center" style={{ transform: 'rotate(90deg)', transformOrigin: '55px 55px' }}>
        {pct}%
      </text>
    </svg>
  );
}

const STATUS_COLORS: Record<string, string> = {
  taken:    'bg-emerald-50 border-emerald-200',
  missed:   'bg-red-50 border-red-200',
  skipped:  'bg-amber-50 border-amber-200',
  pending:  'bg-blue-50 border-blue-200',
  overdue:  'bg-orange-50 border-orange-200',
  upcoming: 'bg-slate-50 border-slate-200',
};
const PILL_COLORS: Record<string, string> = {
  taken: 'status-taken', missed: 'status-missed', skipped: 'status-skipped',
  pending: 'status-pending', overdue: 'status-overdue', upcoming: 'status-upcoming',
};
const DOT_COLORS: Record<string, string> = {
  taken: 'bg-emerald-500', missed: 'bg-red-500', skipped: 'bg-amber-500',
  pending: 'bg-blue-500', overdue: 'bg-orange-500', upcoming: 'bg-slate-400',
};

export default function DashboardPage() {
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
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-medium">{greeting()}</p>
            <h1 className="text-3xl font-bold mt-1">{user?.name?.split(' ')[0] || 'Friend'} 👋</h1>
            <p className="text-indigo-200 mt-2 text-sm">
              {schedLoading ? '…' : todayStats.total === 0
                ? 'No medications scheduled today'
                : todayStats.total - todayStats.taken === 0
                  ? '🎉 All doses taken today!'
                  : `${todayStats.total - todayStats.taken} dose${todayStats.total - todayStats.taken > 1 ? 's' : ''} remaining today`}
            </p>
          </div>
          <div className="hidden sm:block">
            <AdherenceRing pct={todayStats.adherencePct ?? 0} />
          </div>
        </div>
      </div>

      {/* ─── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Doses", value: `${taken}/${todayStats.total}`, icon: <Pill size={20} />, color: 'bg-indigo-100 text-indigo-600' },
          { label: 'Taken Today',   value: taken, icon: <CheckCircle2 size={20} />, color: 'bg-emerald-100 text-emerald-600' },
          { label: 'Missed Today',  value: todayStats.missed, icon: <AlertCircle size={20} />, color: 'bg-red-100 text-red-600' },
          { label: '7-Day Streak',  value: `${streak}d 🔥`, icon: <Flame size={20} />, color: 'bg-orange-100 text-orange-600' },
        ].map((s, i) => (
          <div key={i} className="card flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-slate-500 text-xs font-medium">{s.label}</p>
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Body ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's schedule */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-800">Today&apos;s Schedule</h2>
            <Link href="/dose-tracker" className="text-sm text-indigo-600 font-medium hover:underline flex items-center">
              Full tracker <ChevronRight size={14} />
            </Link>
          </div>

          {schedLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : schedule.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Pill size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No medications scheduled</p>
              <Link href="/medications" className="text-indigo-600 text-sm mt-2 inline-block hover:underline">
                Add your first medication →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {schedule.slice(0, 6).map((dose: any) => (
                <div key={dose._id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${STATUS_COLORS[dose.status] || 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${DOT_COLORS[dose.status] || 'bg-slate-400'}`} />
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{dose.medicationName}</p>
                      <p className="text-xs text-slate-500 flex items-center mt-0.5">
                        <Clock size={11} className="mr-1" />
                        {dose.scheduledTime} · {dose.dosage}
                        {dose.foodInstruction && ` · ${dose.foodInstruction}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PILL_COLORS[dose.status] || 'status-upcoming'}`}>
                      {dose.status.charAt(0).toUpperCase() + dose.status.slice(1)}
                    </span>
                    {['pending', 'overdue', 'upcoming'].includes(dose.status) && (
                      <button
                        onClick={() => logDose.mutate({ medicationId: dose.medicationId, status: 'taken', scheduledTime: dose.scheduledTime })}
                        disabled={logDose.isPending}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        Take
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Weekly adherence */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800">7-Day Adherence</h3>
              <TrendingUp size={18} className="text-emerald-500" />
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-4xl font-bold text-slate-800">{weekAdh}<span className="text-lg text-slate-400">%</span></div>
              <div className="flex-1">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${weekAdh >= 80 ? 'bg-emerald-500' : weekAdh >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${weekAdh}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  {weekAdh >= 80 ? '🌟 Excellent!' : weekAdh >= 50 ? '👍 Keep going' : '⚠️ Needs attention'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/scan-rx" className="flex items-center space-x-3 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors group">
                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                  <Zap size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Scan Prescription</p>
                  <p className="text-xs text-slate-500">AI-powered extraction</p>
                </div>
                <ChevronRight size={16} className="ml-auto text-slate-400 group-hover:text-indigo-600" />
              </Link>
              <Link href="/medications" className="flex items-center space-x-3 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors group">
                <div className="p-2 bg-emerald-600 rounded-lg text-white">
                  <Pill size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Manage Medications</p>
                  <p className="text-xs text-slate-500">Add, edit, or remove</p>
                </div>
                <ChevronRight size={16} className="ml-auto text-slate-400 group-hover:text-emerald-600" />
              </Link>
              <Link href="/insights" className="flex items-center space-x-3 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors group">
                <div className="p-2 bg-purple-600 rounded-lg text-white">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">View Insights</p>
                  <p className="text-xs text-slate-500">Trends & analytics</p>
                </div>
                <ChevronRight size={16} className="ml-auto text-slate-400 group-hover:text-purple-600" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
