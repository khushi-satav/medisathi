'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/api';
import { User, Bell, Shield, Smartphone, Save, LogOut, ChevronDown, Activity, Calendar, Utensils, Smile } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

type Tab = 'progress' | 'notifications' | 'privacy';

const bloodSugarData = [
  { day: 'Mon', value: 108 },
  { day: 'Tue', value: 115 },
  { day: 'Wed', value: 102 },
  { day: 'Thu', value: 118 },
  { day: 'Fri', value: 110 },
  { day: 'Sat', value: 105 },
  { day: 'Sun', value: 112 },
];

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('progress');
  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    age: user?.age?.toString() || '',
    gender: user?.gender || '',
    emergencyContact: user?.emergencyContact?.name || '',
    emergencyPhone: user?.emergencyContact?.phone || '',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    <div className="p-6 max-w-3xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="body-text mt-1">Manage your account and preferences</p>
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
          <h3 className="card-title">Progress Dashboard</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={16} className="text-indigo-500" />
                <p className="text-sm font-medium text-slate-500">Blood Sugar</p>
              </div>
              <p className="text-2xl font-bold text-slate-800">110 <span className="text-sm text-slate-500 font-normal">mg/dL</span></p>
              <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                Normal range
              </div>
            </div>
            
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-orange-500" />
                <p className="text-sm font-medium text-slate-500">Logging Streak</p>
              </div>
              <p className="text-2xl font-bold text-slate-800">14 <span className="text-sm text-slate-500 font-normal">Days</span> 🔥</p>
              <div className="mt-2 flex gap-1">
                {[1,1,1,1,1,1,1].map((_, i) => (
                  <div key={i} className="w-4 h-4 rounded-sm bg-orange-400"></div>
                ))}
              </div>
            </div>
            
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2 mb-2">
                <Utensils size={16} className="text-emerald-500" />
                <p className="text-sm font-medium text-slate-500">Meal Logging</p>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-2xl font-bold text-slate-800">85%</p>
                {/* Simple circular progress using conic-gradient */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'conic-gradient(#10b981 85%, #d1d5db 0)' }}>
                  <div className="w-6 h-6 bg-slate-50 rounded-full"></div>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2 mb-2">
                <Smile size={16} className="text-blue-500" />
                <p className="text-sm font-medium text-slate-500">Most Common Mood</p>
              </div>
              <p className="text-xl font-bold text-slate-800 mt-1">Energetic 😊</p>
              {/* Sparkline approximation */}
              <div className="mt-2 h-4 flex items-end gap-1">
                <div className="w-full h-[40%] bg-blue-200 rounded-t-sm"></div>
                <div className="w-full h-[60%] bg-blue-300 rounded-t-sm"></div>
                <div className="w-full h-[50%] bg-blue-200 rounded-t-sm"></div>
                <div className="w-full h-[90%] bg-blue-500 rounded-t-sm"></div>
                <div className="w-full h-[100%] bg-blue-500 rounded-t-sm"></div>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Blood Sugar Trend (Last 7 Days)</h4>
            <div className="h-64 rounded-xl border border-slate-100 bg-white p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bloodSugarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[80, 140]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="value" stroke="#6C63FF" strokeWidth={3} dot={{ fill: '#6C63FF', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="card space-y-6">
          <div>
            <h3 className="card-title">Notification Preferences</h3>
            <p className="body-text mt-1">Configure how and when MediSaathi notifies you</p>
          </div>

          <div className="space-y-6">
            {/* Section 1 */}
            <div>
              <p className="section-label mb-3">Medication Alerts</p>
              <div className="space-y-2">
                {[
                  { label: 'Insulin reminders', desc: 'Get notified when it\'s time for insulin', enabled: true },
                  { label: 'Appointment reminders', desc: 'Upcoming doctor appointments', enabled: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      className={`relative w-11 h-6 rounded-full transition-colors ${item.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      onClick={() => toast('Notification settings — coming soon!', { icon: '🔔' })}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${item.enabled ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2 */}
            <div>
              <p className="section-label mb-3">Lifestyle</p>
              <div className="space-y-2">
                {[
                  { label: 'Meal reminders', desc: 'Alert for meal logging', enabled: true },
                  { label: 'Mood check-ins', desc: 'Prompt to log your mood', enabled: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      className={`relative w-11 h-6 rounded-full transition-colors ${item.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      onClick={() => toast('Notification settings — coming soon!', { icon: '🔔' })}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${item.enabled ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3 */}
            <div>
              <p className="section-label mb-3">Smart Features</p>
              <div className="space-y-2">
                {[
                  { label: 'School mode', desc: 'Mute alerts during school hours', enabled: false },
                  { label: 'Smart timing', desc: 'AI optimized reminder schedule', enabled: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      className={`relative w-11 h-6 rounded-full transition-colors ${item.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      onClick={() => toast('Notification settings — coming soon!', { icon: '🔔' })}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${item.enabled ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50">
              <span className="text-sm font-medium text-slate-700">Advance Reminder Time</span>
              <select className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none">
                <option>5 minutes before</option>
                <option>10 minutes before</option>
                <option selected>15 minutes before</option>
                <option>30 minutes before</option>
              </select>
            </div>

          </div>

          <div className="pt-4">
            <div className="cta-card" style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '16px',
              padding: '24px',
              color: 'white',
              boxShadow: '0 10px 25px -5px rgba(102, 126, 234, 0.4)'
            }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl">📱</span>
                </div>
                <div>
                  <h4 className="font-bold text-lg">Enable SMS Alerts</h4>
                  <p className="text-white/80 text-sm mt-1">Get real Twilio SMS reminders on your phone</p>
                </div>
              </div>
              <button className="bg-white text-indigo-600 font-semibold mt-6 w-full py-3 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                Add Phone Number →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy & Sharing Tab */}
      {tab === 'privacy' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="card-title mb-4">Privacy & Sharing</h3>
            
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors mb-6">
              <div>
                <p className="font-medium text-slate-800 text-sm">Share logs automatically to my doctor</p>
                <p className="text-xs text-slate-500 mt-0.5">Toggle to enable/disable sharing</p>
              </div>
              <button
                className="relative w-11 h-6 rounded-full transition-colors bg-indigo-600"
                onClick={() => toast('Sharing toggled!', { icon: '🔄' })}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform left-5.5" />
              </button>
            </div>

            <div className="p-5 rounded-xl border border-slate-100 bg-slate-50 mb-8">
              <h4 className="text-sm font-semibold text-slate-800 mb-1">Manage Doctor Access</h4>
              <p className="text-xs text-slate-500 mb-4">Select who can view your medical logs.</p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <select className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm">
                    <option>👨‍⚕️ Dr. Sharma (Endocrinologist)</option>
                    <option>👩‍⚕️ Dr. Patel (General)</option>
                    <option>👤 Family Member</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary text-sm py-2.5 px-5 whitespace-nowrap" onClick={() => toast.success('Changes Confirmed')}>Save</button>
                </div>
              </div>
            </div>

            <h4 className="section-label text-red-500 mb-3">Data Actions</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                className="data-action-btn flex-1 bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                onClick={() => toast('Access Revoked!')}
              >
                Revoke Access
              </button>
              <button 
                className="data-action-btn flex-1 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                onClick={() => toast('Downloading Data...')}
              >
                Download Data
              </button>
              <button 
                className="data-action-btn flex-1 bg-red-500 text-white hover:bg-red-600 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-red-200"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <Shield size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete all data?</h3>
            <p className="text-slate-500 text-sm mb-6">
              This action cannot be undone. This will permanently delete your account, logs, and settings from our servers.
            </p>
            <div className="flex gap-3">
              <button 
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-sm"
                onClick={() => {
                  toast.success('Data deleted successfully');
                  setShowDeleteConfirm(false);
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
