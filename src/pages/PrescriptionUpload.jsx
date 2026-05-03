import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Image as ImageIcon,
  Scan,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

const PrescriptionUpload = () => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Scanning, 3: Results
  const [ocrData, setOcrData] = useState(null);

  const handleUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setStep(2);
      setIsProcessing(true);
      
      // Simulate OCR processing
      setTimeout(() => {
        setIsProcessing(false);
        setStep(3);
        setOcrData({
          patient: "John Doe",
          date: "2026-05-03",
          medications: [
            { name: "Metformin", dosage: "500mg", frequency: "2x daily", timing: "After meals" },
            { name: "Atorvastatin", dosage: "20mg", frequency: "1x daily", timing: "Bedtime" }
          ]
        });
      }, 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">AI Prescription Scanner</h1>
        <p className="text-gray-500">Upload your prescription and let our AI schedule your medications automatically.</p>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
        <div className="flex border-b border-gray-50">
          <Tab step={1} current={step} label="Upload Photo" icon={<ImageIcon size={18} />} />
          <Tab step={2} current={step} label="AI Scanning" icon={<Scan size={18} />} />
          <Tab step={3} current={step} label="Review & Save" icon={<CheckCircle2 size={18} />} />
        </div>

        <div className="p-8 md:p-12">
          {step === 1 && (
            <div className="space-y-8">
              <label className="relative group cursor-pointer block">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*,.pdf" 
                  onChange={handleUpload}
                />
                <div className="border-4 border-dashed border-gray-100 group-hover:border-primary/30 rounded-[2rem] p-12 text-center transition-all bg-gray-50/50 group-hover:bg-primary/5">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:shadow-md group-hover:-translate-y-1 transition-all">
                    <Upload className="text-primary w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Select Prescription File</h3>
                  <p className="text-gray-500 max-w-xs mx-auto">Upload a clear photo of your handwritten or printed prescription (JPEG, PNG, PDF)</p>
                </div>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Feature icon={<ShieldCheck className="text-emerald-500" />} title="Privacy First" desc="Your data is encrypted and secure." />
                <Feature icon={<Scan className="text-blue-500" />} title="99% Accuracy" desc="Advanced Google Vision OCR." />
                <Feature icon={<AlertCircle className="text-amber-500" />} title="Doctor Verified" desc="AI cross-checks with drug database." />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="py-12 text-center space-y-6">
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-full border-4 border-primary/10 flex items-center justify-center">
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Scan className="w-8 h-8 text-primary animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Processing with Medi-AI</h3>
                <p className="text-gray-500 mt-2">Our AI is extracting medication names, dosages, and schedules...</p>
              </div>
              <div className="max-w-md mx-auto bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                <p className="text-sm font-medium text-gray-600">Connecting to Google Vision API...</p>
              </div>
            </div>
          )}

          {step === 3 && ocrData && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
              <div className="flex items-center gap-4 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-900">Prescription Scanned Successfully!</h3>
                  <p className="text-emerald-700 text-sm">We found {ocrData.medications.length} medications to schedule.</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-2">Detected Medications</h4>
                {ocrData.medications.map((med, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-primary/30 transition-all group">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm group-hover:shadow-md transition-all">
                      <FileText size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-lg">{med.name}</span>
                        <span className="px-2 py-0.5 bg-gray-200 rounded text-[10px] font-bold text-gray-600 uppercase tracking-tighter">Verified</span>
                      </div>
                      <p className="text-sm text-gray-500">{med.dosage} • {med.frequency} • {med.timing}</p>
                    </div>
                    <button className="p-3 text-gray-400 hover:text-primary hover:bg-white rounded-xl transition-all">
                      <ArrowRight size={20} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  onClick={() => window.location.href = '/medications'}
                  className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  Confirm & Schedule All
                </button>
                <button 
                  onClick={() => setStep(1)}
                  className="px-8 py-4 border border-gray-200 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Re-scan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Tab = ({ step, current, label, icon }) => (
  <div className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-2 transition-all ${
    current === step ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-400'
  }`}>
    {icon}
    <span className="font-bold text-sm hidden md:block">{label}</span>
  </div>
);

const Feature = ({ icon, title, desc }) => (
  <div className="text-center p-4">
    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100">
      {icon}
    </div>
    <h4 className="font-bold text-gray-900 text-sm mb-1">{title}</h4>
    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
  </div>
);

export default PrescriptionUpload;
