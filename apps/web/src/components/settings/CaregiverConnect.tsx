'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HeartPulse, CheckCircle2, UserPlus, Phone, Lock, Clock, Bell, Trash2 } from 'lucide-react';
import api from '@/services/api';

export default function CaregiverConnect() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Spouse');

  const { data: connectionData, isLoading } = useQuery({
    queryKey: ['caregiverConnections'],
    queryFn: async () => {
      const res = await api.get('/caregiver/my-caregivers');
      return res.data;
    }
  });

  const inviteMutation = useMutation({
    mutationFn: (data: any) => api.post('/caregiver/invite', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caregiverConnections'] });
      setEmail('');
      setPhone('');
    }
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/caregiver/revoke/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caregiverConnections'] })
  });

  if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading connections...</div>;

  const activeCaregivers = connectionData?.caregivers || [];
  const pendingInvites = connectionData?.pendingInvites || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* SECTION 1: Active Caregivers */}
      <section className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
            <HeartPulse size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">My Caregivers</h3>
            <p className="text-sm text-slate-500">People who can monitor your health</p>
          </div>
        </div>

        {activeCaregivers.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-500 text-sm">No active caregivers yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeCaregivers.map((cg: any) => (
              <div key={cg.userId} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-teal-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-inner">
                    {typeof cg.name === 'string' && cg.name.trim() ? cg.name.trim().charAt(0) : (typeof cg.email === 'string' && cg.email.trim() ? cg.email.trim().charAt(0).toUpperCase() : '?')}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{cg.name || 'Caregiver'} <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full ml-2">{cg.relationship}</span></h4>
                    <p className="text-sm text-slate-500">{cg.email}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => {
                    if(confirm('Are you sure you want to revoke access?')) {
                      revokeMutation.mutate(cg.userId);
                    }
                  }}
                >
                  <Trash2 size={16} className="mr-2" /> Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: Invite Form */}
      <section className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-1 shadow-lg">
        <div className="bg-white rounded-[1.4rem] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Add New Caregiver</h3>
              <p className="text-sm text-slate-500">Send an invite via email and SMS</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email Address *</label>
              <Input 
                type="email" 
                placeholder="caregiver@example.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="bg-slate-50 border-slate-200 focus-visible:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Phone Number (For SMS)</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-3 text-slate-400" />
                <Input 
                  type="tel" 
                  placeholder="+1 234 567 8900" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="mb-6">
             <label className="block text-xs font-medium text-slate-500 mb-2">Relationship</label>
             <div className="flex flex-wrap gap-2">
               {['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Nurse'].map(rel => (
                 <button
                   key={rel}
                   onClick={() => setRelationship(rel)}
                   className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                     relationship === rel 
                     ? 'bg-teal-600 text-white shadow-md shadow-teal-200' 
                     : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                   }`}
                 >
                   {rel}
                 </button>
               ))}
             </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 flex gap-3">
            <Lock size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              By inviting a caregiver, you grant them permission to view your medication list, dose logs, and adherence stats. They will also receive SOS alerts if you miss critical doses.
            </p>
          </div>

          <Button 
            className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-12 shadow-lg shadow-teal-200/50"
            disabled={!email || inviteMutation.isPending}
            onClick={() => inviteMutation.mutate({ email, phone, relationship })}
          >
            {inviteMutation.isPending ? 'Sending Invite...' : 'Send Invitation Securely'}
          </Button>
        </div>
      </section>

      {/* SECTION 3: Pending Invites */}
      {pendingInvites.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-orange-500" /> Pending Invitations
          </h3>
          <div className="space-y-2">
            {pendingInvites.map((inv: any) => (
              <div key={inv._id} className="flex items-center justify-between p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">{inv.caregiverEmail}</p>
                  <p className="text-xs text-slate-500">Sent on {new Date(inv.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-lg">Awaiting</span>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
