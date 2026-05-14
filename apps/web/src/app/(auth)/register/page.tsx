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
    age: '', gender: '', role: 'patient',
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
        role: form.role,
      };
      const { data } = await authService.register(payload);
      login(data.user, data.token);
      toast.success(`Welcome to MediSaathi, ${data.user.name}! 🎉`);
      router.push('/onboarding');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center space-x-3 mb-10 justify-center">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-warm">
            <Pill size={26} className="text-white" />
          </div>
          <span className="text-3xl font-bold text-foreground tracking-tight">MediSaathi</span>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center mb-10 space-x-3">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm ${
                step >= s ? 'bg-primary text-white shadow-warm' : 'bg-border text-muted'
              }`}>
                {step > s ? <CheckCircle2 size={20} /> : s}
              </div>
              {s < 2 && <div className={`w-16 h-1 mx-2 rounded-full transition-colors ${step > s ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-3xl shadow-card border border-border p-8 sm:p-10">
          {step === 1 ? (
            <>
              <h2 className="text-3xl font-bold text-foreground mb-2">Create account</h2>
              <p className="text-muted text-base mb-8">Step 1 of 2 — Account details</p>
              <form onSubmit={handleStep1} className="space-y-5">
                <div>
                  <label className="label text-foreground font-semibold mb-1.5 block">Full Name *</label>
                  <input id="name" className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" placeholder="Rahul Sharma" value={form.name} onChange={e => updateForm('name', e.target.value)} />
                </div>
                <div>
                  <label className="label text-foreground font-semibold mb-1.5 block">I am a...</label>
                  <div className="flex p-1 bg-secondary/20 rounded-2xl">
                    <button 
                      type="button"
                      onClick={() => updateForm('role', 'patient')}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${form.role === 'patient' ? 'bg-white text-primary shadow-sm' : 'text-muted'}`}
                    >
                      Patient
                    </button>
                    <button 
                      type="button"
                      onClick={() => updateForm('role', 'caregiver')}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${form.role === 'caregiver' ? 'bg-white text-primary shadow-sm' : 'text-muted'}`}
                    >
                      Caregiver
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label text-foreground font-semibold mb-1.5 block">Email *</label>
                  <input id="email" type="email" className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" placeholder="rahul@example.com" value={form.email} onChange={e => updateForm('email', e.target.value)} />
                </div>
                <div>
                  <label className="label text-foreground font-semibold mb-1.5 block">Phone (optional)</label>
                  <input id="phone" type="tel" className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" placeholder="+91 98765 43210" value={form.phone} onChange={e => updateForm('phone', e.target.value)} />
                </div>
                <div>
                  <label className="label text-foreground font-semibold mb-1.5 block">Password *</label>
                  <div className="relative">
                    <input id="password" type={showPw ? 'text' : 'password'} className="input w-full pr-12 bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" placeholder="Min. 6 characters" value={form.password} onChange={e => updateForm('password', e.target.value)} />
                    <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label text-foreground font-semibold mb-1.5 block">Confirm Password *</label>
                  <input id="confirmPassword" type="password" className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" placeholder="Re-enter password" value={form.confirmPassword} onChange={e => updateForm('confirmPassword', e.target.value)} />
                </div>
                <button id="step1-next" type="submit" className="btn-primary w-full mt-4 py-3.5 text-lg rounded-2xl shadow-warm hover:shadow-elevated transition-all">Continue →</button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-foreground mb-2">Health profile</h2>
              <p className="text-muted text-base mb-8">Step 2 of 2 — Optional but helpful</p>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="label text-foreground font-semibold mb-1.5 block">Age</label>
                    <input id="age" type="number" className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" placeholder="28" min="1" max="120" value={form.age} onChange={e => updateForm('age', e.target.value)} />
                  </div>
                  <div>
                    <label className="label text-foreground font-semibold mb-1.5 block">Gender</label>
                    <select id="gender" className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" value={form.gender} onChange={e => updateForm('gender', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="p-5 bg-secondary/10 rounded-2xl border border-secondary/30">
                  <p className="text-sm text-primary-dark font-medium leading-relaxed flex items-start space-x-2">
                    <span className="text-lg">✨</span>
                    <span>You can add medical conditions, emergency contacts, and connect caregivers in Settings later.</span>
                  </p>
                </div>
                <div className="flex space-x-4 pt-2">
                  <button type="button" className="btn-secondary flex-1 py-3.5 rounded-2xl text-lg font-semibold bg-background hover:bg-border transition-colors border border-border" onClick={() => setStep(1)}>← Back</button>
                  <button id="register-submit" type="submit" disabled={loading} className="btn-primary flex-[2] flex items-center justify-center py-3.5 rounded-2xl text-lg shadow-warm hover:shadow-elevated transition-all">
                    {loading ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Create Account'}
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="mt-8 text-center">
            <p className="text-base text-muted">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-bold hover:text-primary-dark hover:underline transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
