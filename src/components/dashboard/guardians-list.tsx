"use client";

import * as React from "react";
import type { Student } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, User, BookOpen } from "lucide-react";

type GuardiansListProps = {
  students: Student[];
};

type GuardianGroup = {
  [key: string]: {
    contact: string;
    children: Student[];
  };
};

export function GuardiansList({ students }: GuardiansListProps) {
  const groupedByGuardian = React.useMemo(() => {
    return students.reduce<GuardianGroup>((acc, student) => {
      const guardianName = student.guardian;
      if (!acc[guardianName]) {
        acc[guardianName] = {
          contact: student.guardianContact,
          children: [],
        };
      }
      acc[guardianName].children.push(student);
      return acc;
    }, {});
  }, [students]);

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
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    {guardianInfo.contact}
                  </p>
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
