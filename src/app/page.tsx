'use client';

import * as React from "react";
import Link from 'next/link';
import { PlusCircle, Settings, GraduationCap, Users, BookOpen, TrendingUp, AlertTriangle, MessageCircle, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
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
import {
  getStudents, getStudentsForMonth,
  getTeachers, addStudent, addTeacher, getPrices,
} from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

const studentLevels: StudentLevel[] = [
  'Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6',
  'Secondary 1','Secondary 2','Secondary 3','Secondary 4','Secondary 5','Secondary 6',
];

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sublabel, icon: Icon, accent = false, warn = false
}: {
  label: string; value: string | number; sublabel: string; icon: any; accent?: boolean; warn?: boolean
}) {
  return (
    <div className={`card-hover animate-fade-up relative overflow-hidden rounded-xl border bg-[hsl(var(--card))] p-5 ${warn && +value > 0 ? 'border-[hsl(0,72%,55%/0.2)]' : 'border-[hsl(var(--border))]'}`}>
      {accent && <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--gold)/0.06)] to-transparent pointer-events-none" />}
      {warn && +value > 0 && <div className="absolute inset-0 bg-gradient-to-br from-[hsl(0,72%,55%/0.04)] to-transparent pointer-events-none" />}
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          accent ? 'bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]'
          : warn && +value > 0 ? 'bg-[hsl(0,72%,55%/0.12)] text-[hsl(0,72%,62%)]'
          : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className={`text-3xl font-light ${warn && +value > 0 ? 'text-[hsl(0,72%,62%)]' : 'text-[hsl(var(--foreground))]'}`}
        style={{ fontFamily: "'DM Serif Display', serif" }}>
        {value}
      </div>
      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{sublabel}</p>
    </div>
  );
}

// ── Month navigator ───────────────────────────────────────────────────────────

