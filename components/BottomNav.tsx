'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDeviceStatus } from '@/lib/deviceInfo';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [battery, setBattery] = useState<{level:number;charging:boolean}|null>(null);

  useEffect(() => { getDeviceStatus().then(s => { if(s.battery) setBattery(s.battery as any); }); }, []);

  const tabs = [
    { path: '/',          icon: '🏠', label: 'Home' },
    { path: '/dashboard', icon: '📊', label: 'Dash' },
    { path: '/image',     icon: '🎨', label: 'Image' },
    { path: '/tools',     icon: '🧰', label: 'Tools' },
    { path: '/settings',  icon: '⚙️', label: 'More' },
  ];

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(8,10,18,0.97)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: 'max(10px,env(safe-area-inset-bottom)) 0 10px', height: 62 }}>
      {tabs.map(tab => {
        const active = pathname === tab.path;
        return (
          <button key={tab.path} onClick={() => router.push(tab.path)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 10, transition: 'all 0.15s', opacity: active ? 1 : 0.4, transform: active ? 'scale(1.1)' : 'scale(1)', position: 'relative' }}>
            {active && <span style={{ position: 'absolute', top: -1, width: 20, height: 2, borderRadius: 1, background: '#6366f1', boxShadow: '0 0 8px #6366f1' }} />}
            <span style={{ fontSize: 19 }}>{tab.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: active ? '#a78bfa' : '#374151', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{tab.label}</span>
          </button>
        );
      })}
      {battery && (
        <div style={{ position: 'absolute', top: -18, right: 10, fontSize: 9, color: '#374151', display: 'flex', alignItems: 'center', gap: 3 }}>
          <span>{battery.charging ? '⚡' : battery.level > 50 ? '🔋' : '🪫'}</span>
          <span>{battery.level}%</span>
        </div>
      )}
    </nav>
  );
}
