'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { Level, Role, Session, SessionUserDto, Subject, Vehicle } from '@minda/common';
import logo from '../../../common/images/MP-LOGO.png';
import { api, post } from '@/lib/api';
import { SessionProvider } from './session';
import { Loading } from './ui';

interface NavItem { href: string; label: string; roles: Role[] }
const MAIN: NavItem[] = [
  { href: '/', label: 'Overview', roles: ['admin', 'staff'] },
  { href: '/students', label: 'Students', roles: ['admin', 'staff', 'teacher'] },
  { href: '/guardians', label: 'Guardians', roles: ['admin', 'staff'] },
  { href: '/teachers', label: 'Teachers', roles: ['admin', 'staff', 'teacher'] },
  { href: '/transport', label: 'Transport', roles: ['admin', 'staff'] },
  { href: '/billing', label: 'Billing', roles: ['admin', 'staff'] },
];
const SETTINGS: NavItem[] = [
  { href: '/settings/pricing', label: 'Pricing', roles: ['admin', 'staff'] },
  { href: '/settings/classes', label: 'Classes', roles: ['admin', 'staff', 'teacher'] },
  { href: '/settings/sessions', label: 'Sessions', roles: ['admin', 'staff'] },
  { href: '/settings/whatsapp', label: 'WhatsApp', roles: ['admin'] },
  { href: '/settings/users', label: 'Users', roles: ['admin'] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<SessionUserDto | null>(null);
  const [refData, setRefData] = useState<{ sessions: Session[]; levels: Level[]; subjects: Subject[]; vehicles: Vehicle[] } | null>(null);
  const [tick, setTick] = useState(0);
  const [dark, setDark] = useState(false);
  const [tagline, setTagline] = useState('');

  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);

  useEffect(() => {
    api<SessionUserDto>('/auth/me').then((u) => {
      if (u.role === 'driver') { router.replace('/driver'); }
      setUser(u);
    }).catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    if (!user || user.role === 'driver') return;
    if (user.role === 'admin' || user.role === 'staff') {
      api<{ key: string; value: string }[]>('/settings').then((rows) => setTagline(rows.find((r) => r.key === 'centre.tagline')?.value ?? '')).catch(() => undefined);
    }
    Promise.all([
      api<Session[]>('/sessions'), api<Level[]>('/levels'), api<Subject[]>('/subjects'), api<Vehicle[]>('/vehicles'),
    ]).then(([sessions, levels, subjects, vehicles]) => setRefData({
      sessions, levels: [...levels].sort((a, b) => a.order - b.order), subjects, vehicles,
    })).catch(() => undefined);
  }, [user, tick]);

  if (!user || (user.role !== 'driver' && !refData)) return <Loading />;
  if (user.role === 'driver') return <>{children}</>;

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('mp-theme', next ? 'dark' : 'light'); } catch { /* ignore */ }
  };
  const logout = async () => { await post('/auth/logout').catch(() => undefined); router.replace('/login'); };
  const link = (n: NavItem) => {
    const on = n.href === '/' ? path === '/' : path.startsWith(n.href);
    return <Link key={n.href} href={n.href} aria-current={on ? 'page' : undefined}
      className={`block rounded px-2.5 py-[7px] no-underline hover:bg-white/10 ${on ? 'bg-white/15 font-semibold text-white' : 'text-[#EAF1EB]'}`}>{n.label}</Link>;
  };
  const allowed = (l: NavItem[]) => l.filter((n) => n.roles.includes(user.role));

  return (
    <SessionProvider value={{ user, ref: { ...refData!, reload: () => setTick((n) => n + 1) } }}>
      <div className="flex min-h-screen flex-wrap items-stretch">
        <aside className="flex min-w-[200px] max-w-[220px] flex-[1_1_220px] flex-col gap-0.5 bg-sb px-3 py-4 text-[#EAF1EB]">
          <div className="flex items-center gap-2.5 px-2.5 pb-5 pt-1">
            <Image src={logo} alt="Minda Prima" width={28} height={28} className="rounded bg-white object-contain" priority />
            <span className="text-sm font-semibold text-white">Minda Prima</span>
          </div>
          {allowed(MAIN).map(link)}
          <div className="px-2.5 pb-1.5 pt-5 text-xs text-[#A3BCAA]">Settings</div>
          {allowed(SETTINGS).map(link)}
          <div className="mt-auto flex flex-col gap-1 px-2.5 pt-6 text-xs text-[#A3BCAA]">
            {tagline && <span>{tagline}</span>}
            <span className="pt-2">{user.name}</span>
            <div className="flex gap-3">
              <button type="button" className="underline" onClick={toggleTheme}>{dark ? 'Light' : 'Dark'}</button>
              <button type="button" className="underline" onClick={logout}>Sign out</button>
            </div>
          </div>
        </aside>
        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-4 px-9 py-7 max-sm:px-4">{children}</main>
      </div>
    </SessionProvider>
  );
}
