export type StudentLevel = 'Primary 1' | 'Primary 2' | 'Primary 3' | 'Primary 4' | 'Primary 5' | 'Primary 6' | 'Secondary 1' | 'Secondary 2' | 'Secondary 3' | 'Secondary 5' | 'Secondary 6';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';
export type TransportArea = 'Inside Limit' | 'Outside Limit' | 'N/A';

export type Student = {
  id: string;
  name: string;
  level: StudentLevel;
  subjects: string;
  guardian: string;
  guardianContact: string;
  address: string;
  transport: 'Yes' | 'No';
  transportArea: TransportArea;
  paymentStatus: PaymentStatus;
  firstTime: 'Yes' | 'No';
};

export type Teacher = {
  id: string;
  name: string;
  subject: string;
  contact: string;
};

export type MonthlyData = {
  students: Student[];
  teachers: Teacher[];
};

export type HistoricalData = {
  [month: string]: MonthlyData;
};
