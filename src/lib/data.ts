import type { Student, Teacher, HistoricalData } from './types';

const currentStudents: Student[] = [
  {
    id: 'STU-001',
    name: 'Ali bin Abu',
    level: 'Primary 2',
    subjects: 'Malay, English, Mathematics',
    guardian: 'Abu bin Kassim',
    address: '123 Jalan Merdeka, 50480 Kuala Lumpur',
    transport: 'Yes',
    paymentStatus: 'Paid',
  },
  {
    id: 'STU-002',
    name: 'Siti Nurhaliza',
    level: 'Secondary 1',
    subjects: 'Science, History, Geography',
    guardian: 'Ahmad bin Said',
    address: '456 Jalan Raja, 50480 Kuala Lumpur',
    transport: 'No',
    paymentStatus: 'Pending',
  },
  {
    id: 'STU-003',
    name: 'Tan Wei Ling',
    level: 'Primary 3',
    subjects: 'Chinese, Mathematics, Art',
    guardian: 'Tan Ah Kow',
    address: '789 Jalan Bintang, 50480 Kuala Lumpur',
    transport: 'Yes',
    paymentStatus: 'Paid',
  },
  {
    id: 'STU-004',
    name: 'Muthu Krishnan',
    level: 'Secondary 2',
    subjects: 'Physics, Chemistry, Biology',
    guardian: 'Krishnan a/l Ramasamy',
    address: '101 Jalan Pahlawan, 50480 Kuala Lumpur',
    transport: 'No',
    paymentStatus: 'Overdue',
  },
    {
    id: 'STU-005',
    name: 'Chloe Lim',
    level: 'Primary 1',
    subjects: 'English, Art',
    guardian: 'James Lim',
    address: '21 Jalan Sentosa, 50480 Kuala Lumpur',
    transport: 'Yes',
    paymentStatus: 'Paid',
  },
];

const currentTeachers: Teacher[] = [
  {
    id: 'TEA-001',
    name: 'Mr. Azman',
    subject: 'Mathematics',
    contact: '012-3456789',
  },
  {
    id: 'TEA-002',
    name: 'Mrs. Chen',
    subject: 'Science',
    contact: '019-8765432',
  },
  {
    id: 'TEA-003',
    name: 'Ms. Priya',
    subject: 'English',
    contact: '017-5551234',
  },
    {
    id: 'TEA-004',
    name: 'Dr. Lee',
    subject: 'Physics',
    contact: '016-1122334',
  },
];

const mayStudents: Student[] = [
  { ...currentStudents[0] },
  { ...currentStudents[1], paymentStatus: 'Paid' },
  { ...currentStudents[2] },
];

const mayTeachers: Teacher[] = [
  { ...currentTeachers[0] },
  { ...currentTeachers[1] },
  { ...currentTeachers[2] },
];


export const initialHistoricalData: HistoricalData = {
  'current': {
    students: currentStudents,
    teachers: currentTeachers,
  },
  'May 2024': {
    students: mayStudents,
    teachers: mayTeachers,
  }
}
