import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Stethoscope, CalendarClock, BedDouble, IndianRupee, ArrowRight } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useHms, inr } from "@/lib/hms/store";
import { iso } from "@/lib/hms/sample-data";
import { PageHeader, StatCard, StatusBadge } from "@/components/hms/ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — CarePoint Hospital Management" },
      { name: "description", content: "Hospital overview: patients, doctors, appointments, beds and revenue." },
      { property: "og:title", content: "CarePoint Dashboard" },
      { property: "og:description", content: "Hospital overview: patients, doctors, appointments, beds and revenue." },
    ],
  }),
  component: Dashboard,
});

const pieColors = ["var(--chart-1)", "var(--chart-3)", "var(--chart-5)"];

function Dashboard() {
  const d = useHms();
  const today = iso(new Date());
  const todays = d.appointments.filter((a) => a.date === today);
  const freeBeds = d.beds.filter((b) => !b.patientId).length;
  const revenue = d.bills.filter((b) => b.status === "Paid").reduce((s, b) => s + b.amount, 0);
  const name = (id: string) => d.patients.find((p) => p.id === id)?.name ?? "—";
  const doc = (id: string) => d.doctors.find((p) => p.id === id)?.name ?? "—";

  const week = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(Date.now() - (6 - i) * 86400000);
    const k = iso(dt);
    return {
      day: dt.toLocaleDateString("en", { weekday: "short" }),
      visits: d.patients.filter((p) => p.lastVisit === k).length + d.appointments.filter((a) => a.date === k).length,
      revenue: d.bills.filter((b) => b.issuedAt === k).reduce((s, b) => s + b.amount, 0),
    };
  });
  const dist = (["Scheduled", "Completed", "Cancelled"] as const).map((s) => ({ name: s, value: d.appointments.filter((a) => a.status === s).length }));
  const upcoming = d.appointments.filter((a) => a.status === "Scheduled" && a.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 5);
  const recent = [...d.patients].sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)).slice(0, 5);

  return (
    <>
      <PageHeader title="Good day, Admin" subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total patients" value={d.patients.length} icon={Users} tone="blue" hint="All registered" />
        <StatCard label="Doctors" value={d.doctors.length} icon={Stethoscope} tone="teal" hint={`${d.doctors.filter((x) => x.available).length} available now`} />
        <StatCard label="Today's appointments" value={todays.length} icon={CalendarClock} tone="amber" hint={`${todays.filter((a) => a.status === "Scheduled").length} still scheduled`} />
        <StatCard label="Available beds" value={`${freeBeds}/${d.beds.length}`} icon={BedDouble} tone="green" hint={`${Math.round(((d.beds.length - freeBeds) / d.beds.length) * 100)}% occupancy`} />
        <StatCard label="Revenue collected" value={inr(revenue)} icon={IndianRupee} tone="blue" hint="Paid invoices" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="card-soft p-5 xl:col-span-2">
          <h2 className="font-semibold">Patient activity & revenue — last 7 days</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <AreaChart data={week}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis yAxisId="l" tickLine={false} axisLine={false} fontSize={12} width={30} />
                <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} fontSize={12} width={50} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Area yAxisId="l" type="monotone" dataKey="visits" name="Visits" stroke="var(--chart-1)" fill="url(#g1)" strokeWidth={2} />
                <Area yAxisId="r" type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="var(--chart-2)" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-soft p-5">
          <h2 className="font-semibold">Appointment status</h2>
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dist} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3}>
                  {dist.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {dist.map((x, i) => (
              <div key={x.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: pieColors[i] }} />{x.name}</span>
                <span className="font-semibold">{x.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card-soft p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Upcoming appointments</h2><Link to="/appointments" className="flex items-center gap-1 text-xs font-semibold text-primary">View all <ArrowRight className="h-3 w-3" /></Link></div>
          <ul className="mt-3 divide-y divide-border">
            {upcoming.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                <div><p className="font-medium">{name(a.patientId)}</p><p className="text-xs text-muted-foreground">{doc(a.doctorId)} · {a.reason}</p></div>
                <div className="text-right"><p className="font-medium">{a.time}</p><p className="text-xs text-muted-foreground">{a.date}</p></div>
              </li>
            ))}
            {!upcoming.length && <li className="py-6 text-center text-sm text-muted-foreground">No upcoming appointments</li>}
          </ul>
        </div>
        <div className="card-soft p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Recent registrations</h2><Link to="/patients" className="flex items-center gap-1 text-xs font-semibold text-primary">View all <ArrowRight className="h-3 w-3" /></Link></div>
          <ul className="mt-3 divide-y divide-border">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-info-soft text-xs font-semibold text-primary">{p.name.split(" ").map((x) => x[0]).join("")}</div>
                  <div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.id} · {p.condition}</p></div>
                </div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
