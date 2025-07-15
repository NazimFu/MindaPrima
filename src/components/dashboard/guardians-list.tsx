"use client";

import * as React from "react";
import type { Student } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, User, BookOpen, Hash } from "lucide-react";

type GuardiansListProps = {
  students: Student[];
  selectedMonth: string;
};

type GuardianGroup = {
  [key: string]: {
    contact: string;
    children: Student[];
    invoiceId: string;
  };
};

export function GuardiansList({ students, selectedMonth }: GuardiansListProps) {
  const groupedByGuardian = React.useMemo(() => {
    const monthPrefix = selectedMonth === 'current' ? 
      new Date().toLocaleString('default', { month: 'short' }).toUpperCase() :
      selectedMonth.substring(0, 3).toUpperCase();
      
    let guardianIndex = 0;
    return students.reduce<GuardianGroup>((acc, student) => {
      const guardianName = student.guardian;
      if (!acc[guardianName]) {
        guardianIndex++;
        const invoiceId = `${monthPrefix}${String(guardianIndex).padStart(4, '0')}`;
        acc[guardianName] = {
          contact: student.guardianContact,
          children: [],
          invoiceId: invoiceId,
        };
      }
      acc[guardianName].children.push(student);
      return acc;
    }, {});
  }, [students, selectedMonth]);

  const guardians = Object.keys(groupedByGuardian);

  if (guardians.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        No guardians found.
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      {guardians.map((guardianName) => {
        const guardianInfo = groupedByGuardian[guardianName];
        return (
          <AccordionItem value={guardianName} key={guardianName}>
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{guardianName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="font-semibold">{guardianName}</p>
                   <div className="flex items-center gap-4 text-sm text-muted-foreground">
                     <span className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        {guardianInfo.contact}
                     </span>
                     <span className="flex items-center gap-1.5">
                        <Hash className="h-3 w-3" />
                        {guardianInfo.invoiceId}
                     </span>
                   </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-3 pl-4 pt-2 border-l ml-5">
                {guardianInfo.children.map((child) => (
                  <li key={child.id} className="flex flex-col">
                     <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground"/>
                        <span className="font-medium">{child.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground ml-7">
                        <BookOpen className="h-4 w-4"/>
                        <span>{child.level}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
