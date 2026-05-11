'use client';

import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare size={32} className="text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Messages</h1>
        <p className="text-slate-500 mt-2">Connect with your doctor or caregiver.</p>
        
        <div className="mt-8 py-12 text-slate-400">
          <p>No messages yet.</p>
        </div>
      </div>
    </div>
  );
}
