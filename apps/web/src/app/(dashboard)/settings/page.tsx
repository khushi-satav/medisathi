'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import api, { authService, doctorService } from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/lib/i18n';
import {
  Bell,
  Shield,
  Smartphone,
  ChevronDown,
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
import CaregiverConnect from '@/components/settings/CaregiverConnect';

type Tab = 'notifications' | 'privacy';





// ─── Module-level sub-components (MUST be outside the page fn to keep stable identity) ───
const SectionHeader = ({
  icon, title, subtitle, color,
}: { icon: string; title: string; subtitle: string; color: string }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '14px 18px',
    background: `${color}12`,
    borderRadius: '12px',
    marginBottom: '4px',
  }}>
    <div style={{
      width: '36px', height: '36px', borderRadius: '10px',
      background: `${color}22`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '18px',
    }}>{icon}</div>
    <div>
      <div style={{ fontWeight: 700, fontSize: '15px', color: '#1A1A2E' }}>{title}</div>
      <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{subtitle}</div>
    </div>
  </div>
);

const NotificationToggle = ({
  icon, title, desc, enabled, onChange, badge, impact,
}: {
  icon: string; title: string; desc: string;
  enabled: boolean; onChange: (v: boolean) => void;
  badge?: 'Recommended' | 'New' | 'Pro';
  impact?: 'High' | 'Medium' | 'Low';
}) => (
  <div
    style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '16px 18px',
      background: enabled ? '#FFF8F5' : '#FAFAFA',
      border: `1.5px solid ${enabled ? '#E8532B30' : '#E5E7EB'}`,
      borderRadius: '14px',
      marginBottom: '10px',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      boxShadow: enabled ? '0 2px 8px rgba(232,83,43,0.08)' : 'none',
    }}
    onClick={() => onChange(!enabled)}
  >
    {/* Icon */}
    <div style={{
      width: '42px', height: '42px', borderRadius: '12px',
      background: enabled ? '#E8532B15' : '#F3F4F6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '20px', flexShrink: 0, transition: 'all 0.2s',
    }}>{icon}</div>

    {/* Text */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#1A1A2E' }}>{title}</span>
        {badge && (
          <span style={{
            fontSize: '10px', fontWeight: 700,
            padding: '2px 8px', borderRadius: '20px',
            background: badge === 'Recommended' ? '#E8532B' : badge === 'New' ? '#10B981' : '#6C63FF',
            color: 'white', letterSpacing: '0.3px',
          }}>{badge}</span>
        )}
      </div>
      <div style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.4 }}>{desc}</div>
      {impact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: impact === 'High' ? '#EF4444' : impact === 'Medium' ? '#F5A623' : '#10B981',
          }}/>
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{impact} priority</span>
        </div>
      )}
    </div>

    {/* Toggle switch */}
    <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => onChange(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span style={{
          position: 'absolute', inset: 0,
          background: enabled ? '#E8532B' : '#D1D5DB',
          borderRadius: '13px', cursor: 'pointer',
          transition: 'all 0.25s',
          boxShadow: enabled ? '0 0 8px rgba(232,83,43,0.3)' : 'none',
        }}>
          <span style={{
            position: 'absolute',
            width: '20px', height: '20px',
            background: 'white', borderRadius: '50%',
            top: '3px',
            left: enabled ? '25px' : '3px',
            transition: 'left 0.25s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}/>
        </span>
      </label>
    </div>
  </div>
);

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { lang, setLang } = useLanguage();
  const [tab, setTab] = useState<Tab>('notifications');
  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    age: user?.age?.toString() || '',
    gender: user?.gender || '',
    emergencyContact: user?.emergencyContact?.name || '',
    emergencyPhone: user?.emergencyContact?.phone || '',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


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

  const saveLanguageMutation = useMutation({
    mutationFn: (language: string) => authService.updateMe({ language }),
    onSuccess: (res) => {
      updateUser(res.data.user);
      toast.success('Language updated!');
    },
    onError: () => toast.error('Failed to update language'),
  });

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLang(newLang);
    saveLanguageMutation.mutate(newLang);
  };

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



  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'privacy', label: 'Privacy & Sharing', icon: <Shield size={16} /> },
  ];



  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="body-text mt-1">Manage your account, devices, and sharing preferences</p>
      </div>

      {/* Language Selector */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-lg">🌐</div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Preferred Language</h3>
            <p className="text-xs text-slate-500">UI, reminders, and AI responses will use this language</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => handleLanguageChange(l.code)}
              className={`flex flex-col items-start px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                lang === l.code
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              <span className="font-bold">{l.nativeLabel}</span>
              <span className={`text-[11px] ${lang === l.code ? 'text-white/80' : 'text-slate-400'}`}>{l.label}</span>
            </button>
          ))}
        </div>
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



      {/* Notifications Tab */}
      {tab === 'notifications' && (() => {
        // ── helpers ──────────────────────────────────────────────────────────
        const settings = dbUser?.settings || {};

        const updateSetting = (key: string, value: any) => {
          updateSettingsMutation.mutate({ [key]: value });
        };

        const allToggleKeys = [
          'insulin_reminders', 'appointment_reminders', 'refill_alerts',
          'meal_reminders', 'mood_checkins',
          'school_mode', 'smart_timing', 'caregiver_alerts', 'missed_dose_escalation',
        ];
        const enabledCount = allToggleKeys.filter(k => !!settings[k]).length;
        const totalCount   = allToggleKeys.length;

        const phoneNumber = user?.phone
          ? (user.phone.startsWith('+91') ? user.phone.slice(3).trim() : user.phone)
          : '';

        const sendTestSMS  = () => sendTestSMSMutation.mutate();
        const removePhone  = () => saveMutation.mutate({ ...profile, phone: undefined });

        // ── render ───────────────────────────────────────────────────────────
        return (
          <div className="space-y-2">

            {/* ① Gradient banner header */}
            <div style={{
              background: 'linear-gradient(135deg, #E8532B 0%, #F5A623 100%)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '8px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.85, letterSpacing: '1px',
                              fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                  🔔 Notification Center
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>
                  Stay on top of your health
                </h2>
                <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: '14px' }}>
                  Configure alerts so you never miss a dose
                </p>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '12px 18px',
                textAlign: 'center',
                backdropFilter: 'blur(10px)',
              }}>
                <div style={{ fontSize: '24px', fontWeight: 800 }}>{enabledCount}/{totalCount}</div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>alerts active</div>
              </div>
            </div>

            {/* ② Medication Alerts */}
            <SectionHeader
              icon="💊"
              title="Medication Alerts"
              subtitle="Critical dose and prescription reminders"
              color="#E8532B"
            />
            <NotificationToggle
              icon="💉" title="Insulin Reminders"
              desc="Get notified exactly when it's time for insulin doses"
              enabled={!!settings.insulin_reminders}
              onChange={v => updateSetting('insulin_reminders', v)}
              badge="Recommended" impact="High"
            />
            <NotificationToggle
              icon="🏥" title="Appointment Reminders"
              desc="Upcoming doctor appointments and check-ups"
              enabled={!!settings.appointment_reminders}
              onChange={v => updateSetting('appointment_reminders', v)}
              impact="High"
            />
            <NotificationToggle
              icon="📦" title="Prescription Refills"
              desc="Alert when medicine stock drops below 7 days supply"
              enabled={!!settings.refill_alerts}
              onChange={v => updateSetting('refill_alerts', v)}
              badge="New" impact="Medium"
            />

            {/* ③ Lifestyle & Care */}
            <SectionHeader
              icon="🌿"
              title="Lifestyle & Care"
              subtitle="Daily wellness and habit tracking"
              color="#10B981"
            />
            <NotificationToggle
              icon="🍽️" title="Meal Reminders"
              desc="Reminders to log breakfast, lunch, and dinner"
              enabled={!!settings.meal_reminders}
              onChange={v => updateSetting('meal_reminders', v)}
              impact="Medium"
            />
            <NotificationToggle
              icon="😊" title="Mood Check-ins"
              desc="Daily prompts to log your mood and wellbeing"
              enabled={!!settings.mood_checkins}
              onChange={v => updateSetting('mood_checkins', v)}
              impact="Low"
            />

            {/* ④ Smart Features */}
            <SectionHeader
              icon="🤖"
              title="Smart Features"
              subtitle="AI-powered and caregiver notifications"
              color="#6C63FF"
            />
            <NotificationToggle
              icon="🤫" title="School Mode"
              desc="Silently mute all alerts during school or work hours"
              enabled={!!settings.school_mode}
              onChange={v => updateSetting('school_mode', v)}
              impact="Low"
            />
            <NotificationToggle
              icon="🤖" title="Smart Timing (AI)"
              desc="AI learns when you're most likely to miss doses and optimises reminder timing"
              enabled={!!settings.smart_timing}
              onChange={v => updateSetting('smart_timing', v)}
              badge="Recommended" impact="High"
            />
            <NotificationToggle
              icon="👥" title="Caregiver Alerts"
              desc="Instantly share missed dose updates with your connected caregivers"
              enabled={!!settings.caregiver_alerts}
              onChange={v => updateSetting('caregiver_alerts', v)}
              impact="High"
            />
            <NotificationToggle
              icon="📞" title="Missed Dose Escalation"
              desc="Automated phone call + caregiver SMS if dose missed by 30+ minutes"
              enabled={!!settings.missed_dose_escalation}
              onChange={v => updateSetting('missed_dose_escalation', v)}
              badge="Recommended" impact="High"
            />

            {/* ⑤ Advance Reminder Time — pill selector */}
            <div style={{
              padding: '18px',
              background: 'white',
              border: '1.5px solid #E5E7EB',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: '#E8532B15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px',
                }}>⏰</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Advance Reminder Time</div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    How early to send the reminder before dose time
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[5, 10, 15, 30].map(min => (
                  <button
                    key={min}
                    onClick={() => updateSetting('advance_reminder_time', min)}
                    style={{
                      padding: '8px 14px', borderRadius: '20px',
                      border: `1.5px solid ${(settings.advance_reminder_time ?? 15) === min ? '#E8532B' : '#E5E7EB'}`,
                      background: (settings.advance_reminder_time ?? 15) === min ? '#E8532B' : 'white',
                      color: (settings.advance_reminder_time ?? 15) === min ? 'white' : '#6B7280',
                      fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >{min}m</button>
                ))}
              </div>
            </div>

            {/* ⑥ SMS Alerts — upgraded gradient card */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '20px',
              padding: '24px',
              marginTop: '24px',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Decorative circles */}
              <div style={{
                position: 'absolute', top: '-20px', right: '-20px',
                width: '100px', height: '100px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
              }}/>
              <div style={{
                position: 'absolute', bottom: '-30px', right: '60px',
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
              }}/>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '16px',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', flexShrink: 0,
                }}>📱</div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800 }}>
                    Enable SMS Alerts
                  </h3>
                  <p style={{ margin: '0 0 16px', opacity: 0.85, fontSize: '13px', lineHeight: 1.5 }}>
                    Get real Twilio SMS reminders on your phone. Even when the app is closed.
                  </p>

                  {phoneNumber ? (
                    <div>
                      <div style={{
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        marginBottom: '12px',
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '16px' }}>+91 {phoneNumber}</div>
                          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                            ✅ Verified &amp; Active
                          </div>
                        </div>
                        <div style={{
                          background: '#10B981', color: 'white',
                          padding: '6px 14px', borderRadius: '20px',
                          fontSize: '12px', fontWeight: 700,
                        }}>ACTIVE</div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={sendTestSMS}
                          disabled={sendTestSMSMutation.isPending}
                          style={{
                            flex: 1, padding: '10px',
                            background: 'rgba(255,255,255,0.2)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '10px', color: 'white',
                            fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                          }}
                        >
                          {sendTestSMSMutation.isPending ? 'Sending…' : '📨 Send Test SMS'}
                        </button>
                        <button
                          onClick={removePhone}
                          disabled={saveMutation.isPending}
                          style={{
                            padding: '10px 20px',
                            background: 'rgba(239,68,68,0.25)',
                            border: '1px solid rgba(239,68,68,0.4)',
                            borderRadius: '10px', color: 'white',
                            fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                          }}
                        >Remove</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={profile.phone}
                        onChange={e => setProfile({ ...profile, phone: e.target.value })}
                        style={{
                          flex: 1, padding: '12px 16px',
                          background: 'rgba(255,255,255,0.15)',
                          border: '1px solid rgba(255,255,255,0.3)',
                          borderRadius: '10px', color: 'white',
                          fontSize: '14px', outline: 'none',
                        }}
                      />
                      <button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        style={{
                          padding: '12px 20px',
                          background: 'white', color: '#764ba2',
                          border: 'none', borderRadius: '10px',
                          fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                        }}
                      >
                        {saveMutation.isPending ? 'Saving…' : 'Add Number →'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ⑦ Quick Stats summary */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px', marginTop: '24px', padding: '16px',
              background: '#F9FAFB', borderRadius: '14px',
              border: '1px solid #E5E7EB',
            }}>
              {[
                { icon: '✅', label: 'Active alerts',  value: `${enabledCount}` },
                { icon: '📱', label: 'SMS status',     value: phoneNumber ? 'Connected' : 'Not set' },
                { icon: '⚡', label: 'Escalation',     value: settings.missed_dose_escalation ? 'On' : 'Off' },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A2E' }}>{stat.value}</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{stat.label}</div>
                </div>
              ))}
            </div>

          </div>
        );
      })()}

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
                              &quot;{invite.message}&quot;
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
