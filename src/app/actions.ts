'use server';

import { revalidatePath } from 'next/cache';
import { addRow, updateRow, deleteRow, getSheet, getSheetData } from '@/lib/sheets';
import type { Student, Teacher, PaymentStatus } from '@/lib/types';
import { z } from 'zod';

const STUDENT_SHEET_NAME = 'Students';
const TEACHER_SHEET_NAME = 'Teachers';

const StudentSchema = z.object({
    name: z.string(),
    level: z.string(),
    subjects: z.string(),
    guardian: z.string(),
    guardianContact: z.string(),
    address: z.string(),
    transport: z.string(),
    transportArea: z.string(),
    firstTime: z.string(),
});

const TeacherSchema = z.object({
    name: z.string(),
    subject: z.string(),
    contact: z.string(),
});

function revalidate() {
    revalidatePath('/');
}

export async function addStudent(data: Omit<Student, 'id' | 'paymentStatus'>) {
    const validatedData = StudentSchema.parse(data);
    const newId = `STU-${Date.now()}`;
    const newRow = [
        newId,
        validatedData.name,
        validatedData.level,
        validatedData.subjects,
        validatedData.guardian,
        validatedData.guardianContact,
        validatedData.address,
        validatedData.transport,
        validatedData.transportArea,
        'Pending', // Default payment status
        validatedData.firstTime,
    ];
    await addRow(STUDENT_SHEET_NAME, newRow);
    revalidate();
}

export async function updateStudent(student: Student) {
    const validatedData = StudentSchema.parse(student);
    const updatedRow = [
        student.id,
        validatedData.name,
        validatedData.level,
        validatedData.subjects,
        validatedData.guardian,
        validatedData.guardianContact,
        validatedData.address,
        validatedData.transport,
        validatedData.transportArea,
        student.paymentStatus,
        validatedData.firstTime,
    ];
    await updateRow(STUDENT_SHEET_NAME, 'id', student.id, updatedRow);
    revalidate();
}

export async function updateStudentStatus(studentId: string, status: PaymentStatus) {
    const sheet = await getSheet(STUDENT_SHEET_NAME);
    const rows = await getSheetData(sheet);
    const rowIndex = rows.findIndex(row => row[0] === studentId);

    if (rowIndex > -1) {
        const rowToUpdate = rows[rowIndex];
        rowToUpdate[9] = status; // Update payment status column
        await updateRow(STUDENT_SHEET_NAME, 'id', studentId, rowToUpdate);
        revalidate();
    } else {
        throw new Error('Student not found');
    }
}


export async function deleteStudent(id: string) {
    await deleteRow(STUDENT_SHEET_NAME, 'id', id);
    revalidate();
}

export async function addTeacher(data: Omit<Teacher, 'id'>) {
    const validatedData = TeacherSchema.parse(data);
    const newId = `TEA-${Date.now()}`;
    const newRow = [
        newId,
        validatedData.name,
        validatedData.subject,
        validatedData.contact,
    ];
    await addRow(TEACHER_SHEET_NAME, newRow);
    revalidate();
}

export async function updateTeacher(teacher: Teacher) {
     const validatedData = TeacherSchema.parse(teacher);
    const updatedRow = [
        teacher.id,
        validatedData.name,
        validatedData.subject,
        validatedData.contact,
    ];
    await updateRow(TEACHER_SHEET_NAME, 'id', teacher.id, updatedRow);
    revalidate();
}

export async function deleteTeacher(id: string) {
    await deleteRow(TEACHER_SHEET_NAME, 'id', id);
    revalidate();
}
