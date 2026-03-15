"use client";

import * as React from "react";
import { MoreHorizontal, Trash2, Edit, Phone, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Teacher } from "@/lib/types";
import { TeacherForm } from "./teacher-form";
import { useToast } from "@/hooks/use-toast";
import { updateTeacher, deleteTeacher } from "@/app/actions";

type TeachersTableProps = {
  teachers: Teacher[];
};

const SUBJECT_COLORS = [
  'bg-[hsl(38,85%,58%/0.12)] text-[hsl(38,85%,65%)] border-[hsl(38,85%,58%/0.25)]',
  'bg-[hsl(168,60%,48%/0.12)] text-[hsl(168,60%,55%)] border-[hsl(168,60%,48%/0.25)]',
  'bg-[hsl(210,70%,60%/0.12)] text-[hsl(210,70%,65%)] border-[hsl(210,70%,60%/0.25)]',
  'bg-[hsl(280,55%,65%/0.12)] text-[hsl(280,55%,70%)] border-[hsl(280,55%,65%/0.25)]',
  'bg-[hsl(340,70%,60%/0.12)] text-[hsl(340,70%,65%)] border-[hsl(340,70%,60%/0.25)]',
];

function subjectColor(subject: string) {
  const hash = subject.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
}

export function TeachersTable({ teachers }: TeachersTableProps) {
  const { toast } = useToast();
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedTeacher, setSelectedTeacher] = React.useState<Teacher | null>(null);

  const handleEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setEditDialogOpen(true);
  };

  const handleUpdate = async (values: Omit<Teacher, 'id'>) => {
    if (selectedTeacher) {
      await updateTeacher({ ...values, id: selectedTeacher.id });
    }
    setEditDialogOpen(false);
    setSelectedTeacher(null);
    toast({ title: "Updated", description: "Teacher information has been saved." });
  };

  if (teachers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
          <BookOpen className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">No teachers registered yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teachers.map((teacher) => (
          <div
            key={teacher.id}
            className="card-hover group relative rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] p-4 hover:border-[hsl(var(--gold)/0.2)]"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(var(--gold)/0.2)] to-[hsl(var(--gold)/0.05)] border border-[hsl(var(--gold)/0.2)] flex items-center justify-center text-sm font-medium text-[hsl(var(--gold))]">
                  {teacher.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-[hsl(var(--foreground))] text-sm">{teacher.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                    <Phone className="w-3 h-3" />
                    {teacher.contact}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[hsl(var(--popover))] border-[hsl(var(--border))]">
                  <DropdownMenuLabel className="text-xs text-[hsl(var(--muted-foreground))]">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onSelect={() => handleEdit(teacher)}
                    className="text-sm cursor-pointer hover:bg-[hsl(var(--muted))]"
                  >
                    <Edit className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-sm cursor-pointer text-[hsl(0,72%,60%)] hover:bg-[hsl(0,72%,55%/0.1)] focus:text-[hsl(0,72%,60%)]"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                      <AlertDialogHeader>
                        <AlertDialogTitle style={{ fontFamily: "'DM Serif Display', serif" }}>
                          Remove this teacher?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[hsl(var(--muted-foreground))]">
                          This will permanently delete <strong className="text-[hsl(var(--foreground))]">{teacher.name}</strong>'s record.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteTeacher(teacher.id)}
                          className="bg-[hsl(var(--destructive))] text-white hover:bg-[hsl(var(--destructive)/0.9)]"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Subject tag */}
            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${subjectColor(teacher.subject)}`}>
              <BookOpen className="w-3 h-3 mr-1.5 opacity-70" />
              {teacher.subject}
            </span>
          </div>
        ))}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'DM Serif Display', serif" }}>Edit Teacher</DialogTitle>
          </DialogHeader>
          {selectedTeacher && <TeacherForm onSubmit={handleUpdate} initialData={selectedTeacher} />}
        </DialogContent>
      </Dialog>
    </>
  );
}