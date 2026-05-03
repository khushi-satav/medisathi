import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Volume2, Globe } from 'lucide-react';

const VoiceGuidance = ({ text }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    const loadVoices = () => {
      setVoices(synth.getVoices());
    };
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = () => {
    const synth = window.speechSynthesis;
    if (isPlaying) {
      synth.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to find a voice for the selected language
    const voice = voices.find(v => v.lang.startsWith(language.split('-')[0]));
    if (voice) utterance.voice = voice;
    
    utterance.lang = language;
    utterance.onend = () => setIsPlaying(false);
    
    setIsPlaying(true);
    synth.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const languages = [
    { code: 'en-US', name: 'English' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'ta-IN', name: 'Tamil' },
    { code: 'mr-IN', name: 'Marathi' },
    { code: 'bn-IN', name: 'Bengali' },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
      <div className="flex items-center gap-2">
        <button 
          onClick={speak}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isPlaying ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 animate-pulse' : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
          title={isPlaying ? 'Pause' : 'Play Audio Guidance'}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>
        {isPlaying && (
          <button 
            onClick={stop}
            className="w-10 h-10 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
          >
            <Square size={18} fill="currentColor" />
          </button>
        )}
      </div>

      <div className="flex-1">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Audio Instructions</p>
        <p className="text-sm font-medium text-gray-700 truncate max-w-[200px] sm:max-w-md">{text}</p>
      </div>

      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
        <Globe size={16} className="text-gray-400" />
        <select 
          value={language} 
          onChange={(e) => setLanguage(e.target.value)}
          className="text-xs font-bold text-gray-600 bg-transparent outline-none cursor-pointer"
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default VoiceGuidance;
