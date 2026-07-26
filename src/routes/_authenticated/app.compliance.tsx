import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/compliance")({
  head: () => ({ meta: [{ title: "Compliance — LeadTrace" }] }),
  component: Compliance,
});

const REGISTRATION = [
  { label: "Brand Registered", done: true },
  { label: "Campaign Registered", done: true },
  { label: "Sample Messages Approved", done: false },
  { label: "Sending Unlocked", done: false },
];

const AUDIT = [
  { date: "Mar 12, 2026", job: "Tampa HVAC Scrub", total: 3120, clean: 2140, dnc: 512, litigator: 47 },
  { date: "Mar 09, 2026", job: "Insurance Buyer Scrub", total: 1188, clean: 894, dnc: 271, litigator: 23 },
  { date: "Mar 04, 2026", job: "Probate Q1 Scrub", total: 402, clean: 340, dnc: 55, litigator: 7 },
];

function Compliance() {
  return (
    <div>
      <PageHeader title="Compliance" description="10DLC Registration, Audit Logs, And Suppression Enforcement." />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base font-display">10DLC Registration</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {REGISTRATION.map((r) => (
                <li key={r.label} className="flex items-center gap-2 text-sm">
                  {r.done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span className={r.done ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-6 rounded-full">Continue Registration</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-display">Global Suppression</CardTitle></CardHeader>
          <CardContent>
            <div className="font-display text-4xl font-black text-foreground">1,284</div>
            <div className="text-sm text-muted-foreground">Phones Suppressed Across All Campaigns</div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <SupChip label="Opt-Out" value={412} />
              <SupChip label="DNC" value={798} />
              <SupChip label="Manual" value={74} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-display">Scrub Audit Log</CardTitle>
          <Button variant="outline" size="sm" className="rounded-full"><Download className="mr-1 h-3.5 w-3.5" /> Export All</Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="p-4">Date</th>
                <th className="p-4">Job</th>
                <th className="p-4">Total</th>
                <th className="p-4">Clean / DNC / Litigator</th>
                <th className="p-4">Proof</th>
              </tr>
            </thead>
            <tbody>
              {AUDIT.map((a) => (
                <tr key={a.job} className="border-b border-border last:border-0">
                  <td className="p-4 text-muted-foreground">{a.date}</td>
                  <td className="p-4 text-foreground font-medium">{a.job}</td>
                  <td className="p-4">{a.total.toLocaleString()}</td>
                  <td className="p-4">
                    <span className="text-success">{a.clean}</span> / <span className="text-warn">{a.dnc}</span> / <span className="text-danger">{a.litigator}</span>
                  </td>
                  <td className="p-4"><Badge variant="outline">Verified</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function SupChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
      <div className="text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-display font-bold text-foreground text-base">{value.toLocaleString()}</div>
    </div>
  );
}