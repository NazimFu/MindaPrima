"use client";

import * as React from "react";
import Link from "next/link";
import type { Student, Prices } from "@/lib/types";
import { getPrice } from "@/lib/utils";
import {
  Phone, ChevronDown, Receipt, User, GraduationCap,
  MapPin, Bus, Pencil, Check, X, UserMinus, UserPlus, Loader2,
} from "lucide-react";
import { updateStudentSubjectsForMonth, deactivateStudentForMonth, reactivateStudentForMonth } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

type GuardiansListProps = {
  students:      Student[];
  /** "current" | "March 2025" */
  selectedMonth: string;
  prices:        Prices;
};

type GuardianGroup = {
  [key: string]: {
    contact:   string;
    children:  Student[];
    invoiceId: string;
    address:   string;
  };
};

function buildPrefix(selectedMonth: string): string {
  if (selectedMonth === 'current') {
    return new Date().toLocaleString('default', { month: 'short' }).toUpperCase();
  }
  const parts      = selectedMonth.split(' ');
  const monthAbbr  = parts[0].substring(0, 3).toUpperCase();
  const yearSuffix = parts[1] ? parts[1].slice(-2) : '';
  return `${monthAbbr}${yearSuffix}`;
}

// ── Inline subject editor ──────────────────────────────────────────────────

