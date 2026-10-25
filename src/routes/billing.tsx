import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, CheckCircle2, Trash2, IndianRupee, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useHms, update, inr } from "@/lib/hms/store";
import { iso } from "@/lib/hms/sample-data";
import { ConfirmDelete, Empty, Field, FilterPills, PageHeader, SearchInput, StatCard, StatusBadge, TableWrap, inputCls, td, th } from "@/components/hms/ui";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — CarePoint" },
      { name: "description", content: "Generate patient bills and track payments." },
      { property: "og:title", content: "Billing — CarePoint" },
      { property: "og:description", content: "Generate patient bills and track payments." },
    ],
  }),
  component: Billing,
});

const filters = ["All", "Paid", "Pending", "Overdue"] as const;

function Billing() {
  const { bills, patients } = useHms();
  const [q, setQ] = useState("");
  const [f, setF] = useState<(typeof filters)[number]>("All");
  const [open, setOpen] = useState(false);
  const pn = (id: string) => patients.find((p) => p.id === id)?.name ?? "Unknown";
  const list = bills.filter((b) => (f === "All" || b.status === f) && `${b.id} ${pn(b.patientId)} ${b.description}`.toLowerCase().includes(q.toLowerCase()));
  const sum = (s: string) => bills.filter((b) => b.status === s).reduce((t, b) => t + b.amount, 0);

  return (
    <>
      <PageHeader title="Billing" subtitle={`${bills.length} invoices`} action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Generate bill</Button>} />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Collected" value={inr(sum("Paid"))} icon={IndianRupee} tone="green" />
        <StatCard label="Pending" value={inr(sum("Pending"))} icon={Clock} tone="amber" />
        <StatCard label="Overdue" value={inr(sum("Overdue"))} icon={AlertTriangle} tone="red" />
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Search invoice, patient…" />
        <FilterPills options={[...filters]} value={f} onChange={setF} />
      </div>
      <TableWrap>
        <thead><tr><th className={th}>Invoice</th><th className={th}>Patient</th><th className={th}>Description</th><th className={th}>Amount</th><th className={th}>Issued</th><th className={th}>Paid on</th><th className={th}>Status</th><th className={th}></th></tr></thead>
        <tbody>
          {list.map((b) => (
            <tr key={b.id} className="hover:bg-muted/40">
              <td className={`${td} font-medium`}>{b.id}</td>
              <td className={td}>{pn(b.patientId)}</td>
              <td className={td}>{b.description}</td>
              <td className={`${td} font-semibold`}>{inr(b.amount)}</td>
              <td className={td}>{b.issuedAt}</td>
              <td className={td}>{b.paidAt ?? "—"}</td>
              <td className={td}><StatusBadge status={b.status} /></td>
              <td className={td}>
                <div className="flex justify-end gap-1">
                  {b.status !== "Paid" && <Button size="sm" variant="outline" onClick={() => { update((d) => ({ ...d, bills: d.bills.map((x) => (x.id === b.id ? { ...x, status: "Paid", paidAt: iso(new Date()) } : x)) })); toast.success(`${b.id} marked paid`); }}><CheckCircle2 className="h-4 w-4" /> Mark paid</Button>}
                  <ConfirmDelete title={`Delete invoice ${b.id}?`} onConfirm={() => { update((d) => ({ ...d, bills: d.bills.filter((x) => x.id !== b.id) })); toast.success("Invoice deleted"); }}
                    trigger={<Button size="icon" variant="ghost" aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {!list.length && <Empty text="No invoices found." />}
      {open && <BillForm onClose={() => setOpen(false)} />}
    </>
  );
}

function BillForm({ onClose }: { onClose: () => void }) {
  const { patients } = useHms();
  const [v, setV] = useState({ patientId: "", description: "Consultation", amount: "", status: "Pending" });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const submit = () => {
    const e: Record<string, string> = {};
    const amt = Number(v.amount);
    if (!v.patientId) e.patientId = "Select a patient";
    if (!v.description.trim()) e.description = "Enter a description";
    if (!amt || amt <= 0 || amt > 10000000) e.amount = "Enter a valid amount";
    setErr(e);
    if (Object.keys(e).length) return;
    update((d) => {
      const n = Math.max(5000, ...d.bills.map((b) => parseInt(b.id.replace(/\D/g, ""), 10) || 0)) + 1;
      const paid = v.status === "Paid";
      return { ...d, bills: [{ id: `INV-${n}`, patientId: v.patientId, description: v.description.trim(), amount: amt, issuedAt: iso(new Date()), status: paid ? "Paid" : "Pending", paidAt: paid ? iso(new Date()) : null }, ...d.bills] };
    });
    toast.success("Bill generated");
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Generate bill</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <Field label="Patient" error={err.patientId}><select className={inputCls} value={v.patientId} onChange={set("patientId")}><option value="">Select…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}</select></Field>
          <Field label="Description" error={err.description}><input className={inputCls} value={v.description} onChange={set("description")} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (₹)" error={err.amount}><input type="number" className={inputCls} value={v.amount} onChange={set("amount")} /></Field>
            <Field label="Payment status"><select className={inputCls} value={v.status} onChange={set("status")}><option>Pending</option><option>Paid</option></select></Field>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Generate</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
