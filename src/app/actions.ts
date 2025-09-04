
'use server';

import { revalidatePath } from 'next/cache';
import { addRow, updateRow, deleteRow, getSheet, getSheetData, findRowIndex, batchUpdateSheet } from '@/lib/sheets';
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
    revalidatePath('/prices');
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

const levelShortMap: Record<string, StudentLevel> = {
    'P1': 'Primary 1', 'P2': 'Primary 2', 'P3': 'Primary 3',
    'P4': 'Primary 4', 'P5': 'Primary 5', 'P6': 'Primary 6',
    'S1': 'Secondary 1', 'S2': 'Secondary 2', 'S3': 'Secondary 3',
    'S5': 'Secondary 5', 'S6': 'Secondary 6'
};

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
            return defaultPrices;
        }
        const data = await getSheetData(pricesSheet, true); // Get all data including header
        if (data.length < 2) {
            return defaultPrices;
        }

        const header = data[0];
        const pricesData = data.slice(1);
        const prices: Prices = { transportInbound: 0, transportOutbound: 0 };
        
        const tiIndex = header.indexOf('TI');
        const toIndex = header.indexOf('TO');

        if (tiIndex > -1 && pricesData[0] && pricesData[0][tiIndex]) {
            prices.transportInbound = parseFloat(pricesData[0][tiIndex]) || 0;
        }
        if (toIndex > -1 && pricesData[0] && pricesData[0][toIndex]) {
            prices.transportOutbound = parseFloat(pricesData[0][toIndex]) || 0;
        }

        const levelColMap: { [key: string]: number } = {};
        header.forEach((colName: string, index: number) => {
            if (levelShortMap[colName]) {
                levelColMap[levelShortMap[colName]] = index;
            }
        });
        
        pricesData.forEach(row => {
            const numSubjects = row[0];
            if (!numSubjects) return;

            for (const levelName in levelColMap) {
                const colIndex = levelColMap[levelName as StudentLevel];
                const price = parseFloat(row[colIndex]);

                if (!isNaN(price)) {
                    if (!prices[levelName as StudentLevel]) {
                        prices[levelName as StudentLevel] = {};
                    }
                    prices[levelName as StudentLevel]![numSubjects] = price;
                }
            }
        });
        
        return { ...defaultPrices, ...prices };

    } catch (error) {
        console.error("Error fetching prices:", error);
        return defaultPrices;
    }
}


export async function updatePrices(prices: Prices) {
    const levelLongMap: { [key in StudentLevel]: string } = Object.fromEntries(
        Object.entries(levelShortMap).map(([short, long]) => [long, short])
    );
    
    await batchUpdateSheet(PRICES_SHEET_NAME, (sheetData) => {
        const header = sheetData[0] || [];
        const qtySubjectsIndex = header.indexOf('qtySubjects');
        if (qtySubjectsIndex === -1) {
            // Handle case where header is missing or malformed
            header[0] = 'qtySubjects';
        }

        const tiIndex = header.indexOf('TI') > -1 ? header.indexOf('TI') : header.length;
        if(header.indexOf('TI') === -1) header[tiIndex] = 'TI';

        const toIndex = header.indexOf('TO') > -1 ? header.indexOf('TO') : header.length;
        if(header.indexOf('TO') === -1) header[toIndex] = 'TO';
        
        const levelColMap: { [key: string]: number } = {};
        header.forEach((colName: string, index: number) => {
             if (levelShortMap[colName]) {
                levelColMap[levelShortMap[colName]] = index;
            }
        });
        
        // Update transport prices in the first data row (row 2 in sheet)
        const firstDataRow = sheetData[1] || [];
        firstDataRow[tiIndex] = prices.transportInbound;
        firstDataRow[toIndex] = prices.transportOutbound;
        if (!sheetData[1]) sheetData[1] = firstDataRow;

        // Update tuition fees
        for (const level of Object.keys(prices)) {
             if (level === 'transportInbound' || level === 'transportOutbound') continue;
            
            const levelPrices = prices[level as StudentLevel]!;
            const shortLevel = levelLongMap[level as StudentLevel];
            let colIndex = levelColMap[level];

            if (colIndex === undefined) {
                colIndex = header.length;
                header.push(shortLevel);
                levelColMap[level] = colIndex;
            }
            
            for (const numSubjects of Object.keys(levelPrices)) {
                 let rowIndex = sheetData.findIndex(row => row[qtySubjectsIndex] === numSubjects);
                 if (rowIndex === -1) {
                     rowIndex = sheetData.length;
                     const newRow = Array(header.length).fill('');
                     newRow[qtySubjectsIndex] = numSubjects;
                     sheetData.push(newRow);
                 }
                 sheetData[rowIndex][colIndex] = levelPrices[numSubjects];
            }
        }
        return sheetData;
    });

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
        // rowIndex + 2 because getSheetData skips header and sheets are 1-based
        await updateRow(STUDENT_SHEET_NAME, 'id', studentId, rowToUpdate, rowIndex + 2);
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
