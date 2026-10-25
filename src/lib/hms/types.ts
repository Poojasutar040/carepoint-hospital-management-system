export type PatientStatus = "Admitted" | "Outpatient" | "Discharged" | "Critical";
export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  bloodGroup: string;
  status: PatientStatus;
  condition: string;
  lastVisit: string; // yyyy-mm-dd
  registeredAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  department: string;
  specialization: string;
  phone: string;
  email: string;
  experience: number;
  available: boolean;
}

export type AppointmentStatus = "Scheduled" | "Completed" | "Cancelled";
export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
}

export interface Bed {
  id: string;
  ward: string;
  number: string;
  type: "General" | "ICU" | "Private";
  patientId: string | null;
}

export type BillStatus = "Paid" | "Pending" | "Overdue";
export interface Bill {
  id: string;
  patientId: string;
  description: string;
  amount: number;
  issuedAt: string;
  status: BillStatus;
  paidAt: string | null;
}

export interface HmsData {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  beds: Bed[];
  bills: Bill[];
}
