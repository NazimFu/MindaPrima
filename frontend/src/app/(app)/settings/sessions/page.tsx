'use client';
import { formatRange, type Session } from '@minda/common';
import { CrudCard } from '@/components/crud-card';
import { useSession } from '@/components/session';
import { PageHeader } from '@/components/ui';

export default function SessionsPage() {
  const { ref } = useSession();
  return (
    <div className="space-y-4">
      <PageHeader title="Sessions" sub="Class and transport sessions. The code is the one letter shown on pills." />
      <CrudCard<Session>
        title="Sessions" path="/sessions" noun="session" head={['Code', 'Name', 'Time']} reloadRef={ref.reload}
        cells={(s) => [<span key="c" className="inline-flex min-w-[22px] justify-center rounded px-1.5 text-[11px] font-semibold text-white" style={{ background: s.color }}>{s.code}</span>, s.name, formatRange(s.start, s.end)]}
        sort={(a, b) => a.start.localeCompare(b.start)}
        fields={[{ key: 'name', label: 'Name', max: 40 }, { key: 'code', label: 'Code (one letter)', max: 1 }, { key: 'color', label: 'Colour', type: 'color' }, { key: 'start', label: 'Starts', type: 'time' }, { key: 'end', label: 'Ends', type: 'time' }]}
        blank={{ name: '', code: '', color: '#1F6B3F', start: '08:00', end: '12:00' }}
        toForm={(s) => ({ name: s.name, code: s.code, color: s.color, start: s.start, end: s.end })}
        toBody={(f) => ({ name: f.name, code: f.code, color: f.color, start: f.start, end: f.end })}
      />
    </div>
  );
}
