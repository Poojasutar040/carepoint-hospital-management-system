// SAMPLE DATA — for development only. Replace with real backend data.
import type { Appointment, Bed, Bill, Doctor, HmsData, Patient } from "./types";

const today = new Date();
export const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(today.getTime() - n * 86400000));

const names = [
  "Aarav Sharma", "Diya Patel", "Rohan Mehta", "Ananya Iyer", "Kabir Singh", "Meera Nair",
  "Vihaan Gupta", "Saanvi Reddy", "Arjun Desai", "Ishita Rao", "Aditya Joshi", "Priya Kulkarni",
  "Reyansh Verma", "Kavya Menon", "Neil Bose", "Tara Kapoor", "Dev Malhotra", "Riya Shetty",
];
const conditions = ["Hypertension", "Diabetes", "Fracture", "Asthma", "Migraine", "Pneumonia", "Check-up", "Cardiac arrhythmia"];
const statuses = ["Admitted", "Outpatient", "Discharged", "Critical", "Outpatient", "Admitted"] as const;
const bloods = ["A+", "B+", "O+", "AB+", "A-", "O-"];

const patients: Patient[] = names.map((name, i) => ({
  id: `P${String(1001 + i)}`,
  name,
  age: 18 + ((i * 7) % 60),
  gender: i % 3 === 0 ? "Male" : i % 3 === 1 ? "Female" : "Male",
  phone: `98${String(20000000 + i * 137911).slice(0, 8)}`,
  bloodGroup: bloods[i % bloods.length],
  status: statuses[i % statuses.length],
  condition: conditions[i % conditions.length],
  lastVisit: daysAgo(i % 10),
  registeredAt: daysAgo(i * 3),
}));

const doctors: Doctor[] = [
  ["Dr. Nisha Varma", "Cardiology", "Interventional Cardiologist", 14],
  ["Dr. Rahul Khanna", "Orthopedics", "Joint Replacement", 11],
  ["Dr. Sneha Pillai", "Pediatrics", "Neonatology", 9],
  ["Dr. Amit Saxena", "Neurology", "Stroke Specialist", 16],
  ["Dr. Leena Thomas", "General Medicine", "Internal Medicine", 7],
  ["Dr. Farhan Ali", "Pulmonology", "Respiratory Care", 12],
].map(([name, department, specialization, experience], i) => ({
  id: `D${201 + i}`,
  name: name as string,
  department: department as string,
  specialization: specialization as string,
  experience: experience as number,
  phone: `99${String(30000000 + i * 511237).slice(0, 8)}`,
  email: `${(name as string).split(" ")[1].toLowerCase()}@carepoint.health`,
  available: i % 4 !== 3,
}));

const times = ["09:00", "09:30", "10:15", "11:00", "12:30", "14:00", "15:30", "16:45"];
const appointments: Appointment[] = Array.from({ length: 22 }, (_, i) => {
  const offset = (i % 9) - 4;
  return {
    id: `A${3001 + i}`,
    patientId: patients[i % patients.length].id,
    doctorId: doctors[i % doctors.length].id,
    date: daysAgo(-offset),
    time: times[i % times.length],
    reason: conditions[(i + 2) % conditions.length],
    status: offset > 0 ? "Scheduled" : offset === 0 ? (i % 2 ? "Scheduled" : "Completed") : i % 5 === 0 ? "Cancelled" : "Completed",
  };
});

const admitted = patients.filter((p) => p.status === "Admitted" || p.status === "Critical");
const beds: Bed[] = Array.from({ length: 24 }, (_, i) => {
  const ward = i < 10 ? "Ward A" : i < 18 ? "Ward B" : "ICU";
  return {
    id: `B${i + 1}`,
    ward,
    number: `${ward === "ICU" ? "ICU" : ward.slice(-1)}-${String((i % 10) + 1).padStart(2, "0")}`,
    type: ward === "ICU" ? "ICU" : i % 4 === 0 ? "Private" : "General",
    patientId: admitted[i] ? admitted[i].id : null,
  };
});

const bills: Bill[] = patients.slice(0, 15).map((p, i) => {
  const status = i % 4 === 0 ? "Pending" : i % 7 === 0 ? "Overdue" : "Paid";
  return {
    id: `INV-${5001 + i}`,
    patientId: p.id,
    description: ["Consultation", "Lab tests", "Surgery", "Room charges", "Pharmacy"][i % 5],
    amount: [1200, 3400, 48000, 15500, 2200][i % 5] + i * 150,
    issuedAt: daysAgo(i * 2),
    status,
    paidAt: status === "Paid" ? daysAgo(i * 2 - 1 < 0 ? 0 : i * 2 - 1) : null,
  };
});

export const sampleData: HmsData = { patients, doctors, appointments, beds, bills };