function SubjectEditor({
  studentId, subjects, selectedMonth, prices, level, transport, transportArea,
  onSaved,
}: {
  studentId:     string;
  subjects:      string;
  selectedMonth: string;
  prices:        Prices;
  level:         string;
  transport:     string;
  transportArea: string;
  onSaved:       (newSubjects: string) => void;
}) {
  const [editing,  setEditing]  = React.useState(false);
  const [draft,    setDraft]    = React.useState(subjects);
  const [saving,   setSaving]   = React.useState(false);
  const { toast } = useToast();

  const save = async () => {
    setSaving(true);
    try {
      await updateStudentSubjectsForMonth(selectedMonth, studentId, draft);
      onSaved(draft);
      setEditing(false);
      toast({ title: "Subjects updated", description: "Changes saved to this month's snapshot." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to save subjects.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5 group/subj">
        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[220px]">{subjects || '—'}</p>
        <button
          onClick={() => { setDraft(subjects); setEditing(true); }}
          className="opacity-0 group-hover/subj:opacity-100 transition-opacity text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))]"
          title="Edit subjects for this month"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        className="text-xs border border-[hsl(var(--gold)/0.4)] rounded px-2 py-1 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] w-48 focus:outline-none focus:border-[hsl(var(--gold))]"
        placeholder="e.g. Math, Science"
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
      />
      {saving ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[hsl(var(--muted-foreground))]" />
      ) : (
        <>
          <button onClick={save} className="text-[hsl(168,60%,55%)] hover:text-[hsl(168,60%,65%)]" title="Save">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setEditing(false)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" title="Cancel">
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function GuardiansList({ students, selectedMonth, prices }: GuardiansListProps) {
  const [openGuardian, setOpenGuardian]   = React.useState<string | null>(null);
  const [localStudents, setLocalStudents] = React.useState<Student[]>(students);
  const [toggling, setToggling]           = React.useState<string | null>(null);
  const { toast } = useToast();

  // Sync when the parent sends new data (month change)
  React.useEffect(() => { setLocalStudents(students); }, [students]);

  const groupedByGuardian = React.useMemo(() => {
    const prefix        = buildPrefix(selectedMonth);
    let guardianIndex   = 0;

    return localStudents.reduce<GuardianGroup>((acc, student) => {
      const guardianName = student.guardian;
      if (!acc[guardianName]) {
        guardianIndex++;
        acc[guardianName] = {
          contact:   student.guardianContact,
          children:  [],
          invoiceId: `${prefix}${String(guardianIndex).padStart(4, '0')}`,
          address:   student.address,
        };
      }
      acc[guardianName].children.push(student);
      return acc;
    }, {});
  }, [localStudents, selectedMonth]);

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

  const handleSubjectSaved = (studentId: string, newSubjects: string) => {
    setLocalStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, subjects: newSubjects } : s
    ));
  };

  const handleToggleActive = async (student: Student, currentlyActive: boolean) => {
    setToggling(student.id);
    try {
      if (currentlyActive) {
        await deactivateStudentForMonth(selectedMonth, student.id);
        setLocalStudents(prev => prev.filter(s => s.id !== student.id));
        toast({ title: "Student removed", description: `${student.name} will not appear in this month's invoice.` });
      } else {
        await reactivateStudentForMonth(selectedMonth, student.id);
        toast({ title: "Student re-added", description: `${student.name} restored for this month.` });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to update.", variant: "destructive" });
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-2">
      {guardians.map((guardianName) => {
        const guardianInfo = groupedByGuardian[guardianName];
        const isOpen       = openGuardian === guardianName;

        const invoiceData = {
          guardianName,
          month:    selectedMonth,
          contact:  guardianInfo.contact,
          address:  guardianInfo.address,
          children: guardianInfo.children,
          prices,
        };
        const invoiceUrl = `/invoice/${guardianInfo.invoiceId}?data=${encodeURIComponent(JSON.stringify(invoiceData))}`;

        const totalAmount = guardianInfo.children.reduce((sum, c) => sum + getPrice(c, prices), 0);
        const childCount  = guardianInfo.children.length;

        return (
          <div
            key={guardianName}
            className={`rounded-xl border transition-all duration-200 overflow-hidden ${
              isOpen
                ? 'border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--gold)/0.03)]'
                : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] hover:bg-[hsl(var(--muted)/0.5)]'
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
                      <Phone className="w-3 h-3" />{guardianInfo.contact}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {childCount} {childCount === 1 ? 'child' : 'children'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="hidden sm:block text-sm font-medium text-[hsl(var(--gold))]">
                  RM{totalAmount.toFixed(2)}
                </span>
                <Link
                  href={invoiceUrl}
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors bg-[hsl(var(--muted))] hover:bg-[hsl(var(--gold)/0.1)] border border-[hsl(var(--border))] hover:border-[hsl(var(--gold)/0.3)] px-2.5 py-1.5 rounded-lg"
                >
                  <Receipt className="w-3 h-3" />
                  {guardianInfo.invoiceId}
                </Link>
                <ChevronDown className={`w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Children list */}
            {isOpen && (
              <div className="border-t border-[hsl(var(--border))] px-4 pb-4 pt-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
                    Registered Children
                  </p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    Hover a subject row to edit for this month
                  </p>
                </div>

                <div className="space-y-2">
                  {guardianInfo.children.map((child) => {
                    const fee = getPrice(child, prices);
                    return (
                      <div
                        key={child.id}
                        className="flex items-start justify-between rounded-lg bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] px-3 py-2.5 group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[10px] font-medium text-[hsl(var(--muted-foreground))] flex-shrink-0 mt-0.5">
                            {child.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[hsl(var(--foreground))]">{child.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                                <GraduationCap className="w-3 h-3" />{child.level}
                              </span>
                              {child.transport === 'Yes' && (
                                <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                                  <Bus className="w-3 h-3" />{child.transportArea}
                                </span>
                              )}
                            </div>
                            {/* Editable subjects */}
                            <SubjectEditor
                              studentId={child.id}
                              subjects={child.subjects}
                              selectedMonth={selectedMonth}
                              prices={prices}
                              level={child.level}
                              transport={child.transport}
                              transportArea={child.transportArea}
                              onSaved={newSubjects => handleSubjectSaved(child.id, newSubjects)}
                            />
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))]">RM{fee.toFixed(2)}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            child.paymentStatus === 'Paid'    ? 'badge-paid'
                            : child.paymentStatus === 'Overdue' ? 'badge-overdue'
                            : 'badge-pending'
                          }`}>
                            {child.paymentStatus}
                          </span>
                          {/* Deactivate for this month */}
                          <button
                            onClick={() => handleToggleActive(child, true)}
                            disabled={toggling === child.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[9px] uppercase tracking-wider text-[hsl(0,72%,60%)] hover:text-[hsl(0,72%,70%)] mt-1"
                            title="Remove from this month's invoice"
                          >
                            {toggling === child.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <UserMinus className="w-3 h-3" />}
                            Remove this month
                          </button>
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