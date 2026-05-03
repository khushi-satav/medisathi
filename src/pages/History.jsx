import React, { useState } from 'react';
import { 
  History as HistoryIcon, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const chartData = [
  { week: 'W1', adherence: 70 },
  { week: 'W2', adherence: 85 },
  { week: 'W3', adherence: 90 },
  { week: 'W4', adherence: 100 },
  { week: 'W5', adherence: 60 },
  { week: 'W6', adherence: 80 },
  { week: 'W7', adherence: 95 },
  { week: 'W8', adherence: 100 },
];

const calendarDays = [
  { day: 1, status: 'taken' }, { day: 2, status: 'missed' }, { day: 3, status: 'partial' }, { day: 4, status: 'partial' }, { day: 5, status: 'partial' },
  { day: 6, status: 'partial' }, { day: 7, status: 'partial' }, { day: 8, status: 'partial' }, { day: 9, status: 'taken' }, { day: 10, status: 'taken' },
  { day: 11, status: 'taken' }, { day: 12, status: 'taken' }, { day: 13, status: 'taken' }, { day: 14, status: 'taken' }, { day: 15, status: 'taken' },
  { day: 16, status: 'taken' }, { day: 17, status: 'taken' }, { day: 18, status: 'taken' }, { day: 19, status: 'taken' }, { day: 20, status: 'partial' },
  { day: 21, status: 'taken' }, { day: 22, status: 'partial' }, { day: 23, status: 'missed' }, { day: 24, status: 'partial' }
];

const History = () => {
  const [selectedDay, setSelectedDay] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'taken': return 'bg-emerald-50 text-emerald-500 border-emerald-100';
      case 'partial': return 'bg-orange-50 text-orange-400 border-orange-100';
      case 'missed': return 'bg-red-50 text-red-400 border-red-100';
      default: return 'bg-gray-50 text-gray-300 border-gray-100';
    }
  };

  const getDotColor = (status) => {
    switch (status) {
      case 'taken': return 'bg-emerald-500';
      case 'partial': return 'bg-orange-400';
      case 'missed': return 'bg-red-400';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-sans">History & Insights</h1>
          <p className="text-gray-500 mt-1">Track your adherence trends and detailed logs over time.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
          <Download size={18} />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Section */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-blue-600 font-bold">
              <CalendarIcon size={20} />
              April 2026
            </div>
            <div className="flex gap-2">
              <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
              <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors"><ChevronRight size={20} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-4 mb-8">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} className="text-center text-[10px] font-black text-gray-400 tracking-widest">{day}</div>
            ))}
            
            {/* Empty days for Sunday/Monday/Tuesday */}
            <div className="h-20"></div>
            <div className="h-20"></div>
            <div className="h-20"></div>

            {calendarDays.map((d) => (
              <div 
                key={d.day}
                onClick={() => setSelectedDay(d)}
                className={`h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 ${
                  selectedDay?.day === d.day ? 'ring-2 ring-blue-400 border-blue-100' : getStatusColor(d.status)
                }`}
              >
                <span className="text-sm font-bold opacity-60">{d.day}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${getDotColor(d.status)}`}></div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-6 pt-6 border-t border-gray-50">
            <LegendItem color="bg-emerald-500" label="Taken" />
            <LegendItem color="bg-orange-400" label="Partial" />
            <LegendItem color="bg-red-400" label="Missed" />
          </div>
        </div>

        {/* Right Column: Chart & Daily Log */}
        <div className="space-y-8">
          {/* Bar Chart Card */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <div className="flex items-center gap-2 text-blue-600 font-bold mb-6">
                <HistoryIcon size={18} />
                8-Week Trend
             </div>
             <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#9ca3af'}} />
                    <YAxis hide={true} domain={[0, 110]} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="adherence" radius={[6, 6, 6, 6]} barSize={20}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.adherence >= 90 ? '#10b981' : entry.adherence >= 70 ? '#10b98199' : '#f59e0b'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Daily Log Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm min-h-[300px]">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Daily Log</h3>
            {!selectedDay ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <p className="text-sm font-medium">Select a day to view log</p>
                <p className="text-xs mt-2">No day selected</p>
              </div>
            ) : (
              <div className="space-y-6 mt-6">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900">April {selectedDay.day}, 2026</p>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    selectedDay.status === 'taken' ? 'bg-emerald-100 text-emerald-600' :
                    selectedDay.status === 'partial' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {selectedDay.status}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <LogItem time="08:00 AM" name="Metformin" status="Taken" />
                  <LogItem time="01:00 PM" name="Lisinopril" status={selectedDay.status === 'missed' ? 'Missed' : 'Taken'} />
                  <LogItem time="08:00 PM" name="Metformin" status={selectedDay.status === 'taken' ? 'Taken' : 'Pending'} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const LegendItem = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
    <span className="text-xs font-bold text-gray-500">{label}</span>
  </div>
);

const LogItem = ({ time, name, status }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-lg ${status === 'Taken' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
        {status === 'Taken' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900">{name}</p>
        <p className="text-[10px] text-gray-400 flex items-center gap-1">
          <Clock size={10} /> {time}
        </p>
      </div>
    </div>
    <span className={`text-[10px] font-bold uppercase ${status === 'Taken' ? 'text-emerald-500' : 'text-red-500'}`}>{status}</span>
  </div>
);

export default History;
