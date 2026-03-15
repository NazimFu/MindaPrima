import type { Student, Teacher } from '@/lib/types';
import { GraduationCap, Users, AlertTriangle, TrendingUp } from 'lucide-react';

type OverviewCardsProps = {
  students: Student[];
  teachers: Teacher[];
};

export function OverviewCards({ students, teachers }: OverviewCardsProps) {
  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const pendingPayments = students.filter(s => s.paymentStatus === 'Pending' || s.paymentStatus === 'Overdue').length;

  const primaryCount = students.filter(s => s.level.includes('Primary')).length;
  const secondaryCount = students.filter(s => s.level.includes('Secondary')).length;

  const stats = [
    {
      label: 'Total Students',
      value: totalStudents,
      detail: `${primaryCount} Primary · ${secondaryCount} Secondary`,
      icon: GraduationCap,
      accent: true,
    },
    {
      label: 'Active Teachers',
      value: totalTeachers,
      detail: 'Currently employed',
      icon: Users,
      accent: false,
    },
    {
      label: 'Pending Payments',
      value: pendingPayments,
      detail: 'Require follow-up',
      icon: AlertTriangle,
      accent: false,
      warn: pendingPayments > 0,
    },
  ];

  return (
    <>
      {stats.map(({ label, value, detail, icon: Icon, accent, warn }) => (
        <div
          key={label}
          className={`card-hover relative overflow-hidden rounded-xl border bg-[hsl(var(--card))] p-5 ${
            accent
              ? 'border-[hsl(var(--gold)/0.25)]'
              : warn
              ? 'border-[hsl(0,72%,55%/0.2)]'
              : 'border-[hsl(var(--border))]'
          }`}
        >
          {accent && (
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--gold)/0.05)] to-transparent pointer-events-none" />
          )}
          {warn && value > 0 && (
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(0,72%,55%/0.04)] to-transparent pointer-events-none" />
          )}

          <div className="flex items-start justify-between mb-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">{label}</p>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                accent
                  ? 'bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]'
                  : warn && value > 0
                  ? 'bg-[hsl(0,72%,55%/0.12)] text-[hsl(0,72%,62%)]'
                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
          </div>

          <div
            className={`text-3xl font-light ${
              warn && value > 0 ? 'text-[hsl(0,72%,62%)]' : 'text-[hsl(var(--foreground))]'
            }`}
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {value}
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{detail}</p>
        </div>
      ))}
    </>
  );
}