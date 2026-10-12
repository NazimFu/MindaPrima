'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AREA_LABEL, CONNECTOR_LABEL, formatRange, formatRM, monthLabel, SCHOOL_DAYS, type StudentProfileDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { useSession } from '@/components/session';
import { StudentForm } from '@/components/student-form';
import { ErrorNote, Loading, Status } from '@/components/ui';

const Card = ({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) => (
  <div className="card"><div className="card-h"><span>{title}</span>{right}</div>{children}</div>
);
const KV = ({ rows }: { rows: [string, React.ReactNode][] }) => (
  <div className="kv">{rows.map(([k, v], i) => <><span key={`k${i}`}>{k}</span><span key={`v${i}`}>{v}</span></>)}</div>
);

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: s, error, loading, reload } = useApi<StudentProfileDto>(`/students/${id}`);
  const { ref, user } = useSession();
  const [edit, setEdit] = useState(false);
  const canEdit = user.role === 'admin' || user.role === 'staff';
  if (loading && !s) return <Loading />;
  if (!s) return <ErrorNote message={error || 'Not found'} />;

  const t = s.transport;
  const dayText = (day: string) => {
    const ids = t.schedule.filter((x) => x.day === day).map((x) => x.sessionId);
    if (ids.length === 0) return 'Not riding';
    return ids.map((sid) => { const x = ref.sessions.find((q) => q.id === sid); return x ? `${x.name} ${formatRange(x.start, x.end)}` : ''; }).join(', ');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/students" className="text-ac no-underline">← Students</Link>
          <h1 className="mt-1.5">{s.firstName}</h1>
          <div className="text-mu">{s.levelName}{s.invoices[0] && <> · <Status value={s.invoices[0].status} /></>}</div>
        </div>
        {canEdit && <button type="button" className="btn btn-pr" onClick={() => setEdit(true)}>Edit student</button>}
      </div>

      <div className="grid items-start gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="flex flex-col gap-4">
          <Card title="Details">
            <KV rows={[
              ['First name', s.firstName],
              ['Connector', s.connector === 'none' ? CONNECTOR_LABEL.none : s.connector],
              ["Father's name", s.fatherName],
              ['Full name', s.fullName],
              ['Level', s.levelName],
              ['Registered', s.registeredAt],
              ['Guardian', <><Link className="lk" href={`/guardians/${s.guardian.id}`}>{s.guardian.name}</Link> · {s.guardian.contact}</>],
              ['Siblings', s.siblings.length ? s.siblings.map((x, i) => <span key={x.id}>{i > 0 && ', '}<Link className="lk" href={`/students/${x.id}`}>{x.name}</Link></span>) : 'None'],
              ['Address', s.address],
            ]} />
          </Card>
          <Card title="Subjects">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[300px] border-collapse">
                <thead><tr><th className="th">Subject</th><th className="th">Teacher</th></tr></thead>
                <tbody>
                  {s.subjects.map((x) => (
                    <tr key={x.classId}>
                      <td className="td">{x.subject}</td>
                      <td className="td">{x.teacher ? <Link className="lk" href={`/teachers/${x.teacher.id}`}>{x.teacher.name}</Link> : ''}</td>
                    </tr>
                  ))}
                  {s.subjects.length === 0 && <tr><td className="td text-center text-mu" colSpan={2}>No subjects</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Transport" right={canEdit && <Link href="/students?tab=transport" className="font-normal text-ac no-underline">All transport</Link>}>
            <KV rows={[
              ['Needed', t.needed ? 'Yes' : 'No'],
              ...(t.needed ? [
                ['Vehicle', t.vehicle ? <Link key="v" className="lk" href={`/transport/${t.vehicle.id}`}>{t.vehicle.plate}</Link> : ''] as [string, React.ReactNode],
                ['Address is', `${AREA_LABEL[t.area]}, ${formatRM(s.fee.transport).replace('.00', '')}`] as [string, React.ReactNode],
                ['Plan', t.plan] as [string, React.ReactNode],
                ['Pick up from', t.pickupFrom] as [string, React.ReactNode],
                ['Drop-off', t.dropoffAddress || 'Same as home'] as [string, React.ReactNode],
                ...SCHOOL_DAYS.map((d): [string, React.ReactNode] => [d, dayText(d)]),
              ] : []),
            ]} />
          </Card>
          <Card title="Monthly fee">
            <KV rows={[
              [`Tuition, ${s.subjects.length} subject${s.subjects.length === 1 ? '' : 's'}`, formatRM(s.fee.tuition)],
              ...(t.needed ? [[`Transport, ${AREA_LABEL[t.area].toLowerCase()}`, formatRM(s.fee.transport)] as [string, React.ReactNode]] : []),
              [<b key="a">Total</b> as unknown as string, <b key="b">{formatRM(s.fee.total)}</b>],
            ]} />
          </Card>
          <Card title="Invoices">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse">
                <thead><tr><th className="th">Invoice</th><th className="th">Month</th><th className="th text-right">Amount</th><th className="th">Status</th></tr></thead>
                <tbody>
                  {s.invoices.map((i) => (
                    <tr key={i.id}>
                      <td className="td"><Link className="lk" href={`/billing/invoices/${i.id}`}>{i.number}</Link></td>
                      <td className="td">{monthLabel(i.month)}</td>
                      <td className="td text-right">{formatRM(i.total)} (family)</td>
                      <td className="td"><Status value={i.status} /></td>
                    </tr>
                  ))}
                  {s.invoices.length === 0 && <tr><td className="td text-center text-mu" colSpan={4}>No invoices</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
      {edit && <StudentForm student={s} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload(); }} />}
    </div>
  );
}
