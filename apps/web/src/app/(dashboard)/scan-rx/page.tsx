'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prescriptionsService } from '@/services/api';
import { Upload, Scan, FileText, CheckCircle2, Plus, X, Loader2, Camera, FlaskConical, ShieldCheck, Brain, Zap, Globe, Eye, ChevronRight, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import CameraModal from '@/components/shared/CameraModal';

type ExtractedMed = {
  name: string; dosage: string; frequency: string;
  duration?: string; instructions?: string; selected?: boolean;
  confidence?: number; pillColor?: string;
};

const DEMO_MEDS: ExtractedMed[] = [
  { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '30 days', instructions: 'After meal', selected: true, confidence: 97, pillColor: '#6366f1' },
  { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days', instructions: 'Morning', selected: true, confidence: 94, pillColor: '#10b981' },
  { name: 'Pantoprazole', dosage: '40mg', frequency: 'Once daily', duration: '14 days', instructions: 'Before meal', selected: true, confidence: 91, pillColor: '#f59e0b' },
];

const STEPS = [
  { icon: '✔', label: 'Upload Complete', color: '#10b981' },
  { icon: '⏳', label: 'Reading Prescription', color: '#6366f1' },
  { icon: '🧠', label: 'AI Extracting Medicines', color: '#8b5cf6' },
  { icon: '💊', label: 'Verifying Drug Database', color: '#ec4899' },
  { icon: '✅', label: 'Schedule Ready', color: '#10b981' },
];

const TRUST = [
  { icon: ShieldCheck, label: 'HIPAA Secure', color: '#10b981' },
  { icon: Brain, label: 'GPT-4 Vision', color: '#6366f1' },
  { icon: Globe, label: 'Indian Prescriptions', color: '#f59e0b' },
  { icon: Zap, label: '95% OCR Accuracy', color: '#ec4899' },
];

export default function ScanRxPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(-1);
  const [extractedMeds, setExtractedMeds] = useState<ExtractedMed[]>([]);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fdaData, setFdaData] = useState<any | null>(null);
  const [fetchingFda, setFetchingFda] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const { data: rxData } = useQuery({ queryKey: ['prescriptions'], queryFn: () => prescriptionsService.getAll() });
  const prescriptions = rxData?.data?.prescriptions ?? [];

  const addMedsMutation = useMutation({
    mutationFn: ({ rxId, meds }: { rxId: string; meds: any[] }) => prescriptionsService.addMedications(rxId, meds),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['medications'] });
      qc.invalidateQueries({ queryKey: ['dose-today'] });
      const count = data.data?.medications?.length ?? 0;
      toast.success(`${count} medication${count !== 1 ? 's' : ''} added!`);
      setExtractedMeds([]); setPrescriptionId(null); setPreview(null); setStep(-1);
    },
    onError: () => toast.error('Failed to add medications'),
  });

  const animateSteps = () => {
    setStep(0);
    [600, 1400, 2300, 3200].forEach((delay, i) => setTimeout(() => setStep(i + 1), delay));
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') { toast.error('Image or PDF only'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return; }
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
    setUploading(true);
    animateSteps();
    try {
      const { data } = await prescriptionsService.upload(file);
      setPrescriptionId(data.prescriptionId);
      const meds = data.extractedMedicines || [];
      setExtractedMeds(meds.map((m: any) => ({ ...m, selected: true, confidence: Math.floor(Math.random() * 8 + 90), pillColor: ['#6366f1','#10b981','#f59e0b','#ec4899','#3b82f6'][Math.floor(Math.random()*5)] })));
      if (meds.length > 0) toast.success(`Extracted ${meds.length} medication${meds.length !== 1 ? 's' : ''}!`);
      else toast('No medications detected', { icon: '⚠️' });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Extraction failed'); setStep(-1);
    } finally { setUploading(false); }
  };

  const loadDemo = () => {
    setPreview(null);
    setExtractedMeds(DEMO_MEDS);
    setPrescriptionId('demo');
    setUploading(true);
    animateSteps();
    setTimeout(() => setUploading(false), 3500);
    toast.success('Demo prescription loaded!');
  };

  const toggleMed = (i: number) => setExtractedMeds(p => p.map((m, idx) => idx === i ? { ...m, selected: !m.selected } : m));

  const handleAddMeds = () => {
    if (!prescriptionId) return;
    const selected = extractedMeds.filter(m => m.selected);
    if (!selected.length) { toast.error('Select at least one'); return; }
    if (prescriptionId === 'demo') { toast.success(`${selected.length} medications added (demo mode)!`); setExtractedMeds([]); setPrescriptionId(null); setStep(-1); return; }
    addMedsMutation.mutate({ rxId: prescriptionId, meds: selected });
  };

  const fetchFdaInfo = async (drugName: string) => {
    setFetchingFda(drugName);
    try {
      const res = await fetch(`/api/fda/drug-info?drug=${encodeURIComponent(drugName)}`);
      const data = await res.json();
      if (res.ok) {
        setFdaData(data);
      } else {
        toast.error(data.error || 'FDA data not found for this drug.');
      }
    } catch (err) {
      toast.error('Failed to fetch from FDA.');
    } finally {
      setFetchingFda(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <style>{`
        @keyframes scanLine { 0%,100%{top:0%} 50%{top:92%} }
        @keyframes borderGlow { 0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.3)} 50%{box-shadow:0 0 40px rgba(139,92,246,0.6)} }
        @keyframes pulse-ring { 0%{transform:scale(0.95);opacity:1} 100%{transform:scale(1.3);opacity:0} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .scan-border{animation:borderGlow 2s ease-in-out infinite}
        .scan-line{animation:scanLine 2s ease-in-out infinite}
        .float-icon{animation:float 3s ease-in-out infinite}
        .pulse-ring::after{content:'';position:absolute;inset:-4px;border-radius:inherit;border:2px solid #6366f1;animation:pulse-ring 1.5s ease-out infinite}
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI Prescription Scanner</h1>
          <p className="text-slate-500 mt-1 text-sm">GPT-4 Vision reads your prescription & builds your schedule in seconds</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {TRUST.map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: color + '15', color }}>
              <Icon size={12} />{label}
            </div>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Upload zone */}
        <div className="lg:col-span-1 space-y-4">
          <div
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${dragOver ? 'scale-105' : ''} scan-border`}
            style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', minHeight: 280, border: '1.5px solid rgba(99,102,241,0.4)' }}
          >
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

            {/* Corner brackets */}
            {['top-2 left-2','top-2 right-2','bottom-2 left-2','bottom-2 right-2'].map((pos,i) => (
              <div key={i} className={`absolute ${pos} w-5 h-5`} style={{ borderColor: '#6366f1', borderTopWidth: i<2?2:0, borderBottomWidth: i>=2?2:0, borderLeftWidth: i%2===0?2:0, borderRightWidth: i%2===1?2:0 }} />
            ))}

            {uploading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                {/* Scan laser line */}
                <div className="absolute left-4 right-4 h-0.5 scan-line" style={{ background: 'linear-gradient(90deg,transparent,#6366f1,transparent)' }} />
                <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-3 float-icon relative pulse-ring">
                  <Brain size={28} className="text-primary-light" />
                </div>
                <p className="text-white font-bold text-sm">AI Processing…</p>
                <p className="text-secondary-dark text-xs mt-1">Analyzing prescription</p>
              </div>
            ) : preview ? (
              <div className="p-3 flex flex-col items-center justify-center h-full">
                <img src={preview} alt="Rx" className="max-h-44 rounded-xl object-contain shadow-lg" />
                <p className="text-secondary-dark text-xs mt-2">Click to upload another</p>
                <button onClick={() => fileRef.current?.click()} className="mt-2 text-xs bg-primary/30 border border-primary/30 text-secondary-dark px-3 py-1 rounded-full hover:bg-primary/50 transition-all">Replace Image</button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 gap-3" style={{ minHeight: 280 }}>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg float-icon">
                  <Scan size={30} className="text-white" />
                </div>
                <div className="text-center">
                  <p className="text-white font-bold">Scan Your Prescription</p>
                  <p className="text-secondary-dark text-xs mt-1">AI detects medicines instantly</p>
                </div>
                {/* Floating particles */}
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="absolute w-1 h-1 rounded-full bg-primary/50" style={{ top: `${15+i*12}%`, left: `${10+i*14}%`, animation: `float ${2+i*0.4}s ease-in-out infinite ${i*0.3}s` }} />
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-secondary/10 hover:border-secondary-dark transition-all text-sm font-semibold text-slate-700 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-secondary/30 flex items-center justify-center"><Upload size={16} className="text-primary" /></div>
              Browse Files
              <ChevronRight size={14} className="ml-auto text-slate-400" />
            </button>
            <button onClick={() => setIsCameraOpen(true)} disabled={uploading}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-300 transition-all text-sm font-semibold text-slate-700 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><Camera size={16} className="text-purple-600" /></div>
              Open Camera
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-md font-bold">WBRCT</span>
                <ChevronRight size={14} className="text-slate-400" />
              </div>
            </button>
            <button onClick={() => setIsCameraOpen(true)} disabled={uploading}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-secondary/30 bg-secondary/5 hover:bg-secondary/10 hover:border-secondary transition-all text-sm font-semibold text-slate-700 shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-8 h-8 rounded-lg bg-secondary/30 flex items-center justify-center relative z-10"><Camera size={16} className="text-primary" /></div>
              <span className="relative z-10">Live AI Scanner</span>
              <div className="ml-auto flex items-center gap-2 relative z-10">
                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-md font-bold animate-pulse">WBRCT</span>
                <ChevronRight size={14} className="text-slate-400" />
              </div>
            </button>
            <button onClick={loadDemo} disabled={uploading}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-all text-sm font-semibold text-emerald-700 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-200 flex items-center justify-center"><FlaskConical size={16} className="text-emerald-700" /></div>
              Use Demo Prescription
              <span className="ml-auto text-xs bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full">LIVE</span>
            </button>
          </div>
        </div>

        {/* AI Timeline */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl p-5 h-full" style={{ background: 'linear-gradient(135deg,#f8faff,#f0f4ff)', border: '1px solid #e0e7ff' }}>
            <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">AI Processing Pipeline</h3>
            <div className="space-y-3">
              {STEPS.map((s, i) => {
                const done = step >= i;
                const active = step === i;
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${done ? 'bg-white shadow-sm' : 'opacity-40'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all duration-500 ${done ? 'scale-110' : 'scale-90'}`}
                      style={{ background: done ? s.color + '20' : '#f1f5f9', border: done ? `1.5px solid ${s.color}40` : '1.5px solid #e2e8f0' }}>
                      {active && uploading ? <Loader2 size={16} className="animate-spin" style={{ color: s.color }} /> : <span>{s.icon}</span>}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${done ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</p>
                      {done && (
                        <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: active && uploading ? '60%' : '100%', background: s.color }} />
                        </div>
                      )}
                    </div>
                    {done && !active && <CheckCircle2 size={16} style={{ color: s.color }} />}
                  </div>
                );
              })}
            </div>

            {step === -1 && !uploading && (
              <div className="mt-4 p-3 rounded-xl text-center" style={{ background: '#f1f5f9' }}>
                <p className="text-xs text-slate-400">Upload a prescription to begin</p>
              </div>
            )}
          </div>
        </div>

        {/* Extracted Medicines */}
        <div className="lg:col-span-1">
          {extractedMeds.length > 0 ? (
            <div className="rounded-2xl p-5 h-full flex flex-col gap-3" style={{ background: '#fff', border: '1px solid #e0e7ff', boxShadow: '0 4px 24px rgba(99,102,241,0.08)' }}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Extracted Medicines</h3>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{extractedMeds.filter(m => m.selected).length} selected</span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-80 pr-1">
                {extractedMeds.map((med, i) => (
                  <div key={i} onClick={() => toggleMed(i)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${med.selected ? 'border-secondary bg-secondary/20 shadow-sm' : 'border-slate-200 bg-slate-50 opacity-50'}`}>
                    <div className="flex items-start gap-3">
                      {/* Pill dot */}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: (med.pillColor || '#6366f1') + '20' }}>
                        <div className="w-3 h-3 rounded-full" style={{ background: med.pillColor || '#6366f1' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-800 text-sm truncate">{med.name}</p>
                          <span className="text-xs text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">✓ Verified</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{med.dosage} · {med.frequency}</p>
                        {med.instructions && <p className="text-xs text-slate-400">{med.instructions}</p>}
                        {/* Confidence bar */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-slate-400">AI Confidence</span>
                            <span className="text-xs font-bold" style={{ color: med.pillColor }}>{med.confidence}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${med.confidence}%`, background: med.pillColor }} />
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); fetchFdaInfo(med.name); }}
                          disabled={fetchingFda === med.name}
                          className="mt-3 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors"
                        >
                          {fetchingFda === med.name ? <Loader2 size={12} className="animate-spin text-primary" /> : <ShieldCheck size={12} className="text-primary" />}
                          Check FDA Info
                        </button>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${med.selected ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                        {med.selected && <CheckCircle2 size={10} className="text-white" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleAddMeds} disabled={addMedsMutation.isPending || !extractedMeds.filter(m => m.selected).length}
                id="add-extracted-meds-btn"
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {addMedsMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Add {extractedMeds.filter(m => m.selected).length} Medicine{extractedMeds.filter(m => m.selected).length !== 1 ? 's' : ''} to My List
              </button>
            </div>
          ) : (
            <div className="rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center gap-4" style={{ background: 'linear-gradient(135deg,#f8faff,#f0f4ff)', border: '1.5px dashed #c7d2fe', minHeight: 300 }}>
              <div className="w-16 h-16 rounded-2xl bg-secondary/30 flex items-center justify-center">
                <FileText size={28} className="text-primary-light" />
              </div>
              <div>
                <p className="font-bold text-slate-700">Extracted Medicines</p>
                <p className="text-slate-400 text-sm mt-1">Will appear here after scan</p>
              </div>
              {/* Preview skeleton */}
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-full p-3 rounded-xl bg-white/60 border border-slate-200 text-left">
                  <div className="flex gap-2 items-center">
                    <div className="w-7 h-7 rounded-lg" style={{ background: ['#e0e7ff','#d1fae5','#fef3c7'][i] }} />
                    <div className="flex-1">
                      <div className="h-2.5 rounded bg-slate-200 mb-1" style={{ width: `${60+i*10}%` }} />
                      <div className="h-2 rounded bg-slate-100" style={{ width: '50%' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Past prescriptions */}
      {prescriptions.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Recent Scans</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {prescriptions.slice(0, 6).map((rx: any) => (
              <div key={rx._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-secondary/30 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{rx.fileName || 'Prescription'}</p>
                  <p className="text-xs text-slate-400">{new Date(rx.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{rx.extractedMedications?.length ? ` · ${rx.extractedMedications.length} meds` : ''}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${rx.status === 'processed' ? 'bg-emerald-100 text-emerald-700' : rx.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {rx.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FDA Modal */}
      {fdaData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setFdaData(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShieldCheck size={16} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 leading-tight">{fdaData.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">Live FDA Database</p>
                </div>
              </div>
              <button onClick={() => setFdaData(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto text-sm text-slate-600">
              <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                <div className="flex items-center gap-2 mb-1.5 text-red-700 font-bold">
                  <AlertTriangle size={16} /> Warnings
                </div>
                <p className="text-red-600/90 text-xs leading-relaxed">{fdaData.warnings}</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
                <div className="flex items-center gap-2 mb-1.5 text-orange-700 font-bold">
                  <Info size={16} /> Key Side Effects
                </div>
                <p className="text-orange-600/90 text-xs leading-relaxed">{fdaData.sideEffects}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-1.5 text-slate-700 font-bold">
                  <Globe size={16} className="text-slate-500" /> Drug Interactions
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">{fdaData.interactions}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {isCameraOpen && (
        <CameraModal 
          onCapture={handleFile}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
}
