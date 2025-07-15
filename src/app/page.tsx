"use client";

import * as React from "react";
import { Users, User, DollarSign, PlusCircle, Archive, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";
import { Student, Teacher, StudentLevel, PaymentStatus, HistoricalData, MonthlyData } from "@/lib/types";
import { initialHistoricalData } from "@/lib/data";
import { StudentsTable } from "@/components/dashboard/students-table";
import { TeachersTable } from "@/components/dashboard/teachers-table";
import { GuardiansList } from "@/components/dashboard/guardians-list";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { StudentForm } from "@/components/dashboard/student-form";
import { TeacherForm } from "@/components/dashboard/teacher-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";


const studentLevels: StudentLevel[] = ['Primary 1', 'Primary 2', 'Primary 3', 'Secondary 1', 'Secondary 2'];

export default function DashboardPage() {
  const { toast } = useToast();
  const [historicalData, setHistoricalData] = React.useState<HistoricalData>(initialHistoricalData);
  const [selectedMonth, setSelectedMonth] = React.useState<string>('current');
  const [isStudentDialogOpen, setStudentDialogOpen] = React.useState(false);
  const [isTeacherDialogOpen, setTeacherDialogOpen] = React.useState(false);
  
  const isReadOnly = selectedMonth !== 'current';
  const { students, teachers } = historicalData[selectedMonth] || { students: [], teachers: [] };

  const updateCurrentMonthData = (updater: (currentData: MonthlyData) => MonthlyData) => {
    if(isReadOnly) return;
    setHistoricalData(prev => ({
      ...prev,
      [selectedMonth]: updater(prev[selectedMonth]),
    }));
  };
  
  const handleAddStudent = (student: Omit<Student, 'id' | 'paymentStatus'>) => {
    updateCurrentMonthData(data => ({
      ...data,
      students: [...data.students, { ...student, id: `STU-${Date.now()}`, paymentStatus: 'Pending' }]
    }));
    setStudentDialogOpen(false);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
     updateCurrentMonthData(data => ({
      ...data,
      students: data.students.map(s => s.id === updatedStudent.id ? updatedStudent : s)
    }));
  };
  
  const handleDeleteStudent = (studentId: string) => {
    updateCurrentMonthData(data => ({
      ...data,
      students: data.students.filter(s => s.id !== studentId)
    }));
  };

  const handleUpdateStudentStatus = (studentId: string, status: PaymentStatus) => {
    updateCurrentMonthData(data => ({
      ...data,
      students: data.students.map(s => s.id === studentId ? { ...s, paymentStatus: status } : s)
    }));
  };

  const handleAddTeacher = (teacher: Omit<Teacher, 'id'>) => {
    updateCurrentMonthData(data => ({
      ...data,
      teachers: [...data.teachers, { ...teacher, id: `TEA-${Date.now()}` }]
    }));
    setTeacherDialogOpen(false);
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    updateCurrentMonthData(data => ({
      ...data,
      teachers: data.teachers.map(t => t.id === updatedTeacher.id ? updatedTeacher : t)
    }));
  };

  const handleDeleteTeacher = (teacherId: string) => {
     updateCurrentMonthData(data => ({
      ...data,
      teachers: data.teachers.filter(t => t.id !== teacherId)
    }));
  };
  
  const handleArchive = () => {
    const monthKey = format(new Date(), 'MMMM yyyy');
    if (historicalData[monthKey]) {
      toast({
        variant: 'destructive',
        title: 'Archive Failed',
        description: `An archive for ${monthKey} already exists.`,
      });
      return;
    }
    setHistoricalData(prev => ({
      ...prev,
      [monthKey]: prev.current
    }));
    toast({
      title: 'Success',
      description: `Live data has been archived as ${monthKey}.`,
    });
  };

  return (
    <div className="flex h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
        <Logo />
        <div className="ml-auto flex items-center gap-4">
           <Avatar>
              <AvatarImage src="https://placehold.co/32x32.png" alt="User" data-ai-hint="user avatar" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 overflow-y-scroll">
        <Tabs defaultValue="overview" className="pr-1">
          <div className="flex items-center">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="guardians">Guardians</TabsTrigger>
            </TabsList>
            <div className="ml-auto flex items-center gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[120px] h-8 text-sm">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(historicalData).map(month => (
                    <SelectItem key={month} value={month}>
                      {month === 'current' ? 'Live Data' : month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleArchive} disabled={isReadOnly}>
                <Archive className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Archive</span>
              </Button>
               <Dialog open={isStudentDialogOpen} onOpenChange={setStudentDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 gap-1" disabled={isReadOnly}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Add Student
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Register New Student</DialogTitle>
                  </DialogHeader>
                  <StudentForm onSubmit={handleAddStudent} />
                </DialogContent>
              </Dialog>
               <Dialog open={isTeacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
                <DialogTrigger asChild>
                   <Button size="sm" variant="outline" className="h-8 gap-1" disabled={isReadOnly}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Add Teacher
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Register New Teacher</DialogTitle>
                  </DialogHeader>
                  <TeacherForm onSubmit={handleAddTeacher} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <TabsContent value="overview" className="space-y-4">
            <OverviewCards students={students} teachers={teachers} />
          </TabsContent>
          <TabsContent value="students">
             <Card>
              <CardHeader>
                <CardTitle>Students</CardTitle>
                <CardDescription>Manage all registered students. {isReadOnly && <span className="font-semibold text-destructive">(Read-only)</span>}</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    {studentLevels.map((level) => (
                      <TabsTrigger key={level} value={level}>{level}</TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value="all">
                    <StudentsTable 
                      students={students} 
                      onUpdateStudent={handleUpdateStudent}
                      onDeleteStudent={handleDeleteStudent}
                      onUpdateStudentStatus={handleUpdateStudentStatus}
                      isReadOnly={isReadOnly}
                    />
                  </TabsContent>
                  {studentLevels.map((level) => (
                    <TabsContent key={level} value={level}>
                      <StudentsTable 
                        students={students.filter(s => s.level === level)} 
                        onUpdateStudent={handleUpdateStudent}
                        onDeleteStudent={handleDeleteStudent}
                        onUpdateStudentStatus={handleUpdateStudentStatus}
                        isReadOnly={isReadOnly}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="teachers">
            <Card>
              <CardHeader>
                <CardTitle>Teachers</CardTitle>
                <CardDescription>Manage all registered teachers. {isReadOnly && <span className="font-semibold text-destructive">(Read-only)</span>}</CardDescription>
              </CardHeader>
              <CardContent>
                <TeachersTable
                  teachers={teachers}
                  onUpdateTeacher={handleUpdateTeacher}
                  onDeleteTeacher={handleDeleteTeacher}
                  isReadOnly={isReadOnly}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="guardians">
            <Card>
              <CardHeader>
                <CardTitle>Guardians</CardTitle>
                <CardDescription>
                  List of all guardians and their registered children. {isReadOnly && <span className="font-semibold text-destructive">(Read-only)</span>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GuardiansList students={students} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
