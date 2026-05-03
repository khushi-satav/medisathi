import React from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  Flame,
  Calendar,
  Activity,
  ShieldCheck,
  History,
  TrendingDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const data = [
  { name: 'Mon', adherence: 65 },
  { name: 'Tue', adherence: 80 },
  { name: 'Wed', adherence: 45 },
  { name: 'Thu', adherence: 90 },
  { name: 'Fri', adherence: 85 },
  { name: 'Sat', adherence: 100 },
  { name: 'Sun', adherence: 85 },
];

const Dashboard = ({ userName }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-sans">Welcome back, {userName.split(' ')[0]}!</h1>
          <p className="text-gray-500 mt-1">You have 4 medications scheduled for today.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <Flame className="text-orange-500 w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium tracking-wider">STREAK</p>
            <p className="text-lg font-bold text-gray-900">12 Days</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Daily Adherence" 
          value="85%" 
          trend="+5% from yesterday" 
          icon={<CheckCircle2 className="text-emerald-500" />}
          color="emerald"
        />
        <StatCard 
          title="Weekly Average" 
          value="92%" 
          trend="Top 10% of users" 
          icon={<Activity className="text-blue-500" />}
          color="blue"
        />
        <StatCard 
          title="Next Dose" 
          value="20:00" 
          trend="Metformin (500mg)" 
          icon={<Clock className="text-amber-500" />}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Adherence Trends</h3>
              <p className="text-sm text-gray-500">Your medication consistency over the last 7 days</p>
            </div>
            <select className="bg-gray-50 border-none rounded-lg text-sm font-medium px-3 py-2 outline-none cursor-pointer hover:bg-gray-100 transition-colors">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorAdherence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af' }} 
                  dy={10}
                />
                <YAxis 
                  hide={true}
                  domain={[0, 110]}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="adherence" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorAdherence)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights & Predictions */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">AI Health Insights</h3>
              <p className="text-xs text-gray-500 font-medium">Predictive Adherence Engine</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Missed Dose Prediction</span>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full text-purple-600 font-bold">92% CONFIDENCE</span>
              </div>
              <p className="text-sm text-purple-900 font-medium leading-relaxed">
                Based on your Sunday patterns, you are <span className="font-bold underline">likely to miss</span> your 22:00 Atorvastatin dose.
              </p>
              <button className="mt-4 w-full bg-white py-2 rounded-xl text-xs font-bold text-purple-600 hover:bg-purple-100 transition-colors shadow-sm">
                Set Pre-emptive Reminder
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Health Optimization</p>
              <p className="text-sm text-emerald-900 font-medium leading-relaxed">
                Taking Metformin with <span className="font-bold">protein-rich meals</span> has improved your morning energy by 15%.
              </p>
            </div>
          </div>
        </div>

        {/* Today's Schedule Preview */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Today's Schedule</h3>
            <Link to="/medications" className="text-primary text-sm font-semibold hover:underline">View All</Link>
          </div>
          <div className="space-y-4">
            <ScheduleItem 
              time="08:00" 
              name="Metformin" 
              status="Taken" 
              color="emerald" 
            />
            <ScheduleItem 
              time="13:00" 
              name="Lisinopril" 
              status="Taken" 
              color="emerald" 
            />
            <ScheduleItem 
              time="20:00" 
              name="Metformin" 
              status="Pending" 
              color="amber" 
            />
            <ScheduleItem 
              time="22:00" 
              name="Atorvastatin" 
              status="Upcoming" 
              color="gray" 
            />
          </div>
        </div>

        {/* History Insights Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <History size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Long-term History Insights</h3>
              <p className="text-xs text-gray-500 font-medium">Monthly Adherence Analysis</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 text-blue-600 mb-3">
                <TrendingUp size={18} />
                <span className="text-sm font-bold uppercase tracking-wider">Consistency Growth</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Your adherence has improved by <span className="font-bold text-emerald-600">14%</span> compared to last month. You are most consistent on <span className="font-bold">Tuesdays</span>.
              </p>
            </div>

            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 text-amber-600 mb-3">
                <TrendingDown size={18} />
                <span className="text-sm font-bold uppercase tracking-wider">Potential Risks</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Late-night doses (22:00+) show a <span className="font-bold text-amber-600">25% higher miss rate</span>. Consider moving them 30 mins earlier.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                  W{i}
                </div>
              ))}
            </div>
            <p className="text-xs font-medium text-gray-400">Current Month Progress: <span className="text-emerald-500 font-bold">Excellent</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, trend, icon, color }) => {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm card-hover">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>
          {React.cloneElement(icon, { size: 24 })}
        </div>
        <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">LIVE</span>
      </div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-gray-900 mt-1">{value}</h4>
      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
        <TrendingUp size={12} /> {trend}
      </p>
    </div>
  );
};

const ScheduleItem = ({ time, name, status, color }) => {
  const colorClasses = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    gray: 'bg-gray-300',
  };

  return (
    <div className="flex items-center gap-4 group cursor-pointer">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${colorClasses[color]} z-10 shadow-sm`}></div>
        <div className="w-0.5 h-12 bg-gray-100 -my-1"></div>
      </div>
      <div className="flex-1 bg-gray-50 group-hover:bg-gray-100 transition-colors p-4 rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-400">{time}</p>
          <p className="font-bold text-gray-800">{name}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          status === 'Taken' ? 'bg-emerald-100 text-emerald-600' : 
          status === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'
        }`}>
          {status}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
