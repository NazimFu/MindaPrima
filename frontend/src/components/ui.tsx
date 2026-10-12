'use client';
import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { monthLabel, type PaymentStatus, type RiderStatus } from '@minda/common';
import { useSession } from './session';

const STATUS_CLASS: Record<PaymentStatus | RiderStatus, string> = {
  Paid: 'st-ok', Partial: 'st-wn', Pending: 'st-wn', Overdue: 'st-er',
  Picked: 'st-ok', Waiting: 'st-wn', Absent: 'st-er', 'Not riding': 'st-mu',
};

export const Status = ({ value }: { value: PaymentStatus | RiderStatus }) => <span className={`st ${STATUS_CLASS[value]}`}>{value}</span>;

/** Session code in the session's colour, e.g. A, N, M. */
export function SessionChip({ id, on = true }: { id: string; on?: boolean }) {
  const { ref } = useSession();
  const s = ref.sessions.find((x) => x.id === id);
  if (!s) return <span className="font-mono text-mu">?</span>;
  return (
    <span
      title={s.name}
      className="inline-flex min-w-[22px] justify-center rounded-[4px] px-1.5 py-px text-[11px] font-semibold"
      style={on ? { background: s.color, color: '#fff' } : { border: '1px solid var(--ln)', color: 'var(--mu)' }}
    >{s.code}</span>
  );
}

/** A student, guardian or teacher name that opens the full record. */
export const PersonLink = ({ kind, id, children }: { kind: 'student' | 'guardian' | 'teacher'; id: string; children: ReactNode }) => (
  <Link className="lk" href={`/${kind === 'student' ? 'students' : kind === 'guardian' ? 'guardians' : 'teachers'}/${id}`}>{children}</Link>
);

export function PageHeader({ title, count, back, sub, actions }: { title: string; count?: number; back?: { href: string; label: string }; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        {back && <Link href={back.href} className="text-ac no-underline">← {back.label}</Link>}
        <h1 className={back ? 'mt-1.5' : ''}>{title}{count !== undefined && <span className="ml-2 font-normal text-mu">{count}</span>}</h1>
        {sub && <div className="text-mu">{sub}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const Card = ({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) => (
  <div className="card">
    {title && <div className="card-h"><span>{title}</span>{right && <span className="font-normal">{right}</span>}</div>}
    {children}
  </div>
);

export const KV = ({ rows }: { rows: [string, ReactNode][] }) => (
  <div className="kv">{rows.map(([k, v]) => <><span key={`k${k}`}>{k}</span><span key={`v${k}`}>{v}</span></>)}</div>
);

export const Table = ({ head, children, min = 560 }: { head: (string | { label: string; right?: boolean })[]; children: ReactNode; min?: number }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse" style={{ minWidth: min }}>
      <thead><tr>{head.map((h, i) => {
        const o = typeof h === 'string' ? { label: h, right: false } : h;
        return <th key={i} className={`th ${o.right ? 'text-right' : ''}`}>{o.label}</th>;
      })}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export const Empty = ({ children }: { children: ReactNode }) => <div className="px-3.5 py-6 text-center text-mu">{children}</div>;
export const Loading = () => <div className="p-6 text-mu">Loading</div>;
export const ErrorNote = ({ message }: { message: string }) => message ? <div role="alert" className="rounded border border-er bg-erb px-3 py-2 text-er">{message}</div> : null;

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="lbl">{label}{children}</label>;
}

export function Dialog({ title, onClose, children, wide, footer }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    box.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} role="dialog" aria-modal="true" aria-label={title} className={`w-full rounded-lg bg-sf shadow-2xl ${wide ? 'max-w-[1080px]' : 'max-w-[480px]'}`}>
        <div className="flex items-center justify-between border-b border-ln px-6 py-4">
          <h2>{title}</h2>
          <button type="button" aria-label="Close" className="h-9 w-9 text-xl text-mu" onClick={onClose}>×</button>
        </div>
        <div>{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ln px-6 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function MonthPicker({ value, onChange, current }: { value: string; onChange: (m: string) => void; current: string }) {
  const options: string[] = [];
  const [cy, cm] = current.split('-').map(Number) as [number, number];
  for (let i = -11; i <= 1; i++) {
    const d = new Date(Date.UTC(cy, cm - 1 + i, 1));
    options.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return (
    <select aria-label="Month" className="inp !w-auto" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
    </select>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-ln" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`-mb-px border-b-2 px-3 py-2 font-medium ${value === t.id ? 'border-ac text-ac' : 'border-transparent text-mu hover:text-tx'}`}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 text-mu">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
