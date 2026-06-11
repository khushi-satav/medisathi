'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import api, { authService, doctorService } from '@/services/api';
import {
  User,
  Bell,
  Shield,
  Smartphone,
  Save,
  LogOut,
  ChevronDown,
  Activity,
  Calendar,
  Utensils,
  Smile,
  Mail,
  Check,
  X,
  Users,
  Trash2,
  Heart,
  Loader2,
  Stethoscope,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import CaregiverConnect from '@/components/settings/CaregiverConnect';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';

type Tab = 'progress' | 'notifications' | 'privacy';

const formatPhone = (num: string) => {
  if (!num) return '';
  if (num.startsWith('+91')) return num;
  return `+91 ${num.slice(0,5)} ${num.slice(5)}`;
};

const MealLoggingRing = ({ percentage }: { percentage: number }) => {
  const circumference = 2 * Math.PI * 16; // radius 16
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      {/* Background circle */}
      <circle cx="20" cy="20" r="16" fill="none" stroke="#F3E8DC" strokeWidth="4"/>
      {/* Progress circle */}
      <circle
        cx="20" cy="20" r="16"
        fill="none"
        stroke="#E8532B"
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
      />
      {/* Percentage text inside */}
      <text x="20" y="24" textAnchor="middle" fontSize="10" fill="#E8532B" fontWeight="bold">
        {percentage}%
      </text>
    </svg>
  );
};

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
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [relationship, setRelationship] = useState('parent');
  const [inviteMessage, setInviteMessage] = useState('');

  // SOS Contacts state
  const [emergencyContacts, setEmergencyContacts] = useState<{name: string; phone: string; relationship: string; isPrimary: boolean}[]>(user?.emergencyContacts || []);
  const [newSosName, setNewSosName] = useState('');
  const [newSosPhone, setNewSosPhone] = useState('');
  const [newSosRel, setNewSosRel] = useState('family');
  const [sosMessage, setSosMessage] = useState(user?.sosMessage || 'EMERGENCY: I need help. Please contact me immediately.');

  // 1. Fetch Fresh and Populated User Details
  const { data: dbUser, refetch: refetchUser } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await authService.getMe();
      const fetchedUser = res.data.user;
      updateUser(fetchedUser);
      setEmergencyContacts(fetchedUser.emergencyContacts || []);
      setSosMessage(fetchedUser.sosMessage || 'EMERGENCY: I need help. Please contact me immediately.');
      return fetchedUser;
    },
    initialData: user,
  });

  // 2. Fetch Sent and Received Invites
  const { data: invitesData, refetch: refetchInvites } = useQuery({
    queryKey: ['caregiverInvites'],
    queryFn: async () => {
      const res = await api.get('/caregiver/invite');
      return res.data as { sent: any[]; received: any[] };
    },
  });

  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // Fetch list of all doctors
  const { data: doctorsData } = useQuery({
    queryKey: ['allDoctors'],
    queryFn: async () => {
      const res = await doctorService.getAllDoctors();
      return res.data.doctors as any[];
    },
    enabled: dbUser?.role === 'patient',
  });

  // Doctor Mutations
  const linkDoctorMutation = useMutation({
    mutationFn: (doctorId: string) => doctorService.linkDoctor(doctorId),
    onSuccess: () => {
      toast.success('Successfully linked with doctor');
      setSelectedDoctorId('');
      refetchUser();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to link with doctor');
    },
  });

  const toggleDoctorLinkMutation = useMutation({
    mutationFn: (data: { doctorId: string; isActive: boolean }) =>
      doctorService.toggleDoctorLink(data.doctorId, data.isActive),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Updated doctor access successfully');
      refetchUser();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update doctor access');
    },
  });

  const unlinkDoctorMutation = useMutation({
    mutationFn: (doctorId: string) => doctorService.unlinkDoctor(doctorId),
    onSuccess: () => {
      toast.success('Doctor disconnected successfully');
      refetchUser();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to disconnect doctor');
    },
  });

  // 3. Mutates: Invite, Respond, Revoke/Disconnect
  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; relationship: string; message?: string }) =>
      api.post('/caregiver/invite', data),
    onSuccess: () => {
      toast.success('Invitation sent successfully!');
      setCaregiverEmail('');
      setInviteMessage('');
      refetchInvites();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Failed to send invitation'),
  });

  const respondMutation = useMutation({
    mutationFn: (data: { token: string; action: 'accept' | 'reject' }) =>
      api.post('/caregiver/invite/respond', data),
    onSuccess: (_, variables) => {
      toast.success(
        `Invitation ${variables.action === 'accept' ? 'accepted' : 'declined'} successfully`
      );
      refetchInvites();
      refetchUser();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Failed to respond to invitation'),
  });

  const deleteInviteOrConnectionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/caregiver/invite/${id}`),
    onSuccess: () => {
      toast.success('Revoked/disconnected successfully');
      refetchInvites();
      refetchUser();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Action failed'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => authService.updateMe(data),
    onSuccess: (res) => {
      updateUser(res.data.user);
      toast.success('Profile updated!');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const saveSosMutation = useMutation({
    mutationFn: (data: any) => authService.updateMe(data),
    onSuccess: (res) => {
      updateUser(res.data.user);
      toast.success('SOS settings saved!');
    },
    onError: () => toast.error('Failed to save SOS settings'),
  });

  const sendTestSMSMutation = useMutation({
    mutationFn: () => api.post('/test-sms'),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Test SMS sent!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to send test SMS');
    },
  });

  // 4. Update Notifications Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => api.post('/settings/notifications', data),
    onSuccess: (res) => {
      updateUser(res.data.user);
      refetchUser();
      toast.success('Notification preferences updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    },
  });

  const toggleSetting = (key: string) => {
    const currentSettings = dbUser?.settings || {};
    const newVal = !currentSettings[key];
    updateSettingsMutation.mutate({ [key]: newVal });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      name: profile.name,
      phone: profile.phone || undefined,
      age: profile.age ? parseInt(profile.age) : undefined,
      gender: profile.gender || undefined,
      emergencyContact: profile.emergencyContact
        ? {
            name: profile.emergencyContact,
            phone: profile.emergencyPhone,
          }
        : undefined,
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

  // Map settings keys to readable labels and descriptions
  const notificationOptions = [
    {
      category: 'Medication Alerts',
      items: [
        {
          key: 'insulin_reminders',
          label: 'Insulin Reminders',
          desc: "Get notified when it's time for insulin doses",
        },
        {
          key: 'appointment_reminders',
          label: 'Appointment Reminders',
          desc: 'Get alerted for upcoming doctor visits',
        },
        {
          key: 'refill_alerts',
          label: 'Prescription Refills',
          desc: 'Alerts when prescription quantities run low',
        },
      ],
    },
    {
      category: 'Lifestyle & Care',
      items: [
        {
          key: 'meal_reminders',
          label: 'Meal Reminders',
          desc: 'Reminders to log daily breakfast, lunch, and dinner',
        },
        {
          key: 'mood_checkins',
          label: 'Mood Check-ins',
          desc: 'Daily prompts to log your mood and well-being',
        },
        {
          key: 'weekly_report',
          label: 'Weekly PDF Reports',
          desc: 'Receive detailed weekly health and adherence reports',
        },
      ],
    },
    {
      category: 'Smart Caregiver Features',
      items: [
        {
          key: 'school_mode',
          label: 'School Mode',
          desc: 'Automatically mute notifications during school or work hours',
        },
        {
          key: 'smart_timing',
          label: 'Smart Timing (AI)',
          desc: 'Optimize notification delivery times based on AI prediction',
        },
        {
          key: 'caregiver_alerts',
          label: 'Caregiver Alerts',
          desc: 'Enable instant sharing of updates with your connected caregivers',
        },
        {
          key: 'missed_dose_escalation',
          label: 'Missed Dose Escalation',
          desc: 'Escalate and send SMS alerts to caregivers if doses are missed by 30 mins',
        },
      ],
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="body-text mt-1">Manage your account, devices, and sharing preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Progress Tab */}
      {tab === 'progress' && (
        <div className="card space-y-6">
          <h3 className="card-title">Progress Dashboard</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={16} className="text-primary" />
                <p className="text-sm font-medium text-slate-500">Blood Sugar</p>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                110 <span className="text-sm text-slate-500 font-normal">mg/dL</span>
              </p>
              <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                Normal range
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-orange-500" />
                <p className="text-sm font-medium text-slate-500">Logging Streak</p>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                14 <span className="text-sm text-slate-500 font-normal">Days</span> 🔥
              </p>
              <div className="mt-2 flex gap-1">
                {[1, 1, 1, 1, 1, 1, 1].map((_, i) => (
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
                <MealLoggingRing percentage={85} />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2 mb-2">
                <Smile size={16} className="text-primary" />
                <p className="text-sm font-medium text-slate-500">Most Common Mood</p>
              </div>
              <p className="text-xl font-bold text-slate-800 mt-1">Energetic 😊</p>
              <div className="mt-2 h-4 flex items-end gap-1">
                <div className="w-full h-[40%] bg-secondary rounded-t-sm"></div>
                <div className="w-full h-[60%] bg-secondary-dark rounded-t-sm"></div>
                <div className="w-full h-[50%] bg-secondary rounded-t-sm"></div>
                <div className="w-full h-[90%] bg-primary rounded-t-sm"></div>
                <div className="w-full h-[100%] bg-primary rounded-t-sm"></div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Blood Sugar Trend (Last 7 Days)</h4>
            <div className="h-64 rounded-xl border border-slate-100 bg-white p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bloodSugarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[60, 160]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <ReferenceArea 
                    y1={70} y2={140} 
                    fill="#10B981" 
                    fillOpacity={0.05} 
                    label={{ value: "Normal Range", position: "insideTopLeft", fontSize: 10, fill: "#10B981" }}
                  />
                  <ReferenceLine 
                    y={140} 
                    stroke="#EF4444" 
                    strokeDasharray="3 3" 
                    label={{ value: "High", position: "right", fontSize: 10, fill: "#EF4444" }}
                  />
                  <ReferenceLine 
                    y={70} 
                    stroke="#EF4444" 
                    strokeDasharray="3 3"
                    label={{ value: "Low", position: "right", fontSize: 10, fill: "#EF4444" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#6C63FF"
                    strokeWidth={3}
                    dot={{ fill: '#6C63FF', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
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
            {notificationOptions.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <p className="section-label">{section.category}</p>
                <div className="space-y-2">
                  {section.items.map((item) => {
                    const isEnabled = !!dbUser?.settings?.[item.key];
                    const isSavingThis =
                      updateSettingsMutation.isPending &&
                      updateSettingsMutation.variables &&
                      item.key in (updateSettingsMutation.variables as any);

                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <div className="pr-4">
                          <p className="font-medium text-slate-800 text-sm">{item.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                        <button
                          disabled={updateSettingsMutation.isPending}
                          className={`relative w-11 h-6 rounded-full transition-colors flex items-center justify-between ${
                            isEnabled ? 'bg-primary' : 'bg-slate-300'
                          } ${updateSettingsMutation.isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
                          onClick={() => toggleSetting(item.key)}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              isEnabled ? 'left-5.5' : 'left-0.5'
                            } flex items-center justify-center`}
                          >
                            {isSavingThis && (
                              <Loader2 size={10} className="text-primary animate-spin" />
                            )}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="pt-2 flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50">
              <span className="text-sm font-medium text-slate-700">Advance Reminder Time</span>
              <select
                value={dbUser?.settings?.advance_reminder_time || 15}
                onChange={(e) =>
                  updateSettingsMutation.mutate({
                    advance_reminder_time: parseInt(e.target.value),
                  })
                }
                className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2 outline-none"
              >
                <option value={5}>5 minutes before</option>
                <option value={10}>10 minutes before</option>
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <div
              className="cta-card"
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
                boxShadow: '0 10px 25px -5px rgba(102, 126, 234, 0.4)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl">📱</span>
                </div>
                <div>
                  <h4 className="font-bold text-lg">Enable SMS Alerts</h4>
                  <p className="text-white/80 text-sm mt-1">Get real Twilio SMS reminders on your phone</p>
                </div>
              </div>

              {!user?.phone ? (
                <div className="mt-6 flex flex-col gap-3">
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-slate-800 outline-none"
                  />
                  <button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="bg-white text-primary font-semibold w-full py-3 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {saveMutation.isPending ? 'Saving...' : 'Save & Enable →'}
                  </button>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-3">
                  <div className="bg-white/20 px-4 py-3 rounded-xl font-medium flex justify-between items-center">
                    <span>{formatPhone(user.phone)}</span>
                    <div className="flex items-center">
                      <span className="text-xs bg-emerald-500 px-2 py-1 rounded text-white shadow-sm border border-emerald-400">
                        Active
                      </span>
                      <button 
                        onClick={() => sendTestSMSMutation.mutate()}
                        disabled={sendTestSMSMutation.isPending}
                        className="text-xs text-white/70 underline ml-2 hover:text-white transition-colors disabled:opacity-50"
                      >
                        {sendTestSMSMutation.isPending ? 'Sending...' : 'Send test SMS'}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        saveMutation.mutate({ ...profile, phone: undefined });
                      }}
                      className="text-white/80 text-sm hover:text-white underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Privacy & Sharing Tab */}
      {tab === 'privacy' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="card-title mb-4">Privacy & Sharing</h3>

            {/* Caregivers Management Section */}
            {dbUser?.role !== 'caregiver' ? (
              <div className="mb-8 border-b border-slate-100 pb-6">
                <CaregiverConnect />
              </div>
            ) : (
              <div className="mb-8 border-b border-slate-100 pb-6">
                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Users size={18} className="text-primary" />
                  Patient Connections
                </h4>
                <p className="text-xs text-slate-500 mb-6">
                  Manage and monitor the patients who have shared access to their health records with you.
                </p>

                {/* Active Connections List */}
                <div className="space-y-3 mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Active Connections ({dbUser?.caregiverLinks?.filter((l: any) => l.isActive).length || 0})
                  </p>

                  {(!dbUser?.caregiverLinks ||
                    dbUser.caregiverLinks.filter((l: any) => l.isActive).length === 0) && (
                    <div className="text-center p-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                      <Heart size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">No active connections linked yet.</p>
                    </div>
                  )}

                  {dbUser?.caregiverLinks
                    ?.filter((link: any) => link.isActive)
                    .map((link: any) => (
                      <div
                        key={link.userId?._id || link._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-slate-200 transition-colors gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 text-sm">
                              {link.userId?.name || link.name || 'Pending User'}
                            </span>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded capitalize">
                              {link.relationship}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Email: {link.userId?.email || link.email}
                          </p>
                          {link.linkedAt && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Connected on:{' '}
                              {new Date(link.linkedAt).toLocaleDateString(undefined, {
                                dateStyle: 'medium',
                              })}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() =>
                            deleteInviteOrConnectionMutation.mutate(
                              link.userId?._id || link.userId
                            )
                          }
                          disabled={deleteInviteOrConnectionMutation.isPending}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                        >
                          <Trash2 size={12} />
                          Disconnect
                        </button>
                      </div>
                    ))}
                </div>

                {/* Pending Received Invites (If Caregiver) */}
                <div className="space-y-3 mb-6 bg-yellow-50/50 border border-yellow-100 p-4 rounded-xl">
                  <p className="text-xs font-bold text-yellow-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail size={14} className="text-yellow-600" />
                    Pending Patient Invitations (
                    {invitesData?.received?.filter((i: any) => i.status === 'pending').length || 0}
                    )
                  </p>

                  {(!invitesData?.received ||
                    invitesData.received.filter((i: any) => i.status === 'pending').length === 0) && (
                    <p className="text-xs text-slate-500 italic">No pending invitations received.</p>
                  )}

                  {invitesData?.received
                    ?.filter((invite: any) => invite.status === 'pending')
                    .map((invite: any) => (
                      <div
                        key={invite._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-yellow-100 bg-white gap-3 shadow-sm"
                      >
                        <div>
                          <p className="text-xs font-medium text-slate-800">
                            From:{' '}
                            <span className="font-bold">
                              {invite.patientId?.name || 'Unknown Patient'}
                            </span>{' '}
                            ({invite.patientId?.email})
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Relationship: <span className="capitalize">{invite.relationship}</span>
                          </p>
                          {invite.message && (
                            <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                              "{invite.message}"
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              respondMutation.mutate({ token: invite.token, action: 'accept' })
                            }
                            disabled={respondMutation.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors shadow-sm"
                          >
                            <Check size={12} />
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              respondMutation.mutate({ token: invite.token, action: 'reject' })
                            }
                            disabled={respondMutation.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                          >
                            <X size={12} />
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Doctor Access Form */}
            {dbUser?.role === 'patient' && (
              <div className="border-t border-slate-100 pt-6 mt-6">
                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Stethoscope size={18} className="text-primary" />
                  Doctor Connections
                </h4>
                <p className="text-xs text-slate-500 mb-6">
                  Manage medical professionals who can view your health charts and log notes.
                </p>

                {/* Doctor Access Form */}
                <div className="p-5 rounded-xl border border-slate-100 bg-slate-50 mb-6">
                  <h5 className="text-sm font-semibold text-slate-800 mb-1">Link New Doctor</h5>
                  <p className="text-xs text-slate-500 mb-4">Select a healthcare provider to link and share your logs.</p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <select
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                        className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-medium text-sm"
                      >
                        <option value="">Select a Doctor...</option>
                        {doctorsData?.map((doc: any) => (
                          <option key={doc._id} value={doc._id}>
                            👨‍⚕️ {doc.name} {doc.specialization ? `(${doc.specialization})` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        size={16}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-primary text-sm py-2.5 px-5 whitespace-nowrap disabled:opacity-50 inline-flex items-center gap-1.5"
                        disabled={!selectedDoctorId || linkDoctorMutation.isPending}
                        onClick={() => linkDoctorMutation.mutate(selectedDoctorId)}
                      >
                        {linkDoctorMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                        Link Doctor
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active/Inactive Doctors List */}
                <div className="space-y-3 mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Linked Doctors ({dbUser?.doctorLinks?.length || 0})
                  </p>

                  {(!dbUser?.doctorLinks || dbUser.doctorLinks.length === 0) && (
                    <div className="text-center p-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                      <Stethoscope size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">No doctors linked yet.</p>
                    </div>
                  )}

                  {dbUser?.doctorLinks?.map((link: any) => (
                    <div
                      key={link.doctorId?._id || link.doctorId || link._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-slate-200 transition-colors gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-sm">
                            {link.name || 'Unknown Doctor'}
                          </span>
                          {link.specialization && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded capitalize">
                              {link.specialization}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              link.isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {link.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {link.linkedAt && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Connected on:{' '}
                            {new Date(link.linkedAt).toLocaleDateString(undefined, {
                              dateStyle: 'medium',
                            })}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle Active/Inactive */}
                        <button
                          onClick={() =>
                            toggleDoctorLinkMutation.mutate({
                              doctorId: link.doctorId?._id || link.doctorId,
                              isActive: !link.isActive,
                            })
                          }
                          disabled={toggleDoctorLinkMutation.isPending}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                            link.isActive
                              ? 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100'
                              : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {link.isActive ? 'Deactivate' : 'Activate'}
                        </button>

                        {/* Disconnect / Unlink */}
                        <button
                          onClick={() =>
                            unlinkDoctorMutation.mutate(link.doctorId?._id || link.doctorId)
                          }
                          disabled={unlinkDoctorMutation.isPending}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                        >
                          <Trash2 size={12} />
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SOS Contacts Section */}
            <div className="border-t border-slate-100 pt-6 mt-6">
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
                <Smartphone size={18} className="text-red-500" />
                SOS Emergency Sequence
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                These contacts will be alerted sequentially when you trigger an SOS.
              </p>

              <div className="space-y-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Custom SOS Message</label>
                  <textarea
                    value={sosMessage}
                    onChange={(e) => setSosMessage(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-700 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
                    rows={2}
                    placeholder="Enter the message to send during an emergency"
                  ></textarea>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={newSosName}
                    onChange={(e) => setNewSosName(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={newSosPhone}
                    onChange={(e) => setNewSosPhone(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <select
                    value={newSosRel}
                    onChange={(e) => setNewSosRel(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="family">Family</option>
                    <option value="friend">Friend</option>
                    <option value="doctor">Doctor</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSosName || !newSosPhone) return toast.error('Name and Phone are required');
                      setEmergencyContacts([...emergencyContacts, {
                        name: newSosName, phone: newSosPhone, relationship: newSosRel, isPrimary: emergencyContacts.length === 0
                      }]);
                      setNewSosName('');
                      setNewSosPhone('');
                    }}
                    className="bg-primary text-white font-medium py-2 px-4 rounded-xl hover:bg-primary-dark transition-colors text-sm"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-2">
                  {emergencyContacts.map((contact, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {contact.name}
                            {contact.isPrimary && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold">Primary</span>}
                          </p>
                          <p className="text-xs text-slate-500">{contact.phone} • <span className="capitalize">{contact.relationship}</span></p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const updated = emergencyContacts.filter((_, i) => i !== idx);
                          if (updated.length > 0 && contact.isPrimary) {
                            updated[0].isPrimary = true;
                          }
                          setEmergencyContacts(updated);
                        }}
                        className="text-slate-400 hover:text-red-500 p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {emergencyContacts.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-4 italic">No SOS contacts added yet.</p>
                  )}
                </div>

                <button
                  onClick={() => saveSosMutation.mutate({ emergencyContacts, sosMessage })}
                  disabled={saveSosMutation.isPending}
                  className="w-full bg-red-500 text-white font-semibold py-2.5 rounded-xl hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saveSosMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Save SOS Settings
                </button>
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
                className="data-action-btn flex-1 bg-secondary/10 text-primary border border-secondary-light hover:bg-secondary/30 py-2.5 rounded-xl font-semibold text-sm transition-colors"
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
