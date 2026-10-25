import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { useHms, inr, resetData } from "@/lib/hms/store";
import { iso } from "@/lib/hms/sample-data";
import { ConfirmDelete, Field, PageHeader, StatCard, inputCls } from "@/components/hms/ui";
import { Users, CalendarClock, BedDouble, IndianRupee } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — CarePoint" },
      { name: "description", content: "Patient, appointment, bed occupancy and revenue reports." },
      { property: "og:title", content: "Reports — CarePoint" },
      { property: "og:description", content: "Patient, appointment, bed occupancy and revenue reports." },
    ],
  }),
  component: Reports,
});

function csv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return toast.error("Nothing to export for this range");
  const head = Object.keys(rows[0]);
  const body = rows.map((r) => head.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","));
  const blob = new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast.success(`${name}.csv downloaded`);
}

const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Reports() {
  const d = useHms();
  const [from, setFrom] = useState(iso(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(iso(new Date(Date.now() + 7 * 86400000)));
  const inRange = (x: string) => x >= from && x <= to;

  const pts = d.patients.filter((p) => inRange(p.registeredAt));
  const appts = d.appointments.filter((a) => inRange(a.date));
  const bills = d.bills.filter((b) => inRange(b.issuedAt));
  const revenue = bills.filter((b) => b.status === "Paid").reduce((s, b) => s + b.amount, 0);
  const occ = d.beds.filter((b) => b.patientId).length;

  const byStatus = ["Admitted", "Outpatient", "Critical", "Discharged"].map((s) => ({ name: s, value: pts.filter((p) => p.status === s).length }));
  const byDoctor = d.doctors.map((doc) => ({ name: doc.name.replace("Dr. ", ""), count: appts.filter((a) => a.doctorId === doc.id).length }));
  const byWard = Array.from(new Set(d.beds.map((b) => b.ward))).map((w) => ({ name: w, occupied: d.beds.filter((b) => b.ward === w && b.patientId).length, free: d.beds.filter((b) => b.ward === w && !b.patientId).length }));
  const byType = Array.from(new Set(bills.map((b) => b.description))).map((t) => ({ name: t, amount: bills.filter((b) => b.description === t).reduce((s, b) => s + b.amount, 0) }));
  const pn = (id: string) => d.patients.find((p) => p.id === id)?.name ?? "";
  const dn = (id: string) => d.doctors.find((p) => p.id === id)?.name ?? "";

  return (
    <>
      <PageHeader title="Reports" subtitle="Analyse activity across a date range"
        action={<ConfirmDelete title="Reset all data to the sample set?" onConfirm={() => { resetData(); toast.success("Sample data restored"); }} trigger={<Button variant="outline"><RotateCcw className="h-4 w-4" /> Reset sample data</Button>} />} />
      <div className="card-soft mb-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
        <Field label="From"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        {from > to && <p className="text-sm text-destructive">"From" must be before "To".</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New patients" value={pts.length} icon={Users} tone="blue" />
        <StatCard label="Appointments" value={appts.length} icon={CalendarClock} tone="teal" />
        <StatCard label="Bed occupancy" value={`${Math.round((occ / d.beds.length) * 100)}%`} icon={BedDouble} tone="amber" hint="Current" />
        <StatCard label="Revenue collected" value={inr(revenue)} icon={IndianRupee} tone="green" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ReportCard title="Patients by status" onExport={() => csv("patients-report", pts.map(({ id, name, age, gender, status, condition, registeredAt }) => ({ id, name, age, gender, status, condition, registeredAt })))}>
          <PieChart><Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>{byStatus.map((_, i) => <Cell key={i} fill={colors[i]} />)}</Pie><Tooltip /></PieChart>
        </ReportCard>
        <ReportCard title="Appointments by doctor" onExport={() => csv("appointments-report", appts.map((a) => ({ id: a.id, date: a.date, time: a.time, patient: pn(a.patientId), doctor: dn(a.doctorId), reason: a.reason, status: a.status })))}>
          <BarChart data={byDoctor}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} fontSize={11} width={25} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="count" name="Appointments" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /></BarChart>
        </ReportCard>
        <ReportCard title="Bed occupancy by ward" onExport={() => csv("bed-occupancy", d.beds.map((b) => ({ bed: b.number, ward: b.ward, type: b.type, patient: b.patientId ? pn(b.patientId) : "Available" })))}>
          <BarChart data={byWard}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} fontSize={11} width={25} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="occupied" stackId="a" name="Occupied" fill="var(--chart-1)" /><Bar dataKey="free" stackId="a" name="Available" fill="var(--chart-3)" radius={[6, 6, 0, 0]} /></BarChart>
        </ReportCard>
        <ReportCard title="Revenue by service" onExport={() => csv("revenue-report", bills.map((b) => ({ invoice: b.id, patient: pn(b.patientId), description: b.description, amount: b.amount, issued: b.issuedAt, status: b.status, paidAt: b.paidAt ?? "" })))}>
          <BarChart data={byType} layout="vertical"><CartesianGrid stroke="var(--border)" horizontal={false} /><XAxis type="number" fontSize={11} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" fontSize={11} width={95} tickLine={false} axisLine={false} /><Tooltip formatter={(v: number) => inr(v)} /><Bar dataKey="amount" name="Billed" fill="var(--chart-2)" radius={[0, 6, 6, 0]} /></BarChart>
        </ReportCard>
      </div>
    </>
  );
}

function ReportCard({ title, onExport, children }: { title: string; onExport: () => void; children: React.ReactElement }) {
  return (
    <div className="card-soft p-5">
      <div className="flex items-center justify-between"><h2 className="font-semibold">{title}</h2><Button size="sm" variant="outline" onClick={onExport}><Download className="h-4 w-4" /> CSV</Button></div>
      <div className="mt-4 h-64"><ResponsiveContainer>{children}</ResponsiveContainer></div>
    </div>
  );
}
