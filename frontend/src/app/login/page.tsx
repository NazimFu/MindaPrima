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
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card flex w-full max-w-[380px] flex-col gap-4 p-7">
        <div className="flex items-center gap-3">
          <Image src={logo} alt="" width={36} height={36} className="rounded bg-white object-contain" priority />
          <h1>Minda Prima</h1>
        </div>
        <Field label="Email"><input id="email" className="inp" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><input id="password" className="inp" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <ErrorNote message={error} />
        <button className="btn btn-pr h-9" disabled={busy}>{busy ? 'Signing in' : 'Sign in'}</button>
      </form>
    </div>
  );
}
