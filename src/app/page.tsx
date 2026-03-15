'use client';

import * as React from "react";
import Link from 'next/link';
import { PlusCircle, Settings, GraduationCap, Users, BookOpen, TrendingUp, AlertTriangle, DollarSign, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/logo";
import type { StudentLevel, Student, Teacher, Prices } from "@/lib/types";
import { StudentsTable } from "@/components/dashboard/students-table";
import { TeachersTable } from "@/components/dashboard/teachers-table";
import { GuardiansList } from "@/components/dashboard/guardians-list";
import { StudentForm } from "@/components/dashboard/student-form";
import { TeacherForm } from "@/components/dashboard/teacher-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getStudents, getTeachers, addStudent, addTeacher, getPrices } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

const studentLevels: StudentLevel[] = [
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 4', 'Secondary 5', 'Secondary 6'
];

function StatCard({ 
  label, value, sublabel, icon: Icon, accent = false, warn = false
}: { 
  label: string; value: string | number; sublabel: string; icon: any; accent?: boolean; warn?: boolean
}) {
  return (
    <div className={`card-hover animate-fade-up relative overflow-hidden rounded-xl border bg-[hsl(var(--card))] p-5 ${warn && +value > 0 ? 'border-[hsl(0,72%,55%/0.2)]' : 'border-[hsl(var(--border))]'}`}>
      {accent && (
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--gold)/0.06)] to-transparent pointer-events-none" />
      )}
      {warn && +value > 0 && (
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(0,72%,55%/0.04)] to-transparent pointer-events-none" />
      )}
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          accent
            ? 'bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]'
            : warn && +value > 0
            ? 'bg-[hsl(0,72%,55%/0.12)] text-[hsl(0,72%,62%)]'
            : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div
        className={`text-3xl font-light ${warn && +value > 0 ? 'text-[hsl(0,72%,62%)]' : 'text-[hsl(var(--foreground))]'}`}
        style={{ fontFamily: "'DM Serif Display', serif" }}
      >
        {value}
      </div>
      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{sublabel}</p>
    </div>
  );
}

