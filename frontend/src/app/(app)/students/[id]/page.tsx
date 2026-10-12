'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AREA_LABEL, CONNECTOR_LABEL, formatRM, monthLabel, type StudentProfileDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { StudentForm } from '@/components/student-form';
import { Card, Empty, ErrorNote, KV, Loading, PageHeader, PersonLink, SessionChip, Status, Table } from '@/components/ui';

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: s, error, loading, reload } = useApi<StudentProfileDto>(`/students/${id}`);
  const [edit, setEdit] = useState(false);
  if (loading && !s) return <Loading />;
  if (!s) return <ErrorNote message={error || 'Not found'} />;

  const days = s.transport.schedule.reduce<Record<string, string[]>>((m, x) => { (m[x.day] ??= []).push(x.sessionId); return m; }, {});
  return (
    <div className="space-y-4">
      <PageHeader title={s.firstName} back={{ href: '/students', label: 'Students' }} sub={`${s.levelName}`}
        actions={<button type="button" className="btn" onClick={() => setEdit(true)}>Edit</button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Details">
          <KV rows={[
            ['Full name', s.fullName],
            ['Connector', CONNECTOR_LABEL[s.connector]],
            ['Father', s.fatherName || ''],
            ['Level', s.levelName],
            ['Registered', s.registeredAt],
            ['Address', s.address],
            ['Guardian', <PersonLink key="g" kind="guardian" id={s.guardian.id}>{s.guardian.name}</PersonLink>],
            ['Contact', <span key="c" className="font-mono">{s.guardian.contact}</span>],
            ['Siblings', s.siblings.length ? s.siblings.map((x, i) => <span key={x.id}>{i > 0 && ', '}<PersonLink kind="student" id={x.id}>{x.name}</PersonLink></span>) : ''],
          ]} />
        </Card>
        <Card title="Monthly fee">
          <KV rows={[
            ['Tuition', <span key="t" className="font-mono">{formatRM(s.fee.tuition)}</span>],
            ['Transport', <span key="r" className="font-mono">{formatRM(s.fee.transport)}</span>],
            ['Total', <span key="x" className="font-mono font-semibold">{formatRM(s.fee.total)}</span>],
          ]} />
        </Card>
      </div>

      <Card title="Subjects">
        {s.subjects.length === 0 ? <Empty>No subjects</Empty> : (
          <Table head={['Subject', 'Teacher']} min={320}>
            {s.subjects.map((x) => (
              <tr key={x.classId}>
                <td className="td">{x.subject}</td>
                <td className="td">{x.teacher ? <PersonLink kind="teacher" id={x.teacher.id}>{x.teacher.name}</PersonLink> : ''}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Transport">
        {!s.transport.needed ? <Empty>Does not ride</Empty> : (
          <KV rows={[
            ['Vehicle', <span key="v" className="font-mono">{s.transport.vehicle?.plate ?? ''}</span>],
            ['Zone', AREA_LABEL[s.transport.area]],
            ['Plan', s.transport.plan],
            ['Pick-up from', s.transport.pickupFrom],
            ['Drop-off', s.transport.dropoffAddress],
            ['Days', <div key="d" className="flex flex-wrap gap-x-4 gap-y-1">{Object.entries(days).map(([d, ids]) => (
              <span key={d} className="inline-flex items-center gap-1"><span className="text-mu">{d}</span>{ids.map((sid) => <SessionChip key={sid} id={sid} />)}</span>
            ))}</div>],
          ]} />
        )}
      </Card>

      <Card title="Invoices">
        {s.invoices.length === 0 ? <Empty>No invoices</Empty> : (
          <Table head={['Month', 'Invoice', { label: 'Total', right: true }, { label: 'Paid', right: true }, 'Status']}>
            {s.invoices.map((i) => (
              <tr key={i.id}>
                <td className="td">{monthLabel(i.month)}</td>
                <td className="td"><Link className="lk font-mono" href={`/billing/invoices/${i.id}`}>{i.number}</Link></td>
                <td className="td text-right font-mono">{formatRM(i.total)}</td>
                <td className="td text-right font-mono">{formatRM(i.paid)}</td>
                <td className="td"><Status value={i.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {edit && <StudentForm student={s} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload(); }} />}
    </div>
  );
}
