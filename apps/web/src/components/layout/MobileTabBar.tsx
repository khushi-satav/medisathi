'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pill, ScanLine, BarChart3, Settings } from 'lucide-react';

const tabs = [
  { href: '/dashboard',    label: 'Home',     icon: Home },
  { href: '/medications',  label: 'Meds',     icon: Pill },
  { href: '/scan-rx',      label: 'Scan Rx',  icon: ScanLine, center: true },
  { href: '/insights',     label: 'Insights', icon: BarChart3 },
  { href: '/settings',     label: 'Settings', icon: Settings },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around px-2 pb-safe z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)', paddingTop: 8 }}>
      {tabs.map(({ href, label, icon: Icon, center }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        if (center) {
          return (
            <Link key={href} href={href}
              className="flex flex-col items-center -mt-5">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-white transition-all ${
                active ? 'bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                <Icon size={24} className="text-white" />
              </div>
              <span className={`text-xs mt-1 font-medium ${active ? 'text-indigo-600' : 'text-slate-500'}`}>{label}</span>
            </Link>
          );
        }
        return (
          <Link key={href} href={href}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <Icon size={22} />
            <span className="text-xs mt-1 font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
