'use client';
import { useMemo, useState } from 'react';
import {
  AREA_LABEL, AREAS, CONNECTOR_LABEL, CONNECTORS, formatRM, monthlyFee, transportFee, PICKUP_FROM, SCHOOL_DAYS, TRANSPORT_PLANS,
  type Area, type ClassDto, type Connector, type Day, type GuardianListItem, type Pricing, type StudentInput,
  type StudentProfileDto, type PickupFrom, type TransportPlan,
} from '@minda/common';
import { post, put } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { useSession } from './session';
import { Dialog, ErrorNote, Field, SessionChip } from './ui';

/** Add or edit a student. Everything it lists (levels, classes, vehicles, sessions, fees) comes from the spreadsheet. */
export function StudentForm({ student, onClose, onSaved }: { student?: StudentProfileDto; onClose: () => void; onSaved: (id: string) => void }) {
  const { ref } = useSession();
  const classes = useApi<ClassDto[]>('/classes');
  const guardians = useApi<GuardianListItem[]>('/guardians');
  const pricing = useApi<Pricing[]>('/pricing');

  const [firstName, setFirstName] = useState(student?.firstName ?? '');
  const [connector, setConnector] = useState<Connector>(student?.connector ?? 'bin');
  const [fatherName, setFatherName] = useState(student?.fatherName ?? '');
  const [levelId, setLevelId] = useState(student?.levelId ?? ref.levels[0]?.id ?? '');
  const [address, setAddress] = useState(student?.address ?? '');
  const [gName, setGName] = useState(student?.guardian.name ?? '');
  const [gContact, setGContact] = useState(student?.guardian.contact ?? '');
  const [firstTime, setFirstTime] = useState(student?.firstTime ?? true);
  const [hasSibling, setHasSibling] = useState(student?.hasSibling ?? false);
  const [classIds, setClassIds] = useState<string[]>(student?.subjects.map((s) => s.classId) ?? []);
  const [needed, setNeeded] = useState(student?.transport.needed ?? false);
  const [area, setArea] = useState<Area>(student?.transport.area ?? 'inside');
  const [vehicleId, setVehicleId] = useState(student?.transport.vehicle?.id ?? '');
  const [plan, setPlan] = useState<TransportPlan>(student?.transport.plan ?? 'Both ways');
  const [pickupFrom, setPickupFrom] = useState<PickupFrom>(student?.transport.pickupFrom ?? 'School');
  const [dropoff, setDropoff] = useState(student?.transport.dropoffAddress ?? '');
  const [schedule, setSchedule] = useState<Record<string, string[]>>(() => {
    const m: Record<string, string[]> = {};
    student?.transport.schedule.forEach((s) => { (m[s.day] ??= []).push(s.sessionId); });
    return m;
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const levelClasses = (classes.data ?? []).filter((c) => c.levelId === levelId);
  const fee = useMemo(
    () => monthlyFee(pricing.data ?? [], { levelId, subjectCount: classIds.filter((id) => levelClasses.some((c) => c.id === id)).length, transportNeeded: needed, area }),
    [pricing.data, levelId, classIds, levelClasses, needed, area],
  );

  const existing = (guardians.data ?? []).find((g) => g.name.toLowerCase() === gName.trim().toLowerCase())
    ?? (student && gName === student.guardian.name ? { id: student.guardian.id, contact: student.guardian.contact } : undefined);
  const pickGuardianName = (v: string) => {
    setGName(v);
    const g = (guardians.data ?? []).find((x) => x.name === v);
    if (g) setGContact(g.contact);
  };
  const limitText = (a: Area) => { const f = transportFee(pricing.data ?? [], a); return f ? ` RM${f}` : ''; };
  const toggleClass = (id: string) => setClassIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const toggleSession = (day: Day, sid: string) => setSchedule((cur) => {
    const list = cur[day] ?? [];
    return { ...cur, [day]: list.includes(sid) ? list.filter((x) => x !== sid) : [...list, sid] };
  });

  async function save() {
    setError('');
    const body: StudentInput = {
      firstName, connector, fatherName: fatherName, levelId, address,
      guardian: existing && existing.contact === gContact.trim() ? { id: existing.id } : { name: gName, contact: gContact },
      classIds: classIds.filter((id) => levelClasses.some((c) => c.id === id)),
      firstTime, hasSibling,
      transport: {
        needed, area, vehicleId: needed ? vehicleId : '', plan, pickupFrom, dropoffAddress: dropoff,
        schedule: needed ? SCHOOL_DAYS.flatMap((day) => (schedule[day] ?? []).map((sessionId) => ({ day, sessionId }))) : [],
      },
    };
    setBusy(true);
    try {
      const saved = student ? await put<{ id: string }>(`/students/${student.id}`, body) : await post<{ id: string }>('/students', body);
      onSaved(saved?.id ?? student?.id ?? '');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const guardianFields = (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Guardian name"><input className="inp" list="guardian-names" value={gName} maxLength={100} onChange={(e) => pickGuardianName(e.target.value)} /></Field>
      <Field label="Contact"><input className="inp" value={gContact} maxLength={20} inputMode="tel" onChange={(e) => setGContact(e.target.value)} /></Field>
      <datalist id="guardian-names">{(guardians.data ?? []).map((g) => <option key={g.id} value={g.name} />)}</datalist>
    </div>
  );

  return (
    <Dialog wide title={student ? 'Edit student' : 'Add student'} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-pr" disabled={busy} onClick={save}>{student ? 'Save changes' : 'Add student'}</button></>}>
      <div className="space-y-4 p-6">
        <ErrorNote message={error} />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <Field label="First name"><input className="inp" value={firstName} maxLength={60} onChange={(e) => setFirstName(e.target.value)} /></Field>
              <Field label="Connector">
                <select className="inp" value={connector} onChange={(e) => setConnector(e.target.value as Connector)}>
                  {CONNECTORS.map((c) => <option key={c} value={c}>{CONNECTOR_LABEL[c]}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Father's name"><input className="inp" value={fatherName} maxLength={80} onChange={(e) => setFatherName(e.target.value)} /></Field>
            {guardianFields}
            <Field label="Address"><input className="inp" value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First time registration">
                <select className="inp" value={firstTime ? 'Yes' : 'No'} onChange={(e) => setFirstTime(e.target.value === 'Yes')}><option>Yes</option><option>No</option></select>
              </Field>
              <Field label="Sibling already registered">
                <select className="inp" value={hasSibling ? 'Yes' : 'No'} onChange={(e) => setHasSibling(e.target.value === 'Yes')}><option>No</option><option>Yes</option></select>
              </Field>
            </div>
            <Field label="Level">
              <select className="inp" value={levelId} onChange={(e) => { setLevelId(e.target.value); setClassIds([]); }}>
                {ref.levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <div>
              <div className="lbl mb-1">Subjects</div>
              {levelClasses.length === 0 ? <div className="text-mu">No classes for this level</div> : (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {levelClasses.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 rounded border border-ln px-2.5 py-1.5">
                      <input type="checkbox" checked={classIds.includes(c.id)} onChange={() => toggleClass(c.id)} />
                      <span>{c.subject}</span>
                      {c.slots[0] && <span className="ml-auto text-mu">{c.slots.map((x) => x.day.slice(0, 3)).join(' ')}</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={needed} onChange={(e) => setNeeded(e.target.checked)} />Needs transport</label>
            {needed && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Address is">
                    <select className="inp" value={area} onChange={(e) => setArea(e.target.value as Area)}>
                      {AREAS.map((a) => <option key={a} value={a}>{AREA_LABEL[a]}{limitText(a)}</option>)}
                    </select>
                  </Field>
                  <Field label="Vehicle">
                    <select className="inp" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                      <option value="">Choose</option>
                      {ref.vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}, {v.seats} seats</option>)}
                    </select>
                  </Field>
                  <Field label="Plan">
                    <select className="inp" value={plan} onChange={(e) => setPlan(e.target.value as TransportPlan)}>
                      {TRANSPORT_PLANS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Pick-up from">
                    <select className="inp" value={pickupFrom} onChange={(e) => setPickupFrom(e.target.value as PickupFrom)}>
                      {PICKUP_FROM.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Drop-off"><input className="inp" value={dropoff} maxLength={300} onChange={(e) => setDropoff(e.target.value)} /></Field>
                <div>
                  <div className="lbl mb-1">Days and sessions</div>
                  <div className="space-y-1.5">
                    {SCHOOL_DAYS.map((day) => (
                      <div key={day} className="flex items-center gap-3">
                        <span className="w-[76px] text-mu">{day}</span>
                        <div className="flex gap-1.5">
                          {ref.sessions.map((s) => (
                            <button key={s.id} type="button" aria-pressed={(schedule[day] ?? []).includes(s.id)} onClick={() => toggleSession(day, s.id)}>
                              <SessionChip id={s.id} on={(schedule[day] ?? []).includes(s.id)} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="rounded border border-ln bg-th px-3.5 py-3">
              <div className="flex justify-between"><span className="text-mu">Tuition</span><span>{formatRM(fee.tuition)}</span></div>
              {needed && <div className="flex justify-between"><span className="text-mu">Transport</span><span>{formatRM(fee.transport)}</span></div>}
              <div className="mt-1 flex justify-between border-t border-ln pt-1 font-semibold"><span>Monthly fee</span><span>{formatRM(fee.total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
