"use client";

import * as React from "react";
import { BookOpenCheck, Users, User, DollarSign, BrainCircuit, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";
import { Student, Teacher } from "@/lib/types";
import { initialStudents, initialTeachers } from "@/lib/data";
import { StudentsTable } from "@/components/dashboard/students-table";
import { TeachersTable } from "@/components/dashboard/teachers-table";
import { SmartSuggestions } from "@/components/dashboard/smart-suggestions";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { StudentForm } from "@/components/dashboard/student-form";
import { TeacherForm } from "@/components/dashboard/teacher-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function DashboardPage() {
  const [students, setStudents] = React.useState<Student[]>(initialStudents);
  const [teachers, setTeachers] = React.useState<Teacher[]>(initialTeachers);
  const [isStudentDialogOpen, setStudentDialogOpen] = React.useState(false);
  const [isTeacherDialogOpen, setTeacherDialogOpen] = React.useState(false);

  const handleAddStudent = (student: Omit<Student, 'id' | 'paymentStatus'>) => {
    setStudents(prev => [...prev, { ...student, id: `STU-${Date.now()}`, paymentStatus: 'Pending' }]);
    setStudentDialogOpen(false);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
  };
  
  const handleDeleteStudent = (studentId: string) => {
    setStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const handleAddTeacher = (teacher: Omit<Teacher, 'id'>) => {
    setTeachers(prev => [...prev, { ...teacher, id: `TEA-${Date.now()}` }]);
    setTeacherDialogOpen(false);
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    setTeachers(prev => prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t));
  };

  const handleDeleteTeacher = (teacherId: string) => {
    setTeachers(prev => prev.filter(t => t.id !== teacherId));
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
        <Logo />
        <div className="ml-auto flex items-center gap-4">
           <Avatar>
              <AvatarImage src="https://placehold.co/32x32.png" alt="User" data-ai-hint="user avatar" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Tabs defaultValue="overview">
          <div className="flex items-center">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
            </TabsList>
            <div className="ml-auto flex items-center gap-2">
               <Dialog open={isStudentDialogOpen} onOpenChange={setStudentDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 gap-1">
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
                   <Button size="sm" variant="outline" className="h-8 gap-1">
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
            <div className="grid gap-4 md:grid-cols-1">
              <SmartSuggestions />
            </div>
          </TabsContent>
          <TabsContent value="students">
             <Card>
              <CardHeader>
                <CardTitle>Students</CardTitle>
                <CardDescription>Manage all registered students.</CardDescription>
              </CardHeader>
              <CardContent>
                <StudentsTable 
                  students={students} 
                  onUpdateStudent={handleUpdateStudent}
                  onDeleteStudent={handleDeleteStudent}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="teachers">
            <Card>
              <CardHeader>
                <CardTitle>Teachers</CardTitle>
                <CardDescription>Manage all registered teachers.</CardDescription>
              </CardHeader>
              <CardContent>
                <TeachersTable
                  teachers={teachers}
                  onUpdateTeacher={handleUpdateTeacher}
                  onDeleteTeacher={handleDeleteTeacher}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
