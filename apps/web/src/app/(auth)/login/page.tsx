'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/api';
import { Eye, EyeOff, Pill, Activity, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authService.login(form.email, form.password);
      login(data.user, data.token);
      toast.success(`Welcome back, ${data.user.name}! 👋`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary flex-col justify-between p-12 text-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-glass">
            <Pill size={24} />
          </div>
          <span className="text-2xl font-bold tracking-tight">MediSaathi</span>
        </div>
        <div>
          <h1 className="text-5xl font-bold leading-tight mb-6 tracking-tight">
            Your personal<br />medicine companion
          </h1>
          <p className="text-white/80 text-lg mb-10 font-medium">
            Track medications, scan prescriptions with AI, and never miss a dose again.
          </p>
          <div className="space-y-5">
            {[
              { icon: <Pill size={20} />, text: 'Smart medication reminders' },
              { icon: <Activity size={20} />, text: 'AI-powered prescription scanning' },
              { icon: <Shield size={20} />, text: 'Caregiver monitoring & alerts' },
            ].map((f, i) => (
              <div key={i} className="flex items-center space-x-4 text-white/90">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-sm">{f.icon}</div>
                <span className="font-medium text-lg">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/60 text-sm font-medium">© 2025 MediSaathi. Built with ❤️ for better health.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center space-x-3 mb-10 lg:hidden">
            <div className="w-10 h-10 gradient-primary rounded-2xl flex items-center justify-center shadow-warm">
              <Pill size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">MediSaathi</span>
          </div>

          <div className="bg-card rounded-3xl shadow-card border border-border p-8 sm:p-10">
            <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back</h2>
            <p className="text-muted text-base mb-8">Sign in to your account to continue</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="label text-foreground font-semibold mb-1.5 block">Email address</label>
                <input
                  id="email"
                  type="email"
                  className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label text-foreground font-semibold mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    className="input w-full pr-12 bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
                    onClick={() => setShowPw(!showPw)}
                  >
                    {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center space-x-2 py-3.5 text-lg rounded-2xl shadow-warm hover:shadow-elevated transition-all"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-base text-muted">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-primary font-bold hover:text-primary-dark hover:underline transition-colors">
                  Create one free
                </Link>
              </p>
            </div>

            {/* Demo credentials */}
            <div className="mt-6 p-4 bg-secondary/10 rounded-2xl border border-secondary/30">
              <p className="text-sm text-primary-dark font-medium flex items-center justify-center space-x-2">
                <span>✨</span>
                <span>Demo: use any email — register first!</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

