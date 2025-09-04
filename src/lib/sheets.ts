
import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';

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

export async function getSheet(sheetName: string): Promise<sheets_v4.Schema$Sheet | undefined> {
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
    const { spreadsheetId, auth } = await getSpreadsheet();

    // First, find the row index to delete
    const rowIndex = await findRowIndex(sheetName, key, value);
    if (rowIndex === -1) {
        throw new Error('Row not found for deletion');
    }

    // Then, get all sheets to find the sheetId
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId, auth });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);

    if (!sheet?.properties?.sheetId) {
        throw new Error('Sheet properties not found');
    }
    const sheetId = sheet.properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        auth,
        requestBody: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
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
