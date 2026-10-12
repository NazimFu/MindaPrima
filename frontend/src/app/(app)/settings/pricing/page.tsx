'use client';
import { useEffect, useState } from 'react';
import { AREA_LABEL, AREAS, type Pricing, type Vehicle } from '@minda/common';
import { CrudCard } from '@/components/crud-card';
import { useSession } from '@/components/session';
import { useApi } from '@/hooks/use-api';
import { post, put } from '@/lib/api';
import { ErrorNote, Loading, PageHeader } from '@/components/ui';

const TIERS = [1, 2, 3, 4];
const CENTRE_KEYS = [
  ['centre.name', 'Centre name'], ['centre.address', 'Address (separate lines with |)'], ['centre.phone', 'Phone'],
  ['centre.tagline', 'Tagline'], ['receipt.prefix', 'Receipt prefix'],
] as const;

export default function PricingPage() {
  const { ref } = useSession();
  const pricing = useApi<Pricing[]>('/pricing');
  const settings = useApi<{ key: string; value: string }[]>('/settings');
  const [cells, setCells] = useState<Record<string, string>>({});
  const [centre, setCentre] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!pricing.data) return;
    const m: Record<string, string> = {};
    for (const p of pricing.data) m[p.kind === 'tuition' ? `${p.levelId}:${p.qty}` : `t:${p.area}`] = String(p.amount);
    setCells(m);
  }, [pricing.data]);
  useEffect(() => {
    if (settings.data) setCentre(Object.fromEntries(settings.data.map((r) => [r.key, r.value])));
  }, [settings.data]);

  const findRow = (key: string) => (pricing.data ?? []).find((p) => (p.kind === 'tuition' ? `${p.levelId}:${p.qty}` : `t:${p.area}`) === key);

  async function saveGrid() {
    setErr(''); setMsg('');
    try {
      for (const [key, raw] of Object.entries(cells)) {
        const row = findRow(key);
        const amount = Number(raw);
        if (raw.trim() === '' || Number.isNaN(amount) || amount < 0) { if (row && raw.trim() !== String(row.amount)) throw new Error('Fees must be numbers'); continue; }
        if (row && row.amount === amount) continue;
        const [a, b] = key.split(':');
        const body = key.startsWith('t:') ? { kind: 'transport', levelId: '', qty: 0, area: b, amount } : { kind: 'tuition', levelId: a, qty: Number(b), area: '', amount };
        if (row) await put(`/pricing/${row.id}`, body); else await post('/pricing', body);
      }
      pricing.reload(); setMsg('Saved');
    } catch (e) { setErr((e as Error).message); }
  }
  async function saveCentre() {
    setErr(''); setMsg('');
    try {
      for (const [k] of CENTRE_KEYS) {
        const value = centre[k] ?? '';
        if ((settings.data?.find((r) => r.key === k)?.value ?? '') !== value) await put(`/settings/${encodeURIComponent(k)}`, { value });
      }
      settings.reload(); setMsg('Saved');
    } catch (e) { setErr((e as Error).message); }
  }
  const cell = (key: string) => (
    <input className="inp !h-8 !w-24 text-right" inputMode="decimal" aria-label={key} value={cells[key] ?? ''} onChange={(e) => setCells({ ...cells, [key]: e.target.value })} />
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Pricing" sub="Monthly fees. Tuition by level and number of subjects; transport by address zone." actions={<button type="button" className="btn btn-pr" onClick={saveGrid}>Save changes</button>} />
      <ErrorNote message={err || pricing.error} />
      {msg && <div role="status" className="text-ok">{msg}</div>}
      <div className="card overflow-x-auto">
        {pricing.loading && !pricing.data ? <Loading /> : (
          <table className="w-full min-w-[520px] border-collapse">
            <thead><tr><th className="th">Level</th>{TIERS.map((n) => <th key={n} className="th text-right">{n} subject{n > 1 ? 's' : ''}</th>)}</tr></thead>
            <tbody>
              {ref.levels.map((l) => (
                <tr key={l.id}><td className="td font-medium">{l.name}</td>{TIERS.map((n) => <td key={n} className="td text-right">{cell(`${l.id}:${n}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card">
        <div className="card-h"><span>Transport</span></div>
        <div className="flex flex-wrap gap-6 p-4">
          {AREAS.map((a) => <label key={a} className="lbl">{AREA_LABEL[a]}{cell(`t:${a}`)}</label>)}
        </div>
      </div>
      <div className="card">
        <div className="card-h"><span>Centre details</span><button type="button" className="btn" onClick={saveCentre}>Save details</button></div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {CENTRE_KEYS.map(([k, label]) => (
            <label key={k} className="lbl">{label}<input className="inp" maxLength={200} value={centre[k] ?? ''} onChange={(e) => setCentre({ ...centre, [k]: e.target.value })} /></label>
          ))}
        </div>
      </div>
      <CrudCard<Vehicle>
        title="Vehicles" path="/vehicles" noun="vehicle" head={['Plate', 'Model', 'Driver', 'Seats']} reloadRef={ref.reload}
        cells={(v) => [<span key="p" className="mono">{v.plate}</span>, v.model, `${v.driverName} ${v.driverPhone}`, v.seats]}
        fields={[{ key: 'plate', label: 'Plate', max: 20 }, { key: 'model', label: 'Model', max: 60 }, { key: 'driverName', label: 'Driver name', max: 100 }, { key: 'driverPhone', label: 'Driver phone', max: 20 }, { key: 'seats', label: 'Seats', type: 'number' }]}
        blank={{ plate: '', model: '', driverName: '', driverPhone: '', seats: '10' }}
        toForm={(v) => ({ plate: v.plate, model: v.model, driverName: v.driverName, driverPhone: v.driverPhone, seats: String(v.seats) })}
        toBody={(f) => ({ plate: f.plate, model: f.model, driverName: f.driverName, driverPhone: f.driverPhone, seats: Number(f.seats) })}
      />
    </div>
  );
}
