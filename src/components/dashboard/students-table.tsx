"use client";

import * as React from "react";
import { MoreHorizontal, FileText, Trash2, Edit, Tags, ChevronUp, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Student, PaymentStatus, Prices } from "@/lib/types";
import { StudentForm } from "./student-form";
import { useToast } from "@/hooks/use-toast";
import { updateStudent, deleteStudent, updateStudentStatus } from "@/app/actions";

const paymentStatuses: PaymentStatus[] = ['Paid', 'Pending', 'Overdue'];

type StudentsTableProps = {
  students: Student[];
  prices: Prices;
};

function StatusBadge({ status }: { status: Student['paymentStatus'] }) {
  const classes = {
    'Paid': 'badge-paid',
    'Pending': 'badge-pending',
    'Overdue': 'badge-overdue',
  }[status] || 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${classes}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}

export function StudentsTable({ students, prices }: StudentsTableProps) {
  const { toast } = useToast();
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [search, setSearch] = React.useState('');
  const [sortField, setSortField] = React.useState<'name' | 'level' | null>(null);
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  const filtered = React.useMemo(() => {
    let list = [...students];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.subjects.toLowerCase().includes(q) ||
        s.guardian.toLowerCase().includes(q)
      );
    }
    if (sortField) {
      list.sort((a, b) => {
        const av = a[sortField] ?? '';
        const bv = b[sortField] ?? '';
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return list;
  }, [students, search, sortField, sortDir]);

  const toggleSort = (field: 'name' | 'level') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: string }) => (
    <span className="ml-1 opacity-50">
      {sortField === field ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />) : null}
    </span>
  );

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setEditDialogOpen(true);
  };

  const handleUpdate = async (values: Omit<Student, 'id' | 'paymentStatus'>) => {
    if (selectedStudent) {
      await updateStudent({ ...values, id: selectedStudent.id, paymentStatus: selectedStudent.paymentStatus });
    }
    setEditDialogOpen(false);
    setSelectedStudent(null);
    toast({ title: "Updated", description: "Student information has been saved." });
  };

  const handleStatusUpdate = async (studentId: string, status: PaymentStatus) => {
    await updateStudentStatus(studentId, status);
    toast({ title: "Status updated", description: `Payment marked as ${status}.` });
  };

  return (
    <>
      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
        <Input
          placeholder="Search by name, subject, or guardian…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm bg-[hsl(var(--muted))] border-[hsl(var(--border))] focus:border-[hsl(var(--gold)/0.5)] placeholder:text-[hsl(var(--muted-foreground))]"
        />
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <th
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))] cursor-pointer hover:text-[hsl(var(--foreground))] select-none"
                onClick={() => toggleSort('name')}
              >
                Name <SortIcon field="name" />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))] cursor-pointer hover:text-[hsl(var(--foreground))] select-none"
                onClick={() => toggleSort('level')}
              >
                Level <SortIcon field="level" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))] hidden md:table-cell">
                Subjects
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))] hidden lg:table-cell">
                Guardian
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))]">
                Status
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {filtered.length > 0 ? (
              filtered.map((student) => (
                <tr
                  key={student.id}
                  className="table-row-hover transition-colors group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-xs font-medium text-[hsl(var(--muted-foreground))] flex-shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-[hsl(var(--foreground))]">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-md">
                      {student.level.replace('Primary ', 'P').replace('Secondary ', 'S')}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-[hsl(var(--muted-foreground))] text-xs max-w-[200px] truncate">
                    {student.subjects}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-[hsl(var(--muted-foreground))] text-xs">
                    {student.guardian}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={student.paymentStatus} />
                  </td>
                  <td className="px-4 py-3">
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
                      <DropdownMenuContent
                        align="end"
                        className="bg-[hsl(var(--popover))] border-[hsl(var(--border))] text-[hsl(var(--popover-foreground))]"
                      >
                        <DropdownMenuLabel className="text-xs text-[hsl(var(--muted-foreground))]">Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onSelect={() => handleEdit(student)}
                          className="text-sm cursor-pointer hover:bg-[hsl(var(--muted))]"
                        >
                          <Edit className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="text-sm cursor-pointer hover:bg-[hsl(var(--muted))]">
                            <Tags className="mr-2 h-3.5 w-3.5" />
                            Update Status
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="bg-[hsl(var(--popover))] border-[hsl(var(--border))]">
                            {paymentStatuses.map((status) => (
                              <DropdownMenuItem
                                key={status}
                                onSelect={() => handleStatusUpdate(student.id, status)}
                                disabled={student.paymentStatus === status}
                                className="text-sm cursor-pointer hover:bg-[hsl(var(--muted))]"
                              >
                                {status}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator className="bg-[hsl(var(--border))]" />
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
                                Delete this student?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-[hsl(var(--muted-foreground))]">
                                This will permanently remove <strong className="text-[hsl(var(--foreground))]">{student.name}</strong>'s record. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-[hsl(var(--muted))] border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteStudent(student.id)}
                                className="bg-[hsl(var(--destructive))] text-white hover:bg-[hsl(var(--destructive)/0.9)]"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))] text-sm">
                  {search ? `No students matching "${search}"` : 'No students found in this level.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-3">
          Showing {filtered.length} of {students.length} students
        </p>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'DM Serif Display', serif" }}>Edit Student</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <StudentForm onSubmit={handleUpdate} initialData={selectedStudent} students={students} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}