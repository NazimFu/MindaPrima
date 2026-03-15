/**
 * lib/monthly-snapshots.ts
 *
 * Manages the "MonthlySnapshots" Google Sheet — one row per student per month.
 *
 * Sheet layout (header row):
 *   monthKey | studentId | name | level | subjects | transport | transportArea |
 *   guardian | guardianContact | address | paymentStatus | active | firstTime
 *
 * monthKey format: "2025-03"
 *
 * Key behaviours:
 * 1. getOrCreateSnapshot(monthKey)
 *    – If rows already exist for that month, return them.
 *    – Otherwise, carry-forward from the previous month (or master Students
 *      sheet for the very first snapshot).
 *    – If the month is January and the previous snapshot was December of the
 *      previous year, auto-increment every student's level by one.
 *
 * 2. updateSnapshotStudent(monthKey, studentId, patch)
 *    – Update subjects / paymentStatus / active for one student in one month.
 *
 * 3. setSnapshotPaymentStatus(monthKey, studentId, status)
 *    – Thin wrapper used by the "mark as paid" action.
 */

import { google } from 'googleapis';
import type { StudentLevel, PaymentStatus } from '@/lib/types';

// ── Auth / sheet setup ──────────────────────────────────────────────────────

const SCOPES    = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_ID  = process.env.GOOGLE_SHEET_ID;
const SNAP_SHEET = 'MonthlySnapshots';

async function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  });
  return auth.getClient();
}

const sheets = google.sheets('v4');

async function getSpreadsheet() {
  return { spreadsheetId: SHEET_ID, auth: await getAuth() };
}

// ── Header ──────────────────────────────────────────────────────────────────

const HEADER = [
  'monthKey', 'studentId', 'name', 'level', 'subjects',
  'transport', 'transportArea', 'guardian', 'guardianContact', 'address',
  'paymentStatus', 'active', 'firstTime',
];

// ── Types ───────────────────────────────────────────────────────────────────

export interface SnapshotStudent {
  monthKey:        string;
  studentId:       string;
  name:            string;
  level:           StudentLevel;
  subjects:        string;
  transport:       'Yes' | 'No';
  transportArea:   'Inside Limit' | 'Outside Limit' | 'N/A';
  guardian:        string;
  guardianContact: string;
  address:         string;
  paymentStatus:   PaymentStatus;
  active:          boolean;
  firstTime:       'Yes' | 'No';
}

// ── Level progression ───────────────────────────────────────────────────────

const LEVEL_ORDER: StudentLevel[] = [
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 4', 'Secondary 5', 'Secondary 6',
];

export function nextLevel(level: StudentLevel): StudentLevel | 'graduated' {
  const idx = LEVEL_ORDER.indexOf(level);
  if (idx === -1 || idx === LEVEL_ORDER.length - 1) return 'graduated';
  return LEVEL_ORDER[idx + 1];
}

// ── Ensure the snapshot sheet exists ───────────────────────────────────────

async function ensureSnapshotSheet() {
  const { spreadsheetId, auth } = await getSpreadsheet();
  const meta = await sheets.spreadsheets.get({ spreadsheetId, auth });
  const exists = meta.data.sheets?.some(s => s.properties?.title === SNAP_SHEET);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId, auth,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SNAP_SHEET } } }],
      },
    });
    // Write header row
    await sheets.spreadsheets.values.update({
      spreadsheetId, auth,
      range:             `${SNAP_SHEET}!A1`,
      valueInputOption:  'RAW',
      requestBody:       { values: [HEADER] },
    });
  }
}

// ── Read all rows for a monthKey ────────────────────────────────────────────

async function readSnapshotRows(monthKey: string): Promise<SnapshotStudent[]> {
  const { spreadsheetId, auth } = await getSpreadsheet();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId, auth, range: SNAP_SHEET,
  });
  const rows = res.data.values ?? [];
  if (rows.length < 2) return [];

  return rows.slice(1)
    .filter(r => r[0] === monthKey)
    .map(rowToSnapshot);
}

