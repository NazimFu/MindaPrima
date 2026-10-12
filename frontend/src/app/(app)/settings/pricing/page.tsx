'use client';
import { AREA_LABEL, AREAS, formatRM, type Pricing, type Vehicle } from '@minda/common';
import { CrudCard } from '@/components/crud-card';
import { useSession } from '@/components/session';
import { PageHeader } from '@/components/ui';

export default function PricingPage() {
  const { ref } = useSession();
  const levelName = (id: string) => ref.levels.find((l) => l.id === id)?.name ?? '';
  const levelOptions = ref.levels.map((l) => ({ value: l.id, label: l.name }));
  return (
    <div className="space-y-4">
      <PageHeader title="Pricing" sub="Fees come from here. Nothing is fixed in the app." />
      <CrudCard<Pricing>
        title="Tuition by level and number of subjects" path="/pricing" noun="tier" head={['Level', 'Subjects', 'Monthly fee']}
        cells={(p) => p.kind === 'tuition' ? [levelName(p.levelId), p.qty, <span key="a" className="font-mono">{formatRM(p.amount)}</span>] : [`Transport, ${AREA_LABEL[p.area as 'inside']}`, '', <span key="a" className="font-mono">{formatRM(p.amount)}</span>]}
        fields={[{ key: 'kind', label: 'Type', type: 'select', options: [{ value: 'tuition', label: 'Tuition' }, { value: 'transport', label: 'Transport' }] },
          { key: 'levelId', label: 'Level (tuition)', type: 'select', options: [{ value: '', label: 'None' }, ...levelOptions] },
          { key: 'qty', label: 'Number of subjects (tuition)', type: 'number' },
          { key: 'area', label: 'Zone (transport)', type: 'select', options: [{ value: '', label: 'None' }, ...AREAS.map((a) => ({ value: a, label: AREA_LABEL[a] }))] },
          { key: 'amount', label: 'Monthly fee (RM)', type: 'number' }]}
        blank={{ kind: 'tuition', levelId: ref.levels[0]?.id ?? '', qty: '1', area: '', amount: '' }}
        toForm={(p) => ({ kind: p.kind, levelId: p.levelId, qty: String(p.qty), area: p.area, amount: String(p.amount) })}
        toBody={(f) => ({ kind: f.kind, levelId: f.kind === 'tuition' ? f.levelId : '', qty: f.kind === 'tuition' ? Number(f.qty) : 0, area: f.kind === 'transport' ? f.area : '', amount: Number(f.amount) })}
        sort={(a, b) => a.kind.localeCompare(b.kind) || levelName(a.levelId).localeCompare(levelName(b.levelId)) || a.qty - b.qty}
      />
      <CrudCard<Vehicle>
        title="Vehicles" path="/vehicles" noun="vehicle" head={['Plate', 'Model', 'Driver', 'Seats']} reloadRef={ref.reload}
        cells={(v) => [<span key="p" className="font-mono">{v.plate}</span>, v.model, `${v.driverName} ${v.driverPhone}`, v.seats]}
        fields={[{ key: 'plate', label: 'Plate', max: 20 }, { key: 'model', label: 'Model', max: 60 }, { key: 'driverName', label: 'Driver name', max: 100 }, { key: 'driverPhone', label: 'Driver phone', max: 20 }, { key: 'seats', label: 'Seats', type: 'number' }]}
        blank={{ plate: '', model: '', driverName: '', driverPhone: '', seats: '10' }}
        toForm={(v) => ({ plate: v.plate, model: v.model, driverName: v.driverName, driverPhone: v.driverPhone, seats: String(v.seats) })}
        toBody={(f) => ({ plate: f.plate, model: f.model, driverName: f.driverName, driverPhone: f.driverPhone, seats: Number(f.seats) })}
      />
    </div>
  );
}
