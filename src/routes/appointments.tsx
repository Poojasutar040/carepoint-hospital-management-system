import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useHms, update, nextId } from "@/lib/hms/store";
import { iso } from "@/lib/hms/sample-data";
import type { AppointmentStatus } from "@/lib/hms/types";
import { ConfirmDelete, Empty, Field, FilterPills, PageHeader, SearchInput, StatusBadge, TableWrap, inputCls, td, th } from "@/components/hms/ui";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — CarePoint" },
      { name: "description", content: "Schedule and track patient appointments." },
      { property: "og:title", content: "Appointments — CarePoint" },
      { property: "og:description", content: "Schedule and track patient appointments." },
    ],
  }),
  component: Appointments,
});

const filters = ["All", "Scheduled", "Completed", "Cancelled"] as const;

function Appointments() {
  const { appointments, patients, doctors } = useHms();
  const [q, setQ] = useState("");
  const [f, setF] = useState<(typeof filters)[number]>("All");
  const [open, setOpen] = useState(false);
  const pn = (id: string) => patients.find((p) => p.id === id)?.name ?? "Unknown";
  const dn = (id: string) => doctors.find((p) => p.id === id)?.name ?? "Unknown";
  const list = appointments
    .filter((a) => (f === "All" || a.status === f) && `${pn(a.patientId)} ${dn(a.doctorId)} ${a.reason}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const setStatus = (id: string, status: AppointmentStatus) => {
    update((d) => ({ ...d, appointments: d.appointments.map((a) => (a.id === id ? { ...a, status } : a)) }));
    toast.success(`Appointment ${status.toLowerCase()}`);
  };

  return (
    <>
      <PageHeader title="Appointments" subtitle={`${appointments.filter((a) => a.status === "Scheduled").length} scheduled`} action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Schedule</Button>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Search patient, doctor…" />
        <FilterPills options={[...filters]} value={f} onChange={setF} />
      </div>
      <TableWrap>
        <thead><tr><th className={th}>Date & time</th><th className={th}>Patient</th><th className={th}>Doctor</th><th className={th}>Reason</th><th className={th}>Status</th><th className={th}></th></tr></thead>
        <tbody>
          {list.map((a) => (
            <tr key={a.id} className="hover:bg-muted/40">
              <td className={td}><p className="font-medium">{a.date}</p><p className="text-xs text-muted-foreground">{a.time}</p></td>
              <td className={td}>{pn(a.patientId)}</td>
              <td className={td}>{dn(a.doctorId)}</td>
              <td className={td}>{a.reason}</td>
              <td className={td}><StatusBadge status={a.status} /></td>
              <td className={td}>
                <div className="flex justify-end gap-1">
                  {a.status === "Scheduled" && <>
                    <Button size="icon" variant="ghost" aria-label="Mark completed" onClick={() => setStatus(a.id, "Completed")}><Check className="h-4 w-4 text-success" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Cancel" onClick={() => setStatus(a.id, "Cancelled")}><X className="h-4 w-4 text-warning" /></Button>
                  </>}
                  <ConfirmDelete title="Delete this appointment?" onConfirm={() => { update((d) => ({ ...d, appointments: d.appointments.filter((x) => x.id !== a.id) })); toast.success("Appointment deleted"); }}
                    trigger={<Button size="icon" variant="ghost" aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {!list.length && <Empty text="No appointments found." />}
      {open && <ScheduleForm onClose={() => setOpen(false)} />}
    </>
  );
}

function ScheduleForm({ onClose }: { onClose: () => void }) {
  const { patients, doctors, appointments } = useHms();
  const [v, setV] = useState({ patientId: "", doctorId: "", date: iso(new Date()), time: "10:00", reason: "" });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const submit = () => {
    const e: Record<string, string> = {};
    if (!v.patientId) e.patientId = "Select a patient";
    if (!v.doctorId) e.doctorId = "Select a doctor";
    if (!v.date) e.date = "Pick a date";
    else if (v.date < iso(new Date())) e.date = "Date can't be in the past";
    if (!v.time) e.time = "Pick a time";
    if (v.reason.trim().length < 2) e.reason = "Enter a reason";
    if (v.doctorId && appointments.some((a) => a.doctorId === v.doctorId && a.date === v.date && a.time === v.time && a.status === "Scheduled")) e.time = "Doctor already booked at this time";
    setErr(e);
    if (Object.keys(e).length) return;
    update((d) => ({ ...d, appointments: [...d.appointments, { ...v, reason: v.reason.trim(), id: nextId("A", d.appointments.map((x) => x.id)), status: "Scheduled" }] }));
    toast.success("Appointment scheduled");
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Schedule appointment</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Patient" error={err.patientId}><select className={inputCls} value={v.patientId} onChange={set("patientId")}><option value="">Select…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}</select></Field>
          <Field label="Doctor" error={err.doctorId}><select className={inputCls} value={v.doctorId} onChange={set("doctorId")}><option value="">Select…</option>{doctors.filter((d) => d.available).map((d) => <option key={d.id} value={d.id}>{d.name} — {d.department}</option>)}</select></Field>
          <Field label="Date" error={err.date}><input type="date" className={inputCls} value={v.date} onChange={set("date")} /></Field>
          <Field label="Time" error={err.time}><input type="time" className={inputCls} value={v.time} onChange={set("time")} /></Field>
          <div className="sm:col-span-2"><Field label="Reason" error={err.reason}><input className={inputCls} value={v.reason} onChange={set("reason")} /></Field></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Schedule</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
