'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import toast from 'react-hot-toast';
import {
  Users, Activity, Bell, CheckCircle2, XCircle, Clock, AlertTriangle,
  TrendingUp, Pill, Phone, RefreshCw, ChevronRight, Heart,
} from 'lucide-react';

/* ─── Types ────────────────────────────────────────────────────────────── */
interface PatientSummary {
  _id: string;
  name: string;
  age?: number;
  phone?: string;
  conditions: { name: string }[];
  todayAdherence?: number;
  streak?: number;
  missedToday?: number;
  lastSeen?: string;
  riskLevel?: 'low' | 'medium' | 'high';
}

const RISK_CONFIG = {
  low:    { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Low Risk' },
  medium: { color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'At Risk'  },
  high:   { color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'High Risk'},
};

/* ─── Patient Card ─────────────────────────────────────────────────────── */
function PatientCard({ p, onEscalate }: { p: PatientSummary; onEscalate: (id: string, name: string) => void }) {
  const adherence = p.todayAdherence ?? 0;
  const risk = p.riskLevel ?? (adherence >= 80 ? 'low' : adherence >= 50 ? 'medium' : 'high');
  const riskCfg = RISK_CONFIG[risk];
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (adherence / 100) * circumference;

  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${riskCfg.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
            {p.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800">{p.name}</p>
            <p className="text-xs text-slate-500">
              {p.age ? `${p.age} yrs · ` : ''}{p.phone || 'No phone'}
            </p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${riskCfg.bg} ${riskCfg.color} border ${riskCfg.border}`}>
          {riskCfg.label}
        </span>
      </div>

      {/* Adherence ring + stats */}
      <div className="flex items-center space-x-5 mb-4">
        <div className="relative w-14 h-14 shrink-0">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#f1f5f9" strokeWidth="5" />
            <circle
              cx="24" cy="24" r="20" fill="none"
              stroke={risk === 'low' ? '#10b981' : risk === 'medium' ? '#f59e0b' : '#ef4444'}
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-slate-700">{adherence}%</span>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="text-center bg-slate-50 rounded-xl py-2">
            <p className="text-lg font-bold text-slate-800">{p.streak ?? 0}</p>
            <p className="text-xs text-slate-500">day streak</p>
          </div>
          <div className="text-center bg-slate-50 rounded-xl py-2">
            <p className={`text-lg font-bold ${(p.missedToday ?? 0) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
              {p.missedToday ?? 0}
            </p>
            <p className="text-xs text-slate-500">missed today</p>
          </div>
        </div>
      </div>

      {/* Conditions */}
      {p.conditions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {p.conditions.slice(0, 3).map((c, i) => (
            <span key={i} className="text-xs bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-full">
              {c.name}
            </span>
          ))}
          {p.conditions.length > 3 && (
            <span className="text-xs text-slate-400">+{p.conditions.length - 3} more</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {risk !== 'low' && (
          <button
            onClick={() => onEscalate(p._id, p.name)}
            className="flex-1 flex items-center justify-center space-x-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 py-2 px-3 rounded-xl hover:bg-red-100 transition-colors"
          >
            <Phone size={13} />
            <span>Escalate Call</span>
          </button>
        )}
        <button className="flex-1 flex items-center justify-center space-x-1.5 text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-100 py-2 px-3 rounded-xl hover:bg-violet-100 transition-colors">
          <Activity size={13} />
          <span>View Details</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Main Caregiver Page ──────────────────────────────────────────────── */
export default function CaregiverPage() {
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuthStore();

  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [escalating, setEscalating]   = useState<string | null>(null);

  // Demo data fallback for presentation
  const DEMO_PATIENTS: PatientSummary[] = [
    {
      _id: 'demo-1', name: 'Sunita Devi', age: 68, phone: '+91 98765 43210',
      conditions: [{ name: 'Diabetes (Type 2)' }, { name: 'Hypertension' }],
      todayAdherence: 33, streak: 2, missedToday: 2, riskLevel: 'high',
    },
    {
      _id: 'demo-2', name: 'Ramesh Kumar', age: 74, phone: '+91 87654 32109',
      conditions: [{ name: 'Heart Disease' }, { name: 'Thyroid' }],
      todayAdherence: 67, streak: 5, missedToday: 1, riskLevel: 'medium',
    },
    {
      _id: 'demo-3', name: 'Meera Singh', age: 55, phone: '+91 76543 21098',
      conditions: [{ name: 'Asthma' }],
      todayAdherence: 100, streak: 14, missedToday: 0, riskLevel: 'low',
    },
  ];

  const fetchPatients = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/caregiver/patients');
      setPatients(res.data.patients?.length ? res.data.patients : DEMO_PATIENTS);
    } catch {
      // Use demo data for presentation purposes
      setPatients(DEMO_PATIENTS);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    fetchPatients();
    const interval = setInterval(() => fetchPatients(true), 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleEscalate = async (patientId: string, name: string) => {
    setEscalating(patientId);
    try {
      await api.post('/escalation', {
        patientId,
        message: `Alert: ${name} has missed multiple doses today. Please check on them immediately.`,
      });
      toast.success(`Escalation call initiated for ${name}`);
    } catch {
      toast.error('Escalation call failed — check Twilio configuration');
    } finally {
      setEscalating(null);
    }
  };

  // Summary stats
  const totalPatients = patients.length;
  const highRisk    = patients.filter(p => (p.riskLevel ?? 'low') === 'high').length;
  const mediumRisk  = patients.filter(p => (p.riskLevel ?? 'low') === 'medium').length;
  const avgAdherence = patients.length
    ? Math.round(patients.reduce((s, p) => s + (p.todayAdherence ?? 0), 0) / patients.length)
    : 0;

  if (!isAuthenticated) return null;

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Users size={22} className="text-violet-600" />
            <h1 className="text-2xl font-extrabold text-slate-800">Caregiver Dashboard</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Monitoring {totalPatients} patient{totalPatients !== 1 ? 's' : ''} · Last updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={() => fetchPatients(true)}
          disabled={refreshing}
          className="flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-4 py-2 rounded-xl transition-colors hover:bg-slate-50"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Patients', value: totalPatients, icon: <Users size={18} />, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'High Risk',      value: highRisk,      icon: <AlertTriangle size={18} />, color: 'text-red-600',    bg: 'bg-red-50'    },
          { label: 'At Risk',        value: mediumRisk,    icon: <Clock size={18} />,         color: 'text-amber-600',  bg: 'bg-amber-50'  },
          { label: 'Avg Adherence',  value: `${avgAdherence}%`, icon: <TrendingUp size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="text-2xl font-extrabold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alerts banner */}
      {highRisk > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start space-x-3 mb-6">
          <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">
              {highRisk} patient{highRisk > 1 ? 's' : ''} at high risk today
            </p>
            <p className="text-red-600 text-xs mt-0.5">
              They have missed 2+ consecutive doses. Consider calling them or triggering an escalation.
            </p>
          </div>
        </div>
      )}

      {/* Patient grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-full skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton w-3/4 rounded" />
                  <div className="h-3 skeleton w-1/2 rounded" />
                </div>
              </div>
              <div className="h-14 skeleton rounded-xl" />
              <div className="h-8 skeleton rounded-xl" />
            </div>
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart size={28} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No patients linked yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Patients can link you as their caregiver from their MediSaathi Settings page.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {patients.map(p => (
            <PatientCard
              key={p._id}
              p={p}
              onEscalate={handleEscalate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
