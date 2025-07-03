import type { Student, Teacher } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, User, DollarSign } from 'lucide-react';

type OverviewCardsProps = {
  students: Student[];
  teachers: Teacher[];
};

export function OverviewCards({ students, teachers }: OverviewCardsProps) {
  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const pendingPayments = students.filter(s => s.paymentStatus === 'Pending' || s.paymentStatus === 'Overdue').length;

  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStudents}</div>
          <p className="text-xs text-muted-foreground">Currently enrolled</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTeachers}</div>
          <p className="text-xs text-muted-foreground">Currently employed</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingPayments}</div>
          <p className="text-xs text-muted-foreground">Invoices require attention</p>
        </CardContent>
      </Card>
    </div>
  );
}
