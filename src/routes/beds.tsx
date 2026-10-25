import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BedDouble, CheckCircle2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useHms, update } from "@/lib/hms/store";
import type { Bed } from "@/lib/hms/types";
import { Field, FilterPills, PageHeader, StatCard, inputCls } from "@/components/hms/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/beds")({
  head: () => ({
    meta: [
      { title: "Bed Management — CarePoint" },
      { name: "description", content: "Track bed occupancy and assign beds to patients." },
      { property: "og:title", content: "Bed Management — CarePoint" },
      { property: "og:description", content: "Track bed occupancy and assign beds to patients." },
    ],
  }),
  component: Beds,
});

function Beds() {
  const { beds, patients } = useHms();
  const [ward, setWard] = useState("All");
  const [sel, setSel] = useState<Bed | null>(null);
  const occupied = beds.filter((b) => b.patientId).length;
  const wards = ["All", ...Array.from(new Set(beds.map((b) => b.ward)))];
  const shown = beds.filter((b) => ward === "All" || b.ward === ward);

  return (
    <>
      <PageHeader title="Bed management" subtitle="Click a bed to assign or release it" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total beds" value={beds.length} icon={BedDouble} tone="blue" />
        <StatCard label="Occupied" value={occupied} icon={UserRound} tone="amber" />
        <StatCard label="Available" value={beds.length - occupied} icon={CheckCircle2} tone="green" />
      </div>
      <div className="card-soft mt-4 p-5">
        <div className="mb-2 flex justify-between text-sm"><span className="font-medium">Occupancy rate</span><span className="font-semibold">{Math.round((occupied / beds.length) * 100)}%</span></div>
        <Progress value={(occupied / beds.length) * 100} />
      </div>
      <div className="my-5"><FilterPills options={wards} value={ward} onChange={setWard} /></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {shown.map((b) => {
          const p = patients.find((x) => x.id === b.patientId);
          return (
            <button key={b.id} onClick={() => setSel(b)}
              className={cn("rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft", p ? "border-primary/20 bg-info-soft" : "border-success/30 bg-success-soft")}>
              <div className="flex items-center justify-between">
                <BedDouble className={cn("h-5 w-5", p ? "text-primary" : "text-success")} />
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">{b.type}</span>
              </div>
              <p className="mt-3 font-display font-semibold">{b.number}</p>
              <p className="truncate text-xs text-muted-foreground">{p ? p.name : "Available"}</p>
            </button>
          );
        })}
      </div>
      {sel && <AssignDialog bed={sel} onClose={() => setSel(null)} />}
    </>
  );
}

function AssignDialog({ bed, onClose }: { bed: Bed; onClose: () => void }) {
  const { patients, beds } = useHms();
  const current = patients.find((p) => p.id === bed.patientId);
  const bedded = new Set(beds.map((b) => b.patientId).filter(Boolean));
  const candidates = patients.filter((p) => !bedded.has(p.id) && p.status !== "Discharged");
  const [pid, setPid] = useState("");
  const [err, setErr] = useState("");

  const assign = () => {
    if (!pid) return setErr("Select a patient");
    update((d) => ({
      ...d,
      beds: d.beds.map((b) => (b.id === bed.id ? { ...b, patientId: pid } : b)),
      patients: d.patients.map((p) => (p.id === pid && p.status === "Outpatient" ? { ...p, status: "Admitted" } : p)),
    }));
    toast.success(`Bed ${bed.number} assigned`);
    onClose();
  };
  const release = () => {
    update((d) => ({ ...d, beds: d.beds.map((b) => (b.id === bed.id ? { ...b, patientId: null } : b)), patients: d.patients.map((p) => (p.id === bed.patientId ? { ...p, status: "Discharged" } : p)) }));
    toast.success(`Bed ${bed.number} released`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Bed {bed.number} · {bed.ward}</DialogTitle></DialogHeader>
        {current ? (
          <p className="text-sm">Occupied by <span className="font-semibold">{current.name}</span> ({current.id}). Releasing will mark the patient discharged.</p>
        ) : (
          <Field label="Assign patient" error={err}>
            <select className={inputCls} value={pid} onChange={(e) => setPid(e.target.value)}>
              <option value="">Select…</option>
              {candidates.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id}) — {p.status}</option>)}
            </select>
          </Field>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {current ? <Button variant="destructive" onClick={release}>Release bed</Button> : <Button onClick={assign}>Assign</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
