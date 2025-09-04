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

export async function getStudents(): Promise<Student[]> {
    try {
        const studentSheet = await getSheet(STUDENT_SHEET_NAME);
        if (!studentSheet) return [];
        const data = await getSheetData(studentSheet);
        return data.map((row: any[]): Student => ({
            id: row[0],
            name: row[1],
            level: row[2],
            subjects: row[3],
            guardian: row[4],
            guardianContact: row[5],
            address: row[6],
            transport: row[7],
            transportArea: row[8],
            paymentStatus: row[9],
            firstTime: row[10],
        }));
    } catch (error) {
        console.error("Error fetching students:", error);
        return [];
    }
}

export async function getTeachers(): Promise<Teacher[]> {
    try {
        const teacherSheet = await getSheet(TEACHER_SHEET_NAME);
        if (!teacherSheet) return [];
        const data = await getSheetData(teacherSheet);
        return data.map((row: any[]): Teacher => ({
            id: row[0],
            name: row[1],
            subject: row[2],
            contact: row[3],
        }));
    } catch (error) {
        console.error("Error fetching teachers:", error);
        return [];
    }
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
    if (!sheet) {
        throw new Error('Student sheet not found');
    }
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
