'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicationsService } from '@/services/api';
import { Plus, Pill, Edit2, Trash2, ToggleLeft, ToggleRight, Clock, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const FREQUENCIES = ['once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'every_other_day', 'weekly', 'as_needed'];
const FREQ_LABELS: Record<string, string> = {
  once_daily: 'Once daily', twice_daily: 'Twice daily', three_times_daily: '3x daily',
  four_times_daily: '4x daily', every_other_day: 'Every other day', weekly: 'Weekly', as_needed: 'As needed',
};
const FOOD_OPTIONS = ['before_meal', 'after_meal', 'with_meal', 'empty_stomach', 'any_time'];
const FOOD_LABELS: Record<string, string> = {
  before_meal: 'Before meal', after_meal: 'After meal', with_meal: 'With meal',
  empty_stomach: 'Empty stomach', any_time: 'Anytime',
};
const MED_TYPES = ['tablet', 'capsule', 'syrup', 'injection', 'drops', 'inhaler', 'patch', 'cream', 'other'];
const COLOR_PILL: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-slate-100 text-slate-500',
};

const defaultForm = {
  name: '', genericName: '', type: 'tablet', dosage: '', frequency: 'once_daily',
  scheduledTimes: ['08:00'], foodInstruction: 'any_time', startDate: '', endDate: '',
  totalQuantity: '', refillAt: '', notes: '',
};

export default function MedicationsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['medications', showInactive],
    queryFn: () => medicationsService.getAll(!showInactive),
  });
  const medications = data?.data?.medications ?? [];

  const upF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setEditing(null); setForm({ ...defaultForm, startDate: new Date().toISOString().split('T')[0] }); setShowModal(true); };
  const openEdit = (med: any) => {
    setEditing(med);
    setForm({
      name: med.name, genericName: med.genericName || '', type: med.type,
      dosage: med.dosage, frequency: med.frequency,
      scheduledTimes: med.scheduledTimes || ['08:00'],
      foodInstruction: med.foodInstruction || 'any_time',
      startDate: med.startDate?.split('T')[0] || '',
      endDate: med.endDate?.split('T')[0] || '',
      totalQuantity: med.totalQuantity?.toString() || '',
      refillAt: med.refillAt?.toString() || '',
      notes: med.notes || '',
    });
    setShowModal(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      editing ? medicationsService.update(editing._id, payload) : medicationsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medications'] });
      qc.invalidateQueries({ queryKey: ['dose-today'] });
      toast.success(editing ? 'Medication updated!' : 'Medication added!');
      setShowModal(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to save'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      medicationsService.update(id, { isActive: active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications'] }),
    onError: () => toast.error('Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => medicationsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medications'] });
      toast.success('Medication removed');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.dosage) { toast.error('Name and dosage are required'); return; }
    saveMutation.mutate({
      ...form,
      totalQuantity: form.totalQuantity ? parseInt(form.totalQuantity) : undefined,
      refillAt: form.refillAt ? parseInt(form.refillAt) : undefined,
      endDate: form.endDate || undefined,
    });
  };

  const addTime = () => setForm(f => ({ ...f, scheduledTimes: [...f.scheduledTimes, '08:00'] }));
  const removeTime = (i: number) => setForm(f => ({ ...f, scheduledTimes: f.scheduledTimes.filter((_, idx) => idx !== i) }));
  const updateTime = (i: number, v: string) => setForm(f => ({ ...f, scheduledTimes: f.scheduledTimes.map((t, idx) => idx === i ? v : t) }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Medications</h1>
          <p className="text-slate-500 text-sm mt-1">{medications.length} medication{medications.length !== 1 ? 's' : ''} {showInactive ? 'total' : 'active'}</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 cursor-pointer text-sm text-slate-600">
            <input type="checkbox" className="hidden" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            <div className={`w-10 h-5.5 rounded-full relative transition-colors ${showInactive ? 'bg-indigo-600' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${showInactive ? 'translate-x-4.5' : ''}`} />
            </div>
            <span>Show inactive</span>
          </label>
          <button id="add-medication-btn" onClick={openAdd} className="btn-primary flex items-center space-x-2">
            <Plus size={18} />
            <span>Add Medication</span>
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : medications.length === 0 ? (
        <div className="card text-center py-16">
          <Pill size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-600">No medications yet</h3>
          <p className="text-slate-400 text-sm mb-6">Add your first medication or scan a prescription</p>
          <button onClick={openAdd} className="btn-primary mx-auto inline-flex items-center space-x-2">
            <Plus size={16} /> <span>Add Medication</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {medications.map((med: any) => (
            <div key={med._id} className={`card flex items-center justify-between transition-all ${!med.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold ${
                  med.isActive ? 'gradient-primary text-white' : 'bg-slate-200 text-slate-400'}`}>
                  <Pill size={22} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-slate-800">{med.name}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COLOR_PILL[med.isActive ? 'active' : 'inactive']}`}>
                      {med.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{med.dosage} · {FREQ_LABELS[med.frequency] || med.frequency}</p>
                  <div className="flex items-center space-x-3 mt-1">
                    {med.scheduledTimes?.map((t: string, i: number) => (
                      <span key={i} className="flex items-center text-xs text-slate-400">
                        <Clock size={11} className="mr-1" />{t}
                      </span>
                    ))}
                    <span className="text-xs text-slate-400">{FOOD_LABELS[med.foodInstruction] || med.foodInstruction}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {med.totalQuantity && (
                  <span className="text-xs text-slate-500 mr-2">Stock: {med.currentQuantity ?? '—'}</span>
                )}
                <button onClick={() => toggleActive.mutate({ id: med._id, active: !med.isActive })}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors" title="Toggle active">
                  {med.isActive ? <ToggleRight size={20} className="text-indigo-600" /> : <ToggleLeft size={20} />}
                </button>
                <button onClick={() => openEdit(med)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => { if (confirm(`Remove ${med.name}?`)) deleteMutation.mutate(med._id); }}
                  className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowModal(false)} />
          <div className="modal-content">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">{editing ? 'Edit Medication' : 'Add Medication'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Medication Name *</label>
                  <input id="med-name" className="input" placeholder="e.g. Metformin" value={form.name} onChange={e => upF('name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Generic Name</label>
                  <input className="input" placeholder="e.g. Metformin HCl" value={form.genericName} onChange={e => upF('genericName', e.target.value)} />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={e => upF('type', e.target.value)}>
                    {MED_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Dosage *</label>
                  <input className="input" placeholder="e.g. 500mg" value={form.dosage} onChange={e => upF('dosage', e.target.value)} />
                </div>
                <div>
                  <label className="label">Frequency</label>
                  <select className="input" value={form.frequency} onChange={e => upF('frequency', e.target.value)}>
                    {FREQUENCIES.map(f => <option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
                  </select>
                </div>
              </div>

              {/* Scheduled times */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Scheduled Times</label>
                  <button type="button" onClick={addTime} className="text-xs text-indigo-600 font-medium hover:underline flex items-center">
                    <Plus size={12} className="mr-1" /> Add time
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.scheduledTimes.map((t, i) => (
                    <div key={i} className="flex items-center space-x-1 bg-indigo-50 rounded-lg px-2 py-1">
                      <Clock size={14} className="text-indigo-500" />
                      <input type="time" className="bg-transparent text-sm text-indigo-700 font-medium outline-none w-24"
                        value={t} onChange={e => updateTime(i, e.target.value)} />
                      {form.scheduledTimes.length > 1 && (
                        <button type="button" onClick={() => removeTime(i)} className="text-slate-400 hover:text-red-500">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Food Instruction</label>
                <select className="input" value={form.foodInstruction} onChange={e => upF('foodInstruction', e.target.value)}>
                  {FOOD_OPTIONS.map(o => <option key={o} value={o}>{FOOD_LABELS[o]}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" className="input" value={form.startDate} onChange={e => upF('startDate', e.target.value)} />
                </div>
                <div>
                  <label className="label">End Date (optional)</label>
                  <input type="date" className="input" value={form.endDate} onChange={e => upF('endDate', e.target.value)} />
                </div>
                <div>
                  <label className="label">Total Quantity</label>
                  <input type="number" className="input" placeholder="e.g. 30" value={form.totalQuantity} onChange={e => upF('totalQuantity', e.target.value)} />
                </div>
                <div>
                  <label className="label">Refill Alert At</label>
                  <input type="number" className="input" placeholder="e.g. 5" value={form.refillAt} onChange={e => upF('refillAt', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none h-20" placeholder="Any special instructions..." value={form.notes} onChange={e => upF('notes', e.target.value)} />
              </div>

              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button id="save-medication-btn" type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1 flex items-center justify-center">
                  {saveMutation.isPending ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (editing ? 'Save Changes' : 'Add Medication')}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
