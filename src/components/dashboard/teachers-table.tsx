"use client";

import * as React from "react";
import { MoreHorizontal, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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


type TeachersTableProps = {
  teachers: Teacher[];
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  isReadOnly?: boolean;
};

export function TeachersTable({ teachers, onUpdateTeacher, onDeleteTeacher, isReadOnly = false }: TeachersTableProps) {
  const { toast } = useToast();
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedTeacher, setSelectedTeacher] = React.useState<Teacher | null>(null);

  const handleEdit = (teacher: Teacher) => {
    if (isReadOnly) return;
    setSelectedTeacher(teacher);
    setEditDialogOpen(true);
  };
  
  const handleUpdate = (values: Omit<Teacher, 'id'>) => {
    if (selectedTeacher) {
      onUpdateTeacher({ ...values, id: selectedTeacher.id });
    }
    setEditDialogOpen(false);
    setSelectedTeacher(null);
     toast({
      title: "Success",
      description: "Teacher information updated.",
    });
  };


  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((teacher) => (
              <TableRow key={teacher.id}>
                <TableCell className="font-medium">{teacher.name}</TableCell>
                <TableCell>{teacher.subject}</TableCell>
                <TableCell>{teacher.contact}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => handleEdit(teacher)} disabled={isReadOnly}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                       <AlertDialog>
                        <AlertDialogTrigger asChild disabled={isReadOnly}>
                           <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600" disabled={isReadOnly}>
                             <Trash2 className="mr-2 h-4 w-4" />
                             Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the teacher's record.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteTeacher(teacher.id)}>
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Teacher Information</DialogTitle>
          </DialogHeader>
          {selectedTeacher && <TeacherForm onSubmit={handleUpdate} initialData={selectedTeacher} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
