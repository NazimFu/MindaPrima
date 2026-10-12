import type * as T from './types';

/**
 * One spreadsheet tab per entity. `columns` is the single definition of the column order.
 * The repository maps rows by these names, never by column letters.
 * Tab names can be overridden with env vars SHEET_TAB_<KEY> and SHEET_TAB_PREFIX in the backend config.
 */
export interface TableDef<K extends string = string> {
  tab: string;
  columns: readonly K[];
  /** Columns holding numbers. */
  numbers?: readonly K[];
  /** Columns holding booleans (stored as TRUE/FALSE). */
  booleans?: readonly K[];
}

function def<R>() {
  return <K extends keyof R & string>(d: TableDef<K>) => d;
}

export const TABLES = {
  users: def<T.User>()({
    tab: 'Users',
    columns: ['id', 'email', 'name', 'role', 'passwordHash', 'active', 'failedLogins', 'lockedUntil', 'vehicleId', 'createdAt'],
    numbers: ['failedLogins'], booleans: ['active'],
  }),
  levels: def<T.Level>()({ tab: 'Levels', columns: ['id', 'name', 'order'], numbers: ['order'] }),
  subjects: def<T.Subject>()({ tab: 'Subjects', columns: ['id', 'name'] }),
  sessions: def<T.Session>()({ tab: 'Sessions', columns: ['id', 'name', 'code', 'color', 'start', 'end'] }),
  teachers: def<T.Teacher>()({ tab: 'Teachers', columns: ['id', 'name', 'subject', 'contact', 'levelIds'] }),
  guardians: def<T.Guardian>()({ tab: 'Guardians', columns: ['id', 'name', 'contact', 'address'] }),
  classes: def<T.ClassGroup>()({ tab: 'Classes', columns: ['id', 'levelId', 'subjectId', 'teacherId'] }),
  classSlots: def<T.ClassSlot>()({ tab: 'ClassSlots', columns: ['id', 'classId', 'day', 'start', 'end', 'sessionId'] }),
  vehicles: def<T.Vehicle>()({ tab: 'Vehicles', columns: ['id', 'plate', 'model', 'driverName', 'driverPhone', 'seats'], numbers: ['seats'] }),
  students: def<T.Student>()({
    tab: 'Students',
    columns: ['id', 'firstName', 'connector', 'fatherName', 'levelId', 'registeredAt', 'address', 'guardianId', 'classIds', 'firstTime', 'hasSibling', 'active'],
    booleans: ['firstTime', 'hasSibling', 'active'],
  }),
  studentTransport: def<T.StudentTransport>()({
    tab: 'StudentTransport',
    columns: ['studentId', 'needed', 'area', 'vehicleId', 'plan', 'pickupFrom', 'dropoffAddress'],
    booleans: ['needed'],
  }),
  transportSlots: def<T.TransportSlot>()({ tab: 'TransportSlots', columns: ['id', 'studentId', 'day', 'sessionId'] }),
  skips: def<T.Skip>()({ tab: 'Skips', columns: ['id', 'studentId', 'date', 'createdBy'] }),
  runEntries: def<T.RunEntry>()({ tab: 'RunEntries', columns: ['id', 'date', 'vehicleId', 'studentId', 'sessionId', 'status'] }),
  pricing: def<T.Pricing>()({ tab: 'Pricing', columns: ['id', 'kind', 'levelId', 'qty', 'area', 'amount'], numbers: ['qty', 'amount'] }),
  invoices: def<T.Invoice>()({ tab: 'Invoices', columns: ['id', 'number', 'guardianId', 'month', 'extraLabel', 'extraAmount', 'createdAt'], numbers: ['extraAmount'] }),
  invoiceLines: def<T.InvoiceLine>()({
    tab: 'InvoiceLines',
    columns: ['id', 'invoiceId', 'studentId', 'studentName', 'levelName', 'description', 'amount'],
    numbers: ['amount'],
  }),
  invoiceExtras: def<T.InvoiceExtra>()({ tab: 'InvoiceExtras', columns: ['id', 'invoiceId', 'label', 'detail', 'kind', 'amount'], numbers: ['amount'] }),
  payments: def<T.Payment>()({ tab: 'Payments', columns: ['id', 'invoiceId', 'receiptNumber', 'amount', 'method', 'date', 'createdBy'], numbers: ['amount'] }),
  refreshTokens: def<T.RefreshToken>()({
    tab: 'RefreshTokens',
    columns: ['id', 'userId', 'tokenHash', 'expiresAt', 'createdAt', 'revoked'],
    booleans: ['revoked'],
  }),
  settings: def<T.Setting>()({ tab: 'Settings', columns: ['key', 'value'] }),
  waTemplates: def<T.WaTemplate>()({ tab: 'WaTemplates', columns: ['id', 'name', 'body'] }),
  messageLog: def<T.MessageLog>()({ tab: 'MessageLog', columns: ['id', 'at', 'to', 'invoiceId', 'status', 'error'] }),
  auditLog: def<T.AuditEntry>()({ tab: 'AuditLog', columns: ['id', 'at', 'userId', 'action', 'entity', 'entityId', 'detail'] }),
} as const;

export type TableKey = keyof typeof TABLES;

/** Row type for each table key. */
export interface RowMap {
  users: T.User; levels: T.Level; subjects: T.Subject; sessions: T.Session; teachers: T.Teacher;
  guardians: T.Guardian; classes: T.ClassGroup; classSlots: T.ClassSlot; vehicles: T.Vehicle;
  students: T.Student; studentTransport: T.StudentTransport; transportSlots: T.TransportSlot;
  skips: T.Skip; runEntries: T.RunEntry; pricing: T.Pricing; invoices: T.Invoice;
  invoiceLines: T.InvoiceLine; invoiceExtras: T.InvoiceExtra; payments: T.Payment; refreshTokens: T.RefreshToken; settings: T.Setting; waTemplates: T.WaTemplate;
  messageLog: T.MessageLog; auditLog: T.AuditEntry;
}

/** Primary key column of each table. */
export const KEY_COLUMN: Record<TableKey, string> = {
  users: 'id', levels: 'id', subjects: 'id', sessions: 'id', teachers: 'id', guardians: 'id', classes: 'id',
  classSlots: 'id', vehicles: 'id', students: 'id', studentTransport: 'studentId', transportSlots: 'id',
  skips: 'id', runEntries: 'id', pricing: 'id', invoices: 'id', invoiceLines: 'id', invoiceExtras: 'id', payments: 'id', refreshTokens: 'id',
  settings: 'key', waTemplates: 'id', messageLog: 'id', auditLog: 'id',
};
