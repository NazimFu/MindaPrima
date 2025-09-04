
"use client";

import * as React from "react";
import type { Student, StudentLevel } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getPrice } from "@/lib/utils";

type GroupedInvoiceProps = {
  students: Student[];
};

type StudentsByLevel = {
  [key in StudentLevel]?: Student[];
};

const studentLevels: StudentLevel[] = ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 5', 'Secondary 6'];

export function GroupedInvoice({ students }: GroupedInvoiceProps) {
  const groupedStudents = React.useMemo(() => {
    return students.reduce((acc, student) => {
      const level = student.level;
      if (!acc[level]) {
        acc[level] = [];
      }
      acc[level]!.push(student);
      return acc;
    }, {} as StudentsByLevel);
  }, [students]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grouped Invoice Generator</CardTitle>
        <CardDescription>
          View students and their fees, grouped by academic level.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {studentLevels.map((level) => {
            const studentsInLevel = groupedStudents[level] || [];
            if (studentsInLevel.length === 0) return null;

            const grandTotal = studentsInLevel.reduce((acc, student) => acc + getPrice(student), 0);

            return (
              <AccordionItem value={level} key={level}>
                <AccordionTrigger>
                  <div className="flex justify-between w-full pr-4">
                    <span className="font-semibold">{level}</span>
                    <span className="text-muted-foreground">{studentsInLevel.length} student(s)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead className="text-right">Total Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsInLevel.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.subjects}</TableCell>
                          <TableCell className="text-right">RM{getPrice(student).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end mt-4 pr-4">
                    <div className="text-right">
                        <p className="font-semibold text-lg">Grand Total</p>
                        <p className="font-bold text-xl text-primary">RM{grandTotal.toFixed(2)}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
