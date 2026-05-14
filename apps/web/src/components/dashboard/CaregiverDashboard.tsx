'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { caregiverService } from '@/services/api';
import { Pill, Activity, AlertCircle, ChevronRight, User as UserIcon, Heart, Calendar } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function CaregiverDashboard() {
  const { user } = useAuthStore();

  const { data: response, isLoading } = useQuery({
    queryKey: ['caregiver-patients'],
    queryFn: () => caregiverService.getPatients(),
  });

  const patients = response?.data?.patients || [];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Caregiver Portal</h1>
          <p className="text-muted font-medium mt-1">Monitoring {patients.length} {patients.length === 1 ? 'patient' : 'patients'} under your care.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary px-4 py-2 rounded-xl text-sm font-bold border border-border">
            View All Alerts
          </button>
          <button className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold shadow-warm">
            + Add Patient
          </button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-card h-64 animate-pulse rounded-[2rem] border border-border" />
          <div className="bg-card h-64 animate-pulse rounded-[2rem] border border-border" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {patients.map((patient: any) => (
            <motion.div 
              key={patient._id}
              variants={itemVariants}
              className="bg-card rounded-[2rem] shadow-card border border-border overflow-hidden hover:shadow-elevated transition-all group"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center space-x-5">
                    <div className="relative">
                      <img src={patient.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name)}&background=random`} alt={patient.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-primary/20 shadow-sm" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-card rounded-full flex items-center justify-center">
                        <Heart size={12} className="text-white fill-white" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{patient.name}</h2>
                      <p className="text-sm text-muted font-bold uppercase tracking-wider">Patient • {patient.age || '--'} years</p>
                    </div>
                  </div>
                  <Link href={`/caregiver/patient/${patient._id}`} className="p-3 bg-secondary/10 rounded-2xl text-primary hover:bg-primary hover:text-white transition-all">
                    <ChevronRight size={24} />
                  </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  <div className="bg-background/50 rounded-2xl p-4 border border-border">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Adherence</p>
                    <p className="text-xl font-bold text-emerald-600">{patient.adherence || 'N/A'}%</p>
                  </div>
                  <div className="bg-background/50 rounded-2xl p-4 border border-border">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Missed</p>
                    <p className="text-xl font-bold text-red-600">{patient.missedToday || 0}</p>
                  </div>
                  <div className="bg-background/50 rounded-2xl p-4 border border-border">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Alerts</p>
                    <p className="text-xl font-bold text-orange-600">{patient.alerts || 0}</p>
                  </div>
                  <div className="bg-background/50 rounded-2xl p-4 border border-border">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Streak</p>
                    <p className="text-xl font-bold text-primary">{patient.streak || 0}d 🔥</p>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-500 rounded-lg">
                        <Pill size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Last Activity</p>
                        <p className="text-sm font-semibold text-emerald-950">{patient.lastTaken || 'Checking...'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Success</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Calendar size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Upcoming Dose</p>
                        <p className="text-sm font-semibold text-blue-950">{patient.nextDue || 'Checking...'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-blue-600 uppercase">Pending</span>
                  </div>
                </div>

                {/* Action */}
                <div className="mt-8 flex space-x-3">
                  <Link href={`/caregiver/patient/${patient._id}`} className="flex-1 bg-primary text-white font-bold py-3.5 rounded-2xl shadow-warm hover:shadow-elevated transition-all flex items-center justify-center space-x-2">
                    <Activity size={18} />
                    <span>Full Report</span>
                  </Link>
                  <button className="flex-1 bg-white border border-border text-foreground font-bold py-3.5 rounded-2xl hover:bg-secondary/10 transition-all flex items-center justify-center space-x-2">
                    <AlertCircle size={18} className="text-muted" />
                    <span>Contact</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Add Patient Placeholder */}
          <motion.button 
            variants={itemVariants}
            className="border-2 border-dashed border-border rounded-[2rem] flex flex-col items-center justify-center p-12 text-muted hover:border-primary/40 hover:bg-secondary/5 transition-all group"
          >
            <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UserIcon size={32} className="text-muted group-hover:text-primary" />
            </div>
            <p className="font-bold text-lg group-hover:text-foreground">Monitor another person</p>
            <p className="text-sm mt-1">Connect with family members to help them stay healthy.</p>
          </motion.button>
        </div>
      )}
    </div>
  );
}
