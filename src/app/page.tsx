import * as React from "react";
import { PlusCircle, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";
import { StudentLevel } from "@/lib/types";
import { StudentsTable } from "@/components/dashboard/students-table";
import { TeachersTable } from "@/components/dashboard/teachers-table";
import { GuardiansList } from "@/components/dashboard/guardians-list";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { StudentForm } from "@/components/dashboard/student-form";
import { TeacherForm } from "@/components/dashboard/teacher-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getStudents, getTeachers } from "@/lib/sheets";
import { addStudent, addTeacher } from "@/app/actions";

const studentLevels: StudentLevel[] = ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 5', 'Secondary 6'];

export default async function DashboardPage() {
  const students = await getStudents();
  const teachers = await getTeachers();

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
               <Dialog>
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
                    onSubmit={async (data) => {
                      'use server';
                      await addStudent(data);
                    }}
                  />
                </DialogContent>
              </Dialog>
               <Dialog>
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
                    onSubmit={async (data) => {
                      'use server';
                      await addTeacher(data);
                    }}
                   />
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
                      students={students} 
                    />
                  </TabsContent>
                  {studentLevels.map((level) => (
                    <TabsContent key={level} value={level}>
                      <StudentsTable 
                        students={students.filter(s => s.level === level)} 
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
                  teachers={teachers}
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
                <GuardiansList students={students} selectedMonth={'current'}/>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
