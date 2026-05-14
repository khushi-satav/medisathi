'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { insightsService } from '@/services/api';
import { TrendingUp, TrendingDown, Flame, CheckCircle2, XCircle, BarChart3 } from 'lucide-react';

type Period = 7 | 30 | 90;

function BarMini({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex flex-col items-center space-y-1">
      <div className="w-5 bg-slate-100 rounded-sm overflow-hidden" style={{ height: 48 }}>
        <div className={`w-full rounded-sm transition-all duration-700 ${color}`} style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [period, setPeriod] = useState<Period>(30);

  const { data, isLoading } = useQuery({
    queryKey: ['insights', period],
    queryFn: () => insightsService.getStats(period),
  });

  const stats = data?.data ?? {};
  const {
    adherencePercentage = 0,
    totalDoses = 0,
    takenDoses = 0,
    missedDoses = 0,
    skippedDoses = 0,
    currentStreak = 0,
    longestStreak = 0,
    dailyTrend = [],
    byMedication = [],
    aiInsights = [],
    riskLevel = 'unknown',
  } = stats;

  const riskColor: Record<string, string> = {
    low: 'text-emerald-600 bg-emerald-100',
    medium: 'text-amber-600 bg-amber-100',
    high: 'text-red-600 bg-red-100',
    unknown: 'text-slate-500 bg-slate-100',
  };

  const PERIOD_LABELS: Record<number, string> = { 7: '7 Days', 30: '30 Days', 90: '90 Days' };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Health Insights</h1>
          <p className="text-slate-500 text-sm mt-1">Your medication adherence analytics</p>
        </div>
        <div className="flex space-x-1 bg-white border border-slate-200 rounded-xl p-1">
          {([7, 30, 90] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === p ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Adherence', value: `${adherencePercentage}%`, sub: `${period}-day rate`, icon: <TrendingUp size={20} />, color: 'bg-secondary/30 text-primary', bold: adherencePercentage >= 80 ? 'text-emerald-600' : adherencePercentage >= 50 ? 'text-amber-600' : 'text-red-600' },
              { label: 'Total Doses', value: totalDoses, sub: `in ${period} days`, icon: <BarChart3 size={20} />, color: 'bg-slate-100 text-slate-600', bold: 'text-slate-800' },
              { label: 'Taken', value: takenDoses, sub: `${totalDoses ? Math.round(takenDoses / totalDoses * 100) : 0}% of total`, icon: <CheckCircle2 size={20} />, color: 'bg-emerald-100 text-emerald-600', bold: 'text-emerald-700' },
              { label: 'Missed', value: missedDoses, sub: 'doses missed', icon: <XCircle size={20} />, color: 'bg-red-100 text-red-600', bold: missedDoses > 0 ? 'text-red-600' : 'text-slate-800' },
            ].map((kpi, i) => (
              <div key={i} className="card">
                <div className={`p-2.5 rounded-xl ${kpi.color} w-fit mb-3`}>{kpi.icon}</div>
                <p className={`text-2xl font-bold ${kpi.bold}`}>{kpi.value}</p>
                <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
                <p className="text-xs text-slate-400">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Streak + Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card flex items-center space-x-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Flame size={24} className="text-orange-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-800">{currentStreak}<span className="text-base text-slate-400 ml-1">days</span></p>
                <p className="text-sm text-slate-500">Current Streak</p>
                <p className="text-xs text-slate-400">Best: {longestStreak} days</p>
              </div>
            </div>
            <div className="card col-span-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800">Risk Assessment</h3>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${riskColor[riskLevel] || riskColor.unknown}`}>
                  {riskLevel} risk
                </span>
              </div>
              <p className="text-sm text-slate-500">
                {riskLevel === 'low' && '🎉 Great job! Your adherence is excellent. Keep maintaining this streak.'}
                {riskLevel === 'medium' && '⚠️ Moderate adherence detected. Try setting additional reminders.'}
                {riskLevel === 'high' && '🚨 High non-adherence. Consider speaking with your healthcare provider.'}
                {riskLevel === 'unknown' && 'Start logging doses to get your risk assessment.'}
              </p>
            </div>
          </div>

          {/* Daily trend */}
          {dailyTrend.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-4">Daily Adherence Trend</h3>
              <div className="flex items-end justify-between space-x-1 overflow-x-auto pb-2">
                {dailyTrend.slice(-30).map((day: any, i: number) => {
                  const pct = day.adherencePct ?? 0;
                  return (
                    <div key={i} className="flex flex-col items-center min-w-[18px] group relative">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {day.date}: {pct}%
                      </div>
                      <div className="w-4 rounded-t-sm transition-all duration-300"
                        style={{
                          height: `${Math.max(4, pct * 0.6)}px`,
                          background: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : pct === 0 ? '#e2e8f0' : '#ef4444',
                        }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center space-x-4 mt-3 text-xs text-slate-400">
                <div className="flex items-center space-x-1"><div className="w-3 h-3 rounded-sm bg-emerald-500" /><span>≥80%</span></div>
                <div className="flex items-center space-x-1"><div className="w-3 h-3 rounded-sm bg-amber-500" /><span>50–79%</span></div>
                <div className="flex items-center space-x-1"><div className="w-3 h-3 rounded-sm bg-red-500" /><span>&lt;50%</span></div>
                <div className="flex items-center space-x-1"><div className="w-3 h-3 rounded-sm bg-slate-200" /><span>No data</span></div>
              </div>
            </div>
          )}

          {/* Per-medication */}
          {byMedication.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-4">By Medication</h3>
              <div className="space-y-4">
                {byMedication.map((med: any, i: number) => {
                  const pct = med.adherencePercentage ?? 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5 text-sm">
                        <span className="font-medium text-slate-700">{med.name}</span>
                        <span className={`font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{med.taken}/{med.total} doses taken</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {aiInsights.length > 0 && (
            <div className="card bg-gradient-to-br from-secondary/10 to-primary/10 border-secondary-light">
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-2 bg-primary rounded-xl"><TrendingUp size={16} className="text-white" /></div>
                <h3 className="font-bold text-slate-800">AI Recommendations</h3>
                <span className="text-xs bg-secondary/30 text-primary px-2 py-0.5 rounded-full font-semibold">GPT-4o</span>
              </div>
              <ul className="space-y-3">
                {aiInsights.map((insight: string, i: number) => (
                  <li key={i} className="flex items-start space-x-2 text-sm text-slate-700">
                    <span className="text-primary mt-0.5 shrink-0">→</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {totalDoses === 0 && (
            <div className="card text-center py-16">
              <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="font-medium text-slate-500">No data yet for the selected period</p>
              <p className="text-sm text-slate-400 mt-1">Start logging your doses to see insights</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
