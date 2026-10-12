import type {
  Area, Connector, Day, PaymentMethod, PaymentStatus, Role, TransportPlan, PickupFrom, RiderStatus,
} from './constants';
import type { FeeBreakdown } from './fees';

/** Shapes the backend returns and the frontend renders. */

export interface PersonLink { id: string; name: string }
export interface SlotDto { day: Day; start: string; end: string; sessionId: string }

export interface ClassDto {
  id: string; levelId: string; levelName: string; subjectId: string; subject: string;
  teacher: PersonLink | null; slots: SlotDto[]; studentCount: number;
}

export interface InvoiceSummary { id: string; number: string; month: string; total: number; paid: number; status: PaymentStatus }

export interface StudentListItem {
  id: string; firstName: string; levelId: string; levelName: string; subjects: string[];
  guardian: PersonLink; status: PaymentStatus; transportNeeded: boolean;
}

export interface StudentTransportDto {
  needed: boolean; area: Area; vehicle: { id: string; plate: string } | null; plan: TransportPlan;
  pickupFrom: PickupFrom; dropoffAddress: string; schedule: { day: Day; sessionId: string }[];
}

export interface StudentProfileDto {
  id: string; firstName: string; connector: Connector; fatherName: string; fullName: string;
  levelId: string; levelName: string; registeredAt: string; address: string; firstTime: boolean; hasSibling: boolean;
  guardian: { id: string; name: string; contact: string };
  siblings: PersonLink[];
  subjects: { classId: string; subject: string; teacher: PersonLink | null; slots: SlotDto[] }[];
  transport: StudentTransportDto;
  fee: FeeBreakdown;
  invoices: InvoiceSummary[];
}

export interface StudentTransportRow {
  studentId: string; firstName: string; levelName: string; vehicle: { id: string; plate: string } | null;
  area: Area; plan: TransportPlan; schedule: { day: Day; sessionId: string }[];
}

export interface GuardianListItem {
  id: string; name: string; contact: string; children: PersonLink[]; owed: number; status: PaymentStatus;
}

export interface GuardianProfileDto {
  id: string; name: string; contact: string; address: string;
  children: { id: string; firstName: string; levelName: string; fee: number }[];
  familyTotal: number; owed: number;
  invoices: (InvoiceSummary & { receipts: { id: string; number: string }[] })[];
}

export interface TeacherProfileDto {
  id: string; name: string; subject: string; contact: string; levels: string[];
  classes: {
    classId: string; levelName: string; subject: string; slots: SlotDto[]; studentCount: number;
    students: { id: string; firstName: string; guardian: PersonLink }[];
  }[];
}

export interface TransportRider {
  entryId: string; studentId: string; firstName: string; levelName: string; guardian: PersonLink;
  sessionId: string; guardianPhone: string; pickup: string; dropoff: string; plan: TransportPlan; status: RiderStatus;
}

export interface VehicleBoardDto {
  date: string;
  vehicle: { id: string; plate: string; model: string; driverName: string; driverPhone: string; seats: number; used: number };
  sessions: { sessionId: string; count: number }[];
  stats: { onList: number; picked: number; waiting: number; absent: number; notRiding: number };
  riders: TransportRider[];
}

export interface InvoiceLineDto { studentId: string; studentName: string; levelName: string; description: string; amount: number }
export interface PaymentDto { id: string; receiptNumber: string; amount: number; method: PaymentMethod; date: string }

export interface InvoiceDto {
  id: string; number: string; month: string; createdAt: string;
  guardian: { id: string; name: string; contact: string; address: string };
  lines: InvoiceLineDto[]; extraLabel: string; extraAmount: number;
  total: number; paid: number; balance: number; status: PaymentStatus; payments: PaymentDto[];
}

export interface ReceiptDto {
  payment: PaymentDto;
  invoice: InvoiceDto;
  received: number;
  balance: number;
}

export interface BillingChild { id: string; name: string; levelName: string; subjects: string[]; fee: number; status: PaymentStatus }
export interface BillingRow { guardian: PersonLink & { contact: string }; children: BillingChild[]; invoice: InvoiceSummary | null; expected: number }
export interface BillingDto { month: string; rows: BillingRow[] }

export interface OverviewDto {
  month: string;
  counts: { students: number; guardians: number; teachers: number; vehicles: number };
  money: { expected: number; collected: number; owed: number };
  /** Guardians per status. */
  statusCounts: Record<PaymentStatus, number>;
  /** Students and their monthly fees per status. */
  byStatus: Record<PaymentStatus, { students: number; amount: number }>;
  levels: { name: string; count: number }[];
  /** Share of billed money collected in the month before, null when nothing was billed. */
  previous: { month: string; collectedPercent: number } | null;
  guardians: GuardianListItem[];
}

export interface SessionUserDto { id: string; email: string; name: string; role: Role; vehicleId: string }