function MonthYearNavigator({
  month, year, onChange
}: {
  month: number; year: number; onChange: (m: number, y: number) => void;
}) {
  const now = new Date();
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();

  const go = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    onChange(m, y);
  };

  return (
    <div className="flex items-center gap-1 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg px-1 py-1">
      <button onClick={() => go(-1)}
        className="w-7 h-7 flex items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center gap-1.5 px-2 min-w-[138px] justify-center">
        <Calendar className="w-3 h-3 text-[hsl(var(--gold))]" />
        <span className="text-xs font-medium text-[hsl(var(--foreground))]">
          {MONTH_NAMES[month]} {year}
        </span>
        {isCurrentMonth && (
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[hsl(168,60%,55%)] bg-[hsl(168,60%,48%/0.12)] border border-[hsl(168,60%,48%/0.25)] px-1 py-0.5 rounded">
            Now
          </span>
        )}
      </div>
      <button onClick={() => go(+1)} disabled={isCurrentMonth}
        className="w-7 h-7 flex items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({
  initialStudents,
  allStudents,
  initialTeachers,
  initialPrices,
}: {
  initialStudents: Student[];   // current month (for stats)
  allStudents:     Student[];   // master list (for student tab)
  initialTeachers: Teacher[];
  initialPrices:   Prices;
}) {
  const [isStudentDialogOpen, setStudentDialogOpen] = React.useState(false);
  const [isTeacherDialogOpen, setTeacherDialogOpen] = React.useState(false);
  const { toast } = useToast();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = React.useState(now.getMonth());
  const [selectedYear,  setSelectedYear]  = React.useState(now.getFullYear());
  const [monthStudents, setMonthStudents] = React.useState<Student[]>(initialStudents);
  const [loadingMonth,  setLoadingMonth]  = React.useState(false);

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  const selectedMonthString = isCurrentMonth
    ? 'current'
    : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  // Reload students whenever month/year changes
  React.useEffect(() => {
    if (isCurrentMonth) {
      setMonthStudents(initialStudents);
      return;
    }
    setLoadingMonth(true);
    getStudentsForMonth(selectedMonthString)
      .then(setMonthStudents)
      .finally(() => setLoadingMonth(false));
  }, [selectedMonth, selectedYear]);

  // Stats from the viewed month
  const pendingPayments = monthStudents.filter(s => s.paymentStatus === 'Pending' || s.paymentStatus === 'Overdue').length;
  const paidCount       = monthStudents.filter(s => s.paymentStatus === 'Paid').length;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] rounded-lg px-3 py-1.5 border border-[hsl(var(--border))]">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(168,60%,48%)] animate-pulse" />
              {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
            </div>
            <Button variant="ghost" size="sm" asChild className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]">
              <Link href="/whatsapp-setup"><MessageCircle className="w-4 h-4 mr-2" />WhatsApp</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]">
              <Link href="/prices"><Settings className="w-4 h-4 mr-2" />Pricing</Link>
            </Button>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold)/0.4)] to-transparent" />
      </header>

      <main className="px-6 py-6 max-w-screen-xl mx-auto">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl text-[hsl(var(--foreground))]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'} ✦
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Here's what's happening at Minda Prima today.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 stagger">
          <StatCard label="Total Students"   value={allStudents.length}   sublabel="Master registry"    icon={GraduationCap} accent />
          <StatCard label="Total Teachers"   value={initialTeachers.length} sublabel="Active instructors" icon={Users} />
          <StatCard label="Payments Cleared" value={paidCount}            sublabel={`${MONTH_NAMES[selectedMonth]} ${selectedYear}`} icon={TrendingUp} />
          <StatCard label="Pending Payments" value={pendingPayments}      sublabel="Require follow-up"  icon={AlertTriangle} warn={pendingPayments > 0} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="guardians" className="space-y-5">
          <div className="flex items-center justify-between">
            <TabsList className="bg-[hsl(var(--muted))] border border-[hsl(var(--border))] p-1 rounded-lg gap-0.5">
              {[
                { value: 'students',  label: 'Students',  icon: GraduationCap },
                { value: 'teachers',  label: 'Teachers',  icon: Users },
                { value: 'guardians', label: 'Guardians', icon: BookOpen },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value}
                  className="gap-1.5 text-xs font-medium px-3 py-1.5 data-[state=active]:bg-[hsl(var(--card))] data-[state=active]:text-[hsl(var(--foreground))] data-[state=active]:shadow-sm text-[hsl(var(--muted-foreground))]">
                  <Icon className="w-3.5 h-3.5" />{label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex gap-2">
              <Dialog open={isStudentDialogOpen} onOpenChange={setStudentDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold)/0.9)] text-[hsl(var(--primary-foreground))] font-medium text-xs shadow-lg shadow-[hsl(var(--gold)/0.2)]">
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" />Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <DialogHeader>
                    <DialogTitle style={{ fontFamily: "'DM Serif Display', serif" }}>Register New Student</DialogTitle>
                  </DialogHeader>
                  <StudentForm students={allStudents} onFormSubmit={() => setStudentDialogOpen(false)}
                    onSubmit={async (data) => {
                      await addStudent(data);
                      toast({ title: "Student registered", description: "New student has been added successfully." });
                    }} />
                </DialogContent>
              </Dialog>

              <Dialog open={isTeacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] text-xs">
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" />Add Teacher
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <DialogHeader>
                    <DialogTitle style={{ fontFamily: "'DM Serif Display', serif" }}>Register New Teacher</DialogTitle>
                  </DialogHeader>
                  <TeacherForm onFormSubmit={() => setTeacherDialogOpen(false)}
                    onSubmit={async (data) => {
                      await addTeacher(data);
                      toast({ title: "Teacher registered", description: "New teacher has been added successfully." });
                    }} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Students tab — always shows full master registry */}
          <TabsContent value="students" className="animate-fade-up">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
              <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
                <h3 className="font-medium text-[hsl(var(--foreground))]" style={{ fontFamily: "'DM Serif Display', serif" }}>Students</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Master registry — all registered students</p>
              </div>
              <div className="p-5">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="h-auto flex flex-wrap gap-1 bg-[hsl(var(--muted))] p-1.5 rounded-lg mb-4 border border-[hsl(var(--border))]">
                    <TabsTrigger value="all" className="text-xs px-2.5 py-1.5 rounded data-[state=active]:bg-[hsl(var(--card))] data-[state=active]:text-[hsl(var(--foreground))] text-[hsl(var(--muted-foreground))]">All</TabsTrigger>
                    {studentLevels.map((level) => (
                      <TabsTrigger key={level} value={level}
                        className="text-xs px-2.5 py-1.5 rounded data-[state=active]:bg-[hsl(var(--card))] data-[state=active]:text-[hsl(var(--foreground))] text-[hsl(var(--muted-foreground))]">
                        {level.replace('Primary ', 'P').replace('Secondary ', 'S')}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value="all">
                    <StudentsTable students={allStudents} prices={initialPrices} />
                  </TabsContent>
                  {studentLevels.map((level) => (
                    <TabsContent key={level} value={level}>
                      <StudentsTable students={allStudents.filter(s => s.level === level)} prices={initialPrices} />
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
              <div className="p-5"><TeachersTable teachers={initialTeachers} /></div>
            </div>
          </TabsContent>

          {/* Guardians tab — month-aware */}
          <TabsContent value="guardians" className="animate-fade-up">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
              <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-medium text-[hsl(var(--foreground))]" style={{ fontFamily: "'DM Serif Display', serif" }}>Guardians</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Invoices for{' '}
                    <span className="text-[hsl(var(--gold))]">
                      {MONTH_NAMES[selectedMonth]} {selectedYear}
                    </span>
                    {!isCurrentMonth && (
                      <span className="ml-2 text-[hsl(38,85%,58%)] bg-[hsl(38,85%,58%/0.1)] border border-[hsl(38,85%,58%/0.25)] px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold">
                        Past month
                      </span>
                    )}
                  </p>
                </div>
                <MonthYearNavigator
                  month={selectedMonth} year={selectedYear}
                  onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
                />
              </div>

              {loadingMonth ? (
                <div className="flex items-center justify-center py-16 gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-[hsl(var(--gold))] border-t-transparent animate-spin" />
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Loading {MONTH_NAMES[selectedMonth]} {selectedYear}…
                  </p>
                </div>
              ) : (
                <>
                  {!isCurrentMonth && (
                    <div className="mx-5 mt-4 px-4 py-3 rounded-lg border border-[hsl(38,85%,58%/0.25)] bg-[hsl(38,85%,58%/0.06)] flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[hsl(var(--gold))] flex-shrink-0" />
                      <p className="text-xs text-[hsl(var(--gold))]">
                        Viewing <strong>{MONTH_NAMES[selectedMonth]} {selectedYear}</strong> snapshot.
                        Student subjects and levels reflect that month. You can still update payment statuses.
                      </p>
                    </div>
                  )}
                  <div className="p-5">
                    <GuardiansList
                      students={monthStudents}
                      selectedMonth={selectedMonthString}
                      prices={initialPrices}
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ── Page wrapper ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [allStudents, setAllStudents] = React.useState<Student[]>([]);
  const [teachers,    setTeachers]    = React.useState<Teacher[]>([]);
  const [prices,      setPrices]      = React.useState<Prices | null>(null);
  const [loading,     setLoading]     = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      const [studentsData, teachersData, pricesData] = await Promise.all([
        getStudents(),
        getTeachers(),
        getPrices(),
      ]);
      setAllStudents(studentsData);
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

  return (
    <Dashboard
      initialStudents={allStudents}
      allStudents={allStudents}
      initialTeachers={teachers}
      initialPrices={prices}
    />
  );
}