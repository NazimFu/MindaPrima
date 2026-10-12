'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatClock, type SlotDto, type TeacherProfileDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { ErrorNote, Loading } from '@/components/ui';

const slotText = (slots: SlotDto[]) => slots.map((s) => `${s.day} ${formatClock(s.start)} to ${formatClock(s.end)}`).join(', ');
const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="card"><div className="card-h"><span>{title}</span></div>{children}</div>
);

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: t, error, loading } = useApi<TeacherProfileDto>(`/teachers/${id}/profile`);
  if (loading && !t) return <Loading />;
  if (!t) return <ErrorNote message={error || 'Not found'} />;
  const levels = t.levels.length > 1 ? `${t.levels[0]} to ${t.levels[t.levels.length - 1]}` : t.levels.join('');
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/teachers" className="text-ac no-underline">← Teachers</Link>
        <h1 className="mt-1.5">{t.name}</h1>
        <div className="text-mu">{t.subject} · {t.contact}</div>
      </div>
      <div className="grid items-start gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <Card title="Details">
          <div className="kv"><span>Name</span><span>{t.name}</span><span>Subject</span><span>{t.subject}</span><span>Contact</span><span>{t.contact}</span><span>Levels</span><span>{levels}</span></div>
        </Card>
        <Card title="Classes">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse">
              <thead><tr><th className="th">Level</th><th className="th">Days and times</th><th className="th text-right">Students</th></tr></thead>
              <tbody>
                {t.classes.map((c) => (
                  <tr key={c.classId}>
                    <td className="td"><Link className="lk" href="/settings/classes">{c.levelName}</Link></td>
                    <td className="td">{slotText(c.slots)}</td>
                    <td className="td text-right">{c.studentCount}</td>
                  </tr>
                ))}
                {t.classes.length === 0 && <tr><td className="td text-center text-mu" colSpan={3}>No classes</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      {t.classes.filter((c) => c.students.length > 0).map((c) => (
        <Card key={c.classId} title={`Students in ${c.levelName} ${c.subject}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse">
              <thead><tr><th className="th">Student</th><th className="th">Guardian</th></tr></thead>
              <tbody>
                {c.students.map((s) => (
                  <tr key={s.id}>
                    <td className="td"><Link className="lk" href={`/students/${s.id}`}>{s.firstName}</Link></td>
                    <td className="td"><Link className="lk" href={`/guardians/${s.guardian.id}`}>{s.guardian.name}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
