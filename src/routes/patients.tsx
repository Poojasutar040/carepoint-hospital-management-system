import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useHms, update, nextId } from "@/lib/hms/store";
import { iso } from "@/lib/hms/sample-data";
import type { Patient, PatientStatus } from "@/lib/hms/types";
import { ConfirmDelete, Empty, Field, FilterPills, PageHeader, SearchInput, StatusBadge, TableWrap, inputCls, td, th } from "@/components/hms/ui";

export const Route = createFileRoute("/patients")({
  head: () => ({
    meta: [
      { title: "Patients — CarePoint" },
      { name: "description", content: "Register, search and manage patient records." },
      { property: "og:title", content: "Patients — CarePoint" },
      { property: "og:description", content: "Register, search and manage patient records." },
    ],
  }),
  component: Patients,
});

const schema = z.object({
  name: z.string().trim().min(2, "Enter a full name").max(80),
  age: z.coerce.number().int().min(0, "Invalid age").max(120, "Invalid age"),
  gender: z.enum(["Male", "Female", "Other"]),
  phone: z.string().trim().regex(/^\d{10}$/, "Enter a 10-digit phone"),
  bloodGroup: z.string().min(1),
  status: z.enum(["Admitted", "Outpatient", "Discharged", "Critical"]),
  condition: z.string().trim().min(2, "Enter a condition").max(100),
  lastVisit: z.string().min(1, "Pick a date"),
});

const empty = { name: "", age: "", gender: "Male", phone: "", bloodGroup: "O+", status: "Outpatient", condition: "", lastVisit: iso(new Date()) };
const filters = ["All", "Admitted", "Outpatient", "Critical", "Discharged"] as const;

function Patients() {
  const { patients, appointments, doctors } = useHms();
  const [q, setQ] = useState("");
  const [f, setF] = useState<(typeof filters)[number]>("All");
  const [edit, setEdit] = useState<Patient | "new" | null>(null);
  const [view, setView] = useState<Patient | null>(null);

  const list = useMemo(
    () => patients.filter((p) => (f === "All" || p.status === f) && `${p.name} ${p.id} ${p.phone} ${p.condition}`.toLowerCase().includes(q.toLowerCase())),
    [patients, q, f],
  );

  return (
    <>
      <PageHeader title="Patients" subtitle={`${patients.length} registered patients`} action={<Button onClick={() => setEdit("new")}><Plus className="h-4 w-4" /> Register patient</Button>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, ID, phone…" />
        <FilterPills options={[...filters]} value={f} onChange={setF} />
      </div>
      <TableWrap>
        <thead><tr><th className={th}>Patient</th><th className={th}>Age / Sex</th><th className={th}>Blood</th><th className={th}>Condition</th><th className={th}>Last visit</th><th className={th}>Status</th><th className={th}></th></tr></thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id} className="hover:bg-muted/40">
              <td className={td}><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.id} · {p.phone}</p></td>
              <td className={td}>{p.age} / {p.gender[0]}</td>
              <td className={td}>{p.bloodGroup}</td>
              <td className={td}>{p.condition}</td>
              <td className={td}>{p.lastVisit}</td>
              <td className={td}><StatusBadge status={p.status} /></td>
              <td className={td}>
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" aria-label="View" onClick={() => setView(p)}><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <ConfirmDelete title={`Delete ${p.name}?`} onConfirm={() => { update((d) => ({ ...d, patients: d.patients.filter((x) => x.id !== p.id), beds: d.beds.map((b) => (b.patientId === p.id ? { ...b, patientId: null } : b)) })); toast.success("Patient deleted"); }}
                    trigger={<Button size="icon" variant="ghost" aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {!list.length && <Empty text="No patients match your search." />}

      {edit && <PatientForm initial={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent>
          {view && (
            <>
              <DialogHeader><DialogTitle>{view.name}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[["Patient ID", view.id], ["Phone", view.phone], ["Age", view.age], ["Gender", view.gender], ["Blood group", view.bloodGroup], ["Condition", view.condition], ["Registered", view.registeredAt], ["Last visit", view.lastVisit]].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl bg-muted/60 p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="font-medium">{v}</p></div>
                ))}
              </div>
              <div><p className="mb-2 text-sm font-semibold">Visit history</p>
                <ul className="max-h-48 space-y-2 overflow-auto text-sm">
                  {appointments.filter((a) => a.patientId === view.id).map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-xl border border-border p-2.5">
                      <span>{a.date} · {doctors.find((x) => x.id === a.doctorId)?.name} · {a.reason}</span><StatusBadge status={a.status} />
                    </li>
                  ))}
                  {!appointments.some((a) => a.patientId === view.id) && <li className="text-muted-foreground">No visits recorded.</li>}
                </ul>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PatientForm({ initial, onClose }: { initial: Patient | null; onClose: () => void }) {
  const [v, setV] = useState<Record<string, string>>(initial ? Object.fromEntries(Object.entries(initial).map(([k, x]) => [k, String(x)])) : { ...empty });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: string) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));

  const submit = () => {
    const r = schema.safeParse(v);
    if (!r.success) {
      setErr(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    update((d) => {
      if (initial) return { ...d, patients: d.patients.map((p) => (p.id === initial.id ? { ...p, ...r.data, status: r.data.status as PatientStatus } : p)) };
      const p: Patient = { ...r.data, id: nextId("P", d.patients.map((x) => x.id)), registeredAt: iso(new Date()) };
      return { ...d, patients: [p, ...d.patients] };
    });
    toast.success(initial ? "Patient updated" : "Patient registered");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial ? "Edit patient" : "Register new patient"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Full name" error={err.name}><input className={inputCls} value={v.name} onChange={set("name")} /></Field></div>
          <Field label="Age" error={err.age}><input type="number" className={inputCls} value={v.age} onChange={set("age")} /></Field>
          <Field label="Gender"><select className={inputCls} value={v.gender} onChange={set("gender")}>{["Male", "Female", "Other"].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Phone" error={err.phone}><input className={inputCls} value={v.phone} onChange={set("phone")} /></Field>
          <Field label="Blood group"><select className={inputCls} value={v.bloodGroup} onChange={set("bloodGroup")}>{["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Status"><select className={inputCls} value={v.status} onChange={set("status")}>{["Outpatient", "Admitted", "Critical", "Discharged"].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Last visit" error={err.lastVisit}><input type="date" className={inputCls} value={v.lastVisit} onChange={set("lastVisit")} /></Field>
          <div className="sm:col-span-2"><Field label="Condition / reason" error={err.condition}><input className={inputCls} value={v.condition} onChange={set("condition")} /></Field></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>{initial ? "Save changes" : "Register"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
