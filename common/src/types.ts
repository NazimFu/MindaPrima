import type {
  Area, Connector, Day, PaymentMethod, PickupFrom, PricingKind, Role, RunStatus, TransportPlan,
} from './constants';

/** Rows as stored in the spreadsheet, one interface per tab. */

export interface User {
  id: string; email: string; name: string; role: Role; passwordHash: string;
  active: boolean; failedLogins: number; lockedUntil: string; vehicleId: string; createdAt: string;
}
export interface Level { id: string; name: string; order: number }
export interface Subject { id: string; name: string }
export interface Session { id: string; name: string; code: string; color: string; start: string; end: string }
export interface Teacher { id: string; name: string; subject: string; contact: string; levelIds: string }
export interface Guardian { id: string; name: string; contact: string; address: string }
export interface ClassGroup { id: string; levelId: string; subjectId: string; teacherId: string }
export interface ClassSlot { id: string; classId: string; day: Day; start: string; end: string; sessionId: string }
export interface Vehicle { id: string; plate: string; model: string; driverName: string; driverPhone: string; seats: number }
export interface Student {
  id: string; firstName: string; connector: Connector; fatherName: string; levelId: string;
  registeredAt: string; address: string; guardianId: string; classIds: string;
  firstTime: boolean; hasSibling: boolean; active: boolean;
}
export interface StudentTransport {
  studentId: string; needed: boolean; area: Area; vehicleId: string; plan: TransportPlan;
  pickupFrom: PickupFrom; dropoffAddress: string;
}
export interface TransportSlot { id: string; studentId: string; day: Day; sessionId: string }
export interface Skip { id: string; studentId: string; date: string; createdBy: string }
export interface RunEntry { id: string; date: string; vehicleId: string; studentId: string; sessionId: string; status: RunStatus }
export interface Pricing { id: string; kind: PricingKind; levelId: string; qty: number; area: Area | ''; amount: number }
export interface Invoice { id: string; number: string; guardianId: string; month: string; extraLabel: string; extraAmount: number; createdAt: string }
export interface InvoiceLine {
  id: string; invoiceId: string; studentId: string; studentName: string; levelName: string; description: string; amount: number;
}
export interface InvoiceExtra { id: string; invoiceId: string; label: string; detail: string; kind: 'Addition' | 'Discount'; amount: number }
export interface Payment { id: string; invoiceId: string; receiptNumber: string; amount: number; method: PaymentMethod; date: string; createdBy: string }
export interface RefreshToken { id: string; userId: string; tokenHash: string; expiresAt: string; createdAt: string; revoked: boolean }
export interface Setting { key: string; value: string }
export interface WaTemplate { id: string; name: string; body: string }
export interface MessageLog { id: string; at: string; to: string; invoiceId: string; status: string; error: string }
export interface AuditEntry { id: string; at: string; userId: string; action: string; entity: string; entityId: string; detail: string }

/** Public shape of the logged-in user. */
export type SessionUser = Pick<User, 'id' | 'email' | 'name' | 'role' | 'vehicleId'>;
