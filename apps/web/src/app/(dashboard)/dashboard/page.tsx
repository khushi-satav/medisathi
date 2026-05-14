'use client';

import { useAuthStore } from '@/store/authStore';
import PatientDashboard from '@/components/dashboard/PatientDashboard';
import CaregiverDashboard from '@/components/dashboard/CaregiverDashboard';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show"
      className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8"
    >
      {user?.role === 'caregiver' ? (
        <CaregiverDashboard />
      ) : (
        <PatientDashboard />
      )}
    </motion.div>
  );
}
