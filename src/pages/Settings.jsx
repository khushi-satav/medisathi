import React from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Phone, 
  LogOut, 
  ChevronRight,
  UserPlus,
  Mail,
  Smartphone,
  Lock,
  Heart
} from 'lucide-react';

const SettingsPage = ({ user, onLogout }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-sans">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account, health profile, and notifications.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile & Account */}
        <div className="lg:col-span-2 space-y-8">
          {/* Profile Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform"></div>
            
            <div className="relative flex flex-col md:flex-row items-center gap-8">
              <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-primary to-teal-400 p-1 shadow-xl shadow-primary/20">
                <div className="w-full h-full rounded-[1.8rem] bg-white flex items-center justify-center text-3xl font-bold text-primary uppercase">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
              </div>
              <div className="text-center md:text-left flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                <p className="text-gray-500 font-medium">ID: #MS-2026 • {user.email || 'patient@medisathi.com'}</p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold uppercase tracking-wider">Type 2 Diabetes</span>
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold uppercase tracking-wider">Hypertension</span>
                </div>
              </div>
              <button className="px-6 py-3 bg-gray-50 text-gray-600 rounded-2xl text-sm font-bold border border-gray-100 hover:bg-gray-100 transition-colors">
                Edit Profile
              </button>
            </div>
          </div>

          {/* Health Profile */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
               <Heart className="text-red-500" size={20} /> Health Profile
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem label="Age" value="68 Years" />
              <InfoItem label="Blood Group" value="O+ Positive" />
              <InfoItem label="Weight" value="72 kg" />
              <InfoItem label="Height" value="174 cm" />
              <InfoItem label="Primary Caregiver" value="Sarah Jenkins" />
              <InfoItem label="Last Checkup" value="Oct 12, 2023" />
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
               <Bell className="text-blue-500" size={20} /> Notifications
            </h3>
            <div className="space-y-6">
              <ToggleItem 
                icon={<Smartphone size={20} className="text-gray-400" />}
                title="Push Notifications" 
                desc="Receive alerts for upcoming doses on your phone."
                enabled={true}
              />
              <ToggleItem 
                icon={<Mail size={20} className="text-gray-400" />}
                title="Email Summaries" 
                desc="Weekly adherence reports sent to your email."
                enabled={true}
              />
              <ToggleItem 
                icon={<Shield size={20} className="text-gray-400" />}
                title="Caregiver Alerts" 
                desc="Notify your caregiver immediately after a missed dose."
                enabled={true}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar Settings */}
        <div className="space-y-8">
          {/* Security Card */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Security</h3>
            <div className="space-y-4">
               <SecurityItem icon={<Lock size={18} />} label="Change Password" />
               <SecurityItem icon={<Smartphone size={18} />} label="Two-Factor Auth" />
               <SecurityItem icon={<UserPlus size={18} />} label="Authorized Devices" />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100">
            <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
              <Phone size={20} /> Emergency
            </h3>
            <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm">
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Primary Contact</p>
               <p className="font-bold text-gray-900 text-lg">Sarah Jenkins</p>
               <p className="text-sm text-gray-500 mb-4">+1 (555) 123-4567</p>
               <button className="w-full py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200">
                 Call Now
               </button>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="w-full py-4 px-6 bg-white border border-gray-100 rounded-[2rem] text-red-600 font-bold flex items-center justify-between hover:bg-red-50 transition-all group"
          >
            <div className="flex items-center gap-3">
               <LogOut size={20} />
               Sign Out
            </div>
            <ChevronRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value }) => (
  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col">
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
    <span className="text-sm font-bold text-gray-800 mt-1">{value}</span>
  </div>
);

const ToggleItem = ({ icon, title, desc, enabled }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${enabled ? 'bg-primary' : 'bg-gray-200'}`}>
       <div className={`w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
    </div>
  </div>
);

const SecurityItem = ({ icon, label }) => (
  <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
    <div className="flex items-center gap-3 text-gray-600">
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
    <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
  </button>
);

export default SettingsPage;
