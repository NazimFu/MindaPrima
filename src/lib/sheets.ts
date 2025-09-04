
import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

const STUDENT_SHEET_NAME = 'Students';
const TEACHER_SHEET_NAME = 'Teachers';
const PRICES_SHEET_NAME = 'Prices';
const STUDENT_HEADER = ['id', 'name', 'level', 'subjects', 'guardian', 'guardianContact', 'address', 'transport', 'transportArea', 'paymentStatus', 'firstTime'];
const TEACHER_HEADER = ['id', 'name', 'subject', 'contact'];
const PRICES_HEADER = ['qtySubjects', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S5', 'S6', 'TI', 'TO'];


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
    try {
        const response = await sheets.spreadsheets.get({
            spreadsheetId,
            auth,
        });
        const sheet = response.data.sheets?.find(s => s.properties?.title === sheetName);
        return sheet;
    } catch (error) {
        console.error(`Error fetching sheet "${sheetName}":`, error);
        return undefined;
    }
}

export async function getSheetData(sheet: sheets_v4.Schema$Sheet, includeHeader = false) {
    const { spreadsheetId, auth } = await getSpreadsheet();
    if (!sheet?.properties?.title) {
        throw new Error('Sheet properties not found or title is missing');
    }
    const range = sheet.properties.title;
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        auth,
        range,
    });
    
    const values = response.data.values || [];
    return includeHeader ? values : values.slice(1);
}

export async function findRowIndex(sheetName: string, key: string, value: string): Promise<number> {
    const sheet = await getSheet(sheetName);
    if (!sheet) return -1;

    const { spreadsheetId, auth } = await getSpreadsheet();
    const range = sheet.properties.title;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, auth, range });
    const allData = response.data.values || [];

    let header;
    let data;

    if (sheetName === STUDENT_SHEET_NAME) {
        header = STUDENT_HEADER;
        data = allData.slice(1); // data without header
    } else if (sheetName === TEACHER_SHEET_NAME) {
        header = TEACHER_HEADER;
        data = allData.slice(1);
    } else { // For other sheets like Prices, the logic might differ
         header = allData[0] || [];
         data = allData.slice(1);
    }
    
    if (!header) return -1;
    
    const colIndex = header.indexOf(key);
    if (colIndex === -1) return -1;
    
    const rowIndex = data.findIndex(row => row[colIndex] === value);
    
    // +2 because sheets are 1-based and we sliced off the header
    return rowIndex !== -1 ? rowIndex + 2 : -1;
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

export async function updateRow(sheetName: string, key: string, value: string, rowData: any[], rowIndex?: number) {
    const index = rowIndex ?? await findRowIndex(sheetName, key, value);
    if (index === -1) {
        throw new Error('Row not found for update');
    }
    const { spreadsheetId, auth } = await getSpreadsheet();
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        auth,
        range: `${sheetName}!A${index}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [rowData],
        },
    });
}

export async function deleteRow(sheetName: string, key: string, value: string) {
    const { spreadsheetId, auth } = await getSpreadsheet();
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId, auth });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);

    if (sheet?.properties?.sheetId === null || sheet?.properties?.sheetId === undefined) {
        throw new Error('Sheet properties not found, cannot delete row.');
    }
    const sheetId = sheet.properties.sheetId;

    const rowIndex = await findRowIndex(sheetName, key, value);
    if (rowIndex === -1) {
        throw new Error('Row not found for deletion');
    }

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

export async function batchUpdateSheet(
    sheetName: string,
    updateFn: (data: any[][]) => any[][]
) {
    const { spreadsheetId, auth } = await getSpreadsheet();
    const sheet = await getSheet(sheetName);
    if (!sheet || !sheet.properties?.title) {
        throw new Error(`Sheet ${sheetName} not found.`);
    }

    // 1. Read all existing data.
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        auth,
        range: sheet.properties.title,
    });
    const existingData = response.data.values || [];

    // 2. Apply transformations.
    const newData = updateFn(existingData);

    // 3. Clear the sheet.
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        auth,
        range: sheet.properties.title,
    });

    // 4. Write new data.
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        auth,
        range: sheet.properties.title,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: newData,
        },
    });
}
