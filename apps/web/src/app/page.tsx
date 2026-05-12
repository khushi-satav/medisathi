'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Pill, Activity, Shield, Bell, Brain, Users, ChevronRight, Star,
  ArrowRight, CheckCircle, Scan, TrendingUp, Heart, Zap, Globe, Phone,
} from 'lucide-react';

/* ─── Animated counter ─────────────────────────────────────────────────── */
function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        let start = 0;
        const step = end / 60;
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setVal(end); clearInterval(timer); }
          else setVal(Math.floor(start));
        }, 16);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ─── Data ──────────────────────────────────────────────────────────────── */
const features = [
  {
    icon: <Scan size={22} />,
    color: 'from-violet-500 to-purple-600',
    title: 'AI Prescription Scanner',
    desc: 'Photograph any prescription. Our GPT-4o model extracts every medicine, dosage, and schedule in seconds.',
  },
  {
    icon: <Bell size={22} />,
    color: 'from-blue-500 to-cyan-500',
    title: 'Smart Reminders',
    desc: 'Voice, SMS, and push reminders timed precisely around your meals, sleep, and daily routine.',
  },
  {
    icon: <Brain size={22} />,
    color: 'from-emerald-500 to-teal-500',
    title: 'Adherence Prediction',
    desc: 'ML models trained on dose patterns detect non-adherence risk before it happens — and intervene.',
  },
  {
    icon: <Users size={22} />,
    color: 'from-orange-500 to-rose-500',
    title: 'Caregiver Portal',
    desc: 'Family members get real-time alerts when doses are missed. One dashboard for the whole family.',
  },
  {
    icon: <TrendingUp size={22} />,
    color: 'from-pink-500 to-fuchsia-600',
    title: 'Insights & Analytics',
    desc: 'Weekly adherence trends, streak tracking, and AI-generated health recommendations.',
  },
  {
    icon: <Globe size={22} />,
    color: 'from-indigo-500 to-blue-600',
    title: 'Multi-lingual Support',
    desc: 'Voice reminders in Hindi, English, Marathi, and more — accessible to every patient in India.',
  },
];

const stats = [
  { value: 50, suffix: '%', label: 'of patients miss doses' },
  { value: 125000, suffix: '+', label: 'preventable deaths/year' },
  { value: 94, suffix: '%', label: 'adherence with MediSaathi' },
  { value: 2, suffix: 'min', label: 'to set up your schedule' },
];

const testimonials = [
  {
    name: 'Sunita Devi, 68',
    location: 'Bhopal',
    role: 'Diabetic patient',
    quote: 'मैं अब कभी दवाई नहीं भूलती। MediSaathi मेरी सबसे बड़ी मदद है।',
    rating: 5,
    avatar: 'SD',
    color: 'from-violet-400 to-purple-500',
  },
  {
    name: 'Rahul Sharma',
    location: 'Mumbai',
    role: 'Caregiver — son',
    quote: 'My father is 76 and lives alone. The alerts give me complete peace of mind from 300 km away.',
    rating: 5,
    avatar: 'RS',
    color: 'from-blue-400 to-cyan-500',
  },
  {
    name: 'Dr. Priya Nair',
    location: 'Kochi',
    role: 'General Physician',
    quote: 'I recommend MediSaathi to every chronic patient. Adherence has improved dramatically for my practice.',
    rating: 5,
    avatar: 'PN',
    color: 'from-emerald-400 to-teal-500',
  },
];

