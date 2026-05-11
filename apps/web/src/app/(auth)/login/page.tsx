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
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Pill size={24} />
          </div>
          <span className="text-2xl font-bold">MediSaathi</span>
        </div>
        <div>
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Your personal<br />medicine companion
          </h1>
          <p className="text-indigo-200 text-lg mb-10">
            Track medications, scan prescriptions with AI, and never miss a dose again.
          </p>
          <div className="space-y-4">
            {[
              { icon: <Pill size={20} />, text: 'Smart medication reminders' },
              { icon: <Activity size={20} />, text: 'AI-powered prescription scanning' },
              { icon: <Shield size={20} />, text: 'Caregiver monitoring & alerts' },
            ].map((f, i) => (
              <div key={i} className="flex items-center space-x-3 text-indigo-100">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">{f.icon}</div>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-indigo-300 text-sm">© 2025 MediSaathi. Built with ❤️ for better health.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center space-x-2 mb-8 lg:hidden">
            <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center">
              <Pill size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">MediSaathi</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm mb-8">Sign in to your account to continue</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email address</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPw(!showPw)}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-indigo-600 font-semibold hover:underline">
                  Create one free
                </Link>
              </p>
            </div>

            {/* Demo credentials */}
            <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-xs text-indigo-600 font-medium">Demo: use any email — register first!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
