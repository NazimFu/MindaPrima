
'use server';

import { revalidatePath } from 'next/cache';
import { addRow, updateRow, deleteRow, getSheet, getSheetData, findRowIndex, batchUpdatePrices } from '@/lib/sheets';
import type { Student, Teacher, PaymentStatus, Prices, StudentLevel } from '@/lib/types';
import { z } from 'zod';

const STUDENT_SHEET_NAME = 'Students';
const TEACHER_SHEET_NAME = 'Teachers';
const PRICES_SHEET_NAME = 'Prices';


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

export async function getPrices(): Promise<Prices> {
    const defaultPrices: Prices = {
        'Primary 1': { '1': 40, '2': 70, '3': 100 },
        'Primary 2': { '1': 40, '2': 70, '3': 100 },
        'Primary 3': { '1': 40, '2': 70, '3': 100 },
        'Primary 4': { '1': 45, '2': 80, '3': 115 },
        'Primary 5': { '1': 45, '2': 80, '3': 115 },
        'Primary 6': { '1': 45, '2': 80, '3': 115 },
        'Secondary 1': { '1': 50, '2': 90, '3': 130 },
        'Secondary 2': { '1': 50, '2': 90, '3': 130 },
        'Secondary 3': { '1': 50, '2': 90, '3': 130 },
        'Secondary 5': { '1': 55, '2': 100, '3': 145 },
        'Secondary 6': { '1': 55, '2': 100, '3': 145 },
        transportInbound: 20,
        transportOutbound: 40,
    };

    try {
        const pricesSheet = await getSheet(PRICES_SHEET_NAME);
        if (!pricesSheet) {
            console.log("Prices sheet not found, returning default prices.");
            return defaultPrices;
        }
        const data = await getSheetData(pricesSheet);
        if (data.length <= 1) { // Only header or empty
            return defaultPrices;
        }
        
        const prices: any = {};
        data.slice(1).forEach(row => { // skip header
            const [item, priceStr] = row;
            const price = parseFloat(priceStr);
            if (!item || isNaN(price)) return;
            
            if (item.startsWith('transport')) {
                prices[item] = price;
            } else {
                const parts = item.split('_');
                const level = `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)} ${parts[1]}` as StudentLevel;
                const numSubjects = parts[2];
                if (!prices[level]) {
                    prices[level] = {};
                }
                prices[level][numSubjects] = price;
            }
        });
        return { ...defaultPrices, ...prices } as Prices;

    } catch (error) {
        console.error("Error fetching prices:", error);
        return defaultPrices;
    }
}

export async function updatePrices(prices: Prices) {
    const rowsToUpdate: { item: string, price: number }[] = [];
    for (const [key, value] of Object.entries(prices)) {
        if (typeof value === 'object' && value !== null) {
            const levelKey = key as StudentLevel;
            for (const [numSubjects, price] of Object.entries(value)) {
                const item = `${levelKey.split(' ')[0].toLowerCase()}_${levelKey.split(' ')[1]}_${numSubjects}`;
                rowsToUpdate.push({ item, price });
            }
        } else {
            rowsToUpdate.push({ item: key, price: value as number });
        }
    }
    
    await batchUpdatePrices(rowsToUpdate);
    revalidate();
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
