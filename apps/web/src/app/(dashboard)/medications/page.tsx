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
  active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-border text-muted',
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
          <h1 className="text-3xl font-bold text-foreground">My Medications</h1>
          <p className="text-muted text-base mt-1">{medications.length} medication{medications.length !== 1 ? 's' : ''} {showInactive ? 'total' : 'active'}</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer text-sm text-foreground font-medium">
            <input type="checkbox" className="hidden" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            <div className={`w-12 h-6 rounded-full relative transition-colors ${showInactive ? 'bg-primary' : 'bg-border border border-border'}`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showInactive ? 'translate-x-6' : ''}`} />
            </div>
            <span>Show inactive</span>
          </label>
          <button id="add-medication-btn" onClick={openAdd} className="btn-primary flex items-center space-x-2 shadow-warm rounded-2xl py-2.5 px-5">
            <Plus size={20} />
            <span className="font-bold">Add Medication</span>
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-3xl" />)}
        </div>
      ) : medications.length === 0 ? (
        <div className="bg-card rounded-3xl shadow-card border border-border text-center py-20">
          <Pill size={56} className="mx-auto text-muted/40 mb-5" />
          <h3 className="text-2xl font-bold text-foreground mb-2">No medications yet</h3>
          <p className="text-muted text-base mb-8">Add your first medication or scan a prescription</p>
          <button onClick={openAdd} className="btn-primary mx-auto inline-flex items-center space-x-2 px-6 py-3 text-lg rounded-2xl shadow-warm">
            <Plus size={20} /> <span className="font-bold">Add Medication</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {medications.map((med: any) => (
            <div key={med._id} className={`bg-card rounded-3xl shadow-sm border border-border p-5 flex items-center justify-between transition-all hover:shadow-card hover:border-primary/20 ${!med.isActive ? 'opacity-60 bg-background' : ''}`}>
              <div className="flex items-center space-x-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-sm ${
                  med.isActive ? 'gradient-primary text-white shadow-warm' : 'bg-border text-muted'}`}>
                  <Pill size={26} />
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="font-bold text-foreground text-lg">{med.name}</h3>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${COLOR_PILL[med.isActive ? 'active' : 'inactive']}`}>
                      {med.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-base text-muted font-medium">{med.dosage} · {FREQ_LABELS[med.frequency] || med.frequency}</p>
                  <div className="flex items-center space-x-3 mt-1.5">
                    {med.scheduledTimes?.map((t: string, i: number) => (
                      <span key={i} className="flex items-center text-sm text-foreground bg-background px-2 py-0.5 rounded-md border border-border">
                        <Clock size={14} className="mr-1.5 text-primary" />{t}
                      </span>
                    ))}
                    <span className="text-sm text-secondary-dark bg-secondary/20 px-2 py-0.5 rounded-md font-medium">{FOOD_LABELS[med.foodInstruction] || med.foodInstruction}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {med.totalQuantity && (
                  <span className="text-sm font-semibold text-muted mr-3 bg-background px-3 py-1 rounded-lg border border-border">Stock: {med.currentQuantity ?? '—'}</span>
                )}
                <button onClick={() => toggleActive.mutate({ id: med._id, active: !med.isActive })}
                  className="p-2.5 rounded-xl hover:bg-secondary/10 text-muted transition-colors" title="Toggle active">
                  {med.isActive ? <ToggleRight size={24} className="text-primary" /> : <ToggleLeft size={24} />}
                </button>
                <button onClick={() => openEdit(med)} className="p-2.5 rounded-xl hover:bg-secondary/10 text-muted hover:text-primary transition-colors">
                  <Edit2 size={20} />
                </button>
                <button onClick={() => { if (confirm(`Remove ${med.name}?`)) deleteMutation.mutate(med._id); }}
                  className="p-2.5 rounded-xl hover:bg-red-50 text-muted hover:text-red-500 transition-colors">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 transition-opacity" onClick={() => setShowModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-card rounded-[2rem] shadow-2xl z-50 overflow-hidden max-h-[90vh] overflow-y-auto border border-border">
            <div className="flex items-center justify-between p-6 sm:p-8 border-b border-border bg-background/50">
              <h2 className="text-2xl font-bold text-foreground">{editing ? 'Edit Medication' : 'Add Medication'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2.5 hover:bg-border rounded-xl text-muted transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="label text-foreground font-semibold mb-1.5 block">Medication Name *</label>
                  <input id="med-name" className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" placeholder="e.g. Metformin" value={form.name} onChange={e => upF('name', e.target.value)} />
                </div>
                <div>
                  <label className="label text-foreground font-semibold mb-1.5 block">Generic Name</label>
                  <input className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" placeholder="e.g. Metformin HCl" value={form.genericName} onChange={e => upF('genericName', e.target.value)} />
                </div>
                <div>
                  <label className="label text-foreground font-semibold mb-1.5 block">Type</label>
                  <select className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" value={form.type} onChange={e => upF('type', e.target.value)}>
                    {MED_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-foreground font-semibold mb-1.5 block">Dosage *</label>
                  <input className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" placeholder="e.g. 500mg" value={form.dosage} onChange={e => upF('dosage', e.target.value)} />
                </div>
                <div>
                  <label className="label text-foreground font-semibold mb-1.5 block">Frequency</label>
                  <select className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" value={form.frequency} onChange={e => upF('frequency', e.target.value)}>
                    {FREQUENCIES.map(f => <option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
                  </select>
                </div>
              </div>

              {/* Scheduled times */}
              <div className="bg-secondary/10 p-5 rounded-3xl border border-secondary/30">
                <div className="flex items-center justify-between mb-4">
                  <label className="label text-foreground font-bold mb-0 block">Scheduled Times</label>
                  <button type="button" onClick={addTime} className="text-sm text-primary font-bold hover:text-primary-dark transition-colors flex items-center bg-white px-3 py-1.5 rounded-xl border border-primary/20 shadow-sm">
                    <Plus size={16} className="mr-1.5" /> Add time
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {form.scheduledTimes.map((t, i) => (
                    <div key={i} className="flex items-center space-x-2 bg-card rounded-2xl px-3 py-2 border border-border shadow-sm">
                      <Clock size={16} className="text-primary" />
                      <input type="time" className="bg-transparent text-base text-foreground font-bold outline-none w-24"
                        value={t} onChange={e => updateTime(i, e.target.value)} />
                      {form.scheduledTimes.length > 1 && (
                        <button type="button" onClick={() => removeTime(i)} className="text-muted hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="label text-foreground font-semibold mb-1.5 block">Food Instruction</label>
                <select className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" value={form.foodInstruction} onChange={e => upF('foodInstruction', e.target.value)}>
                  {FOOD_OPTIONS.map(o => <option key={o} value={o}>{FOOD_LABELS[o]}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="label text-foreground font-semibold mb-1.5 block">Start Date</label>
                  <input type="date" className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" value={form.startDate} onChange={e => upF('startDate', e.target.value)} />
                </div>
                <div>
                  <label className="label text-foreground font-semibold mb-1.5 block">End Date (optional)</label>
                  <input type="date" className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" value={form.endDate} onChange={e => upF('endDate', e.target.value)} />
                </div>
                <div>
                  <label className="label text-foreground font-semibold mb-1.5 block">Total Quantity</label>
                  <input type="number" className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" placeholder="e.g. 30" value={form.totalQuantity} onChange={e => upF('totalQuantity', e.target.value)} />
                </div>
                <div>
                  <label className="label text-foreground font-semibold mb-1.5 block">Refill Alert At</label>
                  <input type="number" className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3" placeholder="e.g. 5" value={form.refillAt} onChange={e => upF('refillAt', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label text-foreground font-semibold mb-1.5 block">Notes</label>
                <textarea className="input w-full bg-background border-border focus:border-primary focus:ring-primary/20 rounded-2xl px-4 py-3 resize-none h-24" placeholder="Any special instructions..." value={form.notes} onChange={e => upF('notes', e.target.value)} />
              </div>

              <div className="flex space-x-4 pt-4 border-t border-border mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-3.5 rounded-2xl text-lg font-bold bg-background hover:bg-border transition-colors border border-border">Cancel</button>
                <button id="save-medication-btn" type="submit" disabled={saveMutation.isPending} className="btn-primary flex-[2] flex items-center justify-center py-3.5 rounded-2xl text-lg shadow-warm hover:shadow-elevated transition-all">
                  {saveMutation.isPending ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (editing ? 'Save Changes' : 'Add Medication')}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
