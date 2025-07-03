"use client";

import * as React from "react";
import { MoreHorizontal, FileText, Trash2, Edit, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import type { Student, PaymentStatus } from "@/lib/types";
import { StudentForm } from "./student-form";
import { useToast } from "@/hooks/use-toast";

const paymentStatuses: PaymentStatus[] = ['Paid', 'Pending', 'Overdue'];

type StudentsTableProps = {
  students: Student[];
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onUpdateStudentStatus: (id: string, status: PaymentStatus) => void;
};

export function StudentsTable({ students, onUpdateStudent, onDeleteStudent, onUpdateStudentStatus }: StudentsTableProps) {
  const { toast } = useToast();
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setEditDialogOpen(true);
  };
  
  const handleUpdate = (values: Omit<Student, 'id' | 'paymentStatus'>) => {
    if (selectedStudent) {
      onUpdateStudent({ ...values, id: selectedStudent.id, paymentStatus: selectedStudent.paymentStatus });
    }
    setEditDialogOpen(false);
    setSelectedStudent(null);
    toast({
      title: "Success",
      description: "Student information updated.",
    });
  };

  const handleStatusUpdate = (studentId: string, status: PaymentStatus) => {
    onUpdateStudentStatus(studentId, status);
    toast({
      title: "Success",
      description: "Payment status updated.",
    });
  };

  const generateInvoice = (student: Student) => {
    toast({
      title: `Invoice for ${student.name}`,
      description: `Invoice generated successfully. (This is a demo)`,
    });
  };

  const getStatusVariant = (status: Student['paymentStatus']) => {
    switch (status) {
      case 'Paid':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="hidden md:table-cell">Subjects</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length > 0 ? (
              students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.level}</TableCell>
                  <TableCell className="hidden md:table-cell">{student.subjects}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(student.paymentStatus)}>
                      {student.paymentStatus}
                    </Badge>
                  </TableCell>
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
                        <DropdownMenuItem onSelect={() => handleEdit(student)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => generateInvoice(student)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Invoice
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Tags className="mr-2 h-4 w-4" />
                            <span>Update Status</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {paymentStatuses.map((status) => (
                              <DropdownMenuItem
                                key={status}
                                onSelect={() => handleStatusUpdate(student.id, status)}
                                disabled={student.paymentStatus === status}
                              >
                                {status}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                               <Trash2 className="mr-2 h-4 w-4" />
                               Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the student's record.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteStudent(student.id)}>
                                Continue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No students found for this level.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student Information</DialogTitle>
          </DialogHeader>
          {selectedStudent && <StudentForm onSubmit={handleUpdate} initialData={selectedStudent} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
