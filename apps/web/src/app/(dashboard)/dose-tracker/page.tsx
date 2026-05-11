'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doseLogsService } from '@/services/api';
import { CheckCircle2, XCircle, AlertCircle, Clock, ChevronLeft, ChevronRight, Pill, SkipForward } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = ['taken', 'missed', 'skipped', 'pending', 'overdue', 'upcoming'];
const STATUS_META: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
  taken:    { label: 'Taken',    bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  missed:   { label: 'Missed',   bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700',     dot: 'bg-red-500' },
  skipped:  { label: 'Skipped',  bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  pending:  { label: 'Pending',  bg: 'bg-blue-50',     border: 'border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  overdue:  { label: 'Overdue',  bg: 'bg-orange-50',   border: 'border-orange-200',  text: 'text-orange-700',  dot: 'bg-orange-500' },
  upcoming: { label: 'Upcoming', bg: 'bg-slate-50',    border: 'border-slate-200',   text: 'text-slate-600',   dot: 'bg-slate-400' },
  snoozed:  { label: 'Snoozed',  bg: 'bg-purple-50',   border: 'border-purple-200',  text: 'text-purple-700',  dot: 'bg-purple-500' },
};

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}
function dateLabel(d: Date) {
  const today = formatDate(new Date());
  const yest  = formatDate(new Date(Date.now() - 86400000));
  const s = formatDate(d);
  if (s === today) return 'Today';
  if (s === yest)  return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
}

export default function DoseTrackerPage() {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [skipReason, setSkipReason] = useState('');
  const [skippingId, setSkippingId] = useState<string | null>(null);

  const dateStr = formatDate(selectedDate);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dose-tracker', dateStr],
    queryFn: () => doseLogsService.getToday(dateStr),
  });

  const schedule = data?.data?.schedule ?? [];
  const stats    = data?.data?.stats ?? { total: 0, taken: 0, missed: 0, adherencePct: 0 };

  const logDose = useMutation({
    mutationFn: (payload: any) => doseLogsService.log(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dose-tracker', dateStr] });
      qc.invalidateQueries({ queryKey: ['dose-today'] });
      toast.success('Dose logged!');
      setSkippingId(null);
      setSkipReason('');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to log'),
  });

  const changeDate = (delta: number) => {
    const nd = new Date(selectedDate);
    nd.setDate(nd.getDate() + delta);
    if (nd <= new Date()) setSelectedDate(nd);
  };

  const isFuture = formatDate(selectedDate) > formatDate(new Date());

  const groups = STATUSES.reduce((acc, s) => {
    const items = schedule.filter((d: any) => d.status === s);
    if (items.length) acc[s] = items;
    return acc;
  }, {} as Record<string, any[]>);

  const adherencePct = stats.adherencePct ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header / Date Nav */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dose Tracker</h1>
          <p className="text-slate-500 text-sm mt-1">Log and track your daily doses</p>
        </div>
        <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <span className="px-3 font-semibold text-slate-800 min-w-[110px] text-center text-sm">
            {dateLabel(selectedDate)}
          </span>
          <button onClick={() => changeDate(1)} disabled={formatDate(selectedDate) >= formatDate(new Date())}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-800' },
          { label: 'Taken', value: stats.taken, color: 'text-emerald-600' },
          { label: 'Missed', value: stats.missed, color: 'text-red-600' },
          { label: 'Adherence', value: `${adherencePct}%`, color: adherencePct >= 80 ? 'text-emerald-600' : adherencePct >= 50 ? 'text-amber-600' : 'text-red-600' },
        ].map((s, i) => (
          <div key={i} className="card text-center py-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {stats.total > 0 && (
        <div className="card py-4">
          <div className="flex justify-between text-sm font-medium text-slate-600 mb-2">
            <span>Progress</span>
            <span>{stats.taken} / {stats.total} doses</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${
              adherencePct >= 80 ? 'bg-emerald-500' : adherencePct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${adherencePct}%` }} />
          </div>
        </div>
      )}

      {/* Schedule */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : schedule.length === 0 ? (
        <div className="card text-center py-16">
          <Pill size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="font-medium text-slate-600">No medications scheduled for this day</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([status, items]) => {
            const meta = STATUS_META[status] || STATUS_META.upcoming;
            return (
              <div key={status}>
                <div className="flex items-center space-x-2 mb-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${meta.text}`}>{meta.label}</h3>
                  <span className="text-xs text-slate-400">({(items as any[]).length})</span>
                </div>
                <div className="space-y-3">
                  {(items as any[]).map((dose: any) => {
                    const isSkipping = skippingId === dose._id;
                    return (
                      <div key={dose._id}
                        className={`rounded-2xl border p-4 transition-all ${meta.bg} ${meta.border}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm border border-white">
                              <Pill size={20} className={meta.text} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{dose.medicationName}</p>
                              <p className="text-xs text-slate-500 flex items-center mt-0.5">
                                <Clock size={11} className="mr-1" />
                                {dose.scheduledTime} · {dose.dosage}
                              </p>
                              {dose.takenAt && (
                                <p className="text-xs text-emerald-600 mt-0.5">
                                  ✓ Taken at {new Date(dose.takenAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          {['pending', 'overdue', 'upcoming'].includes(dose.status) && !isSkipping && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setSkippingId(dose._id)}
                                className="btn-secondary text-xs py-1.5 px-3 flex items-center space-x-1">
                                <SkipForward size={13} /><span>Skip</span>
                              </button>
                              <button
                                onClick={() => logDose.mutate({ medicationId: dose.medicationId, status: 'taken', scheduledTime: dose.scheduledTime })}
                                disabled={logDose.isPending}
                                className="btn-primary text-xs py-1.5 px-4 flex items-center space-x-1">
                                <CheckCircle2 size={13} /><span>Take</span>
                              </button>
                            </div>
                          )}
                          {dose.status === 'taken' && <CheckCircle2 size={22} className="text-emerald-500" />}
                          {dose.status === 'missed' && <XCircle size={22} className="text-red-400" />}
                          {dose.status === 'skipped' && <AlertCircle size={22} className="text-amber-400" />}
                        </div>

                        {/* Skip reason form */}
                        {isSkipping && (
                          <div className="mt-3 pt-3 border-t border-amber-200">
                            <input className="input text-sm mb-2" placeholder="Reason for skipping (optional)"
                              value={skipReason} onChange={e => setSkipReason(e.target.value)} />
                            <div className="flex space-x-2">
                              <button onClick={() => { setSkippingId(null); setSkipReason(''); }} className="btn-secondary text-xs flex-1">Cancel</button>
                              <button
                                onClick={() => logDose.mutate({ medicationId: dose.medicationId, status: 'skipped', scheduledTime: dose.scheduledTime, skipReason })}
                                disabled={logDose.isPending}
                                className="btn-primary text-xs flex-1">
                                Confirm Skip
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