const steps = [
  { icon: <Scan size={20} />, label: 'Scan prescription', color: 'bg-violet-100 text-violet-600' },
  { icon: <Brain size={20} />, label: 'AI extracts medicines', color: 'bg-blue-100 text-blue-600' },
  { icon: <Bell size={20} />, label: 'Schedule created', color: 'bg-emerald-100 text-emerald-600' },
  { icon: <CheckCircle size={20} />, label: 'Log doses daily', color: 'bg-orange-100 text-orange-600' },
  { icon: <Users size={20} />, label: 'Caregiver monitors', color: 'bg-pink-100 text-pink-600' },
  { icon: <TrendingUp size={20} />, label: 'Insights & growth', color: 'bg-indigo-100 text-indigo-600' },
];

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden font-sans">

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-slate-950/90 backdrop-blur-xl border-b border-white/5 shadow-2xl' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Pill size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">MediSaathi</span>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Stories</a>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 px-4 py-2 rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-600/15 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[150px]" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-2 mb-8">
            <Zap size={14} className="text-violet-400" />
            <span className="text-sm text-violet-300 font-medium">India's AI-powered medication companion</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            Never miss a
            <span className="block bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              medicine again
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            MediSaathi acts like a personal nurse — scanning prescriptions, sending smart reminders,
            tracking adherence, and alerting caregivers — all powered by AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="group flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200 shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105"
            >
              <span>Start for free</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="flex items-center space-x-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-200"
            >
              <span>Sign in</span>
            </Link>
          </div>

          {/* How it works — quick steps */}
          <div id="how-it-works" className="flex flex-wrap justify-center gap-3">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1.5 ${s.color} bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs font-medium text-slate-300`}>
                  {s.icon}
                  <span>{s.label}</span>
                </div>
                {i < steps.length - 1 && <ChevronRight size={14} className="text-slate-600" />}
              </div>
            ))}
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 animate-bounce">
          <div className="w-px h-10 bg-gradient-to-b from-transparent to-violet-500/50" />
          <div className="w-2 h-2 rounded-full bg-violet-500/60" />
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      <section className="py-20 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {stats.map((s, i) => (
            <div key={i}>
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                <Counter end={s.value} suffix={s.suffix} />
              </div>
              <p className="text-slate-400 text-sm mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEM STORY ─────────────────────────────────────────────── */}
      <section className="py-24 max-w-4xl mx-auto px-6">
        <div className="bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20 rounded-3xl p-10">
          <div className="flex items-start space-x-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
              <Heart size={20} className="text-violet-400" />
            </div>
            <div>
              <p className="text-violet-300 text-sm font-semibold uppercase tracking-wider mb-1">The Problem We Solve</p>
              <h2 className="text-2xl font-bold text-white">Meet Sunita — she's one of millions</h2>
            </div>
          </div>
          <p className="text-slate-300 leading-relaxed text-lg">
            Sunita is a <strong className="text-white">68-year-old diabetic patient</strong> from Bhopal. She has 7 medicines to take daily —
            some before meals, some after, some at night. Her prescription is handwritten and hard to read.
            She forgets her afternoon dose while cooking. Her daughter lives in another city and has no idea.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {['Handwritten prescriptions', 'Complex schedules', 'No caregiver visibility', 'No reminders', 'Language barriers'].map(t => (
              <span key={t} className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-3 py-1 rounded-full">{t}</span>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-emerald-300 font-semibold">MediSaathi solves every single one of these.</p>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-violet-400 text-sm font-semibold uppercase tracking-wider mb-3">Everything you need</p>
          <h2 className="text-4xl md:text-5xl font-extrabold">
            Built for real patients,{' '}
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">real families</span>
          </h2>
          <p className="text-slate-400 mt-4 max-w-xl mx-auto">
            Every feature is designed around the actual challenges of medication adherence in India.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-violet-400 text-sm font-semibold uppercase tracking-wider mb-3">Real stories</p>
            <h2 className="text-4xl font-extrabold">Patients & families love MediSaathi</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center space-x-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role} · {t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-violet-500/40">
            <Phone size={28} className="text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
            Your family's health<br />
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">starts here</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Set up in 2 minutes. Scan your first prescription. Let AI handle the rest.
          </p>
          <Link
            href="/register"
            className="group inline-flex items-center space-x-3 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-200 shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105"
          >
            <span>Create free account</span>
            <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="mt-4 text-slate-500 text-sm">No credit card required · Free forever for patients</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Pill size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm">MediSaathi</span>
          </div>
          <p className="text-slate-500 text-sm">© 2025 MediSaathi — Built with ❤️ for better health outcomes in India</p>
          <div className="flex items-center space-x-6 text-sm text-slate-500">
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
