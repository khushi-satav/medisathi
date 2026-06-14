'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pill, ScanLine, BarChart3, Settings, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const patientTabs = [
  { href: '/dashboard',   label: 'Home',     icon: Home },
  { href: '/medications', label: 'Meds',     icon: Pill },
  { href: '/scan-rx',     label: 'Scan Rx',  icon: ScanLine, center: true },
  { href: '/insights',    label: 'Insights', icon: BarChart3 },
  { href: '/settings',    label: 'Settings', icon: Settings },
];

const caregiverTabs = [
  { href: '/dashboard', label: 'Home',     icon: Home },
  { href: '/caregiver', label: 'Patients', icon: Users, center: true },
  { href: '/settings',  label: 'Settings', icon: Settings },
];

const doctorTabs = [
  { href: '/dashboard', label: 'Home',     icon: Home },
  { href: '/doctor',    label: 'Patients', icon: Users, center: true },
  { href: '/settings',  label: 'Settings', icon: Settings },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const tabs =
    user?.role === 'caregiver' ? caregiverTabs :
    user?.role === 'doctor'    ? doctorTabs    :
    patientTabs;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/60 flex items-center justify-around z-50 md:hidden shadow-[0_-4px_30px_rgba(0,0,0,0.07)]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 10px)',
        paddingTop: '8px',
        minHeight: 'calc(60px + env(safe-area-inset-bottom, 10px))',
      }}
    >
      {tabs.map(({ href, label, icon: Icon, center }) => {
        const currentPath = pathname ?? '';
        const active = currentPath === href || (href !== '/dashboard' && currentPath.startsWith(href));

        if (center) {
          return (
            <Link key={href} href={href} className="flex flex-col items-center -mt-6 group">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white transition-all duration-200 active:scale-95 ${
                  active
                    ? 'bg-[#B05A2E] scale-105'
                    : 'bg-gradient-to-br from-[#C96B3B] to-[#E8B08A] hover:scale-105'
                }`}
              >
                <Icon size={24} className="text-white" />
              </div>
              <span className={`text-[10px] mt-1.5 font-bold ${active ? 'text-[#C96B3B]' : 'text-slate-400'}`}>
                {label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center py-1 px-2 rounded-2xl transition-all duration-200 min-w-[52px] active:scale-95"
          >
            <div
              className={`p-2 rounded-xl transition-all duration-200 ${
                active ? 'bg-[#C96B3B]/10' : ''
              }`}
            >
              <Icon
                size={active ? 22 : 21}
                strokeWidth={active ? 2.5 : 2}
                className={`transition-colors duration-200 ${
                  active ? 'text-[#C96B3B]' : 'text-slate-400'
                }`}
              />
            </div>
            <span
              className={`text-[10px] mt-0.5 transition-all duration-200 ${
                active ? 'font-bold text-[#C96B3B]' : 'font-medium text-slate-400'
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
