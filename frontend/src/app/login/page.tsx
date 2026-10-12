'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { SessionUserDto } from '@minda/common';
import logo from '../../../../common/images/MP-LOGO.png';
import { post } from '@/lib/api';
import { ErrorNote, Field } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const u = await post<SessionUserDto>('/auth/login', { email, password });
      router.replace(u.role === 'driver' ? '/driver' : u.role === 'teacher' ? '/students' : '/');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-[minmax(320px,2fr)_3fr]">
      <aside className="flex flex-col justify-between bg-sb p-10 text-white">
        <Image src={logo} alt="Minda Prima" width={56} height={56} className="rounded bg-white object-contain" priority />
        <div>
          <h1 className="text-[28px] font-semibold text-white">Staff portal</h1>
          <p className="mt-2 max-w-[320px] text-white/70">Students, transport and billing for the centre, in one place.</p>
        </div>
        <div className="text-white/50">Minda Prima</div>
      </aside>
      <main className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="flex w-full max-w-[340px] flex-col gap-4">
          <h2 className="text-[20px]">Sign in</h2>
          <Field label="Email"><input id="email" className="inp" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Password"><input id="password" className="inp" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <ErrorNote message={error} />
          <button className="btn btn-pr h-9" disabled={busy}>{busy ? 'Signing in' : 'Sign in'}</button>
        </form>
      </main>
    </div>
  );
}
