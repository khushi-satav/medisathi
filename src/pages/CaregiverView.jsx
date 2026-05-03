import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  MessageSquare, 
  AlertTriangle, 
  TrendingDown, 
  History,
  ShieldAlert,
  ChevronRight,
  MoreVertical,
  Activity,
  HeartPulse,
  Wifi,
  WifiOff
} from 'lucide-react';

const patients = [
  { 
    id: 'P1', 
    name: 'Robert Wilson', 
    age: 72, 
    status: 'Missed Dose', 
    severity: 'high',
    adherence: 64,
    lastActive: '15 mins ago',
    condition: 'Diabetes Type 2',
    medicine: 'Metformin (500mg)'
  },
  { 
    id: 'P2', 
    name: 'Sarah Jenkins', 
    age: 68, 
    status: 'On Track', 
    severity: 'low',
    adherence: 95,
    lastActive: '2 hours ago',
    condition: 'Hypertension',
    medicine: 'Lisinopril (10mg)'
  },
  { 
    id: 'P3', 
    name: 'Michael Chen', 
    age: 65, 
    status: 'Pending', 
    severity: 'medium',
    adherence: 82,
    lastActive: 'Just now',
    condition: 'High Cholesterol',
    medicine: 'Atorvastatin (20mg)'
  }
];

const CaregiverView = () => {
  const [selectedPatient, setSelectedPatient] = useState(patients[0]);
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, connected
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    return () => {
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, []);

  const simulateCall = async () => {
    setIsCalling(true);
    setCallStatus('calling');
    
    try {
      const response = await fetch('http://localhost:3001/api/caregiver/call-escalation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selectedPatient.id, patientName: selectedPatient.name })
      });
      
      if (response.ok) {
        const pollInterval = setInterval(async () => {
          const statusRes = await fetch('http://localhost:3001/api/caregiver/call-status');
          const data = await statusRes.json();
          setCallStatus(data.status);
          
          if (data.status === 'idle') {
            clearInterval(pollInterval);
            setIsCalling(false);
          }
        }, 1000);
      }
    } catch (err) {
      console.warn("Backend not running, simulating local call flow...");
      setTimeout(() => setCallStatus('connected'), 2000);
      setTimeout(() => {
        setCallStatus('idle');
        setIsCalling(false);
      }, 5000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-sans">Caregiver Command Center</h1>
            <p className="text-gray-500 mt-1">Real-time monitoring for your {patients.length} assigned patients.</p>
          </div>
          <div className={`px-3 py-1 rounded-full flex items-center gap-2 text-xs font-bold ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'ONLINE' : 'OFFLINE MODE'}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search patients..." 
            className="pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/20 outline-none w-full md:w-64 transition-all"
          />
        </div>
      </div>

      {/* Critical Alerts Bar */}
      <div className={`bg-red-50 border border-red-100 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm transition-all ${isCalling ? 'ring-4 ring-red-200' : ''}`}>
        <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-200">
          {isCalling ? <Phone className="animate-bounce" size={32} /> : <ShieldAlert size={32} />}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-bold text-red-900">
            {isCalling ? `Emergency Call: ${callStatus.toUpperCase()}...` : `Critical Alert: ${patients[0].name}`}
          </h3>
          <p className="text-red-700">
            {isCalling 
              ? `Connecting to ${selectedPatient.name}'s primary caregiver via Twilio...`
              : `Missed morning dose of ${patients[0].medicine}. No response to automated call.`}
          </p>
        </div>
        <button 
          onClick={simulateCall}
          disabled={isCalling}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white transition-all shadow-lg ${
            isCalling 
              ? 'bg-red-400 cursor-wait' 
              : 'bg-red-600 hover:bg-red-700 shadow-red-200 active:scale-95'
          }`}
        >
          {isCalling ? <Activity className="animate-pulse" /> : <Phone size={20} />}
          {isCalling ? `Status: ${callStatus}` : "Escalate Call Now"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Patient List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
            <Users size={20} className="text-primary" /> Active Patients
          </h3>
          {patients.map((p) => (
            <div 
              key={p.id}
              onClick={() => setSelectedPatient(p)}
              className={`p-4 rounded-[2rem] border transition-all cursor-pointer group ${
                selectedPatient.id === p.id 
                  ? 'bg-white border-primary shadow-xl shadow-primary/10' 
                  : 'bg-white border-gray-100 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${
                  p.severity === 'high' ? 'bg-red-100 text-red-600' : 
                  p.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {p.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{p.name}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs font-medium uppercase tracking-tighter">
                     <span className={`${
                        p.severity === 'high' ? 'text-red-500' : 
                        p.severity === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                     }`}>{p.status}</span>
                     <span className="text-gray-300">•</span>
                     <span className="text-gray-400">{p.lastActive}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">{p.adherence}%</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Adherence</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Patient Details View */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-8">
              <div className="flex gap-6 items-center">
                <div className="w-24 h-24 rounded-3xl bg-gray-50 border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold text-primary overflow-hidden">
                  {selectedPatient.name[0]}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{selectedPatient.name}</h2>
                  <p className="text-gray-500 font-medium">{selectedPatient.age} years old • {selectedPatient.condition}</p>
                  <div className="flex gap-2 mt-4">
                    <button className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold border border-gray-100 hover:bg-gray-100 transition-colors flex items-center gap-2">
                      <MessageSquare size={16} /> Send Message
                    </button>
                    <button className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold border border-primary/10 hover:bg-primary/20 transition-colors flex items-center gap-2">
                      <HeartPulse size={16} /> Health Vitals
                    </button>
                  </div>
                </div>
              </div>
              <button className="p-3 text-gray-400 hover:bg-gray-50 rounded-2xl transition-colors">
                <MoreVertical size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                  <TrendingDown size={16} /> Adherence Trends
                </h4>
                <div className="flex items-end gap-2 h-32 mb-4 px-2">
                  {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary/20 rounded-t-lg relative group transition-all hover:bg-primary/40" style={{ height: `${h}%` }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{h}%</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase px-2">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </div>

              <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                  <History size={16} /> Recent Activity
                </h4>
                <div className="space-y-4">
                  <ActivityLog time="08:00 AM" text="Missed Metformin" type="error" />
                  <ActivityLog time="Yesterday" text="Took Lisinopril" type="success" />
                  <ActivityLog time="Yesterday" text="Took Atorvastatin" type="success" />
                  <ActivityLog time="Yesterday" text="Refill Reminder Sent" type="info" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityLog = ({ time, text, type }) => {
  const types = {
    error: 'bg-red-500',
    success: 'bg-emerald-500',
    info: 'bg-blue-500',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${types[type]}`}></div>
      <div className="flex-1">
        <p className="text-xs font-bold text-gray-800">{text}</p>
        <p className="text-[10px] text-gray-400">{time}</p>
      </div>
    </div>
  );
};



export default CaregiverView;
