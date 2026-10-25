import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useHms, update, nextId } from "@/lib/hms/store";
import type { Doctor } from "@/lib/hms/types";
import { ConfirmDelete, Empty, Field, FilterPills, PageHeader, SearchInput, StatusBadge, inputCls } from "@/components/hms/ui";

export const Route = createFileRoute("/doctors")({
  head: () => ({
    meta: [
      { title: "Doctors — CarePoint" },
      { name: "description", content: "Doctor profiles, departments, specializations and availability." },
      { property: "og:title", content: "Doctors — CarePoint" },
      { property: "og:description", content: "Doctor profiles, departments, specializations and availability." },
    ],
  }),
  component: Doctors,
});

const depts = ["Cardiology", "Orthopedics", "Pediatrics", "Neurology", "General Medicine", "Pulmonology", "Dermatology"];
const schema = z.object({
  name: z.string().trim().min(3, "Enter a name").max(80),
  department: z.string().min(1),
  specialization: z.string().trim().min(2, "Enter a specialization").max(80),
  phone: z.string().trim().regex(/^\d{10}$/, "Enter a 10-digit phone"),
  email: z.string().trim().email("Enter a valid email"),
  experience: z.coerce.number().int().min(0).max(60, "Invalid"),
});

function Doctors() {
  const { doctors } = useHms();
  const [q, setQ] = useState("");
  const [f, setF] = useState("All");
  const [edit, setEdit] = useState<Doctor | "new" | null>(null);
  const list = doctors.filter((d) => (f === "All" || d.department === f) && `${d.name} ${d.specialization}`.toLowerCase().includes(q.toLowerCase()));
  const used = ["All", ...Array.from(new Set(doctors.map((d) => d.department)))];

  return (
    <>
      <PageHeader title="Doctors" subtitle={`${doctors.filter((d) => d.available).length} of ${doctors.length} available`} action={<Button onClick={() => setEdit("new")}><Plus className="h-4 w-4" /> Add doctor</Button>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Search doctors…" />
        <FilterPills options={used} value={f} onChange={setF} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((d) => (
          <div key={d.id} className="card-soft p-5">
            <div className="flex items-start gap-3">
              <div className="bg-brand grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-semibold text-primary-foreground">{d.name.replace("Dr. ", "").split(" ").map((x) => x[0]).join("")}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{d.name}</p>
                <p className="text-sm text-primary">{d.department}</p>
                <p className="text-xs text-muted-foreground">{d.specialization} · {d.experience} yrs</p>
              </div>
              <StatusBadge status={d.available ? "Available" : "On leave"} />
            </div>
            <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{d.phone}</p>
              <p className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5" />{d.email}</p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <label className="flex items-center gap-2 text-xs font-medium">
                <Switch checked={d.available} onCheckedChange={(c) => { update((s) => ({ ...s, doctors: s.doctors.map((x) => (x.id === d.id ? { ...x, available: c } : x)) })); toast.success(`${d.name} marked ${c ? "available" : "on leave"}`); }} />
                Available
              </label>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(d)}><Pencil className="h-4 w-4" /></Button>
                <ConfirmDelete title={`Remove ${d.name}?`} onConfirm={() => { update((s) => ({ ...s, doctors: s.doctors.filter((x) => x.id !== d.id) })); toast.success("Doctor removed"); }}
                  trigger={<Button size="icon" variant="ghost" aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {!list.length && <Empty text="No doctors found." />}
      {edit && <DoctorForm initial={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function DoctorForm({ initial, onClose }: { initial: Doctor | null; onClose: () => void }) {
  const [v, setV] = useState<Record<string, string>>(initial ? Object.fromEntries(Object.entries(initial).map(([k, x]) => [k, String(x)])) : { name: "Dr. ", department: depts[0], specialization: "", phone: "", email: "", experience: "" });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: string) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const submit = () => {
    const r = schema.safeParse(v);
    if (!r.success) return setErr(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
    update((d) => initial
      ? { ...d, doctors: d.doctors.map((x) => (x.id === initial.id ? { ...x, ...r.data } : x)) }
      : { ...d, doctors: [...d.doctors, { ...r.data, id: nextId("D", d.doctors.map((x) => x.id)), available: true }] });
    toast.success(initial ? "Doctor updated" : "Doctor added");
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial ? "Edit doctor" : "Add doctor"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Name" error={err.name}><input className={inputCls} value={v.name} onChange={set("name")} /></Field></div>
          <Field label="Department"><select className={inputCls} value={v.department} onChange={set("department")}>{depts.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Specialization" error={err.specialization}><input className={inputCls} value={v.specialization} onChange={set("specialization")} /></Field>
          <Field label="Phone" error={err.phone}><input className={inputCls} value={v.phone} onChange={set("phone")} /></Field>
          <Field label="Experience (years)" error={err.experience}><input type="number" className={inputCls} value={v.experience} onChange={set("experience")} /></Field>
          <div className="sm:col-span-2"><Field label="Email" error={err.email}><input className={inputCls} value={v.email} onChange={set("email")} /></Field></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
