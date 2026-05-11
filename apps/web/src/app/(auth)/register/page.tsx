'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/api';
import { Eye, EyeOff, Pill, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    age: '', gender: '',
  });

  const updateForm = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill required fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        age: form.age ? parseInt(form.age) : undefined,
        gender: form.gender || undefined,
      };
      const { data } = await authService.register(payload);
      login(data.user, data.token);
      toast.success(`Welcome to MediSaathi, ${data.user.name}! 🎉`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        <div className="flex items-center space-x-2 mb-8 justify-center">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
            <Pill size={22} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-800">MediSaathi</span>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center mb-8 space-x-3">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step >= s ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {step > s ? <CheckCircle2 size={16} /> : s}
              </div>
              {s < 2 && <div className={`w-16 h-0.5 mx-2 ${step > s ? 'bg-indigo-600' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {step === 1 ? (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Create your account</h2>
              <p className="text-slate-500 text-sm mb-8">Step 1 of 2 — Account details</p>
              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input id="name" className="input" placeholder="Rahul Sharma" value={form.name} onChange={e => updateForm('name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input id="email" type="email" className="input" placeholder="rahul@example.com" value={form.email} onChange={e => updateForm('email', e.target.value)} />
                </div>
                <div>
                  <label className="label">Phone (optional)</label>
                  <input id="phone" type="tel" className="input" placeholder="+91 98765 43210" value={form.phone} onChange={e => updateForm('phone', e.target.value)} />
                </div>
                <div>
                  <label className="label">Password *</label>
                  <div className="relative">
                    <input id="password" type={showPw ? 'text' : 'password'} className="input pr-10" placeholder="Min. 6 characters" value={form.password} onChange={e => updateForm('password', e.target.value)} />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirm Password *</label>
                  <input id="confirmPassword" type="password" className="input" placeholder="Re-enter password" value={form.confirmPassword} onChange={e => updateForm('confirmPassword', e.target.value)} />
                </div>
                <button id="step1-next" type="submit" className="btn-primary w-full mt-2">Continue →</button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Health profile</h2>
              <p className="text-slate-500 text-sm mb-8">Step 2 of 2 — Optional but helpful</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Age</label>
                    <input id="age" type="number" className="input" placeholder="28" min="1" max="120" value={form.age} onChange={e => updateForm('age', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select id="gender" className="input" value={form.gender} onChange={e => updateForm('gender', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-sm text-indigo-700">
                    ✨ You can add medical conditions, emergency contacts, and connect caregivers in Settings later.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setStep(1)}>← Back</button>
                  <button id="register-submit" type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center">
                    {loading ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Create Account'}
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