function rowToSnapshot(r: any[]): SnapshotStudent {
  return {
    monthKey:        r[0]  ?? '',
    studentId:       r[1]  ?? '',
    name:            r[2]  ?? '',
    level:           (r[3] ?? 'Primary 1') as StudentLevel,
    subjects:        r[4]  ?? '',
    transport:       (r[5] ?? 'No') as 'Yes' | 'No',
    transportArea:   (r[6] ?? 'N/A') as 'Inside Limit' | 'Outside Limit' | 'N/A',
    guardian:        r[7]  ?? '',
    guardianContact: r[8]  ?? '',
    address:         r[9]  ?? '',
    paymentStatus:   (r[10] ?? 'Pending') as PaymentStatus,
    active:          (r[11] ?? 'true') === 'true',
    firstTime:       (r[12] ?? 'No') as 'Yes' | 'No',
  };
}

function snapshotToRow(s: SnapshotStudent): any[] {
  return [
    s.monthKey, s.studentId, s.name, s.level, s.subjects,
    s.transport, s.transportArea, s.guardian, s.guardianContact, s.address,
    s.paymentStatus, String(s.active), s.firstTime,
  ];
}

// ── Parse a monthKey into { year, month } ───────────────────────────────────

function parseKey(key: string): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m };
}

function prevKey(key: string): string {
  const { year, month } = parseKey(key);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/** True if this monthKey is January AND the previous key is December of the prior year */
function isYearRollover(key: string): boolean {
  const { month } = parseKey(key);
  return month === 1;
}

// ── Load master Students sheet as fallback ──────────────────────────────────

async function readMasterStudents(monthKey: string): Promise<SnapshotStudent[]> {
  const { spreadsheetId, auth } = await getSpreadsheet();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId, auth, range: 'Students',
  });
  const rows = (res.data.values ?? []).slice(1); // skip header

  return rows
    .filter(r => r[0]) // must have an id
    .map(r => ({
      monthKey,
      studentId:       r[0]  ?? '',
      name:            r[1]  ?? '',
      level:           (r[2] ?? 'Primary 1') as StudentLevel,
      subjects:        r[3]  ?? '',
      transport:       (r[7] ?? 'No') as 'Yes' | 'No',
      transportArea:   (r[8] ?? 'N/A') as 'Inside Limit' | 'Outside Limit' | 'N/A',
      guardian:        r[4]  ?? '',
      guardianContact: r[5]  ?? '',
      address:         r[6]  ?? '',
      paymentStatus:   'Pending' as PaymentStatus,
      active:          true,
      firstTime:       (r[10] ?? 'No') as 'Yes' | 'No',
    }));
}

// ── Write new snapshot rows ─────────────────────────────────────────────────

async function appendSnapshotRows(students: SnapshotStudent[]) {
  if (!students.length) return;
  const { spreadsheetId, auth } = await getSpreadsheet();
  await sheets.spreadsheets.values.append({
    spreadsheetId, auth,
    range:            `${SNAP_SHEET}!A:M`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody:      { values: students.map(snapshotToRow) },
  });
}

// ── PUBLIC: getOrCreateSnapshot ─────────────────────────────────────────────

/**
 * Returns snapshot students for `monthKey`.
 * If none exist, creates them by carrying forward from the previous snapshot
 * (or from the master Students sheet if no previous snapshot exists).
 * On year rollover (any January), increments every student's level by one.
 */
