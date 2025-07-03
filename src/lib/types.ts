export type StudentLevel = 'Primary 1' | 'Primary 2' | 'Primary 3' | 'Secondary 1' | 'Secondary 2';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';

export type Student = {
  id: string;
  name: string;
  level: StudentLevel;
  subjects: string;
  guardian: string;
  address: string;
  transport: 'Yes' | 'No';
  paymentStatus: PaymentStatus;
};

export type Teacher = {
  id: string;
  name: string;
  subject: string;
  contact: string;
};
