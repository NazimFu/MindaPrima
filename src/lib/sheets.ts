import { google } from 'googleapis';
import type { Student, Teacher } from './types';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

const STUDENT_SHEET_NAME = 'Students';
const TEACHER_SHEET_NAME = 'Teachers';
const STUDENT_HEADER = ['id', 'name', 'level', 'subjects', 'guardian', 'guardianContact', 'address', 'transport', 'transportArea', 'paymentStatus', 'firstTime'];
const TEACHER_HEADER = ['id', 'name', 'subject', 'contact'];

async function getAuth() {
    const credentials = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
    });
    return auth.getClient();
}

const sheets = google.sheets('v4');

async function getSpreadsheet() {
    const auth = await getAuth();
    return {
        spreadsheetId: SHEET_ID,
        auth,
    };
}

export async function getSheet(sheetName: string) {
    const { spreadsheetId, auth } = await getSpreadsheet();
    const response = await sheets.spreadsheets.get({
        spreadsheetId,
        auth,
    });
    const sheet = response.data.sheets?.find(s => s.properties?.title === sheetName);
    return sheet;
}

export async function getSheetData(sheet: any) {
    const { spreadsheetId, auth } = await getSpreadsheet();
    if (!sheet?.properties?.title) {
        throw new Error('Sheet not found');
    }
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        auth,
        range: sheet.properties.title,
    });
    return response.data.values?.slice(1) || []; // Skip header row
}

async function findRowIndex(sheetName: string, key: string, value: string): Promise<number> {
    const sheet = await getSheet(sheetName);
    if (!sheet) return -1;
    const data = await getSheetData(sheet);
    const header = sheetName === STUDENT_SHEET_NAME ? STUDENT_HEADER : TEACHER_HEADER;
    const colIndex = header.indexOf(key);
    if (colIndex === -1) return -1;
    
    const rowIndex = data.findIndex(row => row[colIndex] === value);
    return rowIndex !== -1 ? rowIndex + 2 : -1; // +2 because sheets are 1-based and we have a header
}


export async function addRow(sheetName: string, rowData: any[]) {
    const { spreadsheetId, auth } = await getSpreadsheet();
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        auth,
        range: sheetName,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [rowData],
        },
    });
}

export async function updateRow(sheetName: string, key: string, value: string, rowData: any[]) {
    const rowIndex = await findRowIndex(sheetName, key, value);
    if (rowIndex === -1) {
        throw new Error('Row not found for update');
    }
    const { spreadsheetId, auth } = await getSpreadsheet();
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        auth,
        range: `${sheetName}!A${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [rowData],
        },
    });
}

export async function deleteRow(sheetName: string, key: string, value: string) {
    const rowIndex = await findRowIndex(sheetName, key, value);
    if (rowIndex === -1) {
        throw new Error('Row not found for deletion');
    }
    
    const sheet = await getSheet(sheetName);
    if (!sheet?.properties?.sheetId) {
         throw new Error('Sheet properties not found');
    }

    const { spreadsheetId, auth } = await getSpreadsheet();

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        auth,
        requestBody: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId: sheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex,
                        },
                    },
                },
            ],
        },
    });
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
