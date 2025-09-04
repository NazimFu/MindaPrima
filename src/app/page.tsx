
'use client';

import * as React from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";
import type { StudentLevel, Student, Teacher } from "@/lib/types";
import { StudentsTable } from "@/components/dashboard/students-table";
import { TeachersTable } from "@/components/dashboard/teachers-table";
import { GuardiansList } from "@/components/dashboard/guardians-list";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { StudentForm } from "@/components/dashboard/student-form";
import { TeacherForm } from "@/components/dashboard/teacher-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getStudents, getTeachers, addStudent, addTeacher } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

const studentLevels: StudentLevel[] = ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 5', 'Secondary 6'];

// This is a temporary workaround until Next.js provides a better solution for server-side data fetching in client components.
// We are fetching the data once and passing it down to the components that need it.
function Dashboard({ initialStudents, initialTeachers }: { initialStudents: Student[]; initialTeachers: Teacher[] }) {
  const [isStudentDialogOpen, setStudentDialogOpen] = React.useState(false);
  const [isTeacherDialogOpen, setTeacherDialogOpen] = React.useState(false);
  const { toast } = useToast();

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
                  <StudentForm
                    onFormSubmit={() => setStudentDialogOpen(false)}
                    onSubmit={async (data) => {
                      await addStudent(data);
                      toast({ title: "Success", description: "New student has been registered." });
                    }}
                  />
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
                  <TeacherForm
                    onFormSubmit={() => setTeacherDialogOpen(false)}
                    onSubmit={async (data) => {
                      await addTeacher(data);
                       toast({ title: "Success", description: "New teacher has been registered." });
                    }}
                   />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <TabsContent value="overview" className="space-y-4">
            <OverviewCards students={initialStudents} teachers={initialTeachers} />
          </TabsContent>
          <TabsContent value="students">
             <Card>
              <CardHeader>
                <CardTitle>Students</CardTitle>
                <CardDescription>Manage all registered students.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="h-auto grid grid-cols-6 grid-rows-2 gap-2 bg-muted p-2 rounded-lg mb-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    {studentLevels.map((level) => (
                      <TabsTrigger key={level} value={level}>{level}</TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value="all">
                    <StudentsTable 
                      students={initialStudents} 
                    />
                  </TabsContent>
                  {studentLevels.map((level) => (
                    <TabsContent key={level} value={level}>
                      <StudentsTable 
                        students={initialStudents.filter(s => s.level === level)} 
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
                <CardDescription>Manage all registered teachers.</CardDescription>
              </CardHeader>
              <CardContent>
                <TeachersTable
                  teachers={initialTeachers}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="guardians">
            <Card>
              <CardHeader>
                <CardTitle>Guardians</CardTitle>
                <CardDescription>
                  List of all guardians and their registered children.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GuardiansList students={initialStudents} selectedMonth={'current'}/>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}


export default function DashboardPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      const [studentsData, teachersData] = await Promise.all([
        getStudents(),
        getTeachers(),
      ]);
      setStudents(studentsData);
      setTeachers(teachersData);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading dashboard...</div>;
  }
  
  return <Dashboard initialStudents={students} initialTeachers={teachers} />
}