function Dashboard({
  initialStudents,
  initialTeachers,
  initialPrices,
}: {
  initialStudents: Student[];
  initialTeachers: Teacher[];
  initialPrices: Prices;
}) {
  const [isStudentDialogOpen, setStudentDialogOpen] = React.useState(false);
  const [isTeacherDialogOpen, setTeacherDialogOpen] = React.useState(false);
  const { toast } = useToast();
  const totalStudents = initialStudents.length;
  const totalTeachers = initialTeachers.length;
  const pendingPayments = initialStudents.filter(s => s.paymentStatus === 'Pending' || s.paymentStatus === 'Overdue').length;
  const paidCount = initialStudents.filter(s => s.paymentStatus === 'Paid').length;
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] rounded-lg px-3 py-1.5 border border-[hsl(var(--border))]">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(168,60%,48%)] animate-pulse" />
              {currentMonth}
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
            >
              <Link href="/whatsapp-setup">
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
            >
              <Link href="/prices">
                <Settings className="w-4 h-4 mr-2" />
                Pricing
              </Link>
            </Button>
          </div>
        </div>
        {/* Gold accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold)/0.4)] to-transparent" />
      </header>

      {/* Main content */}
      <main className="px-6 py-6 max-w-screen-xl mx-auto">
        
        {/* Welcome row */}
        <div className="mb-8">
          <h2 className="text-2xl text-[hsl(var(--foreground))]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} ✦
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Here's what's happening at Minda Prima today.</p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 stagger">
          <StatCard label="Total Students" value={totalStudents} sublabel="Currently enrolled" icon={GraduationCap} accent />
          <StatCard label="Total Teachers" value={totalTeachers} sublabel="Active instructors" icon={Users} />
          <StatCard label="Payments Cleared" value={paidCount} sublabel="This cycle" icon={TrendingUp} />
          <StatCard label="Pending Payments" value={pendingPayments} sublabel="Require follow-up" icon={AlertTriangle} warn={pendingPayments > 0} />
        </div>

        {/* Tab navigation */}
        <Tabs defaultValue="guardians" className="space-y-5">
          <div className="flex items-center justify-between">
            <TabsList className="bg-[hsl(var(--muted))] border border-[hsl(var(--border))] p-1 rounded-lg gap-0.5">
              {[
                { value: 'students', label: 'Students', icon: GraduationCap },
                { value: 'teachers', label: 'Teachers', icon: Users },
                { value: 'guardians', label: 'Guardians', icon: BookOpen },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="gap-1.5 text-xs font-medium px-3 py-1.5 data-[state=active]:bg-[hsl(var(--card))] data-[state=active]:text-[hsl(var(--foreground))] data-[state=active]:shadow-sm text-[hsl(var(--muted-foreground))]"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex gap-2">
              <Dialog open={isStudentDialogOpen} onOpenChange={setStudentDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold)/0.9)] text-[hsl(var(--primary-foreground))] font-medium text-xs shadow-lg shadow-[hsl(var(--gold)/0.2)]"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                    Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <DialogHeader>
                    <DialogTitle style={{ fontFamily: "'DM Serif Display', serif" }}>Register New Student</DialogTitle>
                  </DialogHeader>
                  <StudentForm
                    students={initialStudents}
                    onFormSubmit={() => setStudentDialogOpen(false)}
                    onSubmit={async (data) => {
                      await addStudent(data);
                      toast({ title: "Student registered", description: "New student has been added successfully." });
                    }}
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={isTeacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] text-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                    Add Teacher
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <DialogHeader>
                    <DialogTitle style={{ fontFamily: "'DM Serif Display', serif" }}>Register New Teacher</DialogTitle>
                  </DialogHeader>
                  <TeacherForm
                    onFormSubmit={() => setTeacherDialogOpen(false)}
                    onSubmit={async (data) => {
                      await addTeacher(data);
                      toast({ title: "Teacher registered", description: "New teacher has been added successfully." });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Students tab */}
          <TabsContent value="students" className="animate-fade-up">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
              <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
                <h3 className="font-medium text-[hsl(var(--foreground))]" style={{ fontFamily: "'DM Serif Display', serif" }}>Students</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Manage all registered students and their details</p>
              </div>
              <div className="p-5">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="h-auto flex flex-wrap gap-1 bg-[hsl(var(--muted))] p-1.5 rounded-lg mb-4 border border-[hsl(var(--border))]">
                    <TabsTrigger value="all" className="text-xs px-2.5 py-1.5 rounded data-[state=active]:bg-[hsl(var(--card))] data-[state=active]:text-[hsl(var(--foreground))] text-[hsl(var(--muted-foreground))]">All</TabsTrigger>
                    {studentLevels.map((level) => (
                      <TabsTrigger
                        key={level}
                        value={level}
                        className="text-xs px-2.5 py-1.5 rounded data-[state=active]:bg-[hsl(var(--card))] data-[state=active]:text-[hsl(var(--foreground))] text-[hsl(var(--muted-foreground))]"
                      >
                        {level.replace('Primary ', 'P').replace('Secondary ', 'S')}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value="all">
                    <StudentsTable students={initialStudents} prices={initialPrices} />
                  </TabsContent>
                  {studentLevels.map((level) => (
                    <TabsContent key={level} value={level}>
                      <StudentsTable students={initialStudents.filter(s => s.level === level)} prices={initialPrices} />
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </div>
          </TabsContent>

          {/* Teachers tab */}
          <TabsContent value="teachers" className="animate-fade-up">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
              <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
                <h3 className="font-medium text-[hsl(var(--foreground))]" style={{ fontFamily: "'DM Serif Display', serif" }}>Teachers</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Manage all registered instructors</p>
              </div>
              <div className="p-5">
                <TeachersTable teachers={initialTeachers} />
              </div>
            </div>
          </TabsContent>

          {/* Guardians tab */}
          <TabsContent value="guardians" className="animate-fade-up">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
              <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
                <h3 className="font-medium text-[hsl(var(--foreground))]" style={{ fontFamily: "'DM Serif Display', serif" }}>Guardians</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">All guardians and their registered children — click the invoice ID to generate a bill</p>
              </div>
              <div className="p-5">
                <GuardiansList students={initialStudents} selectedMonth="current" prices={initialPrices} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [prices, setPrices] = React.useState<Prices | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      const [studentsData, teachersData, pricesData] = await Promise.all([
        getStudents(),
        getTeachers(),
        getPrices(),
      ]);
      setStudents(studentsData);
      setTeachers(teachersData);
      setPrices(pricesData);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading || !prices) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[hsl(var(--background))] gap-4">
        <div className="w-10 h-10 rounded-lg bg-[hsl(var(--gold)/0.15)] flex items-center justify-center">
          <div className="w-4 h-4 rounded-full border-2 border-[hsl(var(--gold))] border-t-transparent animate-spin" />
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] tracking-widest uppercase">Loading</p>
      </div>
    );
  }

  return <Dashboard initialStudents={students} initialTeachers={teachers} initialPrices={prices} />;
}