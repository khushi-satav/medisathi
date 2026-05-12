'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { prescriptionsService } from '@/services/api';

export default function ScanRx() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const res = await prescriptionsService.upload(file);
      setResult(res.data);
      toast.success('Prescription processed successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Error processing prescription');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-2xl mx-auto space-y-6 transition-all duration-300 hover:shadow-2xl border border-zinc-100 dark:border-zinc-800">
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
        {!preview ? (
          <>
            <Upload className="w-12 h-12 text-zinc-400 mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">Upload your prescription image</p>
            <input 
              type="file" 
              accept="image/*"
              className="hidden" 
              id="rx-upload"
              onChange={handleFileChange} 
            />
            <Button asChild variant="outline" className="cursor-pointer">
              <label htmlFor="rx-upload">Choose File</label>
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 mb-4 rounded-lg overflow-hidden border border-zinc-200">
              <Image src={preview} alt="Prescription" fill className="object-cover" />
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => { setFile(null); setPreview(null); }}>
                Change
              </Button>
              <Button onClick={handleUpload} disabled={isProcessing} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md">
                {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Process Prescription'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-xl font-bold text-green-800 dark:text-green-400 flex items-center mb-4">
            <CheckCircle className="w-6 h-6 mr-2" /> Extracted Medications
          </h3>
          <div className="space-y-3">
            {result.extractedMedicines?.map((med: any, idx: number) => (
              <div key={idx} className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-700 flex justify-between items-center">
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">{med.name}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{med.dosage} - {med.form}</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs rounded-full font-medium">
                    {med.foodInstruction.replace('_', ' ')}
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
