"use client";

import * as React from "react";
import Link from "next/link";
import type { Student, Prices } from "@/lib/types";
import { getPrice } from "@/lib/utils";
import { Phone, ChevronDown, Receipt, User, GraduationCap, MapPin, Bus } from "lucide-react";

type GuardiansListProps = {
  students: Student[];
  selectedMonth: string;
  prices: Prices;
};

type GuardianGroup = {
  [key: string]: {
    contact: string;
    children: Student[];
    invoiceId: string;
    address: string;
  };
};

export function GuardiansList({ students, selectedMonth, prices }: GuardiansListProps) {
  const [openGuardian, setOpenGuardian] = React.useState<string | null>(null);

  const groupedByGuardian = React.useMemo(() => {
    const monthPrefix =
      selectedMonth === 'current'
        ? new Date().toLocaleString('default', { month: 'short' }).toUpperCase()
        : selectedMonth.substring(0, 3).toUpperCase();

    let guardianIndex = 0;
    return students.reduce<GuardianGroup>((acc, student) => {
      const guardianName = student.guardian;
      if (!acc[guardianName]) {
        guardianIndex++;
        const invoiceId = `${monthPrefix}${String(guardianIndex).padStart(4, '0')}`;
        acc[guardianName] = {
          contact: student.guardianContact,
          children: [],
          invoiceId,
          address: student.address,
        };
      }
      acc[guardianName].children.push(student);
      return acc;
    }, {});
  }, [students, selectedMonth]);

  const guardians = Object.keys(groupedByGuardian);

  if (guardians.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
          <User className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">No guardians registered yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {guardians.map((guardianName) => {
        const guardianInfo = groupedByGuardian[guardianName];
        const isOpen = openGuardian === guardianName;
        const invoiceData = { guardianName, month: selectedMonth, ...guardianInfo, prices };
        const invoiceUrl = `/invoice/${guardianInfo.invoiceId}?data=${encodeURIComponent(JSON.stringify(invoiceData))}`;
        const totalAmount = guardianInfo.children.reduce((sum, c) => sum + getPrice(c, prices), 0);
        const childCount = guardianInfo.children.length;

        return (
          <div
            key={guardianName}
            className={`rounded-xl border transition-all duration-200 overflow-hidden ${
              isOpen
                ? 'border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--gold)/0.03)]'
                : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]'
            }`}
          >
            {/* Guardian header */}
            <button
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setOpenGuardian(isOpen ? null : guardianName)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--gold)/0.2)] to-[hsl(var(--gold)/0.05)] border border-[hsl(var(--gold)/0.2)] flex items-center justify-center text-sm font-semibold text-[hsl(var(--gold))] flex-shrink-0">
                  {guardianName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-[hsl(var(--foreground))] text-sm">{guardianName}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                      <Phone className="w-3 h-3" />
                      {guardianInfo.contact}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {childCount} {childCount === 1 ? 'child' : 'children'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Total amount */}
                <span className="hidden sm:block text-sm font-medium text-[hsl(var(--gold))]">
                  RM{totalAmount.toFixed(2)}
                </span>

                {/* Invoice link */}
                <Link
                  href={invoiceUrl}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors bg-[hsl(var(--muted))] hover:bg-[hsl(var(--gold)/0.1)] border border-[hsl(var(--border))] hover:border-[hsl(var(--gold)/0.3)] px-2.5 py-1.5 rounded-lg"
                >
                  <Receipt className="w-3 h-3" />
                  {guardianInfo.invoiceId}
                </Link>

                <ChevronDown
                  className={`w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {/* Children list */}
            {isOpen && (
              <div className="border-t border-[hsl(var(--border))] px-4 pb-4 pt-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-3">Registered Children</p>
                <div className="space-y-2">
                  {guardianInfo.children.map((child) => {
                    const fee = getPrice(child, prices);
                    return (
                      <div
                        key={child.id}
                        className="flex items-center justify-between rounded-lg bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] px-3 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
                            {child.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[hsl(var(--foreground))]">{child.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                                <GraduationCap className="w-3 h-3" />
                                {child.level}
                              </span>
                              {child.transport === 'Yes' && (
                                <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                                  <Bus className="w-3 h-3" />
                                  {child.transportArea}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 truncate max-w-[240px]">
                              {child.subjects}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))]">RM{fee.toFixed(2)}</p>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full ${
                              child.paymentStatus === 'Paid'
                                ? 'badge-paid'
                                : child.paymentStatus === 'Overdue'
                                ? 'badge-overdue'
                                : 'badge-pending'
                            }`}
                          >
                            {child.paymentStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Address */}
                <div className="flex items-start gap-1.5 mt-3 text-xs text-[hsl(var(--muted-foreground))]">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{guardianInfo.address}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}