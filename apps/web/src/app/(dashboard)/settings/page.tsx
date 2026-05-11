'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/api';
import { User, Bell, Shield, Smartphone, Save, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

type Tab = 'progress' | 'notifications' | 'privacy';

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    age: user?.age?.toString() || '',
    gender: user?.gender || '',
    emergencyContact: user?.emergencyContact?.name || '',
    emergencyPhone: user?.emergencyContact?.phone || '',
  });

  const upP = (k: string, v: string) => setProfile(p => ({ ...p, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: (data: any) => authService.updateMe(data),
    onSuccess: (res) => {
      updateUser(res.data.user);
      toast.success('Profile updated!');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      name: profile.name,
      phone: profile.phone || undefined,
      age: profile.age ? parseInt(profile.age) : undefined,
      gender: profile.gender || undefined,
      emergencyContact: profile.emergencyContact ? {
        name: profile.emergencyContact,
        phone: profile.emergencyPhone,
      } : undefined,
    });
  };

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    router.push('/login');
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'progress', label: 'Progress', icon: <User size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'privacy', label: 'Privacy & Sharing', icon: <Shield size={16} /> },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Progress Tab */}
      {tab === 'progress' && (
        <div className="card space-y-6">
          <h3 className="font-bold text-slate-800">Progress Dashboard</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <p className="text-sm font-medium text-slate-500">Blood Sugar</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">110 mg/dL (Avg)</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <p className="text-sm font-medium text-slate-500">Logging Streak</p>
              <p className="text-xl font-bold text-orange-500 mt-1">14 Days 🔥</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <p className="text-sm font-medium text-slate-500">Meal Logging</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">85%</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <p className="text-sm font-medium text-slate-500">Most Common Mood</p>
              <p className="text-xl font-bold text-blue-500 mt-1">Energetic 😊</p>
            </div>
          </div>
          <div className="h-48 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 bg-slate-50">
            [Blood Sugar Chart Placeholder]
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="card space-y-4">
          <h3 className="font-bold text-slate-800">Notification Preferences</h3>
          <p className="text-sm text-slate-500">Configure how and when MediSaathi notifies you</p>
          {[
            { label: 'Insulin reminders', desc: 'Get notified when it\'s time for insulin', enabled: true },
            { label: 'Meal reminders', desc: 'Alert for meal logging', enabled: true },
            { label: 'Appointment reminders', desc: 'Upcoming doctor appointments', enabled: true },
            { label: 'Mood check-ins', desc: 'Prompt to log your mood', enabled: false },
            { label: 'School mode', desc: 'Mute alerts during school hours', enabled: false },
            { label: 'Smart timing', desc: 'AI optimized reminder schedule', enabled: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-800 text-sm">{item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
              </div>
              <button
                className={`relative w-11 h-6 rounded-full transition-colors ${item.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                onClick={() => toast('Notification settings — coming soon!', { icon: '🔔' })}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${item.enabled ? 'left-5.5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
          <div className="pt-2">
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start space-x-3">
              <Smartphone size={18} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-indigo-700">SMS Notifications via Twilio</p>
                <p className="text-xs text-indigo-500 mt-0.5">Add your phone number in Profile to enable SMS alerts.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy & Sharing Tab */}
      {tab === 'privacy' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4">Privacy & Sharing</h3>
            
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 mb-4">
              <div>
                <p className="font-medium text-slate-800 text-sm">Share logs automatically to my doctor</p>
                <p className="text-xs text-slate-400 mt-0.5">Toggle to enable/disable sharing</p>
              </div>
              <button
                className="relative w-11 h-6 rounded-full transition-colors bg-indigo-600"
                onClick={() => toast('Sharing toggled!', { icon: '🔄' })}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform left-5.5" />
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 mb-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Change Access</h4>
              <p className="text-xs text-slate-500 mb-3">Select who can view your medical logs.</p>
              <div className="flex space-x-2">
                <select className="input text-sm py-2">
                  <option>Dr. Sharma</option>
                  <option>Dr. Patel</option>
                  <option>Family Member</option>
                </select>
                <button className="btn-primary text-sm py-2 px-4 whitespace-nowrap" onClick={() => toast.success('Changes Confirmed')}>Confirm</button>
                <button className="btn-danger text-sm py-2 px-4 whitespace-nowrap bg-slate-200 text-slate-700 hover:bg-slate-300" onClick={() => toast('Changes Discarded')}>Discard</button>
              </div>
            </div>

            <h4 className="text-sm font-semibold text-red-600 mb-2 mt-6">Data Actions</h4>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
              <button className="btn-primary flex-1 text-sm bg-orange-500 hover:bg-orange-600" onClick={() => toast('Access Revoked!')}>Revoke Access</button>
              <button className="btn-primary flex-1 text-sm bg-indigo-500 hover:bg-indigo-600" onClick={() => toast('Downloading Data...')}>Download Data</button>
              <button className="btn-danger flex-1 text-sm" onClick={() => toast('Data Deleted!')}>Delete Data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
