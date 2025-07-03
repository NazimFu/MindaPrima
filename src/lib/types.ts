export type Student = {
  id: string;
  name: string;
  level: 'Primary 1' | 'Primary 2' | 'Primary 3' | 'Secondary 1' | 'Secondary 2';
  subjects: string;
  guardian: string;
  address: string;
  transport: 'Yes' | 'No';
  paymentStatus: 'Paid' | 'Pending' | 'Overdue';
};

export type Teacher = {
  id: string;
  name: string;
  subject: string;
  contact: string;
};
