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
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around px-2 pb-safe z-50 md:hidden shadow-[0_-4px_24px_rgba(75,46,43,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)', paddingTop: 8 }}>
      {tabs.map(({ href, label, icon: Icon, center }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        if (center) {
          return (
            <Link key={href} href={href}
              className="flex flex-col items-center -mt-5 group">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-warm border-4 border-card transition-all duration-300 ${
                active ? 'bg-primary-dark scale-105' : 'bg-primary hover:bg-primary-dark hover:scale-105'}`}>
                <Icon size={24} className="text-white" />
              </div>
              <span className={`text-[10px] mt-1 font-semibold ${active ? 'text-primary' : 'text-muted'}`}>{label}</span>
            </Link>
          );
        }
        return (
          <Link key={href} href={href}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-300 ${active ? 'text-primary scale-110' : 'text-muted hover:text-foreground'}`}>
            <Icon size={active ? 24 : 22} strokeWidth={active ? 2.5 : 2} />
            <span className={`text-[10px] mt-1 ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