export async function getOrCreateSnapshot(monthKey: string): Promise<SnapshotStudent[]> {
  await ensureSnapshotSheet();

  // 1. Try to load existing snapshot
  let existing = await readSnapshotRows(monthKey);
  if (existing.length > 0) return existing;

  // 2. No snapshot exists — carry forward from previous month
  const prev = prevKey(monthKey);
  let source = await readSnapshotRows(prev);

  // 3. If no previous snapshot at all, seed from master Students sheet
  if (source.length === 0) {
    source = await readMasterStudents(monthKey);
    // Write snapshot immediately and return (no level-up needed on first seed)
    if (source.length > 0) {
      await appendSnapshotRows(source);
    }
    return source;
  }

  // 4. Carry forward: clone previous month's snapshot into new monthKey
  let carried = source.map(s => ({
    ...s,
    monthKey,
    paymentStatus: 'Pending' as PaymentStatus, // reset each month
    firstTime: 'No' as 'Yes' | 'No',           // not first-time in a carried month
  }));

  // 5. Year rollover — upgrade levels
  if (isYearRollover(monthKey)) {
    carried = carried.map(s => {
      const upgraded = nextLevel(s.level);
      if (upgraded === 'graduated') {
        // Mark graduated students as inactive rather than removing them
        return { ...s, active: false, level: s.level }; // keep old level for record
      }
      return { ...s, level: upgraded as StudentLevel };
    });
  }

  // 6. Merge any NEW students added to the master sheet since the last snapshot
  const masterStudents = await readMasterStudents(monthKey);
  const existingIds = new Set(carried.map(s => s.studentId));
  const newStudents = masterStudents
    .filter(s => !existingIds.has(s.studentId))
    .map(s => ({ ...s, firstTime: 'Yes' as 'Yes' | 'No' }));

  const final = [...carried, ...newStudents];

  // 7. Persist
  await appendSnapshotRows(final);
  return final;
}

// ── PUBLIC: updateSnapshotStudent ───────────────────────────────────────────

/**
 * Patch one student's record in a month snapshot.
 * Only allows changing: subjects, paymentStatus, active, transport, transportArea.
 */
export async function updateSnapshotStudent(
  monthKey:  string,
  studentId: string,
  patch: Partial<Pick<SnapshotStudent, 'subjects' | 'paymentStatus' | 'active' | 'transport' | 'transportArea'>>,
) {
  const { spreadsheetId, auth } = await getSpreadsheet();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId, auth, range: SNAP_SHEET,
  });
  const allRows = res.data.values ?? [];
  if (allRows.length < 2) throw new Error('MonthlySnapshots sheet is empty');

  // Find the row index (1-based, accounting for header row)
  const rowIndex = allRows.findIndex(
    (r, i) => i > 0 && r[0] === monthKey && r[1] === studentId
  );
  if (rowIndex === -1) throw new Error(`Student ${studentId} not found in snapshot ${monthKey}`);

  const row = [...allRows[rowIndex]];
  const snap = rowToSnapshot(row);

  const updated: SnapshotStudent = {
    ...snap,
    subjects:      patch.subjects      ?? snap.subjects,
    paymentStatus: patch.paymentStatus ?? snap.paymentStatus,
    active:        patch.active        ?? snap.active,
    transport:     patch.transport     ?? snap.transport,
    transportArea: patch.transportArea ?? snap.transportArea,
  };

  // rowIndex in allRows is 0-based; sheet row is rowIndex + 1 (header) + 1 (1-based) = rowIndex + 2
  const sheetRow = rowIndex + 1; // rowIndex is already 0-based after slice; allRows[0] = header
  await sheets.spreadsheets.values.update({
    spreadsheetId, auth,
    range:            `${SNAP_SHEET}!A${sheetRow + 1}`,
    valueInputOption: 'RAW',
    requestBody:      { values: [snapshotToRow(updated)] },
  });
}

// ── PUBLIC: setSnapshotPaymentStatus ───────────────────────────────────────

export async function setSnapshotPaymentStatus(
  monthKey:  string,
  studentId: string,
  status:    PaymentStatus,
) {
  return updateSnapshotStudent(monthKey, studentId, { paymentStatus: status });
}

// ── PUBLIC: monthKeyFromString ──────────────────────────────────────────────

/**
 * Converts a selectedMonth string ("current" | "March 2025") to a
 * "YYYY-MM" key suitable for snapshot lookups.
 */
export function monthKeyFromString(selectedMonth: string): string {
  if (selectedMonth === 'current') {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  const MONTHS: Record<string, string> = {
    January:'01', February:'02', March:'03',    April:'04',
    May:'05',     June:'06',     July:'07',      August:'08',
    September:'09', October:'10', November:'11', December:'12',
  };
  const [monthName, year] = selectedMonth.split(' ');
  return `${year}-${MONTHS[monthName] ?? '01'}`;
}

/** Reverse: "2025-03" → "March 2025" */
export function monthKeyToString(key: string): string {
  const MONTH_NAMES = [
    '', 'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  const { year, month } = parseKey(key);
  return `${MONTH_NAMES[month]} ${year}`;
}