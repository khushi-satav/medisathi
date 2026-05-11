'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prescriptionsService } from '@/services/api';
import { Upload, Scan, FileText, CheckCircle2, AlertCircle, Plus, X, Loader2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

type ExtractedMed = {
  name: string; dosage: string; frequency: string;
  duration?: string; instructions?: string; selected?: boolean;
};

export default function ScanRxPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extractedMeds, setExtractedMeds] = useState<ExtractedMed[]>([]);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data: rxData } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => prescriptionsService.getAll(),
  });
  const prescriptions = rxData?.data?.prescriptions ?? [];

  const addMedsMutation = useMutation({
    mutationFn: ({ rxId, meds }: { rxId: string; meds: any[] }) =>
      prescriptionsService.addMedications(rxId, meds),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['medications'] });
      qc.invalidateQueries({ queryKey: ['dose-today'] });
      const count = data.data?.medications?.length ?? 0;
      toast.success(`${count} medication${count !== 1 ? 's' : ''} added to your list!`);
      setExtractedMeds([]);
      setPrescriptionId(null);
      setPreview(null);
    },
    onError: () => toast.error('Failed to add medications'),
  });

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image or PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }

    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    setUploading(true);
    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(',')[1]);
        r.readAsDataURL(file);
      });

      const { data } = await prescriptionsService.upload({
        fileUrl: `prescription_${Date.now()}`,
        fileName: file.name,
        imageBase64: base64,
        mimeType: file.type,
      });

      setPrescriptionId(data.prescription._id);
      const meds = data.prescription.extractedMedications || [];
      setExtractedMeds(meds.map((m: any) => ({ ...m, selected: true })));

      if (meds.length > 0) {
        toast.success(`Extracted ${meds.length} medication${meds.length !== 1 ? 's' : ''}!`);
      } else {
        toast('No medications detected — try a clearer image', { icon: '⚠️' });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Extraction failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const toggleMed = (i: number) =>
    setExtractedMeds(prev => prev.map((m, idx) => idx === i ? { ...m, selected: !m.selected } : m));

  const handleAddMeds = () => {
    if (!prescriptionId) return;
    const selected = extractedMeds.filter(m => m.selected);
    if (selected.length === 0) { toast.error('Select at least one medication'); return; }
    addMedsMutation.mutate({ rxId: prescriptionId, meds: selected });
  };

  const viewing = prescriptions.find((p: any) => p._id === viewingId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Scan Prescription</h1>
        <p className="text-slate-500 text-sm mt-1">Upload a prescription image — AI will extract your medications automatically</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload zone */}
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => !uploading && fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
              ${uploading ? 'border-indigo-300 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50'}`}
          >
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

            {uploading ? (
              <div className="flex flex-col items-center">
                <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
                <p className="font-semibold text-indigo-700">Extracting medications with AI…</p>
                <p className="text-indigo-500 text-sm mt-1">This may take a few seconds</p>
              </div>
            ) : preview ? (
              <div>
                <img src={preview} alt="Prescription preview" className="max-h-56 mx-auto rounded-xl object-contain mb-3 shadow" />
                <p className="text-sm text-slate-500">Click to upload a different image</p>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Scan size={32} className="text-white" />
                </div>
                <p className="font-semibold text-slate-700 mb-1">Drop prescription image here</p>
                <p className="text-slate-400 text-sm mb-4">or click to browse files</p>
                <div className="flex items-center justify-center space-x-3 text-xs text-slate-400">
                  <span className="px-2 py-1 bg-slate-100 rounded">JPG</span>
                  <span className="px-2 py-1 bg-slate-100 rounded">PNG</span>
                  <span className="px-2 py-1 bg-slate-100 rounded">PDF</span>
                  <span>Max 10MB</span>
                </div>
              </div>
            )}
          </div>

          {/* AI features callout */}
          <div className="card bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white shrink-0">
                <Scan size={18} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">Powered by GPT-4o Vision</h4>
                <ul className="text-xs text-slate-500 mt-1 space-y-1">
                  <li>✓ Reads handwritten & printed prescriptions</li>
                  <li>✓ Extracts dosage, frequency & instructions</li>
                  <li>✓ Supports English, Hindi & regional scripts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Extracted medications */}
        <div>
          {extractedMeds.length > 0 ? (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Extracted Medications</h3>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                  {extractedMeds.filter(m => m.selected).length} selected
                </span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {extractedMeds.map((med, i) => (
                  <div key={i}
                    onClick={() => toggleMed(i)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      med.selected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{med.name}</p>
                        <p className="text-sm text-slate-500">{med.dosage} · {med.frequency}</p>
                        {med.duration && <p className="text-xs text-slate-400 mt-0.5">Duration: {med.duration}</p>}
                        {med.instructions && <p className="text-xs text-slate-400">{med.instructions}</p>}
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ml-3 shrink-0 mt-0.5 ${
                        med.selected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                        {med.selected && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddMeds}
                disabled={addMedsMutation.isPending || extractedMeds.filter(m => m.selected).length === 0}
                id="add-extracted-meds-btn"
                className="btn-primary w-full flex items-center justify-center space-x-2">
                {addMedsMutation.isPending
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Plus size={16} />}
                <span>Add {extractedMeds.filter(m => m.selected).length} Medication{extractedMeds.filter(m => m.selected).length !== 1 ? 's' : ''} to My List</span>
              </button>
            </div>
          ) : (
            <div className="card text-center py-12">
              <FileText size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="font-medium text-slate-500">Upload a prescription to extract medications</p>
            </div>
          )}
        </div>
      </div>

      {/* Past prescriptions */}
      {prescriptions.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-800 mb-4">Past Prescriptions</h3>
          <div className="space-y-2">
            {prescriptions.map((rx: any) => (
              <div key={rx._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <FileText size={16} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{rx.fileName || 'Prescription'}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(rx.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {rx.extractedMedications?.length ? ` · ${rx.extractedMedications.length} medications` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    rx.status === 'processed' ? 'bg-emerald-100 text-emerald-700' :
                    rx.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {rx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
