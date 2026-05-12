'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import api from '@/services/api';
import {
  Pill, Heart, Users, UserPlus, ChevronRight, ChevronLeft,
  CheckCircle2, Plus, Trash2, ArrowRight, Sparkles, Phone, Scan,
} from 'lucide-react';

/* ─── Types ────────────────────────────────────────────────────────────── */
interface Condition   { name: string; severity: string }
interface Contact     { name: string; phone: string; relationship: string; isPrimary: boolean }

const STEPS = [
  { id: 1, label: 'Welcome',   icon: <Sparkles size={16} /> },
  { id: 2, label: 'Health',    icon: <Heart size={16} /> },
  { id: 3, label: 'Emergency', icon: <Phone size={16} /> },
  { id: 4, label: 'Caregiver', icon: <Users size={16} /> },
];

const CONDITIONS_LIST = [
  'Diabetes (Type 2)', 'Hypertension', 'Asthma', 'Heart Disease',
  'Thyroid', 'Arthritis', 'Depression / Anxiety', 'COPD', 'Kidney Disease', 'Other',
];
const RELATIONSHIPS = ['Parent', 'Child', 'Spouse', 'Sibling', 'Friend', 'Doctor', 'Other'];
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
];

/* ─── Step Components ───────────────────────────────────────────────────── */
function StepWelcome({ name }: { name: string }) {
  return (
    <div className="text-center py-4">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-violet-500/30">
        <Pill size={36} className="text-white" />
      </div>
      <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
        Namaste, {name?.split(' ')[0]} 🙏
      </h2>
      <p className="text-slate-500 text-lg leading-relaxed mb-8 max-w-sm mx-auto">
        Let's set up your <strong className="text-slate-700">MediSaathi</strong> profile so we can give you
        the most personalised medication experience.
      </p>
      <div className="space-y-3 text-left max-w-xs mx-auto">
        {[
          { icon: <Heart size={16} className="text-rose-500" />, text: 'Your health conditions' },
          { icon: <Phone size={16} className="text-blue-500" />, text: 'Emergency contact details' },
          { icon: <Users size={16} className="text-violet-500" />, text: 'Link your caregiver (optional)' },
          { icon: <Scan size={16} className="text-emerald-500" />, text: 'Then scan your first prescription!' },
        ].map((item, i) => (
          <div key={i} className="flex items-center space-x-3 text-sm text-slate-600">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">{item.icon}</div>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepHealth({
  conditions, setConditions, language, setLanguage,
}: {
  conditions: Condition[]; setConditions: (c: Condition[]) => void;
  language: string; setLanguage: (l: string) => void;
}) {
  const toggle = (name: string) => {
    const exists = conditions.find(c => c.name === name);
    if (exists) setConditions(conditions.filter(c => c.name !== name));
    else setConditions([...conditions, { name, severity: 'moderate' }]);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Health Profile</h2>
      <p className="text-slate-500 text-sm mb-6">This helps AI personalise your reminders and insights.</p>

      <div className="mb-6">
        <label className="label">Preferred Language for Reminders</label>
        <div className="grid grid-cols-3 gap-2">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLanguage(l.code)}
              className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                language === l.code
                  ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                  : 'border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Medical Conditions (select all that apply)</label>
        <div className="grid grid-cols-2 gap-2">
          {CONDITIONS_LIST.map(c => {
            const active = conditions.some(x => x.name === c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                className={`flex items-center space-x-2 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all text-left ${
                  active
                    ? 'bg-violet-50 border-violet-300 text-violet-700'
                    : 'border-slate-200 text-slate-600 hover:border-violet-200 hover:bg-slate-50'
                }`}
              >
                {active ? <CheckCircle2 size={14} className="text-violet-600 shrink-0" /> : <div className="w-3.5 h-3.5 border border-slate-300 rounded-full shrink-0" />}
                <span className="leading-tight">{c}</span>
              </button>
            );
          })}
        </div>
        {conditions.length > 0 && (
          <p className="text-xs text-violet-600 mt-2 font-medium">✓ {conditions.length} condition{conditions.length > 1 ? 's' : ''} selected</p>
        )}
      </div>
    </div>
  );
}

function StepEmergency({
  contacts, setContacts,
}: {
  contacts: Contact[]; setContacts: (c: Contact[]) => void;
}) {
  const [draft, setDraft] = useState<Contact>({ name: '', phone: '', relationship: '', isPrimary: false });

  const add = () => {
    if (!draft.name || !draft.phone) { toast.error('Name and phone are required'); return; }
    const updated = [...contacts, { ...draft, isPrimary: contacts.length === 0 }];
    setContacts(updated);
    setDraft({ name: '', phone: '', relationship: '', isPrimary: false });
  };

  const remove = (i: number) => setContacts(contacts.filter((_, idx) => idx !== i));

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Emergency Contact</h2>
      <p className="text-slate-500 text-sm mb-6">Who should we call if you miss multiple doses?</p>

      {contacts.length > 0 && (
        <div className="space-y-2 mb-4">
          {contacts.map((c, i) => (
            <div key={i} className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{c.name}
                  {c.isPrimary && <span className="ml-2 text-xs bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Primary</span>}
                </p>
                <p className="text-xs text-slate-500">{c.phone} · {c.relationship}</p>
              </div>
              <button onClick={() => remove(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {contacts.length < 3 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Full Name *</label>
              <input className="input text-sm" placeholder="e.g. Priya Sharma" value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Phone *</label>
              <input className="input text-sm" type="tel" placeholder="+91 98765 43210" value={draft.phone}
                onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label text-xs">Relationship</label>
            <select className="input text-sm" value={draft.relationship} onChange={e => setDraft(d => ({ ...d, relationship: e.target.value }))}>
              <option value="">Select...</option>
              {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button onClick={add} type="button"
            className="flex items-center space-x-2 text-sm font-semibold text-violet-600 hover:text-violet-800 transition-colors">
            <Plus size={16} /> <span>Add Contact</span>
          </button>
        </div>
      )}

      {contacts.length === 0 && (
        <p className="text-xs text-slate-400 mt-3">You can also skip this and add contacts later in Settings.</p>
      )}
    </div>
  );
}

function StepCaregiver({ caregiverEmail, setCaregiverEmail }: {
  caregiverEmail: string; setCaregiverEmail: (e: string) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Connect a Caregiver</h2>
      <p className="text-slate-500 text-sm mb-6">
        A caregiver gets real-time alerts and can monitor your doses. Perfect for family members.
      </p>

      <div className="mb-6">
        <label className="label">Caregiver's Email Address</label>
        <div className="flex space-x-2">
          <input
            className="input flex-1"
            type="email"
            placeholder="daughter@example.com"
            value={caregiverEmail}
            onChange={e => setCaregiverEmail(e.target.value)}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">They'll receive an invite to create a MediSaathi caregiver account.</p>
      </div>

      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 space-y-3">
        <p className="text-sm font-semibold text-violet-700">What your caregiver sees:</p>
        {[
          'Real-time dose status (taken / missed / pending)',
          'Daily adherence score and weekly trends',
          'Instant alert when 2+ consecutive doses are missed',
          'Medication list and schedule',
        ].map((t, i) => (
          <div key={i} className="flex items-start space-x-2 text-sm text-violet-600">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
            <span>{t}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        You can skip this step and invite a caregiver anytime from Settings.
      </p>
    </div>
  );
}

/* ─── Main Onboarding Page ─────────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [step, setStep]                   = useState(1);
  const [conditions, setConditions]       = useState<Condition[]>([]);
  const [contacts, setContacts]           = useState<Contact[]>([]);
  const [language, setLanguage]           = useState('en');
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [saving, setSaving]               = useState(false);

  const isLast = step === STEPS.length;

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Patch user profile with health data
      await api.patch('/auth/me', {
        conditions,
        emergencyContacts: contacts,
        language,
      });

      // Invite caregiver if provided
      if (caregiverEmail.trim()) {
        try {
          await api.post('/caregiver/invite', { email: caregiverEmail });
          toast.success('Caregiver invite sent!');
        } catch { /* non-blocking */ }
      }

      toast.success('Profile set up! Let\'s scan your first prescription 🎉');
      router.push('/scan-rx');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Pill size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-slate-800">MediSaathi</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                step === s.id
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                  : step > s.id
                  ? 'bg-violet-100 text-violet-600'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {step > s.id ? <CheckCircle2 size={12} /> : s.icon}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px mx-1 transition-all ${step > s.id ? 'bg-violet-400' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8">
          {step === 1 && <StepWelcome name={user?.name || 'Friend'} />}
          {step === 2 && <StepHealth conditions={conditions} setConditions={setConditions} language={language} setLanguage={setLanguage} />}
          {step === 3 && <StepEmergency contacts={contacts} setContacts={setContacts} />}
          {step === 4 && <StepCaregiver caregiverEmail={caregiverEmail} setCaregiverEmail={setCaregiverEmail} />}

          {/* Nav buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center space-x-1 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium">
                <ChevronLeft size={16} /> <span>Back</span>
              </button>
            ) : (
              <button onClick={() => router.push('/dashboard')} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                Skip setup
              </button>
            )}

            {isLast ? (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 hover:scale-105 disabled:opacity-60"
              >
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <>
                    <Scan size={16} />
                    <span>Scan First Prescription</span>
                    <ArrowRight size={16} />
                  </>
                }
              </button>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 hover:scale-105"
              >
                <span>Continue</span>
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">Step {step} of {STEPS.length}</p>
      </div>
    </div>
  );
}
