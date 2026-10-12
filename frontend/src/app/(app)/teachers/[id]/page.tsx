'use client';
import { useParams } from 'next/navigation';
import { formatClock, type SlotDto, type TeacherProfileDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { Card, Empty, ErrorNote, KV, Loading, PageHeader, PersonLink, Table } from '@/components/ui';

const slotText = (slots: SlotDto[]) => slots.map((s) => `${s.day} ${formatClock(s.start)}-${formatClock(s.end)}`).join(', ');

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: t, error, loading } = useApi<TeacherProfileDto>(`/teachers/${id}/profile`);
  if (loading && !t) return <Loading />;
  if (!t) return <ErrorNote message={error || 'Not found'} />;
  return (
    <div className="space-y-4">
      <PageHeader title={t.name} back={{ href: '/teachers', label: 'Teachers' }} sub={t.subject} />
      <Card title="Details"><KV rows={[['Subject', t.subject], ['Levels', t.levels.join(', ')], ['Contact', <span key="c" className="font-mono">{t.contact}</span>]]} /></Card>
      <Card title="Classes">
        {t.classes.length === 0 ? <Empty>No classes</Empty> : (
          <Table head={['Level', 'Subject', 'Days and times', { label: 'Students', right: true }]}>
            {t.classes.map((c) => (
              <tr key={c.classId}>
                <td className="td">{c.levelName}</td>
                <td className="td">{c.subject}</td>
                <td className="td">{slotText(c.slots)}</td>
                <td className="td text-right font-mono">{c.studentCount}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {t.classes.map((c) => c.students.length > 0 && (
        <Card key={c.classId} title={`${c.levelName} ${c.subject}`}>
          <Table head={['Student', 'Guardian']} min={320}>
            {c.students.map((s) => (
              <tr key={s.id}>
                <td className="td"><PersonLink kind="student" id={s.id}>{s.firstName}</PersonLink></td>
                <td className="td">{s.guardian.name}</td>
              </tr>
            ))}
          </Table>
        </Card>
      ))}
    </div>
  );
}
