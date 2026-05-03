import React, { useState } from 'react';
import { 
  Pill, 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  ChevronRight,
  AlertCircle,
  MoreVertical,
  Check
} from 'lucide-react';

const initialMedications = [
  { 
    id: 1, 
    name: 'Metformin', 
    dosage: '500mg', 
    timing: 'After meal',
    category: 'DIABETES',
    nextDose: 'TODAY 8:00 AM',
    stock: 45,
    totalStock: 60,
    color: 'emerald'
  },
  { 
    id: 2, 
    name: 'Lisinopril', 
    dosage: '10mg', 
    timing: 'Before meal',
    category: 'HYPERTENSION',
    nextDose: 'TODAY 9:00 AM',
    stock: 12,
    totalStock: 60,
    color: 'amber'
  },
  { 
    id: 3, 
    name: 'Atorvastatin', 
    dosage: '20mg', 
    timing: 'With Food',
    category: 'CHOLESTEROL',
    nextDose: 'TODAY 2:00 PM',
    stock: 5,
    totalStock: 30,
    color: 'red',
    refillSoon: true
  },
  { 
    id: 4, 
    name: 'Vitamin D3', 
    dosage: '1000IU', 
    timing: 'After meal',
    category: 'SUPPLEMENT',
    nextDose: 'TODAY 8:00 PM',
    stock: 60,
    totalStock: 90,
    color: 'emerald'
  },
];

const Medications = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [meds, setMeds] = useState(initialMedications);

  const handleTakeDose = (id) => {
    setMeds(meds.map(med => {
      if (med.id === id && med.stock > 0) {
        return { ...med, stock: med.stock - 1, taken: true };
      }
      return med;
    }));
  };

  const filteredMeds = meds.filter(med => 
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">My Medications</h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">Keep track of your prescriptions and health supplements.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by name or condition..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-400 font-medium"
            />
          </div>
          <button className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-colors text-gray-600">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Medications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredMeds.map((med) => (
          <div key={med.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                  med.color === 'emerald' ? 'bg-emerald-50 text-emerald-500 shadow-emerald-100' :
                  med.color === 'amber' ? 'bg-amber-50 text-amber-500 shadow-amber-100' :
                  'bg-red-50 text-red-500 shadow-red-100'
                }`}>
                  <Pill size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 leading-tight">{med.name}</h3>
                  <p className="text-gray-500 font-medium">{med.dosage} • {med.timing}</p>
                </div>
              </div>
              <button className="p-2 text-gray-300 hover:text-gray-600 rounded-xl transition-colors">
                <MoreVertical size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{med.category}</span>
                  <span className="text-[10px] font-black text-blue-500 tracking-widest uppercase">NEXT: {med.nextDose}</span>
                </div>
                <div className="flex justify-between items-end mb-2">
                   <div>
                      <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">CURRENT STOCK</p>
                      <p className="text-lg font-black text-gray-800">{med.stock} <span className="text-xs font-bold text-gray-400 uppercase">units remaining</span></p>
                   </div>
                   {med.refillSoon && med.stock < 10 && (
                     <div className="flex items-center gap-1 text-red-500 font-black text-[10px] uppercase tracking-wider mb-1 animate-pulse">
                        <AlertCircle size={14} />
                        REFILL SOON
                     </div>
                   )}
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-6">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      med.color === 'emerald' ? 'bg-emerald-500' :
                      med.color === 'amber' ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${(med.stock / med.totalStock) * 100}%` }}
                  ></div>
                </div>

                <button 
                  onClick={() => handleTakeDose(med.id)}
                  disabled={med.taken}
                  className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                    med.taken 
                      ? 'bg-emerald-50 text-emerald-500 cursor-default' 
                      : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95'
                  }`}
                >
                  {med.taken ? <Check size={20} /> : null}
                  {med.taken ? 'Dose Taken' : 'Mark as Taken'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-10 right-10 w-16 h-16 bg-primary text-white rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group">
        <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>
    </div>
  );
};

export default Medications;
