'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Camera, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = async () => {
    setLoading(true);
    setError(null);
    
    // Stop any existing stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: false
      });
      
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setLoading(false);
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please ensure you have given permission.');
      setLoading(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
            onClose();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <div className="relative bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Camera size={18} className="text-primary-light" />
            </div>
            <h3 className="font-bold text-white text-sm">Live Scanner</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Preview */}
        <div className="relative aspect-[3/4] sm:aspect-video bg-black flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={40} className="text-primary animate-spin" />
              <p className="text-slate-400 text-sm">Initializing camera...</p>
            </div>
          )}
          
          {error && (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                <X size={32} className="text-red-500" />
              </div>
              <p className="text-red-400 font-medium">{error}</p>
              <Button variant="outline" onClick={startCamera} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                Try Again
              </Button>
            </div>
          )}

          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover ${loading || error ? 'hidden' : 'block'}`}
          />

          {/* Scanner Overlay */}
          {!loading && !error && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
               <div className="w-[80%] h-[60%] border-2 border-white/30 rounded-3xl relative">
                  {/* Corner brackets */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-right-4 border-primary rounded-tr-xl" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-right-4 border-primary rounded-br-xl" />
                  
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-0 h-0.5 bg-primary/50 shadow-[0_0_15px_rgba(99,102,241,0.8)] scan-line-webrtc" />
               </div>
               <p className="mt-6 text-white/70 text-xs font-medium bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                 Align prescription within the frame
               </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-8">
          <button 
            onClick={toggleCamera}
            disabled={loading || !!error}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all active:scale-90 disabled:opacity-50"
            title="Switch Camera"
          >
            <RefreshCw size={20} />
          </button>

          <button 
            onClick={capture}
            disabled={loading || !!error}
            className="w-20 h-20 rounded-full border-4 border-white/20 p-1 group active:scale-95 transition-transform disabled:opacity-50"
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center group-hover:bg-slate-100 transition-colors">
              <div className="w-16 h-16 rounded-full border-2 border-slate-900/10" />
            </div>
          </button>

          <div className="w-12" /> {/* Spacer for symmetry */}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <style>{`
        @keyframes scanLineWebRTC {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .scan-line-webrtc {
          animation: scanLineWebRTC 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
